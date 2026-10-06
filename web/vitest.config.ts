import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Testler PWA eklentisi olmadan çalışır (service worker yalnızca üretim derlemesinde gerekir).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
