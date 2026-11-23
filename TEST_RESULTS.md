# Test results

## 2026-11-23

- TypeScript and ESLint passed for the React/TypeScript project.
- Vitest covered range boundaries and steps, circuit/weather/session combinations, quiz and driver inputs, source parsing and fallback, transactional version history, backup validation and duplicate-safe import.
- Chromium production checks ran against the project subpath at desktop and compact phone viewport sizes. They exercised navigation, quiz persistence, generation, offline reload and generation, engineer version changes, folder assignment, autosave, backup import and the public research worker.
- Desktop and compact Chromium layouts were reviewed visually. The pinned upstream source returned HTTP 200 and CORS wildcard headers from the shell. This Chromium environment rejected its TLS chain, and the app used its local fallback. The public lookup success path is exercised with a controlled CORS response.
- Capacitor iOS scaffolding and asset sync completed on Linux. Xcode and physical iOS hardware were unavailable.
