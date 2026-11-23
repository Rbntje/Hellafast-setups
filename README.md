# HELLAFAST SETUPS

Find Your Line. Build Your Setup. Chase Perfection.

HELLAFAST is an original, local-first F1 25 setup workshop designed for iPhone. The preview includes a guided quiz, a deterministic engineering worker, 24 base-game circuit profiles, a private garage, a version-aware engineer, Driver DNA, and offline use after the first successful cache installation. The base-game estimates are experimental and should be checked in-game.

## Develop

Use Node.js 24.

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

Run production browser checks against a GitHub Pages-style project URL.

```sh
npx playwright install chromium
npm run test:e2e
```

To use a locally installed Chromium, set `HELLAFAST_CHROMIUM` to its executable path.

## GitHub Pages

In **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The deployment workflow runs on pushes to `main` and can also be run manually under **Actions → Deploy HELLAFAST to Pages**. It checks TypeScript, lint, unit tests and browser tests before deploying `dist`. Vite uses relative asset paths and the app uses hash-based navigation so reloads work on project URLs.

The app is installable from Safari using **Share → Add to Home Screen**. Open it once while online and check **Profile → Offline shell** before relying on it without a connection.

## Capacitor

The iOS project targets iOS 26. To refresh the native assets and open the project on macOS with Xcode 26 and iOS tooling installed, run:

```sh
npm run build
npx cap sync ios
npx cap open ios
```

Use an Apple signing team to build for a physical device. The native bundle uses its packaged assets and stores personal data in the local WebView. Capacitor sync can run on Linux. Building, signing and physical iPhone validation require Apple tooling.

## Project notes

- [Product specification](PRODUCT_SPEC.md) and [technical architecture](TECHNICAL_ARCHITECTURE.md)
- [Design system](DESIGN_SYSTEM.md) and [research sources](RESEARCH_SOURCES.md)
- [Roadmap](DEVELOPMENT_ROADMAP.md), [status](PROJECT_STATUS.md), [work remaining](TODO.md), [changelog](CHANGELOG.md) and [test results](TEST_RESULTS.md)

HELLAFAST is independent of EA and Formula 1.
