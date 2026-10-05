import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// `npm run generate-pwa-assets`: public/favicon.svg'den PWA ikonlarını (PNG) üretir.
// Maskeli ikonun dolgusu index.html'deki theme-color (krem zemin) ile aynıdır.
const background = '#FBF5EC'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
})
