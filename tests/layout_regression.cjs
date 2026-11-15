const assert = require('assert');
const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';

const VIEWPORTS = [
  { w: 2560, h: 1440, theme: 'dark', sb: true },
  { w: 3840, h: 2160, theme: 'dark', sb: true },
  { w: 1920, h: 1080, theme: 'light', sb: true },
  { w: 1440, h: 900, theme: 'light', sb: false }
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    for (const v of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: v.w, height: v.h });
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 400));

      await page.evaluate((theme, sb) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        const app = document.querySelector('.app');
        if (sb) app.classList.add('sb-open');
        else app.classList.remove('sb-open');
      }, v.theme, v.sb);
      await new Promise((r) => setTimeout(r, 200));

      const metrics = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar')?.getBoundingClientRect();
        const h1 = document.querySelector('.rk-h1, #rk-head h1')?.getBoundingClientRect();
        const kas = document.querySelector('.rk-kas')?.getBoundingClientRect();
        const w = document.querySelector('.w')?.getBoundingClientRect();
        return {
          topbarY: topbar ? Math.round(topbar.y) : null,
          h1Y: h1 ? Math.round(h1.y) : null,
          kasY: kas ? Math.round(kas.y) : null,
          wWidth: w ? Math.round(w.width) : null
        };
      });

      console.log(`Viewport ${v.w}x${v.h}:`, metrics);

      // Invarian posisi:
      // 1. Topbar <= 24px dari atas
      assert(metrics.topbarY !== null && metrics.topbarY <= 24, `Topbar y (${metrics.topbarY}) harus <= 24px`);
      // 2. Greeting h1 terlihat dan berjarak <= 120px di bawah topbar
      assert(metrics.h1Y !== null && metrics.h1Y - metrics.topbarY <= 120, `h1 y (${metrics.h1Y}) harus <= 120px di bawah topbar`);
      // 3. Kartu pertama (.rk-kas) y <= 260px (sebelum penskalaan/zoom)
      assert(metrics.kasY !== null && metrics.kasY <= 260, `Kartu pertama y (${metrics.kasY}) harus <= 260px`);

      await page.close();
    }
    console.log('ALL LAYOUT CHECKS PASSED');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('LAYOUT TEST FAILED:', e.message);
  process.exit(1);
});
