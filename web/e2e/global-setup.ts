import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FullConfig } from '@playwright/test'

/**
 * Demo hesaplar test başında bir kez API'den giriş yapar ve oturumları kaydedilir.
 * Testler bu oturumlarla başlar; böylece giriş istek sınırına (dakikada 10) takılmazlar.
 */
export const DEMO_USERS = ['demo_elif', 'demo_zeynep', 'demo_ali', 'demo_admin'] as const
export const PASSWORD = process.env.SEED_PASSWORD ?? 'Demo12345!'

const here = dirname(fileURLToPath(import.meta.url))
export const authFile = (username: string) => join(here, '.auth', `${username}.json`)

/** Web'in kullandığı backend adresi: ortam değişkeni ya da web/.env (VITE_BACKEND_URL). */
function backendUrl() {
  if (process.env.VITE_BACKEND_URL) return process.env.VITE_BACKEND_URL
  try {
    const env = readFileSync(join(here, '..', '.env'), 'utf8')
    const match = env.match(/^VITE_BACKEND_URL=(.+)$/m)
    if (match) return match[1].trim()
  } catch {
    // .env yoksa varsayılan adres kullanılır.
  }
  return 'http://127.0.0.1:3000'
}

export default async function globalSetup(config: FullConfig) {
  const origin = new URL(config.projects[0].use.baseURL ?? 'http://localhost:5173').origin
  const api = backendUrl()
  mkdirSync(join(here, '.auth'), { recursive: true })

  for (const username of DEMO_USERS) {
    const response = await fetch(`${api}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${username}@demo.studylounge`, password: PASSWORD }),
    })
    const body = (await response.json()) as { access_token?: string; user?: unknown; message?: string }
    if (!body.access_token) {
      throw new Error(`${username} giriş yapamadı (${response.status}: ${body.message ?? 'bilinmeyen hata'}). Önce backend'de "npm run seed" çalıştır.`)
    }
    // Web, oturumu localStorage'da tutar (authStore).
    writeFileSync(
      authFile(username),
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin,
            localStorage: [
              { name: 'access_token', value: body.access_token },
              { name: 'user_data', value: JSON.stringify(body.user) },
            ],
          },
        ],
      }),
    )
  }
}
