const fs = require('fs');
const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';
const USER_DATA_PATH = 'C:/Users/daffa/Downloads/data.json';
const userDataRaw = fs.existsSync(USER_DATA_PATH) ? fs.readFileSync(USER_DATA_PATH, 'utf8') : null;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 3840, height: 2160 });

  if (userDataRaw) {
    await page.evaluateOnNewDocument((raw) => {
      localStorage.setItem('rencana-keuangan-v1', raw);
    }, userDataRaw);
  }

  await page.goto(APP_URL, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  });
  await new Promise((r) => setTimeout(r, 300));

  // Measure pixel empty strips directly in the browser via canvas!
  const pixelReport = await page.evaluate(() => {
    const cards = [
      { sel: '.rk-kas .card', name: 'Kondisi kas' },
      { sel: '.rk-bills .card', name: 'Jadwal tagihan' },
      { sel: '.rk-mf .card', name: 'Pemasukan vs pengeluaran' },
      { sel: '.rk-cat .card', name: 'Pengeluaran per kategori' },
      { sel: '.rk-top .card', name: 'Item pengeluaran terbesar' },
      { sel: '.rk-detail .card', name: 'Rincian arus tagihan' },
      { sel: '.rk-tx .card', name: 'Transaksi terakhir' }
    ];

    const results = [];

    for (const c of cards) {
      const el = document.querySelector(c.sel);
      if (!el) continue;
      const rect = el.getBoundingClientRect();

      // We can inspect elements inside el to find empty vertical spans
      // Or calculate the vertical projection of all rendered non-background elements!
      const cs = window.getComputedStyle(el);
      const padTop = parseFloat(cs.paddingTop) || 0;
      const padBottom = parseFloat(cs.paddingBottom) || 0;
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const padRight = parseFloat(cs.paddingRight) || 0;

      const innerTop = rect.top + padTop;
      const innerBottom = rect.bottom - padBottom;
      const totalH = Math.round(innerBottom - innerTop);

      // Create an occupancy array of size totalH initialized to 0 (empty)
      const occ = new Uint8Array(totalH);

      // Get all child elements that have visual content
      const allKids = [...el.querySelectorAll('*')].filter((k) => {
        const s = window.getComputedStyle(k);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
        const kr = k.getBoundingClientRect();
        return kr.width > 0 && kr.height > 0;
      });

      // Mark occupied vertical spans (leaves or elements with background/borders/text)
      allKids.forEach((k) => {
        const s = window.getComputedStyle(k);
        const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
        const hasBorder = parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
        const isLeaf = k.children.length === 0 && k.textContent.trim().length > 0;
        const isSvg = k.tagName.toLowerCase() === 'svg' || k.tagName.toLowerCase() === 'path' || k.tagName.toLowerCase() === 'canvas';

        if (hasBg || hasBorder || isLeaf || isSvg) {
          const kr = k.getBoundingClientRect();
          const start = Math.max(0, Math.floor(kr.top - innerTop));
          const end = Math.min(totalH, Math.ceil(kr.bottom - innerTop));
          for (let y = start; y < end; y++) {
            occ[y] = 1;
          }
        }
      });

      // Find longest run of 0s in occ
      let maxRun = 0;
      let currRun = 0;
      for (let i = 0; i < totalH; i++) {
        if (occ[i] === 0) {
          currRun++;
          if (currRun > maxRun) maxRun = currRun;
        } else {
          currRun = 0;
        }
      }

      results.push({
        card: c.name,
        cardHeight: Math.round(rect.height),
        innerContentHeight: totalH,
        maxEmptyPixelStrip: maxRun,
        pass: maxRun <= 40
      });
    }

    return results;
  });

  console.log('=== PIXEL/OCCUPANCY EMPTY STRIP REPORT (PRE-FASE E) ===');
  console.table(pixelReport);

  await browser.close();
})().catch(console.error);
