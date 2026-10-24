/*
 * Açılış sayfasının oda görsellerini gerçek uygulamadan yeniden çeker.
 *
 *   backend: npm run seed && npm run seed:canli && npm run start:dev
 *   web:     npm run dev            (http://localhost:5173)
 *   sonra:   node scripts/landing-shots.mjs
 *
 * Elif tarayıcıda "Demo: Sessiz Kütüphane" odasına girer; diğer beş demo hesap
 * (Ali, Zeynep, Deniz, Mert, Selin) soketle aynı odaya bağlanır, lambalarını yakar,
 * sohbete yazar ve ortak tahtaya çizer. Çıktılar web/public/landing/ altına webp
 * olarak yazılır; ölçüler ve yanık masaların yerleri konsola basılır.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { io } from 'socket.io-client';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'public', 'landing');
const WEB = process.env.E2E_BASE_URL ?? 'http://localhost:5173';
const PASSWORD = process.env.SEED_PASSWORD ?? 'Demo12345!';
const ROOM = 'Demo: Sessiz Kütüphane';
const VIEWPORT = { width: 1200, height: 750 };

function backendUrl() {
  if (process.env.VITE_BACKEND_URL) return process.env.VITE_BACKEND_URL;
  try {
    const match = readFileSync(join(here, '..', '.env'), 'utf8').match(/^VITE_BACKEND_URL=(.+)$/m);
    if (match) return match[1].trim();
  } catch {
    // .env yoksa varsayılan adres.
  }
  return 'http://127.0.0.1:3000';
}
const API = backendUrl();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(username) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${username}@demo.studylounge`, password: PASSWORD }),
  });
  const body = await response.json();
  if (!body.access_token) throw new Error(`${username} giriş yapamadı (${response.status}). Önce backend'de "npm run seed" çalıştır.`);
  return { token: body.access_token, user: body.user };
}

/** Soketle odaya giren demo kişi. */
async function bot(username) {
  const { token, user } = await login(username);
  const socket = io(API, { transports: ['websocket'], auth: { token } });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  await sleep(300);
  socket.on('join_lobby_error', (payload) => console.error(`${username}: ${payload?.message}`));
  socket.on('board_error', (payload) => console.error(`${username} tahta: ${payload?.message}`));
  socket.emit('join_lobby', { roomName: ROOM });
  await sleep(500);
  return {
    user,
    socket,
    focus: (isAtDesk) => socket.emit('update_presence', isAtDesk ? { isAtDesk, roomName: ROOM, source: 'web' } : { isAtDesk, roomName: ROOM }),
    say: (text) => socket.emit('send_message', { roomName: ROOM, text, type: 'text' }),
    draw: (stroke) => socket.emit('board_stroke', { stroke: { id: `${username}-${Math.random().toString(36).slice(2, 10)}`, page: 1, ...stroke } }),
    leave: () => {
      socket.emit('update_presence', { isAtDesk: false, roomName: ROOM });
      socket.emit('leave_lobby');
      socket.disconnect();
    },
  };
}

/** Elle çizilmiş gibi hafif titrek düz çizgi. */
function line(x1, y1, x2, y2, steps = 40, wobble = 0.0012) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(t * 9) * wobble];
  });
}

/** Elle çizilmiş gibi, ucu biraz taşan elips. */
function ellipse(cx, cy, rx, ry, steps = 70) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = -Math.PI / 2.4 + (index / steps) * Math.PI * 2.12;
    const wobble = 1 + Math.sin(index / 5) * 0.03;
    return [cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble];
  });
}

/** Tahtada açılacak ders notu: Chromium'da HTML'den PDF üretilir; çizim yerleri aynı sayfadan ölçülür. */
async function makeLectureNote(browser) {
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.emulateMedia({ media: 'print' });
  await page.setContent(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
    @page { size: 794px 1123px; margin: 0; }
    html, body { margin: 0; width: 794px; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1d2320; }
    .page { padding: 64px 72px; }
    .eyebrow { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #6b726f; }
    h1 { font-family: Georgia, serif; font-weight: 400; font-size: 34px; margin: 10px 0 6px; }
    .sub { font-size: 15px; color: #4b524f; margin: 0 0 28px; }
    h2 { font-size: 18px; margin: 26px 0 8px; }
    p { font-size: 15px; line-height: 1.65; margin: 0 0 10px; }
    .formula { display: inline-block; font-family: Georgia, serif; font-size: 40px; margin: 10px 0 6px; padding: 0 6px; }
    .box { border: 1.5px solid #c9cfcc; border-radius: 10px; padding: 16px 20px; margin-top: 14px; }
    .answer { display: inline-block; font-family: Georgia, serif; font-size: 22px; padding: 2px 4px; }
    hr { border: 0; border-top: 1px solid #dfe3e1; margin: 26px 0; }
  </style></head><body><div class="page">
    <div class="eyebrow">Fizik 101 · Hafta 4</div>
    <h1>Newton'un Hareket Yasaları</h1>
    <p class="sub">Ders notu, s. 12</p>
    <h2>2. Yasa: Kuvvet ve ivme</h2>
    <p>Bir cisme etki eden net kuvvet, cismin kütlesiyle ivmesinin çarpımına eşittir. Kuvvet artarsa ivme artar; kütle artarsa aynı kuvvet daha küçük bir ivme verir.</p>
    <span id="formula" class="formula">F = m · a</span>
    <p>Birimler: F newton (N), m kilogram (kg), a metre bölü saniye kare (m/s²).</p>
    <div class="box">
      <p><strong>Örnek 1.</strong> Sürtünmesiz yatay düzlemde duran 2 kg kütleli bir cisme 6 N'luk yatay bir kuvvet uygulanıyor. Cismin ivmesi kaç m/s² olur?</p>
      <p>a = F / m = 6 N / 2 kg</p>
      <span id="answer" class="answer">a = 3 m/s²</span>
    </div>
    <hr>
    <h2>3. Yasa: Etki ve tepki</h2>
    <p>Her etkiye karşı eşit büyüklükte ve zıt yönde bir tepki vardır. Masaya bastırdığın elin, masanın sana uyguladığı kuvveti hisseder.</p>
    <p><strong>Örnek 2.</strong> 5 kg kütleli bir kutu masada duruyor. Masanın kutuya uyguladığı tepki kuvveti nedir? (g = 10 m/s²)</p>
  </div></body></html>`);
  const box = async (id) => page.locator(`#${id}`).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x / 794, y: rect.y / 1123, w: rect.width / 794, h: rect.height / 1123 };
  });
  const formula = await box('formula');
  const answer = await box('answer');
  const pdf = await page.pdf({ width: '794px', height: '1123px', printBackground: true, pageRanges: '1' });
  await page.close();
  const path = join(mkdtempSync(join(tmpdir(), 'sl-tahta-')), 'Fizik 101 - Newton yasalari.pdf');
  writeFileSync(path, pdf);
  return { path, formula, answer };
}

/** PNG ekran görüntüsünü tarayıcıda istenen genişliğe küçültüp webp olarak kaydeder. */
async function saveWebp(helper, png, name, width, quality = 0.88) {
  const result = await helper.evaluate(
    async ({ base64, width, quality }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const targetWidth = Math.min(width, image.width);
      const targetHeight = Math.round((image.height * targetWidth) / image.width);
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, targetWidth, targetHeight);
      return { data: canvas.toDataURL('image/webp', quality).split(',')[1], width: targetWidth, height: targetHeight };
    },
    { base64: png.toString('base64'), width, quality },
  );
  writeFileSync(join(OUT, `${name}.webp`), Buffer.from(result.data, 'base64'));
  console.log(`  ${name}.webp  ${result.width}×${result.height}`);
  return result;
}

/** Birkaç öğenin ortak kutusu (sayfa koordinatı), çevresine pay bırakılarak. */
async function unionBox(page, selectors, pad = 12) {
  const rects = [];
  for (const selector of selectors) {
    const rect = await page.locator(selector).first().boundingBox();
    if (rect) rects.push(rect);
  }
  const x = Math.max(0, Math.min(...rects.map((rect) => rect.x)) - pad);
  const y = Math.max(0, Math.min(...rects.map((rect) => rect.y)) - pad);
  const right = Math.min(VIEWPORT.width, Math.max(...rects.map((rect) => rect.x + rect.width)) + pad);
  const bottom = Math.min(VIEWPORT.height, Math.max(...rects.map((rect) => rect.y + rect.height)) + pad);
  return { x, y, width: right - x, height: bottom - y };
}

async function main() {
  const elif = await login('demo_elif');
  const lobbies = await fetch(`${API}/lobbies`, { headers: { Authorization: `Bearer ${elif.token}` } }).then((response) => response.json());
  const lobby = (Array.isArray(lobbies) ? lobbies : lobbies.data).find((item) => item.name === ROOM);
  if (!lobby) throw new Error(`"${ROOM}" odası yok. Önce "npm run seed" çalıştır.`);

  console.log('Demo kişiler odaya giriyor…');
  const bots = [];
  for (const name of ['demo_ali', 'demo_zeynep', 'demo_admin', 'demo_mert', 'demo_selin']) {
    bots.push(await bot(name));
  }
  const [ali, zeynep, deniz, mert, selin] = bots;
  for (const person of [ali, zeynep, mert, selin]) person.focus(true);
  deniz.focus(false);
  await sleep(1000);

  const browser = await chromium.launch();
  const note = await makeLectureNote(browser);
  const helper = await browser.newPage();

  const origin = new URL(WEB).origin;
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    storageState: {
      cookies: [],
      origins: [
        {
          origin,
          localStorage: [
            { name: 'access_token', value: elif.token },
            { name: 'user_data', value: JSON.stringify(elif.user) },
            { name: 'sl-oda-yan-panel', value: 'chat' },
          ],
        },
      ],
    },
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error('Sayfa hatası:', error.message));

  // 0. Odalar sayfası (Nasıl çalışır, 1. adım): arama ve oda panosu. `seed:canli` verisi varsa oda listesi dolu görünür.
  await page.goto(`${WEB}/app/lobbies`);
  await page.getByRole('heading', { name: 'Odalar', level: 1 }).waitFor();
  await page.locator('#oda-listesi article, #oda-listesi li').first().waitFor();
  await sleep(1200);
  await page.mouse.move(VIEWPORT.width / 2, 4);
  const header = await page.getByRole('heading', { name: 'Odalar', level: 1 }).boundingBox();
  const listTop = await page.locator('#oda-listesi').boundingBox();
  const lobbyClip = { x: Math.max(0, header.x - 20), y: Math.max(0, header.y - 14), width: Math.min(VIEWPORT.width - header.x + 20, 1060), height: Math.min(VIEWPORT.height - header.y + 14, listTop.y - header.y + 360) };
  await saveWebp(helper, await page.screenshot({ clip: lobbyClip }), 'oda-kategoriler', 1200);

  await page.goto(`${WEB}/app/focus/${lobby.id}`);
  await page.getByRole('main', { name: 'Odadakiler' }).locator('article').nth(5).waitFor();

  // Sohbet: Elif odaya girdikten sonra yazılır, böylece yan panelde sırayla görünür.
  ali.say('Herkese kolay gelsin, ilk turdan sonra 5 dk mola.');
  await sleep(500);
  zeynep.say('Biyokimya 3. ünite bitene kadar buradayım.');
  await sleep(500);
  deniz.say('Kahvemi alıp dönüyorum, sayacı bekletmeyin.');
  await sleep(500);
  mert.say('Molada 2. yasa örneğini tahtada açabilir miyiz?');
  await sleep(500);
  selin.say('Olur, ben de Fizik 2 notlarımı getiriyorum.');
  await sleep(1200);
  await page.mouse.move(VIEWPORT.width / 2, 8);

  console.log('Görseller çekiliyor:');
  const timer = page.getByRole('timer');
  const settings = page.getByRole('button', { name: 'Sayaç ayarları' });

  // 1. Sayaç hazır: süre seçimi, Odaklan ve Odayla (Nasıl çalışır, 2. adım).
  await settings.click();
  await sleep(400);
  const idleBox = await unionBox(page, ['[role="timer"]', '[role="timer"] + div']);
  await saveWebp(helper, await page.screenshot({ clip: idleBox }), 'oda-odaklan', 1200);

  // 2. Ortak sayacı başlat; Elif de odakta sayılır.
  await page.getByRole('button', { name: 'Odayla' }).click();
  await sleep(600);
  await page.keyboard.press('Escape');
  await page.mouse.click(VIEWPORT.width / 2, 40);
  await sleep(9000); // 25:00 → 24:51
  await page.mouse.move(VIEWPORT.width / 2, 8);
  await sleep(300);

  // 3. Giriş görseli: bütün oda.
  const full = await page.screenshot();
  await saveWebp(helper, full, 'oda-masaustu-2400', 2400, 0.86);
  await saveWebp(helper, full, 'oda-masaustu-1200', 1200, 0.86);

  // Yanık masaların yeri (ProductShot'taki ışıma için, yüzde).
  const lit = await page.getByRole('main', { name: 'Odadakiler' }).locator('article').evaluateAll((elements, viewport) =>
    elements
      .filter((element) => /: Odakta/.test(element.getAttribute('aria-label') ?? ''))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const pct = (value, total) => Math.round((value / total) * 1000) / 10;
        return { left: pct(rect.x, viewport.width), top: pct(rect.y, viewport.height), width: pct(rect.width, viewport.width), height: pct(rect.height, viewport.height) };
      }),
    VIEWPORT,
  );
  console.log('  yanık masalar:', JSON.stringify(lit));

  // 4. Masalar ve sohbet kesitleri.
  const tiles = await page.getByRole('main', { name: 'Odadakiler' }).locator('article').evaluateAll((elements) => {
    const rects = elements.map((element) => element.getBoundingClientRect());
    const x = Math.min(...rects.map((rect) => rect.left));
    const y = Math.min(...rects.map((rect) => rect.top));
    return { x, y, width: Math.max(...rects.map((rect) => rect.right)) - x, height: Math.max(...rects.map((rect) => rect.bottom)) - y };
  });
  const pad = 14;
  await saveWebp(helper, await page.screenshot({ clip: { x: tiles.x - pad, y: tiles.y - pad, width: tiles.width + pad * 2, height: tiles.height + pad * 2 } }), 'oda-masalar', 1200);
  const chatPanel = await page.getByRole('complementary', { name: 'Yan panel' }).boundingBox();
  if (chatPanel) {
    const chatClip = { x: chatPanel.x, y: chatPanel.y, width: chatPanel.width, height: Math.min(chatPanel.height, 470) };
    await saveWebp(helper, await page.screenshot({ clip: chatClip }), 'oda-sohbet', 900);
  }

  // 5. Ortak sayaç açık panel: kim başlattı, duraklat / bitir.
  await settings.click();
  await sleep(400);
  const runningBox = await unionBox(page, ['[role="timer"]', '[role="timer"] + div']);
  await saveWebp(helper, await page.screenshot({ clip: runningBox }), 'oda-sayac', 1200);
  await page.keyboard.press('Escape');
  await page.mouse.click(VIEWPORT.width / 2, 40);
  await sleep(300);

  // 6. Ortak tahta: Elif PDF'i açar, Ali ve Zeynep üstüne çizer.
  await page.locator('input[type="file"][accept="application/pdf,.pdf"]').setInputFiles(note.path);
  await page.locator('canvas').first().waitFor({ timeout: 20_000 });
  await sleep(2500);
  const { formula, answer } = note;
  ali.draw({
    tool: 'highlighter',
    color: '#f5e56b',
    width: 0.03,
    points: line(formula.x + 0.004, formula.y + formula.h * 0.58, formula.x + formula.w - 0.004, formula.y + formula.h * 0.55, 50, 0.0015),
  });
  await sleep(300);
  zeynep.draw({
    tool: 'pen',
    color: '#c2306a',
    width: 0.0045,
    points: ellipse(answer.x + answer.w / 2, answer.y + answer.h / 2, answer.w / 2 + 0.03, answer.h / 2 + 0.012),
  });
  await sleep(300);
  mert.draw({
    tool: 'pen',
    color: '#0b7a76',
    width: 0.0045,
    points: line(formula.x + formula.w + 0.03, formula.y + formula.h * 0.5, formula.x + formula.w + 0.16, formula.y + formula.h * 0.5, 30, 0.002),
  });
  await sleep(1500);
  await page.mouse.move(VIEWPORT.width / 2, 8);
  await sleep(300);
  const stage = await page.getByRole('main', { name: 'Odadakiler' }).boundingBox();
  await saveWebp(helper, await page.screenshot({ clip: stage }), 'oda-tahta', 1200);

  // Toparla: tahta ve sayaç kapanır, herkes çıkar.
  ali.socket.emit('board_close');
  ali.socket.emit('room_timer_stop');
  await sleep(300);
  for (const person of [ali, zeynep, deniz, mert, selin]) person.leave();
  await browser.close();
  console.log('Bitti.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
