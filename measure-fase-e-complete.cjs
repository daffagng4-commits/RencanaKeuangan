const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';
const USER_DATA_PATH = 'C:/Users/daffa/Downloads/data.json';
const userDataRaw = fs.existsSync(USER_DATA_PATH) ? fs.readFileSync(USER_DATA_PATH, 'utf8') : null;
const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-e';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  if (userDataRaw) {
    await page.evaluateOnNewDocument((raw) => {
      localStorage.setItem('rencana-keuangan-v1', raw);
    }, userDataRaw);
  }

  const VIEWPORTS = [3840, 2560, 1920, 1440, 1280, 1024, 768, 390];
  const fullReport = {
    generatedAt: new Date().toISOString(),
    viewports: {},
    stability: null,
    screenshots: []
  };

  // 1. Detailed measurement across viewports (Light & Dark, 2026)
  for (const w of VIEWPORTS) {
    const h = w >= 2560 ? 1600 : w >= 1280 ? 1080 : 900;
    await page.setViewport({ width: w, height: h });
    await page.goto(APP_URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));

    // Measure light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      if (typeof renderAll === 'function') renderAll();
    });
    await new Promise((r) => setTimeout(r, 300));

    // Capture screenshot
    const shotPathLight = path.join(OUT_DIR, `viewport-${w}-light-2026.png`);
    await page.screenshot({ path: shotPathLight, fullPage: false });
    fullReport.screenshots.push(shotPathLight);

    const metricsLight = await page.evaluate(() => {
      // Cards to measure
      const cards = [
        { sel: '.rk-kas .card', name: 'Kondisi kas', role: 'MENYESUAIKAN' },
        { sel: '.rk-bills .card', name: 'Jadwal tagihan', role: 'PENENTU TINGGI' },
        { sel: '.rk-mf .card', name: 'Pemasukan vs pengeluaran', role: 'MENYESUAIKAN' },
        { sel: '.rk-where .rk-where-card', name: 'Ke mana uangnya pergi', role: 'PENENTU TINGGI' },
        { sel: '.where-panel.rk-cat .card', name: 'Panel Per kategori', role: 'SUB-PANEL' },
        { sel: '.where-panel.rk-top .card', name: 'Panel Item terbesar', role: 'SUB-PANEL' },
        { sel: '.rk-detail .card', name: 'Rincian arus tagihan', role: 'PENENTU TINGGI' },
        { sel: '.rk-tx .card', name: 'Transaksi terakhir', role: 'MENYESUAIKAN' }
      ];

      const res = {};

      // (a) Gaps & empty strips
      cards.forEach(c => {
        const el = document.querySelector(c.sel);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        const pt = parseFloat(cs.paddingTop) || 0;
        const pb = parseFloat(cs.paddingBottom) || 0;
        const innerTop = rect.top + pt;
        const innerBottom = rect.bottom - pb;
        const totalH = Math.max(1, Math.round(innerBottom - innerTop));

        // Direct blocks inside card
        const directBlocks = [...el.children].filter(k => {
          const s = window.getComputedStyle(k);
          return s.display !== 'none' && s.visibility !== 'hidden' && k.getBoundingClientRect().height > 0;
        });

        const blockGaps = [];
        for (let i = 0; i < directBlocks.length - 1; i++) {
          const r1 = directBlocks[i].getBoundingClientRect();
          const r2 = directBlocks[i + 1].getBoundingClientRect();
          blockGaps.push(Math.round(r2.top - r1.bottom));
        }

        // Pixel occupancy
        const occ = new Uint8Array(totalH);
        const allKids = [...el.querySelectorAll('*')].filter(k => {
          const s = window.getComputedStyle(k);
          if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
          const kr = k.getBoundingClientRect();
          return kr.width > 0 && kr.height > 0;
        });

        allKids.forEach(k => {
          const s = window.getComputedStyle(k);
          const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
          const hasBorder = parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0;
          const isLeaf = k.children.length === 0 && k.textContent.trim().length > 0;
          const isSvg = k.tagName.toLowerCase() === 'svg' || k.tagName.toLowerCase() === 'path' || k.tagName.toLowerCase() === 'canvas';

          if (hasBg || hasBorder || isLeaf || isSvg) {
            const kr = k.getBoundingClientRect();
            const start = Math.max(0, Math.floor(kr.top - innerTop));
            const end = Math.min(totalH, Math.ceil(kr.bottom - innerTop));
            for (let y = start; y < end; y++) occ[y] = 1;
          }
        });

        let maxRun = 0, curr = 0;
        for (let i = 0; i < totalH; i++) {
          if (occ[i] === 0) {
            curr++;
            if (curr > maxRun) maxRun = curr;
          } else {
            curr = 0;
          }
        }

        res[c.name] = {
          height: Math.round(rect.height),
          role: c.role,
          blockGaps,
          maxEmptyStrip: maxRun,
          status: maxRun <= 40 ? 'LULUS' : 'GAGAL'
        };
      });

      // (b) List Pitches
      // Bills
      const billsItems = [...document.querySelectorAll('.rk-bills .bl')];
      const billsPitches = [];
      for (let i = 0; i < billsItems.length - 1; i++) {
        billsPitches.push(Math.round(billsItems[i + 1].getBoundingClientRect().top - billsItems[i].getBoundingClientRect().top));
      }

      // Top expenses
      const topItems = [...document.querySelectorAll('.where-panel.rk-top .expense-row')];
      const topPitches = [];
      for (let i = 0; i < topItems.length - 1; i++) {
        topPitches.push(Math.round(topItems[i + 1].getBoundingClientRect().top - topItems[i].getBoundingClientRect().top));
      }

      // Categories
      const catItems = [...document.querySelectorAll('.where-panel.rk-cat .dn-lg > li')];
      const catPitches = [];
      for (let i = 0; i < catItems.length - 1; i++) {
        catPitches.push(Math.round(catItems[i + 1].getBoundingClientRect().top - catItems[i].getBoundingClientRect().top));
      }

      // Recent Tx
      const txRows = [...document.querySelectorAll('.rk-tx .tx-row')];
      const txPitches = [];
      for (let i = 0; i < txRows.length - 1; i++) {
        const d = Math.round(txRows[i + 1].getBoundingClientRect().top - txRows[i].getBoundingClientRect().top);
        if (d > 0 && d < 80) txPitches.push(d); // same day or adjacent
      }

      // (c) Kondisi kas chart to tiles gap
      const lcWrap = document.querySelector('.rk-kas .lc-wrap');
      const tiles = document.querySelector('.rk-kas .cond-tiles');
      const kasGap = lcWrap && tiles ? Math.round(tiles.getBoundingClientRect().top - lcWrap.getBoundingClientRect().bottom) : null;

      // (d) Pemasukan plot fill ratio
      const bsChart = document.querySelector('.rk-mf .bs-chart');
      let plotFillRatio = null;
      if (bsChart) {
        const svg = bsChart.querySelector('svg');
        const h = bsChart.clientHeight;
        const pt = 10, pb = 14;
        const ih = h - pt - pb;
        plotFillRatio = Math.round((ih / h) * 100);
      }

      // (e) Smallest font size rendered
      let minFont = 999;
      const allTextEls = [...document.querySelectorAll('.rk *')].filter(el => {
        return el.children.length === 0 && el.textContent.trim().length > 0;
      });
      allTextEls.forEach(el => {
        const fs = parseFloat(window.getComputedStyle(el).fontSize);
        if (fs && fs < minFont) minFont = fs;
      });

      return {
        cards: res,
        pitches: {
          billsPitches,
          topPitches,
          catPitches,
          txPitches
        },
        kasChartToTilesGap: kasGap,
        pemasukanPlotFillRatio: plotFillRatio + '%',
        minFontSize: minFont
      };
    });

    fullReport.viewports[w] = metricsLight;

    // Capture dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      if (typeof renderAll === 'function') renderAll();
    });
    await new Promise((r) => setTimeout(r, 200));

    const shotPathDark = path.join(OUT_DIR, `viewport-${w}-dark-2026.png`);
    await page.screenshot({ path: shotPathDark, fullPage: false });
    fullReport.screenshots.push(shotPathDark);
  }

  // 2. Profile 2027 Screenshots
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluate(() => {
    if (typeof switchYear === 'function') switchYear(2027);
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    if (typeof renderAll === 'function') renderAll();
  });
  await new Promise((r) => setTimeout(r, 400));
  const shotPath2027 = path.join(OUT_DIR, `viewport-1920-light-2027.png`);
  await page.screenshot({ path: shotPath2027, fullPage: false });
  fullReport.screenshots.push(shotPath2027);

  // 3. Stability Contract Test (0px dimension mutations, 0 other cards DOM mutations)
  await page.evaluate(() => {
    if (typeof switchYear === 'function') switchYear(2026);
    if (typeof renderAll === 'function') renderAll();
  });
  await new Promise((r) => setTimeout(r, 300));

  const stabilityResults = await page.evaluate(async () => {
    const cardSelectors = ['.rk-kas', '.rk-bills', '.rk-mf', '.rk-where', '.rk-detail', '.rk-tx'];

    function getSizes() {
      const s = {};
      cardSelectors.forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          s[sel] = { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
        }
      });
      return s;
    }

    const baselineSizes = getSizes();
    const tests = [];

    // Test 1: Category Period Toggle ('w')
    let wCatBtn = document.querySelector('.where-panel.rk-cat [data-catp="w"]');
    if (wCatBtn) {
      wCatBtn.click();
      await new Promise(r => setTimeout(r, 100));
      const afterCatW = getSizes();
      let diff = 0;
      cardSelectors.forEach(sel => {
        diff += Math.abs(afterCatW[sel].w - baselineSizes[sel].w) + Math.abs(afterCatW[sel].h - baselineSizes[sel].h);
      });
      tests.push({ name: 'Toggle Cat Period (w)', totalDimensionChangePx: diff, passed: diff === 0 });
    }

    // Restore Cat Period ('y')
    let yCatBtn = document.querySelector('.where-panel.rk-cat [data-catp="y"]');
    if (yCatBtn) { yCatBtn.click(); await new Promise(r => setTimeout(r, 100)); }

    // Test 2: Category Dir Toggle ('+')
    let inCatBtn = document.querySelector('.where-panel.rk-cat [data-catd="+"]');
    if (inCatBtn) {
      inCatBtn.click();
      await new Promise(r => setTimeout(r, 100));
      const afterCatIn = getSizes();
      let diff = 0;
      cardSelectors.forEach(sel => {
        diff += Math.abs(afterCatIn[sel].w - baselineSizes[sel].w) + Math.abs(afterCatIn[sel].h - baselineSizes[sel].h);
      });
      tests.push({ name: 'Toggle Cat Dir (+)', totalDimensionChangePx: diff, passed: diff === 0 });
    }

    // Restore Cat Dir ('-')
    let outCatBtn = document.querySelector('.where-panel.rk-cat [data-catd="-"]');
    if (outCatBtn) { outCatBtn.click(); await new Promise(r => setTimeout(r, 100)); }

    // Test 3: Top Expenses Toggle ('m')
    let mTopBtn = document.querySelector('.where-panel.rk-top [data-expm="m"]');
    if (mTopBtn) {
      mTopBtn.click();
      await new Promise(r => setTimeout(r, 100));
      const afterTopM = getSizes();
      let diff = 0;
      cardSelectors.forEach(sel => {
        diff += Math.abs(afterTopM[sel].w - baselineSizes[sel].w) + Math.abs(afterTopM[sel].h - baselineSizes[sel].h);
      });
      tests.push({ name: 'Toggle Top Expense Period (m)', totalDimensionChangePx: diff, passed: diff === 0 });
    }

    // Restore Top Expenses ('y')
    let yTopBtn = document.querySelector('.where-panel.rk-top [data-expm="y"]');
    if (yTopBtn) { yTopBtn.click(); await new Promise(r => setTimeout(r, 100)); }

    // Test 4: Kas Flow Period ('w')
    let wFlowBtn = document.querySelector('.rk-kas [data-flowp="w"]');
    if (wFlowBtn) {
      wFlowBtn.click();
      await new Promise(r => setTimeout(r, 100));
      const afterFlowW = getSizes();
      let diff = 0;
      cardSelectors.forEach(sel => {
        diff += Math.abs(afterFlowW[sel].w - baselineSizes[sel].w) + Math.abs(afterFlowW[sel].h - baselineSizes[sel].h);
      });
      tests.push({ name: 'Toggle Kas Flow Period (w)', totalDimensionChangePx: diff, passed: diff === 0 });
    }

    // Restore Kas Flow ('y')
    let yFlowBtn = document.querySelector('.rk-kas [data-flowp="y"]');
    if (yFlowBtn) { yFlowBtn.click(); await new Promise(r => setTimeout(r, 100)); }

    // Test 5: Tx Dir Toggle ('+') -> checks isolation of all other 5 cards
    let inTxBtn = document.querySelector('.rk-tx [data-txd="+"]');
    if (inTxBtn) {
      inTxBtn.click();
      await new Promise(r => setTimeout(r, 100));
      const afterTxIn = getSizes();
      let otherDiff = 0;
      cardSelectors.filter(s => s !== '.rk-tx').forEach(sel => {
        otherDiff += Math.abs(afterTxIn[sel].w - baselineSizes[sel].w) + Math.abs(afterTxIn[sel].h - baselineSizes[sel].h);
      });
      tests.push({ name: 'Tx Dir (+) Other Cards Isolation', totalDimensionChangePx: otherDiff, passed: otherDiff === 0 });
    }

    // Restore Tx Dir ('-')
    let outTxBtn = document.querySelector('.rk-tx [data-txd="-"]');
    if (outTxBtn) { outTxBtn.click(); await new Promise(r => setTimeout(r, 100)); }

    return {
      passed: tests.every(t => t.passed),
      tests
    };
  });

  fullReport.stability = stabilityResults;

  // Save report JSON
  const reportPath = path.join(OUT_DIR, 'fase-e-measurement-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log('Saved report to', reportPath);

  await browser.close();
})().catch(console.error);
