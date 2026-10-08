import { expect, test } from '@playwright/test'
import type { Browser, Page } from '@playwright/test'
import { PASSWORD, authFile } from './global-setup'

/** backend/src/seed.ts ile oluşturulan demo hesaplar ve odalar. */
const email = (username: string) => `${username}@demo.studylounge`
const ROOM = 'Demo: Sessiz Kütüphane'

async function openRoom(page: Page) {
  await page.goto('/app/lobbies')
  const card = page.getByRole('listitem').filter({ hasText: ROOM })
  await card.getByRole('button', { name: 'Katıl' }).click()
  await expect(page.getByRole('heading', { name: ROOM })).toBeVisible()
  // Odaya katılınca kendi masan listede görünür.
  await expect(page.getByRole('article').first()).toBeVisible()
}

/** Kayıtlı oturumla ayrı bir tarayıcı bağlamı (iki kişilik testler için). */
async function signedIn(browser: Browser, username: string) {
  const context = await browser.newContext({ storageState: authFile(username) })
  return { context, page: await context.newPage() }
}

// Giriş testleri gerçek formu kullanır; diğerleri global-setup'ın kaydettiği oturumla başlar.
test.describe('giriş', () => {
  test('yanlış şifrede hata gösterir', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('textbox', { name: 'E-posta' }).fill(email('demo_elif'))
    await page.getByRole('textbox', { name: 'Şifre' }).fill('yanlis-sifre')
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    await expect(page.getByRole('alert')).toContainText('Hatalı e-posta veya şifre')
    await expect(page).toHaveURL(/\/auth/)
  })

  test('demo hesapla giriş yapıp odaları görür', async ({ page }) => {
    await page.goto('/auth')
    await page.getByRole('textbox', { name: 'E-posta' }).fill(email('demo_elif'))
    await page.getByRole('textbox', { name: 'Şifre' }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Giriş yap' }).click()
    await expect(page).toHaveURL(/\/app\/lobbies/)
    await expect(page.getByText(ROOM)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Planlı oturumlar' })).toBeVisible()
  })
})

test.describe('Elif olarak', () => {
  test.use({ storageState: authFile('demo_elif') })

  test('bilinmeyen adreste 404 gösterir', async ({ page }) => {
    await page.goto('/app/olmayan-bir-sayfa')
    await expect(page.getByRole('heading', { name: 'Bu masa boş' })).toBeVisible()
  })

  test('odada görev ekleyip bitirir', async ({ page }) => {
    await openRoom(page)
    await page.getByRole('tab', { name: 'Görevler' }).click()
    const title = `E2E görevi ${Date.now()}`
    await page.getByRole('textbox', { name: 'Yeni görev' }).fill(title)
    await page.getByRole('button', { name: 'Görevi ekle' }).click()
    await page.getByRole('checkbox', { name: `${title} görevini bitir` }).click()
    await expect(page.getByRole('checkbox', { name: `${title} görevini geri al` })).toBeChecked()
  })

  test('haftalık ligde demo kullanıcıları sıralanır', async ({ page }) => {
    await page.goto('/app/leaderboard')
    await expect(page.getByText(/haftası\. Lig pazartesi 00:00/)).toBeVisible()
    await expect(page.getByRole('list', { name: 'İlk üç' })).toContainText('Elif Kaya')
  })

  test('kullanıcı arayıp profiline gider', async ({ page }) => {
    await page.goto('/app/leaderboard')
    await page.getByPlaceholder('Birini bul').fill('demo_zey')
    await page.getByRole('link', { name: /Zeynep Ak/ }).click()
    await expect(page.getByRole('heading', { name: /Zeynep Ak/ })).toBeVisible()
    await expect(page.getByText('Rozetler')).toBeVisible()
  })
})

test.describe('birden fazla kişi', () => {
  test('iki kişi aynı odada mesajlaşır ve ortak tahtayı görür', async ({ browser }) => {
    const elif = await signedIn(browser, 'demo_elif')
    const zeynep = await signedIn(browser, 'demo_zeynep')
    try {
      await openRoom(elif.page)
      await openRoom(zeynep.page)

      // İki masa da görünür.
      await expect(elif.page.getByRole('article', { name: /Zeynep Ak/ })).toBeVisible()

      // Sohbet: Elif yazar, Zeynep görür.
      const text = `Selam, ${Date.now()}`
      await elif.page.getByRole('textbox', { name: 'Mesaj' }).fill(text)
      await elif.page.getByRole('button', { name: 'Gönder' }).click()
      await expect(zeynep.page.getByText(text)).toBeVisible()

      // Ortak tahta: Elif açar, Zeynep'in sahnesinde de görünür.
      await elif.page.getByRole('button', { name: 'Boş tahta aç' }).click()
      await expect(elif.page.getByLabel(/Boş tahta, sayfa 1/)).toBeVisible()
      await expect(zeynep.page.getByLabel(/Boş tahta, sayfa 1/)).toBeVisible()
    } finally {
      await elif.context.close()
      await zeynep.context.close()
    }
  })

  test('kameralı odada kamera görüntüsü karşı tarafa ulaşır ve cihaz önizlemesi açılır', async ({ browser }) => {
    const elif = await signedIn(browser, 'demo_elif')
    const zeynep = await signedIn(browser, 'demo_zeynep')
    const videoRoom = 'Demo: Yazılım Final Haftası'
    try {
      for (const { page } of [elif, zeynep]) {
        await page.goto('/app/lobbies')
        await page.getByRole('listitem').filter({ hasText: videoRoom }).getByRole('button', { name: 'Katıl' }).click()
        await expect(page.getByRole('heading', { name: videoRoom })).toBeVisible()
        // Görüntülü bağlantı hazır olunca kamera düğmesi etkinleşir.
        await expect(page.getByRole('button', { name: 'Kamerayı aç' })).toBeEnabled({ timeout: 15_000 })
      }

      // Cihaz ayarları: sahte kameradan önizleme gelir, kamera listesi dolar.
      await elif.page.getByRole('button', { name: 'Kamera ve mikrofon ayarları' }).click()
      const preview = elif.page.getByLabel('Kamera önizlemesi')
      await expect(preview).toBeVisible()
      await expect.poll(() => preview.evaluate((video: HTMLVideoElement) => video.videoWidth)).toBeGreaterThan(0)
      await expect(elif.page.getByLabel('Kamera').locator('option')).not.toHaveCount(1)
      await elif.page.getByRole('button', { name: 'Tamam' }).click()

      // Elif kamerasını açar; Zeynep'in ekranında Elif'in kamerası oynar.
      await elif.page.getByRole('button', { name: 'Kamerayı aç' }).click()
      const remoteVideo = zeynep.page.getByLabel('Elif Kaya kamerası', { exact: true })
      await expect(remoteVideo).toBeVisible({ timeout: 20_000 })
      await expect.poll(() => remoteVideo.evaluate((video: HTMLVideoElement) => video.videoWidth), { timeout: 20_000 }).toBeGreaterThan(0)
    } finally {
      await elif.context.close()
      await zeynep.context.close()
    }
  })

  test('yönetici şikayetler sayfasını açar, normal kullanıcı açamaz', async ({ browser }) => {
    const admin = await signedIn(browser, 'demo_admin')
    const ali = await signedIn(browser, 'demo_ali')
    try {
      await admin.page.goto('/app/admin')
      await expect(admin.page.getByRole('heading', { name: 'Şikayetler', exact: true })).toBeVisible()
      await ali.page.goto('/app/admin')
      await expect(ali.page.getByText('Bu sayfa yöneticilere açık')).toBeVisible()
    } finally {
      await admin.context.close()
      await ali.context.close()
    }
  })
})
