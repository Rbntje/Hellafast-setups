import { settings, validSetting } from './setup'
import type { Draft, Evidence, Setting, Settings } from './setup'

const publicDataset = 'https://raw.githubusercontent.com/gborges0727/f1-setups/f83caf2d240a88821101eb04ddcf97b729f9ca3e/data/f1-25.json'
const labels = [
  'Front Wing', 'Rear Wing', 'Differential On Throttle', 'Differential Off Throttle',
  'Front Camber', 'Rear Camber', 'Front Toe', 'Rear Toe', 'Front Suspension', 'Rear Suspension',
  'Front Anti-Roll Bar', 'Rear Anti-Roll Bar', 'Front Ride Height', 'Rear Ride Height', 'Brake Pressure',
  'Front Brake Bias', 'Front Left Tyre Pressure', 'Front Right Tyre Pressure', 'Rear Left Tyre Pressure', 'Rear Right Tyre Pressure',
]

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

export function parseCommunity(raw: unknown, draft: Draft, now: string): Evidence | null {
  const source = object(raw)
  if (source.game !== 'f1-25' || !Array.isArray(source.tracks)) return null
  const track = source.tracks.map(object).find((item) => item.id === draft.circuit)
  if (!track) return null
  const table = object(track[draft.weather.toLowerCase()])
  const values: Partial<Settings> = {}
  settings.forEach((key, index) => {
    const text = table[labels[index]]
    if (typeof text !== 'string' || !/^-?\d+(\.\d+)?\s*(%|°|psi)?$/i.test(text)) return
    const value = Number.parseFloat(text)
    if (validSetting(key, value)) values[key] = value
  })
  if (!Object.keys(values).length) return null
  return {
    name: 'F1Laps community aggregate via gborges0727', url: publicDataset, accessedAt: now,
    kind: 'Community aggregate', game: 'F1 25', patch: 'Unknown', car: 'Unknown',
    track: draft.circuit, weather: draft.weather, session: 'Unknown', values,
    note: 'Matches track and weather. The individual patch, car and session are unknown. Between-step medians were excluded.',
  }
}

export function sourceUrl(value: string) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Use a public HTTPS source URL.')
  url.hash = ''
  return url.href
}

export function parseManual(label: string, link: string, raw: string, draft: Draft): Evidence {
  if (!label.trim()) throw new Error('Enter the source name.')
  const input = object(JSON.parse(raw))
  const values: Partial<Settings> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!(settings as string[]).includes(key) || !validSetting(key as Setting, value)) {
      throw new Error(`Invalid setting or step for "${key}".`)
    }
    values[key as Setting] = value
  }
  if (!Object.keys(values).length) throw new Error('Include at least one valid setting.')
  return {
    name: label.trim(), url: sourceUrl(link), accessedAt: new Date().toISOString(),
    kind: 'User-provided', game: 'F1 25', patch: 'Unknown', car: 'Unknown',
    track: draft.circuit, weather: draft.weather, session: draft.session, values,
    note: 'Provided by the driver for these conditions. Patch and car have not been independently verified.',
  }
}

export function searchTerms(draft: Draft, trackName: string) {
  return `F1 25 ${trackName} ${draft.weather.toLowerCase()} ${draft.session.toLowerCase()} setup`
}

export async function research(draft: Draft, imports: Evidence[], fetchPublic: typeof fetch = fetch) {
  const now = new Date().toISOString()
  const relevant = imports.filter((source) => source.track === draft.circuit && source.weather === draft.weather && source.session === draft.session)
  const items: Evidence[] = [{
    name: 'EA SPORTS F1 25 news and patch index', url: 'https://www.ea.com/games/f1/f1-25/news',
    accessedAt: '2026-11-23', kind: 'Official', game: 'F1 25', patch: 'Multiple',
    car: 'Base game', track: draft.circuit, weather: 'All', session: 'All', values: {},
    note: 'Reviewed during development. Identifies the game and version history. It does not provide setup values.',
  }, ...relevant]
  let note = 'Public lookup is off. The local engineering baseline and any matching imported settings are available.'
  if (draft.online) {
    try {
      const response = await fetchPublic(publicDataset, {
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(6000),
      })
      if (!response.ok) throw new Error(String(response.status))
      const source = parseCommunity(await response.json(), draft, now)
      if (source) items.push(source)
      note = source
        ? 'One public community aggregate matched this track and weather. Patch, car and session remain unverified.'
        : 'The public dataset returned no compatible values for these conditions. The local baseline is available.'
    } catch {
      note = 'The public dataset could not be reached. The local engineering baseline and any imported settings were used.'
    }
  }
  const unique = new Map<string, Evidence>()
  for (const item of items) unique.set(item.url, item)
  return { evidence: [...unique.values()], note }
}
