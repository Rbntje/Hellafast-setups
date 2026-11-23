import { useState } from 'react'
import { compare, feedbackOutcomes, feedbackTopics, propose } from '../features/setup'
import type { Feedback, Settings } from '../features/setup'
import { addFeedback } from '../storage/db'
import type { Version } from '../storage/db'
import { Differences } from './shared'

export function TestFeedback({ setupId, active, saving, apply, report }: {
  setupId: string; active: Version; saving: boolean
  apply: (label: string, weather: Version['weather'], values: Settings, reasons: string[]) => Promise<void>
  report: (message: string) => void
}) {
  const [topic, setTopic] = useState<Feedback['topic']>('Turn-in')
  const [outcome, setOutcome] = useState<Feedback['outcome']>('Needs work')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [review, setReview] = useState<Feedback | null>(null)
  const adjustment = review && propose(feedbackTopics[review.topic], active.values)
  const hasChange = adjustment && compare(active.values, adjustment.values).some((item) => item.delta)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    try {
      await addFeedback(setupId, active.id, { id: crypto.randomUUID(), date: new Date().toISOString(), topic, outcome, notes: notes.trim() })
      setNotes('')
      report('Test feedback saved to this version.')
    } catch (error) { report(error instanceof Error ? error.message : 'Test feedback could not be saved.') }
    finally { setPending(false) }
  }

  return <section className="feedback-block">
    <h3>Test feedback</h3>
    <p className="muted">Record what you felt on track in the active version.</p>
    <form onSubmit={(event) => void save(event)}>
      <div className="form-columns">
        <label>Handling area<select value={topic} onChange={(event) => setTopic(event.target.value as Feedback['topic'])}>
          {Object.keys(feedbackTopics).map((item) => <option key={item}>{item}</option>)}
        </select></label>
        <label>Test outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as Feedback['outcome'])}>
          {feedbackOutcomes.map((item) => <option key={item}>{item}</option>)}
        </select></label>
      </div>
      <label>Corner or test note<textarea maxLength={500} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)}/></label>
      <button className="button secondary" disabled={pending}>Save feedback</button>
    </form>
    {[...(active.feedback ?? [])].reverse().map((item) => <div className="feedback-record" key={item.id}>
      <strong>{item.topic} · {item.outcome}</strong>
      {item.notes && <p>{item.notes}</p>}
      {item.outcome === 'Needs work' && <button className="button ghost" onClick={() => setReview(item)}>Review an adjustment</button>}
    </div>)}
    {review && <div className="proposal">
      <h3>{adjustment?.label ?? review.topic}</h3>
      {adjustment && hasChange ? <>
        <p className="muted">{adjustment.reasons[0]}</p>
        <Differences before={active.values} after={adjustment.values}/>
        <button className="button primary" disabled={saving || pending} onClick={() => void apply(adjustment.label, active.weather, adjustment.values, [
          `Based on feedback for ${review.topic.toLowerCase()}.`, ...adjustment.reasons,
        ])}>Save feedback adjustment as a new version</button>
      </> : <p className="muted">The relevant settings are already at the game limits.</p>}
      <button className="button ghost" onClick={() => setReview(null)}>Dismiss</button>
    </div>}
  </section>
}
