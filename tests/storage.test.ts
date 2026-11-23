import 'fake-indexeddb/auto'
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createSetup, defaultDriver, defaults } from '../src/features/setup'
import { appendVersion, decodeBackup, importBackup, LocalDatabase, newSetup, readBackupBytes, savePreferences, updateSetup, version } from '../src/storage/db'

let database: LocalDatabase
const sample = () => newSetup(defaults, defaultDriver, createSetup(defaults, defaultDriver, [], 'Local baseline.'))

beforeEach(() => { database = new LocalDatabase(crypto.randomUUID()) })
afterEach(async () => { await database.delete() })

it('persists concurrent quiz/preferences updates without dropping other fields', async () => {
  await Promise.all([
    savePreferences({ quizStep: 2 }, database),
    savePreferences({ driver: { ...defaultDriver, traction: 5 } }, database),
  ])
  expect(await database.preferences.get('local')).toMatchObject({ quizStep: 2, driver: { traction: 5 } })
})

it('appends versions transactionally and rejects stale concurrent writes', async () => {
  const setup = sample()
  await database.setups.add(setup)
  const original = setup.versions[0]
  const adjustment = version('More grip', 'Dry', { ...original.values, frontWing: original.values.frontWing + 1 }, [])
  const restore = version('Restored initial', 'Dry', original.values, original.reasons)
  await appendVersion(setup.id, original.id, adjustment, database)
  await expect(appendVersion(setup.id, original.id, restore, database)).rejects.toThrow(/newer version/)
  await appendVersion(setup.id, adjustment.id, restore, database)
  await updateSetup(setup.id, { notes: 'Race test' }, database)
  expect(await database.setups.get(setup.id)).toMatchObject({ versions: [original, adjustment, restore], notes: 'Race test' })
})

it('restores a nested folder and setup from a ZIP without overwriting duplicates', async () => {
  const root = { id: 'root-folder', name: 'F1 25', parentId: null }
  const child = { id: 'child-folder', name: 'Bahrain', parentId: root.id }
  const setup = { ...sample(), folderId: child.id }
  const json = JSON.stringify({ format: 'hellafast-backup', version: 1, setups: [setup], folders: [root, child] })
  const payload = readBackupBytes(zipSync({ 'hellafast.json': strToU8(json) }))
  expect(await importBackup(payload, database)).toMatchObject({ added: 1, duplicates: 0 })
  await updateSetup(setup.id, { name: 'Keep current name' }, database)
  expect(await importBackup(payload, database)).toMatchObject({ added: 0, duplicates: 1 })
  expect(await database.setups.get(setup.id)).toMatchObject({ folderId: child.id, name: 'Keep current name' })
  expect(await database.folders.get(child.id)).toEqual(child)
})

it('rejects broken hierarchy and invalid setup values before importing', () => {
  const sampleSetup = sample()
  const invalid = { ...sampleSetup, versions: [{ ...sampleSetup.versions[0], values: { ...sampleSetup.versions[0].values, frontWing: 100 } }] }
  expect(() => decodeBackup(JSON.stringify({ format: 'hellafast-backup', version: 1, setups: [invalid], folders: [] }))).toThrow()
  const loop = [{ id: 'a', name: 'a', parentId: 'b' }, { id: 'b', name: 'b', parentId: 'a' }]
  expect(() => decodeBackup(JSON.stringify({ format: 'hellafast-backup', version: 1, setups: [], folders: loop }))).toThrow(/hierarchy/)
})
