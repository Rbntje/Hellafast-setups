import { ArrowUp, Check, Cpu, GitBranch, Wrench } from 'lucide-react'
import { liveQuery } from 'dexie'
import { useEffect, useRef, useState } from 'react'
import { circuits, compare, propose } from '../features/setup'
import { interpretRequest, modelInstalled } from '../features/local-model'
import { appendVersion, db, version } from '../storage/db'
import type { ChatEntry, Setup } from '../storage/db'
import { Differences, Empty, PageHeading } from './shared'

const prompts = ['More rear stability', 'More entry rotation', 'Improve exit traction', 'Explain the setup', 'Build a wet version']
const modelInstructions = {
  STABILITY: 'Rear stability', ROTATION: 'Entry rotation', TRACTION: 'Exit traction',
  GRIP: 'Front grip', BRAKING: 'Braking stability', WET: 'Wet adaptation',
} as const
const supportedInstructions = 'I can work with rear stability, entry rotation, traction, front grip, braking and wet adaptation.'


type Proposal = NonNullable<ReturnType<typeof propose>> & { setupId: string; baseId: string }

export function Engineer({ setups, activeId, setActiveId, open, create, report }: {
  setups: Setup[]; activeId: string; setActiveId: (id: string) => void; open: (id: string) => void; create: () => void; report: (message: string) => void
}) {
  const setup = setups.find((item) => item.id === activeId) ?? setups.find((item) => !item.archived)
  const setupId = setup?.id
  const active = setup?.versions.at(-1)
  const [history, setHistory] = useState<ChatEntry[]>([])
  const [message, setMessage] = useState('')
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [busy, setBusy] = useState(false)
  const [modelReady, setModelReady] = useState(false)
  const inference = useRef<AbortController | null>(null)
  const current = proposal?.setupId === setupId && proposal?.baseId === active?.id ? proposal : null

  useEffect(() => {
    if (!setupId) return
    const subscription = liveQuery(() => db.chat.where('setupId').equals(setupId).sortBy('date')).subscribe({
      next: setHistory,
      error: () => setHistory([]),
    })
    return () => subscription.unsubscribe()
  }, [setupId])

  useEffect(() => {
    let mounted = true
    void modelInstalled().then((value) => { if (mounted) setModelReady(value) }).catch(() => {})
    return () => { mounted = false; inference.current?.abort() }
  }, [])

  async function askModel() {
    if (!setup || !active || !message.trim() || busy || inference.current) return
    const controller = new AbortController()
    inference.current = controller
    const text = message.trim()
    setBusy(true)
    setProposal(null)
    try {
      const track = circuits.find((circuit) => circuit.id === setup.draft.circuit)?.name
      const context = [track, active.weather, setup.draft.session, 'Generic F1 25'].join(' · ')
      const intent = await interpretRequest(text, context, controller.signal)
      controller.signal.throwIfAborted()
      const instruction = intent in modelInstructions ? modelInstructions[intent as keyof typeof modelInstructions] : ''
      const explains = intent === 'EXPLAIN' || (intent === 'UNKNOWN' && /explain|why|reason/i.test(text))
      const draft = explains ? null : propose(instruction || text, active.values)
      const next = !explains && draft && compare(active.values, draft.values).some((item) => item.delta)
        ? { ...draft, setupId: setup.id, baseId: active.id } : null
      const answer = explains ? active.reasons.join(' ')
        : next ? `${next.reasons[0]} Review the proposed changes before applying them.`
        : draft ? 'The relevant settings are already at the game limits for this adjustment.'
        : `${supportedInstructions} Try describing how the car feels in one corner or phase.`
      await db.chat.add({ id: crypto.randomUUID(), setupId: setup.id, text, answer, date: new Date().toISOString(), method: intent === 'UNKNOWN' ? 'model-fallback' : 'model' })
      setProposal(next)
      setMessage('')
    } catch (error) {
      if (!controller.signal.aborted) report(error instanceof Error ? error.message : 'The local model could not respond. The rules engine is available.')
    } finally {
      inference.current = null
      setBusy(false)
    }
  }

  async function send(text: string) {
    if (!setup || !active || !text.trim() || busy) return
    setBusy(true)
    const trimmed = text.trim()
    const explanation = /explain|why|reason/i.test(trimmed)
    const draft = explanation ? null : propose(trimmed, active.values)
    let next: Proposal | null = null
    let answer: string
    if (explanation) {
      answer = active.reasons.join(' ')
    } else if (!draft) {
      answer = `${supportedInstructions} Describe one handling change or ask why a setting was chosen.`
    } else if (!compare(active.values, draft.values).some((item) => item.delta)) {
      answer = 'The relevant settings are already at the game limits for this adjustment.'
    } else {
      next = { ...draft, setupId: setup.id, baseId: active.id }
      answer = `${draft.reasons[0]} Review the proposed changes before applying them.`
    }
    try {
      await db.chat.add({ id: crypto.randomUUID(), setupId: setup.id, text: trimmed, answer, date: new Date().toISOString() })
      setProposal(next)
      setMessage('')
    } catch { report('The engineer message could not be saved locally.') }
    finally { setBusy(false) }
  }

  async function apply() {
    if (!setup || !active || !current || busy) return
    setBusy(true)
    try {
      await appendVersion(setup.id, active.id, version(current.label, current.wet ? 'Wet' : active.weather, current.values, current.reasons))
      setProposal(null)
      report('Engineer adjustment saved as a new version.')
    } catch (error) { report(error instanceof Error ? error.message : 'The change could not be saved.') }
    finally { setBusy(false) }
  }

  return <>
    <PageHeading eyebrow="ENGINEERING WORKBENCH" title="AI Engineer" description="Describe how the car feels and review the engineer’s suggested changes."/>
    <section className="panel engineer-panel">
      <div className="panel-header">
        <div className="engine-heading"><span className="empty-icon"><Cpu size={23}/></span><div><h2>HELLAFAST Engineer</h2><p className="eyebrow accent">LOCAL RULES ENGINE</p></div></div>
        {setup && <button className="button ghost" onClick={() => open(setup.id)}><GitBranch size={16}/> Open setup</button>}
      </div>
      {setup && active ? <>
        <label>Active setup<select value={setup.id} onChange={(event) => { setActiveId(event.target.value); setProposal(null) }}>{setups.map((item) => <option value={item.id} key={item.id}>{item.name} · V{item.versions.length}</option>)}</select></label>
        <div className="message-list" aria-live="polite">
          {history.filter((item) => item.setupId === setup.id).slice(-40).map((item) => <div className="exchange" key={item.id}><p className="message-user">{item.text}</p><p className="message-engine">{item.method && <strong className="model-message-label">{item.method === 'model' ? 'Local model · Request interpretation' : 'Local model uncertain · Rules fallback'}</strong>}{item.answer}</p></div>)}
        </div>
        {current && <div className="proposal"><h3>{current.label}</h3><Differences before={active.values} after={current.values}/>
          <div className="toolbar"><button className="button primary" disabled={busy} onClick={() => void apply()}><Check size={16}/> Apply as new version</button><button className="button ghost" onClick={() => setProposal(null)}>Dismiss</button></div>
        </div>}
        <div className="suggestions">{prompts.map((text) => <button key={text} className="button ghost" disabled={busy} onClick={() => void send(text)}>{text}</button>)}</div>
        <form className="message-form" onSubmit={(event) => { event.preventDefault(); void send(message) }}>
          <input aria-label="Message the engineer" placeholder="Describe what the car is doing…" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)}/>
          <button aria-label="Send message" className="button primary icon-button" disabled={!message.trim() || busy}><ArrowUp size={20}/></button>
        </form>
        {modelReady && <div className="toolbar model-actions">{inference.current ? <>
          <span role="status">Running local inference…</span><button className="button ghost" onClick={() => inference.current?.abort()}>Cancel</button>
        </> : <button className="button secondary" disabled={busy || !message.trim()} onClick={() => void askModel()}>Ask local model</button>}</div>}
      </> : <Empty icon={<Wrench size={21}/>} title="No setup on the workbench."><p>Create a setup to get context-aware handling advice.</p><button className="button primary" onClick={create}>Create setup</button></Empty>}
    </section>
  </>
}
