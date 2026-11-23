export const schemaVersion = 'f1-25-base/community-1' as const

type Range = readonly [label: string, min: number, max: number, step: number, unit?: string]

export const ranges = {
  frontWing: ['Front wing', 0, 50, 1],
  rearWing: ['Rear wing', 0, 50, 1],
  diffOn: ['On-throttle differential', 10, 100, 5, '%'],
  diffOff: ['Off-throttle differential', 10, 100, 5, '%'],
  frontCamber: ['Front camber', -3.5, -2.5, 0.1, '°'],
  rearCamber: ['Rear camber', -2, -1, 0.1, '°'],
  frontToe: ['Front toe', 0, 0.2, 0.01, '°'],
  rearToe: ['Rear toe', 0.1, 0.25, 0.01, '°'],
  frontSprings: ['Front suspension', 1, 41, 1],
  rearSprings: ['Rear suspension', 1, 41, 1],
  frontArb: ['Front anti-roll bar', 1, 21, 1],
  rearArb: ['Rear anti-roll bar', 1, 21, 1],
  frontHeight: ['Front ride height', 15, 35, 1],
  rearHeight: ['Rear ride height', 40, 60, 1],
  brakePressure: ['Brake pressure', 80, 100, 1, '%'],
  brakeBias: ['Front brake bias', 50, 70, 1, '%'],
  frontLeft: ['Front left pressure', 22.5, 29.5, 0.1, ' psi'],
  frontRight: ['Front right pressure', 22.5, 29.5, 0.1, ' psi'],
  rearLeft: ['Rear left pressure', 20.5, 26.5, 0.1, ' psi'],
  rearRight: ['Rear right pressure', 20.5, 26.5, 0.1, ' psi'],
} satisfies Record<string, Range>

export type Setting = keyof typeof ranges
export type Settings = Record<Setting, number>
export const settings = Object.keys(ranges) as Setting[]

export const groups: [string, Setting[]][] = [
  ['Aerodynamics', ['frontWing', 'rearWing']],
  ['Transmission', ['diffOn', 'diffOff']],
  ['Suspension geometry', ['frontCamber', 'rearCamber', 'frontToe', 'rearToe']],
  ['Suspension', ['frontSprings', 'rearSprings', 'frontArb', 'rearArb', 'frontHeight', 'rearHeight']],
  ['Brakes', ['brakePressure', 'brakeBias']],
  ['Tyres', ['frontLeft', 'frontRight', 'rearLeft', 'rearRight']],
]

const circuit = (id: string, name: string, country: string, aero: number, traction: boolean, kerbs: boolean) =>
  ({ id, name, country, aero, traction, kerbs })

// Aero preference, traction and kerb flags are engineering estimates.
export const circuits = [
  circuit('bahrain', 'Bahrain International Circuit', 'Bahrain', 27, true, true),
  circuit('australia', 'Albert Park Circuit', 'Australia', 26, false, true),
  circuit('china', 'Shanghai International Circuit', 'China', 30, true, false),
  circuit('japan', 'Suzuka Circuit', 'Japan', 34, false, true),
  circuit('saudi_arabia', 'Jeddah Corniche Circuit', 'Saudi Arabia', 22, false, false),
  circuit('miami', 'Miami International Autodrome', 'United States', 27, true, true),
  circuit('imola', 'Autodromo Enzo e Dino Ferrari', 'Italy', 29, true, true),
  circuit('monaco', 'Circuit de Monaco', 'Monaco', 47, true, true),
  circuit('spain', 'Circuit de Barcelona-Catalunya', 'Spain', 34, false, true),
  circuit('canada', 'Circuit Gilles Villeneuve', 'Canada', 25, true, true),
  circuit('austria', 'Red Bull Ring', 'Austria', 25, true, true),
  circuit('silverstone', 'Silverstone Circuit', 'United Kingdom', 32, false, true),
  circuit('spa', 'Circuit de Spa-Francorchamps', 'Belgium', 23, false, true),
  circuit('hungary', 'Hungaroring', 'Hungary', 41, true, true),
  circuit('netherlands', 'Circuit Zandvoort', 'Netherlands', 42, true, false),
  circuit('monza', 'Autodromo Nazionale Monza', 'Italy', 12, true, true),
  circuit('azerbaijan', 'Baku City Circuit', 'Azerbaijan', 18, true, true),
  circuit('singapore', 'Marina Bay Street Circuit', 'Singapore', 43, true, true),
  circuit('usa', 'Circuit of the Americas', 'United States', 34, true, true),
  circuit('mexico', 'Autódromo Hermanos Rodríguez', 'Mexico', 35, true, true),
  circuit('brazil', 'Autódromo José Carlos Pace', 'Brazil', 30, true, true),
  circuit('las_vegas', 'Las Vegas Strip Circuit', 'United States', 18, true, true),
  circuit('qatar', 'Lusail International Circuit', 'Qatar', 35, false, true),
  circuit('abudhabi', 'Yas Marina Circuit', 'United Arab Emirates', 30, true, true),
]

export const traits = {
  response: 'Front-end response', stability: 'Rear stability', rotation: 'Rotation',
  traction: 'Exit traction', braking: 'Braking stability', oversteer: 'Oversteer tolerance',
  understeer: 'Understeer tolerance', aggression: 'Driving aggression', risk: 'Risk tolerance',
  qualifying: 'Qualifying priority',
} as const
export type Driver = Record<keyof typeof traits, number>
export const defaultDriver: Driver = {
  response: 3, stability: 3, rotation: 3, traction: 3, braking: 3,
  oversteer: 3, understeer: 3, aggression: 3, risk: 3, qualifying: 3,
}

export const concerns = ['Balanced', 'Understeer', 'Rear instability', 'Poor traction'] as const
export const phases = ['Corner entry', 'Mid-corner', 'Corner exit', 'High-speed corners', 'Low-speed corners'] as const
export type Draft = {
  circuit: string
  weather: 'Dry' | 'Wet'
  session: 'Race' | 'Qualifying' | 'Time trial'
  style: 'Stable' | 'Balanced' | 'Responsive'
  concern: (typeof concerns)[number]
  phase: (typeof phases)[number]
  online: boolean
}
export const defaults: Draft = {
  circuit: 'bahrain', weather: 'Dry', session: 'Race', style: 'Balanced',
  concern: 'Balanced', phase: 'Corner entry', online: true,
}

export type Evidence = {
  name: string; url: string; accessedAt: string; kind: 'Official' | 'Community aggregate' | 'User-provided'
  game: 'F1 25'; patch: string; car: string; track: string; weather: string; session: string
  note: string; values: Partial<Settings>; publication?: string
}
export type Result = {
  schema: typeof schemaVersion
  values: Settings
  reasons: string[]
  evidence: Evidence[]
  confidence: 'Moderate' | 'Experimental'
  researchNote: string
}

export function clampSetting(key: Setting, value: number): number {
  const [, min, max, step] = ranges[key]
  return Number(Math.max(min, Math.min(max, min + Math.round((value - min) / step) * step)).toFixed(2))
}

export function validSetting(key: Setting, value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(clampSetting(key, value) - value) < 1e-8
}

export function validSettings(value: unknown): value is Settings {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<Setting, unknown>
  return settings.every((key) => validSetting(key, row[key]))
}

export function formatSetting(key: Setting, value: number): string {
  const [, , , step, unit] = ranges[key] as Range
  return value.toFixed(step >= 1 ? 0 : step === 0.1 ? 1 : 2) + (unit ?? '')
}

export function compare(before: Settings, after: Settings) {
  return settings.map((key) => ({ key, before: before[key], after: after[key], delta: Number((after[key] - before[key]).toFixed(2)) }))
}

export function createSetup(input: Draft, driver: Driver, evidence: Evidence[], researchNote: string): Result {
  const track = circuits.find((item) => item.id === input.circuit)
  if (!track) throw new Error('Choose a supported circuit.')
  const wet = input.weather === 'Wet'
  const race = input.session === 'Race'
  const aero = track.aero + (wet ? 4 : 0)
  const style = input.style === 'Stable' ? -1 : input.style === 'Responsive' ? 1 : 0
  const responsiveness = style + (driver.response + driver.rotation + driver.oversteer - driver.stability - driver.understeer - 3) / 5
  const values: Settings = {
    frontWing: aero, rearWing: aero - (wet ? 0 : 3), diffOn: track.traction || wet ? 45 : 60,
    diffOff: wet ? 55 : 45, frontCamber: wet ? -3.2 : -3.4, rearCamber: wet ? -1.7 : -1.9,
    frontToe: 0.04, rearToe: wet ? 0.15 : 0.12, frontSprings: wet ? 26 : 34, rearSprings: wet ? 9 : 12,
    frontArb: 9, rearArb: wet ? 6 : 9, frontHeight: track.kerbs ? 24 : 21, rearHeight: track.kerbs ? 49 : 45,
    brakePressure: wet ? 95 : 100, brakeBias: wet ? 56 : 55, frontLeft: 25, frontRight: 25, rearLeft: 21.4, rearRight: 21.4,
  }
  const reasons = [
    `${track.name} starts at an estimated aero level of ${track.aero} for F1 25.`,
    wet ? 'Wet conditions add wing, soften the springs, and reduce the on-throttle lock for progressive power delivery.'
      : 'Dry conditions use a firmer platform. The differential reflects the circuit’s traction demands.',
  ]
  const relevant = evidence.filter((item) => item.kind !== 'Official' && item.track === input.circuit
    && item.weather === input.weather && (item.session === 'Unknown' || item.session === input.session))
  const exact = relevant.filter((item) => item.session === input.session && item.car === 'Generic F1 25' && item.patch !== 'Unknown')
  for (const key of settings) {
    const samples = relevant.map((item) => item.values[key]).filter((value): value is number => value !== undefined)
    if (samples.length) {
      samples.sort((left, right) => left - right)
      const middle = Math.floor(samples.length / 2)
      const median = samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2
      values[key] = values[key] * 0.75 + median * 0.25
    }
  }
  if (relevant.length) reasons.push('Matching public and imported values contribute 25% to covered starting settings. Their median reduces the influence of outliers.')
  values.frontWing += 2 * responsiveness
  values.rearWing -= responsiveness
  values.rearArb += 2 * responsiveness
  values.diffOn -= 5 * (driver.traction - 3)
  values.brakeBias += driver.braking - 3
  values.brakePressure += driver.aggression - 3
  values.diffOff -= 5 * (driver.risk - 3)
  if (race) {
    values.rearArb -= 1
    values.rearWing += 2
    reasons.push('Race trim adds a rear stability margin and softens lateral response.')
  } else {
    values.frontWing += 1 + (driver.qualifying - 3) / 2
    reasons.push('Short-run trim puts more emphasis on front response.')
  }
  reasons.push(`The confirmed ${input.style.toLowerCase()} balance and Driver DNA tune the wing split, braking and differential.`)
  const concerns = input.concern === 'Understeer'
    ? (input.phase === 'Corner entry' ? 'rotation' : input.phase === 'Corner exit' ? 'traction' : 'front grip')
    : input.concern === 'Rear instability' ? 'rear stability' : input.concern === 'Poor traction' ? 'traction' : null
  if (concerns) {
    const adjustment = propose(concerns, values)
    if (adjustment) {
      Object.assign(values, adjustment.values)
      reasons.push(...adjustment.reasons)
    }
  }
  for (const key of settings) values[key] = clampSetting(key, values[key])
  if (!validSettings(values)) throw new Error('The setup could not be validated.')
  return { schema: schemaVersion, values, reasons, evidence, researchNote, confidence: exact.length >= 2 ? 'Moderate' : 'Experimental' }
}

export const requests = [
  { match: /wet|rain/i, label: 'Wet adaptation', change: { frontWing: 3, rearWing: 5, diffOn: -15, rearSprings: -3, rearHeight: 2 }, reason: 'More downforce and a softer rear platform aim for more progressive grip in the wet.' },
  { match: /rear.*stab|stab.*rear|oversteer/i, label: 'Rear stability', change: { rearWing: 3, rearArb: -2, rearToe: 0.02 }, reason: 'More rear wing, softer rear roll stiffness and additional rear toe prioritize rear stability.' },
  { match: /traction|hairpin|wheelspin/i, label: 'Exit traction', change: { diffOn: -10, rearSprings: -3 }, reason: 'Lower on-throttle lock and softer rear springs can make slow-corner power delivery more progressive.' },
  { match: /rotation|turn.in|entry/i, label: 'Entry rotation', change: { diffOff: -10, frontWing: 2 }, reason: 'Lower off-throttle lock and more front wing aim to help the car turn under a lift.' },
  { match: /front grip|understeer|front end/i, label: 'Front grip', change: { frontWing: 2, frontArb: -1 }, reason: 'Additional front wing and slightly softer front roll stiffness target more front grip.' },
  { match: /brak/i, label: 'Braking stability', change: { brakeBias: 1, brakePressure: -2 }, reason: 'A little more front bias and less peak pressure aim to reduce rear locking when braking.' },
] satisfies { match: RegExp; label: string; change: Partial<Settings>; reason: string }[]

export function propose(message: string, current: Settings) {
  const rule = requests.find((item) => item.match.test(message))
  if (!rule) return null
  const values = { ...current }
  for (const key of Object.keys(rule.change) as Setting[]) {
    values[key] = clampSetting(key, current[key] + (rule.change[key as keyof typeof rule.change] ?? 0))
  }
  return { label: rule.label, values, reasons: [rule.reason], wet: rule.label === 'Wet adaptation' }
}
