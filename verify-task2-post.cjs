const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-e/transaksi-filter';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function runTask2Verification() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  const viewports = [1280, 1920, 2560, 3840];
  const themes = ['light', 'dark'];
  const testResults = {
    viewports: {},
    rapidCycle: null,
    synthetic: {},
    privacy: null
  };

  const page = await browser.newPage();

  // Test across viewports and themes
  for (const vp of viewports) {
    testResults.viewports[vp] = {};
    for (const thm of themes) {
      await page.setViewport({ width: vp, height: 1200 });
      await page.evaluateOnNewDocument((r) => {
        localStorage.setItem('rencana-keuangan-v1', r);
      }, rawData);

      await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 400));

      await page.evaluate((t) => setTheme(t), thm);
      await new Promise(r => setTimeout(r, 200));

      // Test each filter: Keluar (-), Masuk (+), Semua (all)
      const filters = [
        { code: '-', name: 'Keluar' },
        { code: '+', name: 'Masuk' },
        { code: 'all', name: 'Semua' }
      ];

      const vpThmData = {};

      for (const f of filters) {
        await page.evaluate((dir) => {
          const btn = document.querySelector(`.rk-tx button[data-txd="${dir}"]`);
          if (btn) btn.click();
        }, f.code);
        await new Promise(r => setTimeout(r, 200));

        const data = await page.evaluate(() => {
          const card = document.querySelector('.rk-tx');
          const sub = card.querySelector('.sub') ? card.querySelector('.sub').textContent.trim() : '';
          const moreEl = card.querySelector('.tx-more');
          const moreText = moreEl ? moreEl.textContent.trim() : null;

          const days = Array.from(card.querySelectorAll('.tx-day')).map(d => {
            const dateLabel = d.querySelector('.tx-dh span') ? d.querySelector('.tx-dh span').textContent.trim() : '';
            const pills = Array.from(d.querySelectorAll('.tx-pill')).map(p => ({
              text: p.textContent.trim(),
              isNeg: p.classList.contains('neg'),
              isKin: p.classList.contains('kin')
            }));
            const rows = Array.from(d.querySelectorAll('.tx-row')).map(r => ({
              note: r.querySelector('.tx-note') ? r.querySelector('.tx-note').textContent.trim() : '',
              amt: r.querySelector('.tx-amt') ? r.querySelector('.tx-amt').textContent.trim() : '',
              isNeg: r.querySelector('.tx-amt') ? r.querySelector('.tx-amt').classList.contains('neg') : false,
              isKin: r.querySelector('.tx-amt') ? r.querySelector('.tx-amt').classList.contains('kin') : false,
              cat: r.querySelector('.tx-cat') ? r.querySelector('.tx-cat').textContent.trim() : ''
            }));
            return { dateLabel, pills, rows };
          });

          const totalRenderedRows = card.querySelectorAll('.tx-row').length;
          return { sub, moreText, days, totalRenderedRows };
        });

        vpThmData[f.name] = data;

        // Screenshot of viewport and card
        const ssVpPath = path.join(OUT_DIR, `vp-${vp}-${thm}-${f.name.toLowerCase()}.png`);
        await page.screenshot({ path: ssVpPath, fullPage: false });

        const cardEl = await page.$('.rk-tx');
        if (cardEl) {
          const ssCardPath = path.join(OUT_DIR, `card-${vp}-${thm}-${f.name.toLowerCase()}.png`);
          await cardEl.screenshot({ path: ssCardPath });
        }
      }

      // Check UNION condition
      const keluarRows = vpThmData['Keluar'].totalRenderedRows;
      const masukRows = vpThmData['Masuk'].totalRenderedRows;
      const semuaRows = vpThmData['Semua'].totalRenderedRows;
      const unionPass = (semuaRows === keluarRows + masukRows);

      // Check dual pill on 10 Nov in Semua
      const day10Nov = vpThmData['Semua'].days.find(d => d.dateLabel.includes('10 Nov'));
      const hasDualPills10Nov = day10Nov && day10Nov.pills.length === 2 &&
        day10Nov.pills.some(p => p.isNeg) && day10Nov.pills.some(p => p.isKin);

      testResults.viewports[vp][thm] = {
        keluarRows,
        masukRows,
        semuaRows,
        unionPass,
        hasDualPills10Nov,
        pills10Nov: day10Nov ? day10Nov.pills : null
      };
    }
  }

  // Rapid Cycling Test
  console.log('Testing rapid cycling filter order and stability...');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const getOtherCardsHeights = () => page.evaluate(() => ({
    kas: document.querySelector('.rk-kas').getBoundingClientRect().height,
    bills: document.querySelector('.rk-bills').getBoundingClientRect().height,
    mf: document.querySelector('.rk-mf').getBoundingClientRect().height,
    where: document.querySelector('.rk-where').getBoundingClientRect().height,
    detail: document.querySelector('.rk-detail').getBoundingClientRect().height
  }));

  const initialHeights = await getOtherCardsHeights();

  // Attach MutationObserver to all other cards to ensure 0 DOM mutations
  await page.evaluate(() => {
    window._mutationCountOther = 0;
    const mo = new MutationObserver((mutations) => {
      window._mutationCountOther += mutations.length;
    });
    ['.rk-kas', '.rk-bills', '.rk-mf', '.rk-where', '.rk-detail'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) mo.observe(el, { childList: true, subtree: true, attributes: true });
    });
  });

  // Cycle 5 times: '-' -> '+' -> 'all' -> '-'
  for (let c = 0; c < 5; c++) {
    for (const d of ['-', '+', 'all', '-']) {
      await page.evaluate((dir) => {
        document.querySelector(`.rk-tx button[data-txd="${dir}"]`).click();
      }, d);
      await new Promise(r => setTimeout(r, 60));
    }
  }

  const heightsAfterCycling = await getOtherCardsHeights();
  const mutationCount = await page.evaluate(() => window._mutationCountOther);

  const heightDiffs = {
    kas: Math.abs(heightsAfterCycling.kas - initialHeights.kas),
    bills: Math.abs(heightsAfterCycling.bills - initialHeights.bills),
    mf: Math.abs(heightsAfterCycling.mf - initialHeights.mf),
    where: Math.abs(heightsAfterCycling.where - initialHeights.where),
    detail: Math.abs(heightsAfterCycling.detail - initialHeights.detail)
  };

  testResults.rapidCycle = {
    mutationCountOtherCards: mutationCount,
    heightDiffs,
    stabilityPass: mutationCount === 0 && Object.values(heightDiffs).every(d => d <= 0.01)
  };

  // Synthetic Tests
  console.log('Testing synthetic scenarios...');

  // (i) 30 transactions within 7 days
  const synth30Result = await page.evaluate(() => {
    const P = kasLinked();
    const today = todayISO();
    const rows = [];
    for (let i = 0; i < 30; i++) {
      // 5 transactions per day for 6 days
      const dayOffset = Math.floor(i / 5);
      const d = addDaysISO(today, -dayOffset);
      rows.push({
        id: 'synth_' + i,
        d: d,
        t: i % 3 === 0 ? '+' : '-',
        amt: (i + 1) * 10000,
        cat: 'Test',
        note: 'Tx ' + i
      });
    }
    P.tx = rows;
    txDir = 'all';
    rerenderTx();

    const card = document.querySelector('.rk-tx');
    const dayGroups = card.querySelectorAll('.tx-day').length;
    const renderedRows = card.querySelectorAll('.tx-row').length;
    const moreEl = card.querySelector('.tx-more');
    const moreText = moreEl ? moreEl.textContent.trim() : null;
    return { dayGroups, renderedRows, moreText, total: 30 };
  });
  testResults.synthetic.thirtyRows = synth30Result;

  // (ii) Empty days in 7 days
  const synthEmptyResult = await page.evaluate(() => {
    const P = kasLinked();
    const today = todayISO();
    P.tx = [
      { id: 'e1', d: today, t: '-', amt: 50000, cat: 'A', note: 'Today' },
      { id: 'e2', d: addDaysISO(today, -5), t: '+', amt: 100000, cat: 'B', note: '5 days ago' }
    ];
    txDir = 'all';
    rerenderTx();
    const card = document.querySelector('.rk-tx');
    const days = Array.from(card.querySelectorAll('.tx-day')).map(d => d.querySelector('.tx-dh span').textContent.trim());
    return { days, renderedRows: card.querySelectorAll('.tx-row').length };
  });
  testResults.synthetic.emptyDays = synthEmptyResult;

  // (iii) Single direction only
  const synthSingleDirResult = await page.evaluate(() => {
    const P = kasLinked();
    const today = todayISO();
    P.tx = [
      { id: 's1', d: today, t: '-', amt: 50000, cat: 'A', note: 'Out 1' },
      { id: 's2', d: addDaysISO(today, -1), t: '-', amt: 60000, cat: 'A', note: 'Out 2' }
    ];
    txDir = 'all';
    rerenderTx();
    const card = document.querySelector('.rk-tx');
    const pills = Array.from(card.querySelectorAll('.tx-pill')).map(p => ({
      text: p.textContent.trim(),
      isNeg: p.classList.contains('neg'),
      isKin: p.classList.contains('kin')
    }));
    return { pills, count: pills.length };
  });
  testResults.synthetic.singleDir = synthSingleDirResult;

  // (iv) Future tx and 9 Nov boundary (7th day)
  const synthBoundaryResult = await page.evaluate(() => {
    const P = kasLinked();
    const today = '2026-11-15';
    const cut = addDaysISO(today, -6); // 2026-11-09
    P.tx = [
      { id: 'future', d: '2026-11-16', t: '-', amt: 10000, cat: 'A', note: 'Future' },
      { id: 'today', d: '2026-11-15', t: '-', amt: 20000, cat: 'A', note: 'Today' },
      { id: 'boundary', d: '2026-11-09', t: '+', amt: 30000, cat: 'B', note: 'Boundary' },
      { id: 'past', d: '2026-11-08', t: '-', amt: 40000, cat: 'A', note: 'Too old' }
    ];
    txDir = 'all';
    rerenderTx();
    const card = document.querySelector('.rk-tx');
    const rows = Array.from(card.querySelectorAll('.tx-row')).map(r => r.querySelector('.tx-note').textContent.trim());
    return { cut, rows };
  });
  testResults.synthetic.boundary = synthBoundaryResult;

  // Privacy Mode Test
  console.log('Testing privacy mode on pills and amounts...');
  const privacyResult = await page.evaluate(() => {
    const P = kasLinked();
    const today = todayISO();
    P.tx = [
      { id: 'p1', d: today, t: '-', amt: 50000, cat: 'A', note: 'Belanja' },
      { id: 'p2', d: today, t: '+', amt: 100000, cat: 'B', note: 'Gaji' }
    ];
    txDir = 'all';
    rerenderTx();

    const btn = document.getElementById('btn-privacy');
    if (btn && !document.body.classList.contains('privacy-mode')) btn.click();

    const card = document.querySelector('.rk-tx');
    const pills = Array.from(card.querySelectorAll('.tx-pill')).map(p => ({
      html: p.outerHTML,
      hasPv: p.classList.contains('pv')
    }));
    const amts = Array.from(card.querySelectorAll('.tx-amt')).map(a => ({
      html: a.outerHTML,
      hasPv: a.classList.contains('pv')
    }));
    const bodyHasPvOn = document.body.classList.contains('privacy-mode');

    // Restore
    if (btn && document.body.classList.contains('privacy-mode')) btn.click();

    return { bodyHasPvOn, pills, amts };
  });
  testResults.privacy = privacyResult;

  await browser.close();

  fs.writeFileSync('C:/Users/daffa/Documents/verif-fase-e/transaksi-filter/post-fix-report.json', JSON.stringify(testResults, null, 2));
  console.log('Task 2 Verification Complete. Report saved.');
  console.log(JSON.stringify(testResults, null, 2));
}

runTask2Verification().catch(console.error);
