import { Cpu, Database, Download, Fingerprint, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { defaultDriver, traits } from '../features/setup'
import type { Driver } from '../features/setup'
import { downloadBackup, importBackup, readBackupBytes, savePreferences } from '../storage/db'
import type { Preferences } from '../storage/db'
import { persistQuiz } from '../storage/edit-journal'
import { PageHeading } from './shared'
import { ModelControls } from './ModelControls'

export function Profile({ preferences, offlineReady, report }: {
  preferences: Preferences; offlineReady: boolean; report: (message: string) => void
}) {
  const [driver, setDriver] = useState(preferences.driver)
  const [usage, setUsage] = useState('Unavailable')
  const [persistent, setPersistent] = useState<boolean | null>(null)
  const [gpu, setGpu] = useState('Checking')
  const [busy, setBusy] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true
    if (navigator.storage) {
      void navigator.storage.estimate().then((details) => {
        if (mounted && typeof details.usage === 'number') setUsage(`${(details.usage / 1048576).toFixed(2)} MB`)
      }).catch(() => {})
      void navigator.storage.persisted().then((value) => { if (mounted) setPersistent(value) }).catch(() => {})
    }
    const adapter = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu
    if (!adapter) queueMicrotask(() => { if (mounted) setGpu('Unavailable') })
    else void adapter.requestAdapter().then((value) => { if (mounted) setGpu(value ? 'Adapter available' : 'No adapter') })
      .catch(() => { if (mounted) setGpu('Unavailable') })
    return () => { mounted = false }
  }, [])

  function save(next: Driver) {
    setDriver(next)
    void savePreferences({ driver: next }).catch(() => report('Driver DNA could not be saved locally.'))
  }

  async function restore(input?: File) {
    if (!input || busy) return
    setBusy(true)
    try {
      if (input.size > 24 * 1024 * 1024) throw new Error('The backup exceeds 24 MB.')
      const backup = readBackupBytes(new Uint8Array(await input.arrayBuffer()))
      const result = await importBackup(backup)
      if (result.restoredProfile && backup.preferences) setDriver(backup.preferences.driver)
      report(`${result.added} setup(s) restored. ${result.duplicates} duplicate ID(s) skipped.`)
    } catch (error) { report(error instanceof Error ? error.message : 'The backup could not be restored.') }
    finally { setBusy(false); if (file.current) file.current.value = '' }
  }

  return <>
    <PageHeading eyebrow="DRIVER PROFILE" title="Profile" description="Your driving preferences, device capabilities, and data controls."/>
    <div className="profile-grid">
      <section className="panel profile-dna">
        <div className="panel-header"><div className="engine-heading"><span className="empty-icon"><Fingerprint size={23}/></span><div><h2>Driver DNA</h2><p className="muted">Changes save automatically on this device.</p></div></div></div>
        {(Object.keys(traits) as (keyof Driver)[]).map((key) => <label className="slider-row" key={key}>
          <span>{traits[key]} <output>{driver[key]} / 5</output></span>
          <input type="range" min="1" max="5" step="1" value={driver[key]} onChange={(event) => save({ ...driver, [key]: Number(event.target.value) })}/>
        </label>)}
        <button className="button secondary" onClick={() => { save(defaultDriver); report('Driver DNA reset to balanced defaults.') }}>Reset Driver DNA</button>
      </section>
      <div className="profile-right">
        <section className="panel">
          <div className="panel-header"><div className="engine-heading"><span className="empty-icon"><Cpu size={21}/></span><h2>Engine & device</h2></div></div>
          <dl className="device-list"><div><dt>Engineering engine</dt><dd>Local rules · Ready</dd></div><div><dt>WebGPU</dt><dd>{gpu}</dd></div><div><dt>Offline shell</dt><dd>{offlineReady ? 'Ready' : 'Awaiting cache'}</dd></div></dl>
          <label className="check-row"><input type="checkbox" checked={preferences.ignition} onChange={(event) => void savePreferences({ ignition: event.target.checked }).catch(() => report('The ignition preference could not be saved.'))}/> Show ignition at startup</label>
          <ModelControls report={report}/>
        </section>
        <section className="panel">
          <div className="panel-header"><div className="engine-heading"><span className="empty-icon"><Database size={21}/></span><h2>Storage & backup</h2></div></div>
          <dl className="device-list"><div><dt>Origin storage usage</dt><dd>{usage}</dd></div><div><dt>Persistent storage</dt><dd>{persistent === null ? 'Unavailable' : persistent ? 'Granted' : 'Not granted'}</dd></div></dl>
          {persistent === false && <button className="button secondary" onClick={() => void navigator.storage.persist().then((granted) => {
            setPersistent(granted)
            report(granted ? 'Persistent storage granted.' : 'The browser did not grant persistent storage.')
          }).catch(() => report('Persistent storage is unavailable.'))}>Request persistent storage</button>}
          <p className="muted">Back up your garage before clearing Safari data or moving to another device. Import merges new records and skips existing IDs.</p>
          <div className="toolbar"><button className="button secondary" onClick={() => void downloadBackup(false).catch(() => report('JSON export failed.'))}><Download size={16}/> JSON</button>
            <button className="button secondary" onClick={() => void downloadBackup(true).catch(() => report('ZIP export failed.'))}><Download size={16}/> ZIP</button>
            <button className="button secondary" disabled={busy} onClick={() => file.current?.click()}><Upload size={16}/> Import</button>
            <input type="file" ref={file} accept=".json,.zip,application/json,application/zip" hidden onChange={(event) => void restore(event.target.files?.[0])}/></div>
        </section>
        <section className="panel"><div className="panel-header"><div className="engine-heading"><span className="empty-icon"><ShieldCheck size={21}/></span><h2>Privacy</h2></div></div>
          <p className="muted">Setups, preferences and conversations stay in this browser. The app has no analytics or cloud account.</p>
          <label className="check-row"><input type="checkbox" checked={preferences.draft.online} onChange={(event) => void persistQuiz({
            draft: { ...preferences.draft, online: event.target.checked },
          }).catch(() => report('The research preference could not be saved.'))}/> Enable public source lookup in the setup quiz</label>
        </section>
      </div>
    </div>
  </>
}
