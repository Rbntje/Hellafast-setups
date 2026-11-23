import { Archive, ArrowLeft, ArrowRight, Copy, Download, Flag, FolderPlus, GitCompare, Plus, Search, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { circuits, compare, groups, ranges } from '../features/setup'
import type { Setting, Settings } from '../features/setup'
import { appendVersion, db, downloadBackup, updateSetup, version } from '../storage/db'
import type { Folder, Setup } from '../storage/db'
import { Differences, Empty, EvidenceSummary, PageHeading, SettingsTable, SetupList } from './shared'

export function folderName(id: string, folders: Folder[]): string {
  const folder = folders.find((item) => item.id === id)
  if (!folder) return ''
  return folder.parentId ? `${folderName(folder.parentId, folders)} / ${folder.name}` : folder.name
}

function FolderOptions({ folders }: { folders: Folder[] }) {
  return folders.map((item) => <option key={item.id} value={item.id}>{folderName(item.id, folders)}</option>)
}

export function Garage({ setups, folders, open, create, report }: {
  setups: Setup[]; folders: Folder[]; open: (id: string) => void; create: () => void; report: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState('all')
  const [folder, setFolder] = useState('')
  const [sort, setSort] = useState('recent')
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [mode, setMode] = useState<'browse' | 'compare' | 'select'>('browse')
  const [selection, setSelection] = useState<string[]>([])
  const [before, setBefore] = useState('')
  const [after, setAfter] = useState('')
  const first = setups.find((setup) => setup.id === before)
  const second = setups.find((setup) => setup.id === after)
  const needle = query.trim().toLocaleLowerCase()
  const items = setups.filter((setup) => {
    const track = circuits.find((item) => item.id === setup.draft.circuit)
    return (scope === 'archived' ? setup.archived : !setup.archived)
      && (scope !== 'favorites' || setup.favorite)
      && (!folder || setup.folderId === folder)
      && [setup.name, track?.name, track?.country, ...setup.tags].some((value) => value?.toLocaleLowerCase().includes(needle))
  })
  if (sort === 'name') items.sort((left, right) => left.name.localeCompare(right.name))
  const selected = items.filter((setup) => selection.includes(setup.id))

  async function createFolder(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    const newFolder = { id: crypto.randomUUID(), name: name.trim(), parentId: parent || null }
    try {
      await db.transaction('rw', db.folders, async () => {
        const siblings = (await db.folders.toArray()).filter((item) => item.parentId === newFolder.parentId)
        if (siblings.some((item) => item.name.toLocaleLowerCase() === newFolder.name.toLocaleLowerCase())) throw new Error('A folder with that name already exists here.')
        await db.folders.add(newFolder)
      })
      setName('')
      setAddingFolder(false)
    } catch (error) { report(error instanceof Error ? error.message : 'The folder could not be saved.') }
  }

  async function archiveSelected() {
    try {
      await db.transaction('rw', db.setups, async () => {
        for (const item of selected) await updateSetup(item.id, { archived: scope !== 'archived' })
      })
      setSelection([])
    } catch { report('The selected setups could not be updated.') }
  }

  return <>
    <PageHeading eyebrow="LOCAL LIBRARY" title="My Garage" description="Organize your setups, revisit past versions, and compare changes." actions={<button className="button primary" onClick={create}><Plus size={18}/> Create setup</button>}/>
    <section className="panel garage-panel">
      <div className="panel-header"><h2>{mode === 'compare' ? 'Compare setups' : 'Setup library'}</h2><div className="toolbar">
        <button className="button ghost" aria-pressed={mode === 'compare'} onClick={() => setMode(mode === 'compare' ? 'browse' : 'compare')}><GitCompare size={16}/> Compare</button>
        {mode !== 'compare' && <button className="button ghost" aria-pressed={mode === 'select'} onClick={() => setMode(mode === 'select' ? 'browse' : 'select')}>Select</button>}
      </div></div>
      {mode === 'compare' ? <>
        <div className="form-columns">
          <label>Baseline setup<select value={before} onChange={(event) => setBefore(event.target.value)}><option value="">Choose setup</option>{setups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Comparison setup<select value={after} onChange={(event) => setAfter(event.target.value)}><option value="">Choose setup</option>{setups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        </div>
        {first && second ? <Differences before={first.versions.at(-1)!.values} after={second.versions.at(-1)!.values}/> : <p className="muted">Choose two setups to compare their latest versions.</p>}
      </> : <>
        <div className="filters"><label className="search"><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search setups" placeholder="Search setups, tracks or tags"/></label>
          <select aria-label="Setup filter" value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">Active setups</option><option value="favorites">Favorites</option><option value="archived">Archived</option></select>
          <select aria-label="Sort setups" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Latest update</option><option value="name">Name</option></select>
        </div>
        <div className="filters">
          <select value={folder} aria-label="Filter by folder" onChange={(event) => setFolder(event.target.value)}><option value="">All folders</option><FolderOptions folders={folders}/></select>
          <button className="button secondary" onClick={() => setAddingFolder(!addingFolder)}><FolderPlus size={17}/> New folder</button>
          {folder && <button className="button ghost" onClick={() => {
            const descendants = new Set([folder])
            for (const item of folders) {
              let current = item.parentId
              while (current && !descendants.has(item.id)) {
                if (descendants.has(current)) descendants.add(item.id)
                current = folders.find((candidate) => candidate.id === current)?.parentId ?? null
              }
            }
            void downloadBackup(false, setups.filter((item) => item.folderId && descendants.has(item.folderId)), descendants).catch(() => report('Folder export failed.'))
          }}><Download size={16}/> Export folder</button>}
        </div>
        {addingFolder && <form className="folder-form" onSubmit={createFolder}>
          <label>Folder name<input value={name} maxLength={150} onChange={(event) => setName(event.target.value)} required/></label>
          <label>Parent folder<select value={parent} onChange={(event) => setParent(event.target.value)}><option value="">Top level</option><FolderOptions folders={folders}/></select></label>
          <button className="button primary">Save folder</button>
        </form>}
        {mode === 'select' && selected.length > 0 && <div className="toolbar bulk"><span>{selected.length} selected</span>
          <button className="button secondary" onClick={() => void archiveSelected()}><Archive size={16}/>{scope === 'archived' ? 'Unarchive' : 'Archive'}</button>
          <button className="button secondary" onClick={() => void downloadBackup(false, selected).catch(() => report('Export failed.'))}><Download size={16}/> Export</button>
        </div>}
        {items.length ? mode === 'select' ? <div className="bulk-list">{items.map((item) => <label className="check-row" key={item.id}>
          <input type="checkbox" checked={selection.includes(item.id)} onChange={(event) => setSelection(event.target.checked ? [...selection, item.id] : selection.filter((id) => id !== item.id))}/>{item.name}
        </label>)}</div> : <SetupList items={items} open={open}/> : <Empty title={setups.length ? 'No matching setups.' : 'Your grid is clear.'}>
          <p>{setups.length ? 'Try another search, folder or filter.' : 'Create a setup to start your garage.'}</p>
        </Empty>}
      </>}
    </section>
  </>
}

export function SetupDetail({ setup, folders, close, open, engineer, report }: {
  setup: Setup; folders: Folder[]; close: () => void; open: (id: string) => void; engineer: () => void; report: (message: string) => void
}) {
  const [view, setView] = useState<'settings' | 'versions' | 'details' | 'research'>('settings')
  const [selection, setSelection] = useState('')
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<Partial<Record<Setting, string>>>({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const active = setup.versions.at(-1)!
  const previous = setup.versions.find((item) => item.id === selection) ?? setup.versions.at(-2)
  const track = circuits.find((row) => row.id === setup.draft.circuit)

  function saveMetadata(patch: Parameters<typeof updateSetup>[1]) {
    void updateSetup(setup.id, patch).catch(() => report('The change could not be saved. Your existing setup is still in the garage.'))
  }
  async function apply(label: string, weather: typeof active.weather, next: Settings, reasons: string[]) {
    if (saving) return
    setSaving(true)
    try {
      await appendVersion(setup.id, active.id, version(label, weather, next, reasons))
      setEditing(false)
      setValues({})
      report('New version saved.')
    } catch (error) {
      report(error instanceof Error ? error.message : 'The version could not be saved.')
    } finally { setSaving(false) }
  }
  async function duplicate() {
    try {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      await db.setups.add({ ...setup, id, created: now, updated: now, archived: false, name: `${setup.name.slice(0, 138)} copy` })
      open(id)
    } catch { report('The setup could not be duplicated.') }
  }
  async function discard() {
    try {
      await db.transaction('rw', db.setups, db.chat, async () => {
        await db.setups.delete(setup.id)
        await db.chat.where('setupId').equals(setup.id).delete()
      })
      close()
    } catch { report('The setup could not be deleted.') }
  }
  function saveManual(event: React.FormEvent) {
    event.preventDefault()
    const next = { ...active.values }
    for (const [key, val] of Object.entries(values)) next[key as Setting] = val.trim() ? Number(val) : Number.NaN
    if (!compare(active.values, next).some((row) => row.delta)) { setEditing(false); return }
    void apply('Manual adjustment', active.weather, next, ['Settings were edited by the driver.'])
  }

  return <>
    <button className="button ghost back-link" onClick={close}><ArrowLeft size={16}/> My Garage</button>
    <PageHeading eyebrow={`F1 25 / V${setup.versions.length}`} title={setup.name} description={`${track?.name} · ${active.weather} · ${setup.draft.session}`}
      actions={<button className={`button secondary ${setup.favorite ? 'accent' : ''}`} aria-pressed={setup.favorite} onClick={() => saveMetadata({ favorite: !setup.favorite })}><Star size={17} fill={setup.favorite ? 'currentColor' : 'none'}/> {setup.favorite ? 'Favorited' : 'Favorite'}</button>}/>
    <div className="detail-tabs" aria-label="Setup views">{([['settings', 'Settings'], ['versions', 'Versions'], ['research', 'Research'], ['details', 'Details']] as const).map(([key, title]) =>
      <button className={view === key ? 'selected' : ''} aria-pressed={view === key} key={key} onClick={() => setView(key)}>{title}</button>)}</div>
    {view === 'settings' && <>
      <div className="detail-intro"><span className="eyebrow accent"><Flag size={14}/> {setup.result.confidence} confidence</span><div className="toolbar">
        <button className="button secondary" onClick={() => { setEditing(!editing); setValues({}) }}>{editing ? 'Cancel edit' : 'Edit settings'}</button>
        <button className="button primary" onClick={engineer}>Open engineer <ArrowRight size={16}/></button>
      </div></div>
      {editing ? <form onSubmit={saveManual} className="panel manual-edit">
        <div className="settings-grid">{groups.map(([group, keys]) => <section className="settings-group" key={group}><h3>{group}</h3>
          {keys.map((key) => <label key={key}>{ranges[key][0]}<input type="number" min={ranges[key][1]} max={ranges[key][2]} step={ranges[key][3]} required value={values[key] ?? active.values[key]} onChange={(event) => setValues({ ...values, [key]: event.target.value })}/></label>)}
        </section>)}</div>
        <button className="button primary" disabled={saving}>Save new version</button>
      </form> : <SettingsTable values={active.values}/>}
    </>}
    {view === 'research' && <EvidenceSummary result={setup.result}/>}
    {view === 'versions' && <section className="panel version-panel">
      <div className="panel-header"><h2>Version history</h2><span className="eyebrow accent">{setup.versions.length} saved</span></div>
      <ol className="version-list">{setup.versions.map((item, index) => <li key={item.id}><strong>V{index + 1} · {item.label}</strong><span>{item.weather} · {item.date.slice(0, 10)}</span></li>)}</ol>
      <ul className="reasons">{active.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      {previous && <>
        <label>Compare with active version<select value={previous.id} onChange={(event) => setSelection(event.target.value)}>
          {setup.versions.slice(0, -1).map((item, index) => <option key={item.id} value={item.id}>V{index + 1} · {item.label}</option>)}
        </select></label>
        <Differences before={previous.values} after={active.values}/>
        <button className="button secondary" disabled={saving} onClick={() => void apply(`Restored ${previous.label}`.slice(0, 150), previous.weather, previous.values, previous.reasons)}>Restore as new version</button>
      </>}
    </section>}
    {view === 'details' && <section className="panel form-panel">
      <div className="panel-header"><h2>Garage details</h2><span className="eyebrow accent">LOCAL AUTOSAVE</span></div>
      <label>Setup name<input defaultValue={setup.name} maxLength={150} onChange={(event) => {
        const name = event.target.value.trim()
        if (name) saveMetadata({ name })
      }} onBlur={(event) => {
        if (!event.target.value.trim()) { event.target.value = setup.name; report('A setup name is required.') }
      }}/></label>
      <div className="form-columns">
        <label>Folder<select value={setup.folderId ?? ''} onChange={(event) => saveMetadata({ folderId: event.target.value || null })}><option value="">Unfiled</option><FolderOptions folders={folders}/></select></label>
        <label>Tags (comma-separated)<input defaultValue={setup.tags.join(', ')} maxLength={2000} onChange={(event) => saveMetadata({ tags: [...new Set(event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))].slice(0, 100) })}/></label>
      </div>
      <label>Test notes<textarea defaultValue={setup.notes} maxLength={20000} rows={5} onChange={(event) => saveMetadata({ notes: event.target.value })}/></label>
      <div className="toolbar detail-toolbar">
        <button className="button secondary" onClick={() => void duplicate()}><Copy size={16}/> Duplicate</button>
        <button className="button secondary" onClick={() => saveMetadata({ archived: !setup.archived })}><Archive size={16}/> {setup.archived ? 'Unarchive' : 'Archive'}</button>
        <button className="button secondary" onClick={() => void downloadBackup(false, [setup]).catch(() => report('Export failed.'))}><Download size={16}/> Export JSON</button>
        <button className="button ghost danger" onClick={() => setConfirmDelete(!confirmDelete)}><Trash2 size={16}/> Delete</button>
      </div>
      {confirmDelete && <div className="confirm"><p>Delete this setup and all its versions from this device?</p><button className="button danger" onClick={() => void discard()}>Delete setup permanently</button><button className="button ghost" onClick={() => setConfirmDelete(false)}>Cancel</button></div>}
    </section>}
  </>
}
