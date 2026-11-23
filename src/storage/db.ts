import Dexie from 'dexie'
import type { EntityTable } from 'dexie'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { circuits, concerns, defaultDriver, defaults, feedbackOutcomes, feedbackTopics, phases, schemaVersion, settings, validSetting, validSettings } from '../features/setup'
import type { Draft, Driver, Evidence, Feedback, Result, Settings } from '../features/setup'
import { sourceUrl } from '../features/research'

export type Version = { id: string; date: string; label: string; weather: Draft['weather']; values: Settings; reasons: string[]; feedback?: Feedback[] }
export type Setup = {
  id: string; name: string; created: string; updated: string; favorite: boolean; archived: boolean
  folderId: string | null; tags: string[]; notes: string; draft: Draft; driver: Driver; result: Result; versions: Version[]
}
export type Folder = { id: string; name: string; parentId: string | null }
export type Preferences = { id: string; driver: Driver; draft: Draft; quizStep: number; imports: Evidence[]; ignition: boolean }
export type ChatEntry = { id: string; setupId: string; text: string; answer: string; date: string; method?: 'model' | 'model-fallback' }

export const initialPreferences: Preferences = {
  id: 'local', driver: defaultDriver, draft: defaults, quizStep: 0, imports: [], ignition: true,
}

export class LocalDatabase extends Dexie {
  setups!: EntityTable<Setup, 'id'>
  folders!: EntityTable<Folder, 'id'>
  preferences!: EntityTable<Preferences, 'id'>
  chat!: EntityTable<ChatEntry, 'id'>

  constructor(name = 'hellafast-setups') {
    super(name)
    this.version(1).stores({
      setups: 'id, updated, folderId, draft.circuit',
      folders: 'id, parentId',
      preferences: 'id',
      chat: 'id, setupId, date',
    })
  }
}
export const db = new LocalDatabase()

export async function savePreferences(patch: Partial<Omit<Preferences, 'id'>>, database = db) {
  return database.transaction('rw', database.preferences, async () => {
    const stored = await database.preferences.get('local')
    await database.preferences.put({ ...initialPreferences, ...stored, ...patch })
  })
}

export function version(label: string, weather: Draft['weather'], values: Settings, reasons: string[]): Version {
  if (!validSettings(values)) throw new Error('Correct the settings before saving this version.')
  return { id: crypto.randomUUID(), date: new Date().toISOString(), label, weather, values, reasons }
}

export function newSetup(draft: Draft, driver: Driver, result: Result): Setup {
  const country = circuits.find((track) => track.id === draft.circuit)?.country ?? draft.circuit
  const date = new Date().toISOString()
  return {
    id: crypto.randomUUID(), name: `${country} · ${draft.weather} ${draft.session.toLowerCase()}`,
    created: date, updated: date, favorite: false, archived: false, tags: [], notes: '', folderId: null,
    draft, driver, result, versions: [version('Initial setup', draft.weather, result.values, result.reasons)],
  }
}

export async function appendVersion(id: string, expectedVersion: string, next: Version, database = db) {
  return database.transaction('rw', database.setups, async () => {
    const setup = await database.setups.get(id)
    if (!setup) throw new Error('This setup is no longer in your garage.')
    if (setup.versions.at(-1)?.id !== expectedVersion) throw new Error('A newer version exists. Reopen the setup and try again.')
    await database.setups.put({ ...setup, updated: next.date, versions: [...setup.versions, next] })
  })
}

export async function addFeedback(id: string, expectedVersion: string, feedback: Feedback, database = db) {
  return database.transaction('rw', database.setups, async () => {
    const setup = await database.setups.get(id)
    const current = setup?.versions.at(-1)
    if (!setup || !current || current.id !== expectedVersion) throw new Error('The active version changed. Reopen it before saving feedback.')
    if ((current.feedback?.length ?? 0) >= 300) throw new Error('This version has reached its feedback limit.')
    const updated = { ...current, feedback: [...(current.feedback ?? []), feedback] }
    await database.setups.put({ ...setup, updated: feedback.date, versions: [...setup.versions.slice(0, -1), updated] })
  })
}

export async function updateSetup(id: string, changes: Partial<Pick<Setup, 'name' | 'favorite' | 'archived' | 'notes' | 'tags' | 'folderId'>>, database = db) {
  const count = await database.setups.update(id, { ...changes, updated: new Date().toISOString() })
  if (!count) throw new Error('This setup is no longer in your garage.')
}

type Backup = { format: 'hellafast-backup'; version: 1; setups: Setup[]; folders: Folder[]; preferences?: Preferences; chat?: ChatEntry[] }

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, limit = 20000): value is string => typeof value === 'string' && value.length <= limit
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[\w-]{1,100}$/.test(value)
const date = (value: unknown) => text(value, 50) && Number.isFinite(Date.parse(value))
const strings = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every((item: unknown) => text(item))
const weather = (value: unknown) => value === 'Dry' || value === 'Wet'

function validDraft(value: unknown) {
  const row = record(value)
  return circuits.some((circuit) => circuit.id === row.circuit) && weather(row.weather)
    && ['Race', 'Qualifying', 'Time trial'].includes(String(row.session))
    && ['Stable', 'Balanced', 'Responsive'].includes(String(row.style))
    && concerns.some((item) => item === row.concern) && phases.some((item) => item === row.phase)
    && typeof row.online === 'boolean'
}
function validDriver(value: unknown) {
  const row = record(value)
  return Object.keys(defaultDriver).every((key) => typeof row[key] === 'number' && Number.isInteger(row[key]) && row[key] >= 1 && row[key] <= 5)
}
function validEvidence(value: unknown) {
  const row = record(value)
  try {
    if (typeof row.url !== 'string' || sourceUrl(row.url) !== row.url) return false
  } catch {
    return false
  }
  return row.game === 'F1 25' && date(row.accessedAt)
    && ['Official', 'Community aggregate', 'User-provided'].includes(String(row.kind))
    && ['name', 'patch', 'car', 'track', 'weather', 'session', 'note'].every((key) => text(row[key]))
    && (row.publication === undefined || date(row.publication))
    && !!row.values && typeof row.values === 'object' && !Array.isArray(row.values)
    && Object.entries(record(row.values)).every(([key, val]) => settings.some((setting) => key === setting && validSetting(setting, val)))
}
function evidenceList(value: unknown) {
  return Array.isArray(value) && value.length <= 100 && value.every(validEvidence)
}
function validFeedback(value: unknown) {
  const row = record(value)
  return identifier(row.id) && date(row.date) && Object.keys(feedbackTopics).includes(String(row.topic))
    && feedbackOutcomes.some((item) => item === row.outcome) && text(row.notes, 500)
}
function validVersion(value: unknown) {
  const row = record(value)
  return identifier(row.id) && date(row.date) && text(row.label, 150) && weather(row.weather)
    && validSettings(row.values) && strings(row.reasons)
    && (row.feedback === undefined || (Array.isArray(row.feedback) && row.feedback.length <= 300 && row.feedback.every(validFeedback)))
}
function validSetup(value: unknown) {
  const row = record(value), result = record(row.result)
  return identifier(row.id) && text(row.name, 150) && !!row.name.trim() && date(row.created) && date(row.updated)
    && typeof row.favorite === 'boolean' && typeof row.archived === 'boolean'
    && (row.folderId === null || identifier(row.folderId)) && strings(row.tags) && text(row.notes)
    && validDraft(row.draft) && validDriver(row.driver) && result.schema === schemaVersion
    && evidenceList(result.evidence) && validSettings(result.values) && strings(result.reasons)
    && ['Experimental', 'Moderate'].includes(String(result.confidence)) && text(result.researchNote)
    && Array.isArray(row.versions) && row.versions.length > 0 && row.versions.length <= 2000
    && row.versions.every(validVersion) && new Set(row.versions.map((item) => record(item).id)).size === row.versions.length
}

export function decodeBackup(input: string): Backup {
  const backup = record(JSON.parse(input))
  if (backup.format !== 'hellafast-backup' || backup.version !== 1
    || !Array.isArray(backup.setups) || backup.setups.length > 20000 || !backup.setups.every(validSetup)
    || !Array.isArray(backup.folders) || backup.folders.length > 20000) throw new Error('This HELLAFAST backup is invalid or unsupported.')
  const folders = new Map<string, string | null>()
  for (const item of backup.folders) {
    const folder = record(item)
    if (!identifier(folder.id) || !text(folder.name, 150) || !folder.name.trim() || folders.has(folder.id)
      || (folder.parentId !== null && !identifier(folder.parentId))) throw new Error('The backup contains an invalid folder.')
    folders.set(folder.id, folder.parentId)
  }
  for (const key of folders.keys()) {
    const seen = new Set([key])
    let parent = folders.get(key)
    while (parent) {
      if (!folders.has(parent) || seen.has(parent)) throw new Error('The backup contains a broken folder hierarchy.')
      seen.add(parent)
      parent = folders.get(parent)
    }
  }
  if (new Set(backup.setups.map((item) => record(item).id)).size !== backup.setups.length) throw new Error('The backup repeats a setup ID.')
  if (backup.setups.some((item) => {
    const parent = record(item).folderId
    return typeof parent === 'string' && !folders.has(parent)
  })) throw new Error('The backup contains a setup with a missing folder.')
  if (backup.preferences !== undefined) {
    const pref = record(backup.preferences)
    if (pref.id !== 'local' || !validDriver(pref.driver) || !validDraft(pref.draft) || typeof pref.ignition !== 'boolean'
      || typeof pref.quizStep !== 'number' || ![0, 1, 2, 3].includes(pref.quizStep) || !evidenceList(pref.imports)) {
      throw new Error('The backup contains invalid preferences.')
    }
  }
  if (backup.chat !== undefined && (!Array.isArray(backup.chat) || backup.chat.length > 20000 || !backup.chat.every((item: unknown) => {
    const row = record(item)
    return identifier(row.id) && identifier(row.setupId) && text(row.text) && text(row.answer) && date(row.date) && (row.method === undefined || row.method === 'model' || row.method === 'model-fallback')
  }))) throw new Error('The backup contains invalid engineer messages.')
  return backup as unknown as Backup
}

export function readBackupBytes(bytes: Uint8Array) {
  const limit = 24 * 1024 * 1024
  if (bytes.length > limit) throw new Error('The backup exceeds 24 MB.')
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const unpacked = unzipSync(bytes, { filter: (file) => file.name === 'hellafast.json' && file.originalSize <= limit })
    if (!unpacked['hellafast.json'] || unpacked['hellafast.json'].length > limit) throw new Error('The ZIP must contain a HELLAFAST backup under 24 MB.')
    return decodeBackup(strFromU8(unpacked['hellafast.json']))
  }
  return decodeBackup(strFromU8(bytes))
}

export async function importBackup(backup: Backup, database = db) {
  return database.transaction('rw', database.setups, database.folders, database.preferences, database.chat, async () => {
    const [ids, folderIds, chatIds, preferences] = await Promise.all([
      database.setups.toCollection().primaryKeys(), database.folders.toCollection().primaryKeys(),
      database.chat.toCollection().primaryKeys(), database.preferences.get('local'),
    ])
    const known = new Set(ids), knownFolders = new Set(folderIds), knownChat = new Set(chatIds)
    const setups = backup.setups.filter((row) => !known.has(row.id))
    const newFolders = backup.folders.filter((row) => !knownFolders.has(row.id))
    const allFolders = new Map((await database.folders.toArray()).concat(newFolders).map((folder) => [folder.id, folder.parentId]))
    for (const folder of newFolders) {
      const seen = new Set([folder.id])
      let parent = folder.parentId
      while (parent) {
        if (seen.has(parent) || !allFolders.has(parent)) throw new Error('Imported folders conflict with your existing hierarchy.')
        seen.add(parent)
        parent = allFolders.get(parent) ?? null
      }
    }
    await database.folders.bulkAdd(newFolders)
    await database.setups.bulkAdd(setups)
    if (backup.preferences && !preferences) await database.preferences.add(backup.preferences)
    const setupIds = new Set([...ids, ...setups.map((item) => item.id)])
    const messages = new Map((backup.chat ?? []).filter((item) => !knownChat.has(item.id) && setupIds.has(item.setupId)).map((item) => [item.id, item]))
    await database.chat.bulkAdd([...messages.values()])
    return { added: setups.length, duplicates: backup.setups.length - setups.length, restoredProfile: !!backup.preferences && !preferences }
  })
}

export async function makeBackup(selection?: Setup[], selectedFolders: Set<string> = new Set()) {
  return db.transaction('r', db.setups, db.folders, db.preferences, db.chat, async () => {
    const [setups, allFolders, preferences, chat] = await Promise.all([
      selection ?? db.setups.toArray(), db.folders.toArray(), db.preferences.get('local'), db.chat.toArray(),
    ])
    const folderMap = new Map(allFolders.map((item) => [item.id, item]))
    const folderIds = new Set<string>()
    for (const selected of [...selectedFolders, ...setups.map((setup) => setup.folderId)]) {
      let id = selected
      while (id && !folderIds.has(id)) {
        folderIds.add(id)
        id = folderMap.get(id)?.parentId ?? null
      }
    }
    return {
      format: 'hellafast-backup', version: 1, setups,
      folders: selection ? allFolders.filter((folder) => folderIds.has(folder.id)) : allFolders,
      preferences: selection ? undefined : preferences,
      chat: selection ? undefined : chat,
    } satisfies Backup
  })
}

export async function downloadBackup(zip: boolean, selection?: Setup[], folders?: Set<string>) {
  const text = JSON.stringify(await makeBackup(selection, folders), null, 2)
  const bytes = zip ? zipSync({ 'hellafast.json': strToU8(text) }) : strToU8(text)
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: zip ? 'application/zip' : 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `hellafast-${selection ? 'setups' : 'backup'}.${zip ? 'zip' : 'json'}`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
