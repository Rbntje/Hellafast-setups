import { db, savePreferences, updateSetup } from './db'
import type { Preferences, Setup } from './db'

type QuizPatch = Partial<Pick<Preferences, 'draft' | 'quizStep' | 'imports'>>
type SetupPatch = Partial<Pick<Setup, 'name' | 'favorite' | 'archived' | 'notes' | 'tags' | 'folderId'>>
type Edit =
  | { revision: string; kind: 'quiz'; changes: QuizPatch }
  | { revision: string; kind: 'setup'; id: string; changes: SetupPatch }

const key = 'hellafast-pending-edits-v1'

function journal(): Record<string, Edit> {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Edit> : {}
  } catch { return {} }
}

function write(entries: Record<string, Edit>) {
  try {
    if (Object.keys(entries).length) localStorage.setItem(key, JSON.stringify(entries))
    else localStorage.removeItem(key)
  } catch {
    // IndexedDB is still used when synchronous storage is unavailable.
  }
}

async function flush(scope: string, edit: Edit) {
  if (edit.kind === 'quiz') await savePreferences(edit.changes)
  else if (await db.setups.get(edit.id)) await updateSetup(edit.id, edit.changes)
  const entries = journal()
  if (entries[scope]?.revision === edit.revision) {
    delete entries[scope]
    write(entries)
  }
}

export function persistQuiz(changes: QuizPatch) {
  const entries = journal()
  const previous = entries.quiz
  const edit: Edit = {
    revision: crypto.randomUUID(), kind: 'quiz',
    changes: { ...previous?.changes, ...changes },
  }
  write({ ...entries, quiz: edit })
  return flush('quiz', edit)
}

export function persistSetupDetails(id: string, changes: SetupPatch) {
  const scope = `setup:${id}`
  const entries = journal()
  const edit: Edit = {
    revision: crypto.randomUUID(), kind: 'setup', id,
    changes: { ...entries[scope]?.changes, ...changes },
  }
  write({ ...entries, [scope]: edit })
  return flush(scope, edit)
}

export async function recoverEdits() {
  const outcomes = await Promise.allSettled(Object.entries(journal()).map(([scope, edit]) => flush(scope, edit)))
  if (outcomes.some((outcome) => outcome.status === 'rejected')) throw new Error('A queued edit could not be recovered.')

}
