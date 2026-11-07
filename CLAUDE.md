# MagiTap

A native-feeling iOS toy delivered as a PWA: users install it via Safari "Add to Home Screen".
React 18 + TypeScript + Vite 5 + vite-plugin-pwa. The toy lives in `src/App.tsx`.

## Commands

- `npm run dev` — dev server (also exposed on the LAN for testing on an iPhone)
- `npm run build` — `tsc -b` type-check, then `vite build` into `dist/` (includes `sw.js` + manifest)
- `npm run lint` — ESLint
- `npm run icons` — regenerate PNG icons from `public/icon.svg`

Run `npm run build` and `npm run lint` before considering a change done.

## iOS / native-feel rules

- Everything must fit one locked screen: no page scroll, no zoom, no text selection.
  Keep `touch-action: none` on interactive surfaces and handle pointer events yourself.
- Respect safe areas with the `--safe-top/right/bottom/left` CSS variables (`src/index.css`).
- Use the system font stack and 60fps CSS transforms/opacity for animation.
- iOS Safari has no Vibration API; don't rely on haptics.
- Asset URLs must work under a sub-path: GitHub Pages builds with `BASE_PATH=/MagiTap/`.
  Use relative imports or `import.meta.env.BASE_URL`, never hard-coded `/foo` paths in code.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds on Node 20 and deploys to GitHub Pages on push to `main`.

## Node 18 (deliberate)

Local Node is 18.15 and stays there by choice — don't propose upgrading or bump packages that need Node 20+.
To keep that working:
- Vite is pinned to v5 and vite-plugin-pwa to 0.21.
- `package.json` `overrides` pin two workbox-build deps: `glob` ^10 (glob 11's lru-cache needs Node 20)
  and `@rollup/plugin-terser` ^0.4 (1.x pulls serialize-javascript 7, which needs a global `crypto`).
When adding a dependency, check its `engines` and that `npm run build` still passes on Node 18.
