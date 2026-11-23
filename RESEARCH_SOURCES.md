# Research sources

Sources were checked on 2026-11-23. Settings from different cars, patches, conditions and session types need individual compatibility checks.

| Source | Observed evidence |
| --- | --- |
| [EA F1 25](https://www.ea.com/games/f1/f1-25/news) | Official release and patch index |
| [EA Season Pack launch](https://www.ea.com/games/f1/f1-25/news/f1-25-2026-season-pack-launch) | Official 2026 content announcement, published 2026-06-03 |
| [EA patch 1.27](https://www.ea.com/games/f1/f1-25/news/f1-25-2026-season-pack-patch-notes-v127) | Official 2026 Season Pack notes, published 2026-11-13. The 2025 schema cannot establish 2026 slider parity |
| [Iderion setup model](https://github.com/Iderion/setupcalculator/blob/main/setupcalculator-backend/database/setup_model.json) | Community min/max/increments for the 20 setup parameters. The exact patch and car applicability are unspecified |
| [F1Laps-derived published aggregate](https://github.com/gborges0727/f1-setups/blob/main/data/f1-25.json) | Observed settings corroborate the schema boundaries. Aggregate medians may contain half steps. The public raw GitHub endpoint returned CORS wildcard headers. This is one source family, with unknown individual patch/car provenance |
| [F1Laps Bahrain](https://www.f1laps.com/f1-25/setups/bahrain/meta/) | Upstream source linked by the aggregate. Direct access returned 403 in the development environment |
| [Formula 1 calendar](https://www.formula1.com/en/racing/2025) | 24 official real-world track lengths checked on the individual 2025 event pages |
| [Steam Community F1 25](https://steamcommunity.com/app/3059520/guides/) | Accessible guide index. Individual setups require verification |
| [Apple iOS 26 updates](https://support.apple.com/en-us/123075) | Official iOS 26 update history |
| [Apple iOS 26 compatibility announcement](https://www.apple.com/newsroom/2025/06/apple-elevates-the-iphone-experience-with-ios-26/) | Apple lists iPhone 11 and later for the software update. Model capability still depends on the browser adapter and runtime |
| [Safari 26](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) | WebGPU support and WebKit changes |
| [WebLLM](https://webllm.mlc.ai/docs/) · [Transformers.js](https://huggingface.co/docs/transformers.js/index) · [ONNX Web](https://onnxruntime.ai/docs/tutorials/web/) | Runtime options for measured device benchmarking |
| [wllama](https://github.com/ngxson/wllama) · [SmolLM2 GGUF](https://huggingface.co/lmstudio-community/SmolLM2-135M-Instruct-GGUF) | Pinned Q4_K_M weighs 105,454,144 bytes. The selected single-threaded WASM runtime is 2,775,862 bytes. Model weights are downloaded after consent |
| [GitHub Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) | Static deployment and required permissions |

SimGrid, OverTake, RaceDepartment and Reddit are candidates. F1GameSetup, SimRacingSetup and Traxion returned 403 on attempted URLs. The preview processes one browser-readable community aggregate and supports user-provided evidence. Only distinct source URLs count separately. Source availability, relevance, compatibility and confidence are separate fields. Community ranges and fallback engineering recommendations require real-game verification before they can be extended to other configurations.
