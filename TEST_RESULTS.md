# Test results

## 2026-11-23

- TypeScript, ESLint and the production Vite build passed.
- All 14 Vitest checks passed. They covered setting boundaries and steps, circuit/weather/session combinations, quiz and Driver DNA inputs, source parsing and fallback, transactional version history, feedback, backup validation and duplicate-safe import.
- All 10 browser checks passed. Desktop and compact Chromium checks on a project subpath exercised navigation, quiz recovery after immediate reload, setup generation, offline reload and generation, engineer edits, feedback-driven versions, folder assignment, autosave, backup import, download consent and rejection of a partial model file.
- A controlled CORS response verified the public research worker and its GET without private context. The pinned upstream dataset responded with HTTP 200 and CORS wildcard headers from the shell. The local Chromium environment rejected its TLS chain, and the app used its local fallback.
- A standalone Chromium experiment installed the real pinned 105,454,144-byte model through controlled local delivery. After switching offline and reloading, the WASM request interpretation took about 31 seconds for a braking request in the local environment. The model showed uncertainty and the rules correctly proposed a braking adjustment. Removing the model offline succeeded. These measurements describe this environment only.
- Compact and desktop displays were reviewed visually. Capacitor iOS scaffolding and asset sync completed on Linux. Xcode and physical iPhone hardware were unavailable.
