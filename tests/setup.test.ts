import { describe, expect, it, vi } from 'vitest'
import { circuits, clampSetting, compare, createSetup, defaultDriver, defaults, propose, ranges, settings, validSetting, validSettings } from '../src/features/setup'
import { parseCommunity, parseManual, research, searchTerms } from '../src/features/research'

describe('setup engineering', () => {
  it('produces game-step values for all selectable tracks, conditions and styles', () => {
    for (const circuit of circuits) {
      for (const weather of ['Dry', 'Wet'] as const) {
        for (const session of ['Race', 'Time trial', 'Qualifying'] as const) {
          for (const style of ['Balanced', 'Stable', 'Responsive'] as const) {
            const result = createSetup({ ...defaults, circuit: circuit.id, weather, session, style }, defaultDriver, [], '')
            expect(Object.keys(result.values)).toHaveLength(20)
            expect(validSettings(result.values)).toBe(true)
          }
        }
      }
    }
  })
  it('changes the result based on confirmed preferences and Driver DNA', () => {
    const baseline = createSetup(defaults, defaultDriver, [], '').values
    const responsive = createSetup({ ...defaults, style: 'Responsive' }, { ...defaultDriver, traction: 5, braking: 5 }, [], '').values
    expect(responsive.frontWing).toBeGreaterThan(baseline.frontWing)
    expect(responsive.diffOn).toBeLessThan(baseline.diffOn)
    expect(responsive.brakeBias).toBeGreaterThan(baseline.brakeBias)
  })
  it('adapts to turn phase', () => {
    const entry = createSetup({ ...defaults, concern: 'Understeer', phase: 'Corner entry' }, defaultDriver, [], '').values
    const exit = createSetup({ ...defaults, concern: 'Understeer', phase: 'Corner exit' }, defaultDriver, [], '').values
    expect(entry.diffOff).toBeLessThan(exit.diffOff)
    expect(exit.diffOn).toBeLessThan(entry.diffOn)
  })
  it('rounds to the declared steps, including fractional and negative values', () => {
    for (const key of settings) {
      const [, min, max, step] = ranges[key]
      expect(clampSetting(key, min - 100)).toBe(min)
      expect(clampSetting(key, max + 100)).toBe(max)
      expect(validSetting(key, min + step / 2)).toBe(false)
    }
    expect(clampSetting('rearCamber', -1.76)).toBe(-1.8)
    expect(validSetting('rearCamber', Number.NaN)).toBe(false)
  })
  it('proposes and compares actual changes without mutating the original', () => {
    const { values } = createSetup(defaults, defaultDriver, [], '')
    const result = propose('make the rear more stable', values)!
    expect(result.values.rearWing).toBeGreaterThan(values.rearWing)
    expect(compare(values, result.values).find((row) => row.key === 'rearWing')?.delta).toBe(3)
    expect(propose('how are you', values)).toBeNull()
  })
})

describe('research', () => {
  const raw = { game: 'f1-25', tracks: [{ id: 'bahrain', dry: {
    'Front Wing': '35', 'Rear Wing': '60', 'Rear Suspension': '3.50', 'Rear Camber': '-1.80°', 'Brake Pressure': '100%',
  } }] }
  it('parses selected conditions and excludes out-of-range, half-step or mismatching data', () => {
    const evidence = parseCommunity(raw, defaults, '2026-11-23')
    expect(evidence?.values).toEqual({ frontWing: 35, rearCamber: -1.8, brakePressure: 100 })
    expect(evidence?.patch).toBe('Unknown')
    expect(parseCommunity(raw, { ...defaults, weather: 'Wet' }, '2026-11-23')).toBeNull()
    expect(searchTerms(defaults, 'Bahrain')).toBe('F1 25 Bahrain dry race setup')
  })
  it('uses published values as low-confidence supporting evidence', () => {
    const evidence = parseCommunity(raw, defaults, '2026-11-23')!
    const baseline = createSetup(defaults, defaultDriver, [], '')
    const adjusted = createSetup(defaults, defaultDriver, [evidence], '')
    expect(adjusted.values.frontWing).toBeGreaterThan(baseline.values.frontWing)
    expect(adjusted.confidence).toBe('Experimental')
  })
  it('validates manual evidence and prevents non-HTTPS source links', () => {
    expect(parseManual('Guide', 'https://example.org/#setup', '{"frontWing":30}', defaults).url).toBe('https://example.org/')
    expect(() => parseManual('Guide', 'javascript:alert(1)', '{"frontWing":30}', defaults)).toThrow()
    expect(() => parseManual('Guide', 'https://example.org/', '{"diffOn":53}', defaults)).toThrow()
  })
  it('separates external lookup from local context and degrades on an unavailable source', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network error'))
    expect((await research(defaults, [], fetcher)).note).toMatch(/could not be reached/)
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }))
    const noNetwork = vi.fn<typeof fetch>()
    await research({ ...defaults, online: false }, [], noNetwork)
    expect(noNetwork).not.toHaveBeenCalled()
  })
})
