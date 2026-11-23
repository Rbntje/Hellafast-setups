import { useEffect, useRef, useState } from 'react'
import { downloadModel, modelDownloadMiB, modelInstalled, modelName, modelSupported, removeModel } from '../features/local-model'

export function ModelControls({ report }: { report: (message: string) => void }) {
  const [installed, setInstalled] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [removing, setRemoving] = useState(false)
  const transfer = useRef<AbortController | null>(null)

  useEffect(() => {
    let alive = true
    void modelInstalled().then((value) => { if (alive) setInstalled(value) }).catch(() => {})
    return () => { alive = false; transfer.current?.abort() }
  }, [])

  async function install() {
    if (transfer.current || !confirmed) return
    const controller = new AbortController()
    transfer.current = controller
    setProgress(0)
    try {
      await downloadModel(controller.signal, setProgress)
      setInstalled(true)
      setConfirmed(false)
      report('The local language model is available offline.')
    } catch (error) {
      if (!controller.signal.aborted) report(error instanceof Error ? error.message : 'The model download failed.')
    } finally {
      transfer.current = null
      setProgress(null)
    }
  }

  async function remove() {
    setRemoving(true)
    try {
      await removeModel()
      setInstalled(false)
      report('The local model and its runtime files were removed.')
    } catch { report('The model could not be removed.') }
    finally { setRemoving(false) }
  }

  return <div className="model-controls">
    <h3>Local language model</h3>
    {!modelSupported() ? <p className="muted">This browser lacks the runtime or private cache support. Setup calculations are ready.</p> : <>
      <p className="muted">{modelName} · WebAssembly · {modelDownloadMiB} MiB download. Allow roughly 300–450 MiB of runtime memory. The model interprets handling requests. iPhone memory use is unmeasured.</p>
      {installed ? <div className="toolbar"><span className="eyebrow accent">AVAILABLE OFFLINE</span><button className="button secondary" disabled={removing} onClick={() => void remove()}>Remove model</button></div> :
        progress === null ? <>
          <label className="check-row"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)}/> Download this model to this device</label>
          <button className="button secondary" disabled={!confirmed} onClick={() => void install()}>Download model</button>
        </> : <>
          <p role="status">Downloading {modelName} · {progress}%</p>
          <progress max="100" value={progress} aria-label="Model download progress"/>
          <button className="button secondary" onClick={() => transfer.current?.abort()}>Cancel download</button>
        </>}
    </>}
  </div>
}
