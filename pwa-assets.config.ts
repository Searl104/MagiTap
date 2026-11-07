import { defineConfig } from '@vite-pwa/assets-generator/config'

// Generates the PWA / Apple touch icons from public/icon.svg.
// The SVG is full-bleed (background included), so no padding is added.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    transparent: { sizes: [64, 192, 512], favicons: [[48, 'favicon.ico']], padding: 0 },
    maskable: { sizes: [512], padding: 0 },
    apple: { sizes: [180], padding: 0 },
  },
  images: ['public/icon.svg'],
})
