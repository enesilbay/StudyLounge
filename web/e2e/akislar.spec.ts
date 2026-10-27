import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { authFile } from './global-setup'

/** Daha önce uçtan uca test edilmeyen akışlar: mağaza, ayarlar, DM, arkadaşlık, mobil üst çubuk, oda sayacı, ortam sesi. */
const ROOM = 'Demo: Sessiz Kütüphane'

async function signedIn(browser: Browser, username: string) {
  const context = await browser.newContext({ storageState: authFile(username) })
  return { context, page: await context.newPage() }
}

function token(username: string): string {
  const state = JSON.parse(readFileSync(authFile(username), 'utf8')) as { origins: { localStorage: { name: string; value: string }[] }[] }
  return state.origins[0].localStorage.find((entry) => entry.name === 'access_token')!.value
}

function apiBase(): string {
  if (process.env.VITE_BACKEND_URL) return process.env.VITE_BACKEND_URL
  try {
    const env = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    const match = env.match(/^VITE_BACKEND_URL=(.+)$/m)
    if (match) return match[1].trim()
  } catch {
    // .env yoksa varsayılan adres
  }
  return 'http://127.0.0.1:3000'
}

async function api<T = unknown>(username: string, method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token(username)}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, data: (text ? JSON.parse(text) : null) as T }
}

type Me = { id: number; email: string; coins: number }
const me = async (username: string) => (await api<{ user: Me }>(username, 'GET', '/users/me')).data.user

async function joinRoom(page: Page, room = ROOM) {
  await page.goto('/app/lobbies')
  await page.getByRole('listitem').filter({ hasText: room }).getByRole('button', { name: 'Katıl' }).click()
  await expect(page.getByRole('heading', { name: room })).toBeVisible()
}

test.describe('mağaza', () => {
  test.use({ storageState: authFile('demo_elif') })

  test('puanı yeten kullanıcı sahip olmadığı ürünü alır; puan düşer, ürün sahip görünür', async ({ page }) => {
    const before = await me('demo_elif')
    await page.goto('/app/shop')
    await expect(page.getByRole('heading', { name: 'Mağaza' }).first()).toBeVisible()

    // Her kategoride sırayla, alınabilir (sahip olunmayan, fiyatı olan, puanı yeten) ilk ürünü ara.
    let bought: { name: string; price: number } | null = null
    for (const category of ['Çerçeve', 'Kapak', 'Lamba', 'Balon']) {
      await page.getByRole('tab', { name: category }).click()
      const buttons = page.getByRole('button', { name: /puana satın al$/ })
      if ((await buttons.count()) === 0) continue
      const label = (await buttons.first().getAttribute('aria-label'))!
      const match = label.match(/^(.*): (\d+) puana satın al$/)!
      bought = { name: match[1], price: Number(match[2]) }
      await buttons.first().click()
      break
    }
    test.skip(!bought, 'Elif zaten tüm ürünlere sahip ya da puanı yetmiyor (seed yeniden çalıştırılmalı).')

    await expect(page.getByText(`${bought!.name} senin ve kuşanıldı.`)).toBeVisible()
    await expect(page.getByRole('button', { name: new RegExp(`^${bought!.name}: `) })).toHaveCount(0)
    await expect(page.getByText('Kuşanıldı').first()).toBeVisible()

    const after = await me('demo_elif')
    expect(after.coins).toBe(before.coins - bought!.price)
    // Sayfa yenilenince de puan düşük, ürün sende.
    await page.reload()
    await expect(page.getByText(String(after.coins), { exact: true }).first()).toBeVisible()
  })
})

test.describe('ayarlar', () => {
  test.use({ storageState: authFile('demo_ali') })

  test('yanlış mevcut şifreyle e-posta değişmez, hata görünür', async ({ page }) => {
    const original = (await me('demo_ali')).email
    await page.goto('/app/settings')
    const emailField = page.getByLabel('E-posta')
    await expect(emailField).toHaveValue(original)
    await emailField.fill('degistirilmis.ali@demo.studylounge')
    await page.getByLabel('Mevcut şifre').fill('YanlisSifre123')
    await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click()
    await expect(page.getByRole('alert').or(page.getByRole('status')).filter({ hasText: /şifre/i }).first()).toBeVisible()
    await expect(page).toHaveURL(/\/app\/settings/)

    await page.reload()
    await expect(page.getByLabel('E-posta')).toHaveValue(original)
    expect((await me('demo_ali')).email).toBe(original)
  })
})

test.describe('DM', () => {
  test('arkadaşlar mesajlaşır, alıcı gerçek zamanlı görür; 2000 karakterden uzun gönderilemez', async ({ browser }) => {
    const elif = await signedIn(browser, 'demo_elif')
    const ali = await signedIn(browser, 'demo_ali')
    try {
      const [elifId, aliId] = [(await me('demo_elif')).id, (await me('demo_ali')).id]
      await elif.page.goto(`/app/dm?with=${aliId}`)
      await ali.page.goto(`/app/dm?with=${elifId}`)
      const aliInput = ali.page.getByRole('textbox', { name: 'Mesaj' })
      const elifInput = elif.page.getByRole('textbox', { name: 'Mesaj' })
      await expect(elifInput).toBeVisible()
      await expect(aliInput).toBeVisible()

      const text = `DM testi ${Date.now()}`
      await elifInput.fill(text)
      await elif.page.getByRole('button', { name: 'Gönder' }).click()
      await expect(elif.page.getByRole('log', { name: 'Mesajlar' }).getByText(text)).toBeVisible()
      await expect(ali.page.getByRole('log', { name: 'Mesajlar' }).getByText(text)).toBeVisible()

      // Yazarken 2000 karakterde durur.
      await elifInput.fill('')
      await elifInput.pressSequentially('a'.repeat(2005))
      expect((await elifInput.inputValue()).length).toBeLessThanOrEqual(2000)

      // Giriş sınırı programatik olarak aşılsa bile (2001 karakter) mesaj gönderilmez, karşıda görünmez.
      const long = `ASIRI${'b'.repeat(1995)}x`
      expect(long.length).toBe(2001)
      await elifInput.evaluate((input: HTMLInputElement, value) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }, long)
      expect((await elifInput.inputValue()).length).toBe(2001)
      await elif.page.getByRole('button', { name: 'Gönder' }).click()
      await expect(elif.page.getByText(/2000 karakter/).first()).toBeVisible()
      await elif.page.waitForTimeout(1000)
      await expect(ali.page.getByRole('log', { name: 'Mesajlar' }).getByText(/^ASIRIb{10}/)).toHaveCount(0)
    } finally {
      await elif.context.close()
      await ali.context.close()
    }
  })
})

test.describe('arkadaşlık', () => {
  test('istek gerçek zamanlı gelir, kabul edilir, sonunda arkadaşlıktan çıkarılır', async ({ browser }) => {
    const zeynep = await signedIn(browser, 'demo_zeynep')
    const ali = await signedIn(browser, 'demo_ali')
    try {
      const [zeynepId, aliId] = [(await me('demo_zeynep')).id, (await me('demo_ali')).id]
      // Önceki yarım kalmış koşuya karşı temizlik (arkadaş değillerse 4xx dönmesi sorun değil).
      await api('demo_zeynep', 'DELETE', `/users/friends/${aliId}`)
      const pending = (await api<{ id: number; sender?: { username?: string } }[]>('demo_ali', 'GET', `/users/friend-requests/${aliId}`)).data ?? []
      for (const request of Array.isArray(pending) ? pending : []) {
        if (request.sender?.username === 'demo_zeynep') await api('demo_ali', 'POST', '/users/respond-request', { requestId: request.id, status: 'rejected' })
      }

      // Ali dinlemede: sayfayı yenilemeden istek düşmeli.
      await ali.page.goto('/app/dm')
      await expect(ali.page.getByRole('tab', { name: /İstekler/ })).toBeVisible()

      await zeynep.page.goto(`/app/u/${aliId}`)
      await zeynep.page.getByRole('button', { name: 'Arkadaş ekle' }).click()
      await expect(zeynep.page.getByRole('button', { name: 'İstek gönderildi' })).toBeVisible()

      await expect(ali.page.getByRole('tab', { name: /İstekler.*1/ })).toBeVisible({ timeout: 10_000 })
      await ali.page.getByRole('tab', { name: /İstekler/ }).click()
      await expect(ali.page.getByText('@demo_zeynep · seni eklemek istiyor')).toBeVisible()
      await ali.page.getByRole('button', { name: 'Kabul et' }).click()

      // Zeynep'in profilinde arkadaşlık görünür.
      await zeynep.page.reload()
      await expect(zeynep.page.getByRole('button', { name: 'Arkadaşlıktan çıkar' })).toBeVisible()

      // Eski hale getir.
      await ali.page.goto(`/app/u/${zeynepId}`)
      await ali.page.getByRole('button', { name: 'Arkadaşlıktan çıkar' }).click()
      await ali.page.getByRole('dialog').getByRole('button', { name: 'Arkadaşlıktan çıkar' }).click()
      await expect(ali.page.getByRole('button', { name: 'Arkadaş ekle' })).toBeVisible()
    } finally {
      await api('demo_ali', 'DELETE', `/users/friends/${(await me('demo_zeynep')).id}`)
      await zeynep.context.close()
      await ali.context.close()
    }
  })
})

test.describe('mobil üst çubuk', () => {
  test.use({ storageState: authFile('demo_admin') })
  for (const width of [375, 320]) {
    test(`${width} px genişlikte tüm düğmeler görünür alanda`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/app/lobbies')
      const header = page.getByRole('banner').first()
      await expect(header).toBeVisible()
      const items = header.locator('a:visible, button:visible')
      expect(await items.count()).toBeGreaterThan(2)
      const boxes = await items.evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect()
          return { name: node.getAttribute('aria-label') ?? node.textContent ?? '', left: rect.left, right: rect.right }
        }),
      )
      for (const box of boxes) {
        expect(box.right, `${box.name} sağ kenarı`).toBeLessThanOrEqual(width)
        expect(box.left, `${box.name} sol kenarı`).toBeGreaterThanOrEqual(0)
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    })
  }
})

test.describe('oda', () => {
  test('odadan ayrılınca kişi sayısı düşer', async ({ browser }) => {
    const zeynep = await signedIn(browser, 'demo_zeynep')
    try {
      const count = async () => {
        const lobbies = (await api<{ name: string; memberCount?: number }[]>('demo_zeynep', 'GET', '/lobbies')).data
        return lobbies.find((lobby) => lobby.name === ROOM)?.memberCount ?? 0
      }
      const base = await count()
      await joinRoom(zeynep.page)
      await expect.poll(count).toBe(base + 1)
      await zeynep.page.getByRole('button', { name: 'Odadan çık' }).click()
      await expect(zeynep.page).toHaveURL(/\/app\/lobbies/)
      await expect.poll(count, { timeout: 15_000 }).toBe(base)

      // Listede de düşük görünür.
      await zeynep.page.reload()
      const card = zeynep.page.getByRole('listitem').filter({ hasText: ROOM })
      await expect(card).toBeVisible()
      if (base === 0) await expect(card.getByText('Boş')).toBeVisible()
      else await expect(card.getByText(new RegExp(`${base}/\\d+ kişi`)).first()).toBeVisible()
    } finally {
      await zeynep.context.close()
    }
  })

  test('odaya girince ortam sesi dosyaları indirilmez', async ({ browser }) => {
    const elif = await signedIn(browser, 'demo_elif')
    try {
      const mp3: string[] = []
      elif.page.on('request', (request) => {
        // Geliştirme sunucusunun `?import` istekleri yalnızca adres dizgisi döndüren modüllerdir; ses verisi değildir.
        if (/\.mp3(\?(?!import)|$)/.test(request.url())) mp3.push(request.url())
      })
      await joinRoom(elif.page)
      await elif.page.waitForTimeout(3000)
      expect(mp3).toEqual([])
    } finally {
      await elif.context.close()
    }
  })
})
