import wasmAsset from '@wllama/wllama/esm/single-thread/wllama.wasm?url'

const weightsUrl = 'https://huggingface.co/lmstudio-community/SmolLM2-135M-Instruct-GGUF/resolve/04f7f8a05a8e4bc208e88d11e8c9122be36c2f9b/SmolLM2-135M-Instruct-Q4_K_M.gguf'
const weightsBytes = 105_454_144
const runtimeBytes = 2_775_862
export const modelName = 'SmolLM2 135M'
export const modelDownloadMiB = Math.ceil((weightsBytes + runtimeBytes) / 1048576)

const modelIntents = ['STABILITY', 'ROTATION', 'TRACTION', 'GRIP', 'BRAKING', 'WET', 'EXPLAIN', 'UNKNOWN'] as const
const intentGrammar = 'root ::= ' + modelIntents.map((label) => JSON.stringify(label)).join(' | ')


const cacheName = () => `hellafast-model:${new URL('.', document.baseURI)}:smollm2-q4-v1`
const modelKey = () => new URL('./local-smollm2-weights.gguf', document.baseURI).href
const runtimeKey = () => new URL(wasmAsset, document.baseURI).href

export function modelSupported() {
  return typeof WebAssembly === 'object' && typeof Worker === 'function' && typeof caches === 'object'
}

export async function modelInstalled() {
  if (!modelSupported() || !(await caches.has(cacheName()))) return false
  const cache = await caches.open(cacheName())
  const [weights, runtime] = await Promise.all([cache.match(modelKey()), cache.match(runtimeKey())])
  return !!weights && !!runtime && Number(weights.headers.get('content-length')) === weightsBytes
}

export async function downloadModel(signal: AbortSignal, onProgress: (value: number) => void) {
  if (!modelSupported()) throw new Error('This browser does not expose WebAssembly and private cache storage.')
  const detail = await navigator.storage?.estimate().catch(() => undefined)
  if (detail?.quota && detail.usage !== undefined && detail.quota - detail.usage < weightsBytes + runtimeBytes) {
    throw new Error('The browser has insufficient space for the local model.')
  }
  const cache = await caches.open(cacheName())
  let transferIssue: string | undefined
  try {
    const runtime = await fetch(runtimeKey(), { signal, credentials: 'omit' })
    if (!runtime.ok) throw new Error('The bundled inference runtime could not be downloaded.')
    const wasm = await runtime.arrayBuffer()
    if (wasm.byteLength !== runtimeBytes) throw new Error('The inference runtime is incomplete.')
    await cache.put(runtimeKey(), new Response(wasm, { headers: { 'content-type': 'application/wasm' } }))
    const response = await fetch(weightsUrl, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok || !response.body) throw new Error('The model host did not return the model file.')
    const reader = response.body.getReader()
    let loaded = 0
    let lastPercent = 0
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
          if (loaded !== weightsBytes) {
            transferIssue = 'The model download is incomplete.'
            throw new Error(transferIssue)
          }
          controller.close()
          return
        }
        loaded += value.byteLength
        if (loaded > weightsBytes) {
          transferIssue = 'The model download is larger than expected.'
          throw new Error(transferIssue)
        }
        controller.enqueue(value)
        const percent = Math.floor(loaded / weightsBytes * 100)
        if (percent !== lastPercent) {
          lastPercent = percent
          onProgress(percent)
        }
      },
      cancel(reason) { return reader.cancel(reason) },
    })
    await cache.put(modelKey(), new Response(body, {
      headers: { 'content-type': 'application/octet-stream', 'content-length': String(weightsBytes) },
    }))
  } catch (error) {
    await caches.delete(cacheName()).catch(() => {})
    if (transferIssue) throw new Error(transferIssue)
    throw error
  }
}

export async function removeModel() {
  if (modelSupported()) await caches.delete(cacheName())
}

export async function interpretRequest(question: string, context: string, signal: AbortSignal) {
  if (!(await modelInstalled())) throw new Error('The model is missing from local storage.')
  const cache = await caches.open(cacheName())
  const [weights, runtime] = await Promise.all([cache.match(modelKey()), cache.match(runtimeKey())])
  if (!weights || !runtime) throw new Error('The local model was removed.')
  const { Wllama } = await import('@wllama/wllama')
  const [model, wasm] = await Promise.all([weights.blob(), runtime.blob()])
  signal.throwIfAborted()
  const url = URL.createObjectURL(wasm)
  const quiet = () => {}
  const engine = new Wllama({ 'single-thread/wllama.wasm': url }, {
    suppressNativeLog: true, logger: { debug: quiet, log: quiet, warn: quiet, error: quiet },
  })
  try {
    await engine.loadModel([model], { n_ctx: 1024, n_threads: 1, n_batch: 64, seed: 42 })
    signal.throwIfAborted()
    const prompt = [
      'Classify an F1 game setup request. Pick exactly one label.',
      'STABILITY: rear stepping out or oversteer.',
      'ROTATION: turn-in or corner entry.',
      'TRACTION: wheelspin, poor drive from a slow corner.',
      'GRIP: front grip or mid-corner understeer.',
      'BRAKING: brakes lock up or the car is unstable while slowing.',
      'WET: rain setup.',
      'EXPLAIN: asks why a setting was chosen.',
      'UNKNOWN: anything else.',
    ].join(' ')
    const result = await engine.createChatCompletion([
      { role: 'system', content: prompt },
      { role: 'user', content: 'I lock a wheel when I slow down.' },
      { role: 'assistant', content: 'BRAKING' },
      { role: 'user', content: 'The back slides as I enter turns.' },
      { role: 'assistant', content: 'STABILITY' },
      { role: 'user', content: 'I spin the tyres when I get back on power.' },
      { role: 'assistant', content: 'TRACTION' },
      { role: 'user', content: `Setup context: ${context}. Request: ${question.slice(0, 600)}` },
    ], { nPredict: 8, abortSignal: signal, sampling: { temp: 0, grammar: intentGrammar } })
    return modelIntents.find((intent) => intent === result.trim()) ?? 'UNKNOWN'
  } finally {
    await engine.exit().catch(() => {})
    URL.revokeObjectURL(url)
  }
}
