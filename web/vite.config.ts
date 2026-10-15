import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Kaynak haritaları yalnızca SENTRY_AUTH_TOKEN olan derlemede (Netlify canlı/test) üretilir,
// Sentry'ye yüklenir ve yayından önce silinir; böylece açık kaynak kodu sitede görünmez.
const uploadSourceMaps = Boolean(process.env.SENTRY_AUTH_TOKEN)

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: uploadSourceMaps ? 'hidden' : false,
  },
  plugins: [
    react(),
    // Ana ekrana eklenebilir web uygulaması. Service worker yalnızca üretim derlemesinde çalışır;
    // API ve socket istekleri başka origin'de olduğu için önbelleğe alınmaz.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'StudyLounge',
        short_name: 'StudyLounge',
        description: 'Ayrı masalarda, aynı lobide. Arkadaşlarınla birlikte odaklan.',
        lang: 'tr',
        start_url: '/app/lobbies',
        scope: '/',
        display: 'standalone',
        background_color: '#FBF5EC',
        theme_color: '#FBF5EC',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Ortam sesleri (onlarca MB) önbelleğe alınmaz, ağdan akar.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // pdf.js çalışanı büyük; uygulama kabuğuyla birlikte önbelleğe alınabilsin.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
    // Sentry: kaynak haritalarını yükler ve sürümü (Netlify commit kimliği) pakete ekler.
    // Token yoksa (geliştirme, CI, PR ön izlemesi) hiçbir şey yapmaz. Eklentiler listesinin sonunda olmalı.
    sentryVitePlugin({
      disable: !uploadSourceMaps,
      org: 'enes-ilbay',
      project: 'studylounge-web',
      url: 'https://de.sentry.io/',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: { name: process.env.COMMIT_REF },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
    }),
  ],
})
