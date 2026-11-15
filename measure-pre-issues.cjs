const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8'));
const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-e';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function runPreMeasurement() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument((data) => {
    localStorage.setItem('rencana-keuangan-v1', JSON.stringify(data));
  }, rawData);

  const report = {
    partA: {},
    partB_toggles: [],
    partC1_bottomGaps: {},
    partD_dateLabels: []
  };

  // --- PART A & C1: Viewports 1280, 1440, 1920, 2560, 3840 ---
  const viewports = [1280, 1440, 1920, 2560, 3840];
  for (const vp of viewports) {
    await page.setViewport({ width: vp, height: 900 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const metricsA = await page.evaluate(() => {
      const cardKas = document.querySelectorAll('#v-rincian .card')[0];
      const cardJadwal = document.querySelectorAll('#v-rincian .card')[1];
      const kr = cardKas.getBoundingClientRect();
      const jr = cardJadwal.getBoundingClientRect();

      const jStyle = window.getComputedStyle(cardJadwal);
      const jPb = parseFloat(jStyle.paddingBottom) || 0;
      const jInnerBottom = jr.bottom - jPb;

      const foot = cardJadwal.querySelector('.bl-foot');
      const footRect = foot ? foot.getBoundingClientRect() : null;
      const bottomGap = footRect ? Math.round(jInnerBottom - footRect.bottom) : null;

      // Natural height of Kondisi kas if chart is at min-height (190px)
      // Head + Big + MinChart (190) + Foot (Legend) + 14px gap + Tiles + Padding
      const head = cardKas.querySelector('.cond-head')?.getBoundingClientRect().height || 0;
      const big = cardKas.querySelector('.hero-val')?.getBoundingClientRect().height || 0;
      const leg = cardKas.querySelector('.cond-flow-foot')?.getBoundingClientRect().height || 0;
      const tiles = cardKas.querySelector('.cond-tiles')?.getBoundingClientRect().height || 0;
      const kStyle = window.getComputedStyle(cardKas);
      const kPad = (parseFloat(kStyle.paddingTop) || 0) + (parseFloat(kStyle.paddingBottom) || 0);
      const minKasNaturalHeight = Math.round(head + big + 190 + leg + 14 + tiles + kPad);

      // Current row height
      const gridRow1Height = Math.round(Math.max(kr.height, jr.height));

      // Calculate natural height of Jadwal for N = 6, 7, 8
      const jHead = cardJadwal.querySelector('.dflex.jcsb.aic.fwrap.g8')?.getBoundingClientRect().height || 0;
      const jSub = cardJadwal.querySelector('.sub.mb8')?.getBoundingClientRect().height || 0;
      const jFootH = footRect ? footRect.height : 32;
      const jPad = (parseFloat(jStyle.paddingTop) || 0) + jPb;
      const pitch = 46; // fixed pitch per bill

      const naturalJadwal6 = Math.round(jHead + jSub + (6 * pitch) + jFootH + jPad);
      const naturalJadwal7 = Math.round(jHead + jSub + (7 * pitch) + jFootH + jPad);
      const naturalJadwal8 = Math.round(jHead + jSub + (8 * pitch) + jFootH + jPad);

      return {
        currentKasHeight: Math.round(kr.height),
        currentJadwalHeight: Math.round(jr.height),
        gridRow1Height,
        minKasNaturalHeight,
        naturalJadwal6,
        naturalJadwal7,
        naturalJadwal8,
        jadwalBottomGap: bottomGap,
        jadwalItemCount: cardJadwal.querySelectorAll('.bl-list .bl').length
      };
    });

    report.partA[vp] = metricsA;

    // Measure Part C1 bottom gaps for ALL 6 cards
    const gapsC1 = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('#v-rincian > .rk > .card, #v-rincian > .rk > * > .card'));
      return cards.map((c, idx) => {
        const title = c.querySelector('h2, .rk-h3')?.textContent.trim() || 'Card ' + idx;
        const cr = c.getBoundingClientRect();
        const cStyle = window.getComputedStyle(c);
        const pb = parseFloat(cStyle.paddingBottom) || 0;
        const innerBottom = cr.bottom - pb;

        // Find last rendered leaf or block
        const children = Array.from(c.querySelectorAll('*')).filter(el => {
          if (el.offsetParent === null) return false;
          const s = window.getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
          if (el.classList.contains('lc-tip') || el.classList.contains('bs-tip')) return false;
          return true;
        });

        let maxChildBottom = cr.top;
        children.forEach(el => {
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.bottom > maxChildBottom) {
            maxChildBottom = r.bottom;
          }
        });

        const gap = Math.max(0, Math.round(innerBottom - maxChildBottom));
        return { idx, title, cardHeight: Math.round(cr.height), bottomGap: gap, pass: gap <= 28 };
      });
    });

    report.partC1_bottomGaps[vp] = gapsC1;
  }

  // --- PART B: 18 Toggle combinations at 1280px ---
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const catPeriods = ['w', 'm', 'y'];
  const catDirs = ['-', '+'];
  const expPeriods = ['w', 'm', 'y'];

  for (const cp of catPeriods) {
    for (const cd of catDirs) {
      for (const ep of expPeriods) {
        const snap = await page.evaluate((cPeriod, cDir, ePeriod) => {
          const cpBtn = document.querySelector('.rk-cat .cat-tab[data-catp="' + cPeriod + '"]');
          if (cpBtn) cpBtn.click();
          const cdBtn = document.querySelector('.rk-cat .cat-tab[data-catd="' + cDir + '"]');
          if (cdBtn) cdBtn.click();
          const epBtn = document.querySelector('.rk-top .cat-tab[data-expp="' + ePeriod + '"]');
          if (epBtn) epBtn.click();

          const cardWhere = document.querySelector('.rk-where-card');
          const cardPv = document.querySelectorAll('#v-rincian .card')[2];
          const row3 = document.querySelector('.rk > .rk-detail') || document.querySelectorAll('#v-rincian .card')[4];

          const wr = cardWhere ? cardWhere.getBoundingClientRect() : null;
          const pr = cardPv ? cardPv.getBoundingClientRect() : null;
          const r3 = row3 ? row3.getBoundingClientRect() : null;

          const catRows = document.querySelectorAll('.rk-cat .dn-lg > li').length;
          const expRows = document.querySelectorAll('.rk-top .expense-list > li').length;

          // Date label in where title
          const whereSub = document.querySelector('#where-lbl')?.textContent.trim();
          const catRange = document.querySelector('.rk-cat .sub')?.textContent.trim();
          const expSub = document.querySelector('.rk-top .expense-head-row2 .sub')?.textContent.trim();

          return {
            whereHeight: wr ? Math.round(wr.height) : null,
            pvHeight: pr ? Math.round(pr.height) : null,
            row3Top: r3 ? Math.round(r3.top) : null,
            catRows,
            expRows,
            whereSub,
            catRange,
            expSub
          };
        }, cp, cd, ep);

        report.partB_toggles.push({
          catPeriod: cp,
          catDir: cd,
          expPeriod: ep,
          ...snap
        });
      }
    }
  }

  // --- PART D: Check current Date Labels ---
  const labels = await page.evaluate(() => {
    const list = [];
    ['w', 'm', 'y'].forEach(p => {
      const btn = document.querySelector('.rk-cat .cat-tab[data-catp="' + p + '"]');
      if (btn) btn.click();
      const whereSub = document.querySelector('#where-lbl')?.textContent.trim();
      const catSub = document.querySelector('.rk-cat .sub')?.textContent.trim();
      list.push({ period: p, whereSub, catSub });
    });
    return list;
  });
  report.partD_dateLabels = labels;

  await browser.close();

  fs.writeFileSync(path.join(OUT_DIR, 'pre-issues-measurement.json'), JSON.stringify(report, null, 2));
  console.log('Saved pre-issues-measurement.json successfully');
}

runPreMeasurement().catch(console.error);
