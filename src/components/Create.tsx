import { ArrowLeft, ArrowRight, Check, CloudRain, FlaskConical, Flag, Radio, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { circuits, concerns, phases } from '../features/setup'
import type { Draft } from '../features/setup'
import { parseManual, searchTerms } from '../features/research'
import { db, newSetup, savePreferences } from '../storage/db'
import type { Preferences } from '../storage/db'
import type { EngineeringUpdate } from '../workers/engineering'
import { PageHeading } from './shared'

const steps = ['Conditions', 'Balance', 'Handling', 'Review']
const styles = [
  ['Stable', 'Predictable rear response and a wider margin on corner entry.'],
  ['Balanced', 'A neutral balance built around your Driver DNA.'],
  ['Responsive', 'Sharper turn-in and more rotation through the corner.'],
] as const

export function Create({ preferences, onSaved, report }: {
  preferences: Preferences; onSaved: (id: string) => void; report: (message: string) => void
}) {
  const [draft, setDraft] = useState(preferences.draft)
  const [step, setStep] = useState(preferences.quizStep)
  const [imports, setImports] = useState(preferences.imports)
  const [progress, setProgress] = useState('')
  const [committing, setCommitting] = useState(false)
  const [source, setSource] = useState({ name: '', url: '', values: '' })
  const worker = useRef<Worker | null>(null)
  const track = circuits.find((item) => item.id === draft.circuit)!

  useEffect(() => () => worker.current?.terminate(), [])

  function change(patch: Partial<Draft>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    void savePreferences({ draft: next }).catch(() => report('The quiz change could not be saved locally.'))
  }
  function move(next: number) {
    setStep(next)
    void savePreferences({ quizStep: next }).catch(() => report('The quiz progress could not be saved locally.'))
  }
  function stop() {
    worker.current?.terminate()
    worker.current = null
    setProgress('')
  }
  function addSource() {
    try {
      const item = parseManual(source.name, source.url, source.values, draft)
      const next = [...imports.filter((previous) => previous.url !== item.url || previous.track !== item.track || previous.weather !== item.weather || previous.session !== item.session), item]
      if (next.length > 100) throw new Error('Remove a source before adding more.')
      setImports(next)
      setSource({ name: '', url: '', values: '' })
      void savePreferences({ imports: next }).catch(() => report('The source could not be saved locally.'))
    } catch (error) {
      report(error instanceof Error ? error.message : 'The source could not be added.')
    }
  }
  function removeSource(url: string) {
    const next = imports.filter((item) => item.url !== url || item.track !== draft.circuit || item.weather !== draft.weather || item.session !== draft.session)
    setImports(next)
    void savePreferences({ imports: next }).catch(() => report('The source could not be removed locally.'))
  }
  function generate() {
    if (worker.current || committing) return
    try {
      const active = new Worker(new URL('../workers/engineering.ts', import.meta.url), { type: 'module' })
      worker.current = active
      setProgress('Starting the local engineering worker')
      active.onerror = () => { stop(); report('The engineering worker failed. Try generating the setup again.') }
      active.onmessage = async ({ data }: MessageEvent<EngineeringUpdate>) => {
        if ('stage' in data) setProgress(data.stage)
        if ('error' in data) { stop(); report(data.error) }
        if ('result' in data) {
          active.terminate()
          worker.current = null
          setCommitting(true)
          setProgress('Saving the validated setup to your garage')
          try {
            const setup = newSetup(draft, preferences.driver, data.result)
            await db.transaction('rw', db.setups, db.preferences, async () => {
              await db.setups.add(setup)
              await savePreferences({ quizStep: 0 })
            })
            onSaved(setup.id)
          } catch {
            setProgress('')
            setCommitting(false)
            report('The setup could not be saved. Check local storage and try again.')
          }
        }
      }
      active.postMessage({ draft, driver: preferences.driver, imports })
    } catch {
      stop()
      report('The engineering worker could not start.')
    }
  }

  return <>
    <PageHeading eyebrow="SETUP WORKSHOP" title="Create setup" description="Choose your conditions, confirm the balance, and build a track-ready starting point."/>
    <ol className="steps">{steps.map((name, index) => <li className={index === step ? 'current' : index < step ? 'done' : ''} key={name} aria-current={index === step ? 'step' : undefined}>
      <span>{index < step ? <Check size={14}/> : index + 1}</span>{name}
    </li>)}</ol>
    <section className="panel form-panel" aria-labelledby="step-title">
      {step === 0 && <>
        <div className="section-lead"><Flag size={22}/><div><h2 id="step-title">Set the conditions</h2><p>F1 25 base game · Generic F1 25 car</p></div></div>
        <label>Circuit<select value={draft.circuit} onChange={(event) => change({ circuit: event.target.value })}>{circuits.map((item) => <option key={item.id} value={item.id}>{item.country} · {item.name}</option>)}</select></label>
        <div className="form-columns">
          <fieldset><legend>Weather</legend><div className="segmented">
            <button className={draft.weather === 'Dry' ? 'selected' : ''} aria-pressed={draft.weather === 'Dry'} onClick={() => change({ weather: 'Dry' })}><Sun size={17}/> Dry</button>
            <button className={draft.weather === 'Wet' ? 'selected' : ''} aria-pressed={draft.weather === 'Wet'} onClick={() => change({ weather: 'Wet' })}><CloudRain size={17}/> Wet</button>
          </div></fieldset>
          <label>Session<select value={draft.session} onChange={(event) => change({ session: event.target.value as Draft['session'] })}>
            <option>Race</option><option>Qualifying</option><option>Time trial</option>
          </select></label>
        </div>
      </>}
      {step === 1 && <>
        <div className="section-lead"><FlaskConical size={22}/><div><h2 id="step-title">How should the car feel?</h2><p>Choose the balance you want for this run.</p></div></div>
        <div className="choices">{styles.map(([style, description]) => <button key={style} className={draft.style === style ? 'selected' : ''} aria-pressed={draft.style === style} onClick={() => change({ style })}>
          <span><strong>{style}</strong><small>{description}</small></span>{draft.style === style && <Check size={20}/>}
        </button>)}</div>
      </>}
      {step === 2 && <>
        <div className="section-lead"><Flag size={22}/><div><h2 id="step-title">What are you feeling?</h2><p>Pinpoint a handling concern to inform the first version.</p></div></div>
        <label>Handling concern<select value={draft.concern} onChange={(event) => change({ concern: event.target.value as Draft['concern'] })}>{concerns.map((item) => <option key={item}>{item}</option>)}</select></label>
        {draft.concern === 'Understeer' && <label>Where do you feel the understeer?<select value={draft.phase} onChange={(event) => change({ phase: event.target.value as Draft['phase'] })}>{phases.map((item) => <option key={item}>{item}</option>)}</select></label>}
      </>}
      {step === 3 && <>
        <div className="section-lead"><Radio size={22}/><div><h2 id="step-title">Confirm your brief</h2><p>Review the inputs before the engineering run.</p></div></div>
        <dl className="brief-grid">
          <div><dt>Circuit</dt><dd>{track.name}</dd></div><div><dt>Conditions</dt><dd>{draft.weather} · {draft.session}</dd></div>
          <div><dt>Balance</dt><dd>{draft.style} · Driver DNA applied</dd></div><div><dt>Handling</dt><dd>{draft.concern}{draft.concern === 'Understeer' && ` · ${draft.phase}`}</dd></div>
        </dl>
        <label className="check-row"><input type="checkbox" checked={draft.online} onChange={(event) => change({ online: event.target.checked })} disabled={!!progress}/>Look up public community settings</label>
        <p className="muted">This retrieves a public dataset without sending your circuit selection or profile.</p>
        <details className="research-import"><summary>Find or add a source</summary>
          <p>Search terms</p><code>{searchTerms(draft, track.name)}</code>
          <div className="source-links"><a href={`https://www.f1laps.com/f1-25/setups/${draft.circuit}/meta/`} target="_blank" rel="noreferrer">F1Laps circuit page ↗</a><a href="https://steamcommunity.com/app/3059520/guides/" target="_blank" rel="noreferrer">Steam community guides ↗</a></div>
          <p className="muted">Enter the published values as JSON. The example uses the internal setting keys.</p>
          <label>Source name<input value={source.name} maxLength={150} onChange={(event) => setSource({ ...source, name: event.target.value })}/></label>
          <label>Source URL<input type="url" value={source.url} onChange={(event) => setSource({ ...source, url: event.target.value })}/></label>
          <label>Published settings<textarea value={source.values} onChange={(event) => setSource({ ...source, values: event.target.value })} placeholder='{"frontWing": 26, "rearWing": 24}' rows={3}/></label>
          <button className="button secondary" onClick={addSource} disabled={!!progress}>Add source</button>
          {imports.filter((item) => item.track === draft.circuit && item.weather === draft.weather && item.session === draft.session).map((item) =>
            <div key={item.url} className="source-item"><span>{item.name}</span><button className="button ghost" onClick={() => removeSource(item.url)} disabled={!!progress}>Remove</button></div>)}
        </details>
        {progress && <div className="status-feedback" role="status"><Radio size={17}/> {progress}</div>}
      </>}
      <div className="form-actions">
        {step > 0 && <button className="button ghost" disabled={!!progress} onClick={() => move(step - 1)}><ArrowLeft size={16}/> Back</button>}
        {progress && !committing ? <button className="button secondary" onClick={stop}>Cancel run</button> :
          <button className="button primary" disabled={committing} onClick={() => step === 3 ? generate() : move(step + 1)}>
            {step === 3 ? 'Confirm and generate' : 'Continue'} <ArrowRight size={17}/>
          </button>}
      </div>
    </section>
  </>
}
