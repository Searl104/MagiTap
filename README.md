# MagiTap

A little tap toy for iPhone that feels like a native app. It's a web app (PWA) you
install with Safari's **Share → Add to Home Screen**. It then launches full screen,
with its own icon, and works offline.

Built with React, TypeScript, Vite and [vite-plugin-pwa](https://vite-pwa-org.netlify.app).

## Getting started

```bash
npm install
npm run dev
```

The dev server listens on your LAN too, so you can open the `Network:` URL it prints
on your iPhone (same Wi-Fi) to try it. Over plain `http` on the LAN, the offline
service worker won't run; use the deployed HTTPS site for the full installed experience.

## Installing on iPhone

1. Open the deployed site (see below) in Safari.
2. Tap **Share → Add to Home Screen**.
3. Launch MagiTap from the home screen icon.

## Deploying

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on every push to `main`.
One-time setup: in the repo on GitHub, go to **Settings → Pages** and set **Source** to
**GitHub Actions**. The site is then at `https://searl104.github.io/MagiTap/`.

## Scripts

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Dev server with hot reload (also on your LAN)    |
| `npm run build`   | Type-check and build to `dist/`                  |
| `npm run preview` | Serve the production build locally               |
| `npm run lint`    | Run ESLint                                       |
| `npm run icons`   | Regenerate PNG icons from `public/icon.svg`      |

## What makes it feel native

- `index.html`: `apple-mobile-web-app-*` tags, `viewport-fit=cover`, no pinch zoom.
- `src/index.css`: locked page (no rubber-band scroll), no text selection, long-press
  callouts or tap flashes; `--safe-*` variables for the notch and home indicator.
- `vite.config.ts`: web manifest (`display: standalone`, portrait) and an offline service worker.

## Project layout

```
index.html            HTML entry + iOS meta tags
src/main.tsx          React entry
src/App.tsx           The toy (currently a placeholder spark burst)
src/index.css         App-wide native-feel resets
public/icon.svg       Source app icon; PNGs are generated from it
pwa-assets.config.ts  Icon generator config
```
