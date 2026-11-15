const fs = require('fs');
const path = require('path');
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
  // Test at 3840x2160 light theme (matching user's screenshot)
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

  const diag = await page.evaluate(() => {
    const results = {};

    // 1. Kondisi kas: measure gap between chart/legend and tiles
    const kasCard = document.querySelector('.rk-kas .card');
    if (kasCard) {
      const lcWrap = kasCard.querySelector('.lc-wrap');
      const tiles = kasCard.querySelector('.cond-tiles');
      const lcRect = lcWrap ? lcWrap.getBoundingClientRect() : null;
      const tileRect = tiles ? tiles.getBoundingClientRect() : null;
      results.kas = {
        cardHeight: Math.round(kasCard.getBoundingClientRect().height),
        lcWrapHeight: lcWrap ? Math.round(lcRect.height) : null,
        tilesHeight: tiles ? Math.round(tileRect.height) : null,
        gapChartToTiles: lcRect && tileRect ? Math.round(tileRect.top - lcRect.bottom) : null
      };
    }

    // 2. Jadwal tagihan: measure item pitches
    const billsCard = document.querySelector('.rk-bills .card');
    if (billsCard) {
      const items = [...billsCard.querySelectorAll('.bl')];
      const pitches = [];
      for (let i = 0; i < items.length - 1; i++) {
        const r1 = items[i].getBoundingClientRect();
        const r2 = items[i + 1].getBoundingClientRect();
        pitches.push(Math.round(r2.top - r1.top));
      }
      const gaps = [];
      for (let i = 0; i < items.length - 1; i++) {
        const r1 = items[i].getBoundingClientRect();
        const r2 = items[i + 1].getBoundingClientRect();
        gaps.push(Math.round(r2.top - r1.bottom));
      }
      const foot = billsCard.querySelector('.bl-foot');
      const footGap = foot && items.length ? Math.round(foot.getBoundingClientRect().top - items[items.length - 1].getBoundingClientRect().bottom) : null;
      results.bills = {
        cardHeight: Math.round(billsCard.getBoundingClientRect().height),
        itemCount: items.length,
        pitches,
        gapsBetweenItems: gaps,
        footGap
      };
    }

    // 3. Pemasukan vs pengeluaran: measure empty space inside card
    const mfCard = document.querySelector('.rk-mf .card');
    if (mfCard) {
      const head = mfCard.querySelector('.bs-head, .dflex, h2')?.parentElement;
      const chart = mfCard.querySelector('.bs-chart, svg');
      const foot = mfCard.querySelector('.bs-foot');
      const headRect = head ? head.getBoundingClientRect() : null;
      const chartRect = chart ? chart.getBoundingClientRect() : null;
      const footRect = foot ? foot.getBoundingClientRect() : null;
      const gapChartToFoot = chartRect && footRect ? Math.round(footRect.top - chartRect.bottom) : null;
      results.mf = {
        cardHeight: Math.round(mfCard.getBoundingClientRect().height),
        chartHeight: chartRect ? Math.round(chartRect.height) : null,
        gapChartToFoot,
        plotRatio: chartRect ? Math.round((chartRect.height / mfCard.getBoundingClientRect().height) * 100) + '%' : null
      };
    }

    // 4. Transaksi terakhir: pitches & gaps
    const txCard = document.querySelector('.rk-tx .card');
    if (txCard) {
      const rows = [...txCard.querySelectorAll('.tx-row')];
      const pitches = [];
      for (let i = 0; i < rows.length - 1; i++) {
        const r1 = rows[i].getBoundingClientRect();
        const r2 = rows[i + 1].getBoundingClientRect();
        pitches.push(Math.round(r2.top - r1.top));
      }
      results.tx = {
        cardHeight: Math.round(txCard.getBoundingClientRect().height),
        rowCount: rows.length,
        pitches
      };
    }

    return results;
  });

  console.log('=== PRE-FASE E DIAGNOSTIC NUMBERS (Viewport 3840x2160) ===');
  console.log(JSON.stringify(diag, null, 2));

  await browser.close();
})().catch(console.error);
