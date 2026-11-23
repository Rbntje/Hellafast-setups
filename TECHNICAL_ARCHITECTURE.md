# Technical architecture

React and TypeScript implement the UI. Vite uses a relative base for GitHub project Pages and the Capacitor WebView. A service worker installs an explicit list of build assets and uses versioned caches. The WebView already contains those assets with the native bundle. Capacitor is a packaging path and the iOS project and signing have their own verification requirements.

Dexie wraps IndexedDB. An append-only setup history keeps confirmed adjustments and restores reversible. Library records and profile preferences are local. A short-lived local edit journal recovers writes that were still in progress when a tab reloaded. JSON backup import validates full records before a transaction and retains existing records with matching IDs.

A module worker handles the evidence and calculation pipeline. Local racing rules work without a model. The working baseline is an original engineering estimate bounded by the community-corroborated F1 25 schema in RESEARCH_SOURCES.md. Evidence with unknown session, patch or car context reduces confidence and is never treated as an exact match. The optional public GET uses a fixed URL without private inputs, credentials or a referrer. No application state is sent to public sources.

## Local model options

| Runtime | Rationale | Validation needed |
| --- | --- | --- |
| WebLLM | Worker-friendly WebGPU runtime geared toward local chat | Model cache eviction, compilation time and sustained iPhone memory use |
| Transformers.js | WebGPU and WASM options for small instruction models or classification | Operator coverage, cold start and WASM token speed |
| ONNX Runtime Web | Lower-level WebGPU/WASM execution with explicit model control | Quantized model compatibility and runtime-specific support |
| Native Core ML | Native route for on-device models via a Capacitor bridge | Model conversion, supported devices, signing and hardware benchmarks |

Safari 26 ships WebGPU. A browser capability check does not establish model compatibility or available memory. Device testing must include initial download, storage pressure, token throughput and recovery after a worker crash. The preview uses a pinned 4-bit SmolLM2 135M GGUF model and a single-threaded wllama WASM worker. This avoids WebGPU and cross-origin-isolation requirements for GitHub Pages. The download is opt-in and provides progress and cancellation. Cache Storage holds the model weights and runtime separately from the offline app shell. Inference reads only the local cache. The language model classifies a bounded request, the engineering rules build the proposal, and the user confirms any change. The small model can misclassify requests and remains experimental. Native, WebGPU and Transformers.js device measurements remain part of the follow-up work.

GitHub Actions builds, tests and publishes static assets. Repository Pages must use the GitHub Actions source. No backend is required.
