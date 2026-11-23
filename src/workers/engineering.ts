import { research } from '../features/research'
import { circuits, createSetup } from '../features/setup'
import type { Draft, Driver, Evidence, Result } from '../features/setup'

export type EngineeringInput = { draft: Draft; driver: Driver; imports: Evidence[] }
export type EngineeringUpdate =
  | { stage: string }
  | { result: Result }
  | { error: string }

const worker = self
const send = (update: EngineeringUpdate) => worker.postMessage(update)

worker.onmessage = async ({ data }: MessageEvent<EngineeringInput>) => {
  try {
    const circuit = circuits.find((item) => item.id === data.draft.circuit)
    if (!circuit) throw new Error('This circuit is unavailable.')
    send({ stage: `Reviewing ${circuit.name} and confirmed preferences` })
    send({ stage: data.draft.online ? 'Looking up public setup evidence' : 'Checking locally supplied evidence' })
    const { evidence, note } = await research(data.draft, data.imports)
    send({ stage: 'Calculating and validating all 20 settings' })
    send({ result: createSetup(data.draft, data.driver, evidence, note) })
  } catch (error) {
    send({ error: error instanceof Error ? error.message : 'The setup could not be calculated.' })
  }
}
