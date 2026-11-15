const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8'));

async function testRunway() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.evaluateOnNewDocument((data) => {
    localStorage.setItem('rencana-keuangan-v1', JSON.stringify(data));
  }, rawData);

  const results = [];
  const viewports = [1280, 1920, 2560, 3840];
  const profiles = ['2026', '2027'];
  const themes = ['light', 'dark'];
  const runwayPercents = [0, 0.25, 0.5, 0.75, 1.0, null]; // null = no runway

  for (const vp of viewports) {
    await page.setViewport({ width: vp, height: 900 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 200));

    for (const pr of profiles) {
      await page.evaluate((profile) => {
        if (window.setProfile) window.setProfile(profile);
      }, pr);
      await new Promise(r => setTimeout(r, 100));

      for (const th of themes) {
        await page.evaluate((theme) => {
          if (theme === 'dark') document.body.classList.add('dark');
          else document.body.classList.remove('dark');
        }, th);
        await new Promise(r => setTimeout(r, 50));

        for (const rw of runwayPercents) {
          const metrics = await page.evaluate((rwPct) => {
            // Find kas chart instance
            if (window.LC_LIVE && window.LC_LIVE[0]) {
              const inst = window.LC_LIVE[0];
              const cfg = inst.cfg;
              if (cfg && cfg.pts && cfg.pts.length > 0) {
                if (rwPct === null) {
                  delete cfg.marks.habis;
                } else {
                  const idx = Math.min(cfg.pts.length - 1, Math.max(0, Math.round((cfg.pts.length - 1) * rwPct)));
                  cfg.marks.habis = cfg.pts[idx].d;
                }
                inst.draw();
              }
            }

            const svg = document.querySelector('svg.lc');
            const legend = document.querySelector('.cond-flow-foot');
            const tiles = document.querySelector('.cond-tiles');

            if (!svg || !legend || !tiles) {
              return { error: 'elements not found' };
            }

            const sr = svg.getBoundingClientRect();
            const lr = legend.getBoundingClientRect();
            const tr = tiles.getBoundingClientRect();

            // Measure gaps
            const chartToLegendGap = lr.top - sr.bottom;
            const legendToTilesGap = tr.top - lr.bottom;

            // Measure SVG labels
            const labels = Array.from(svg.querySelectorAll('text'));
            const labelBoxes = labels.map(l => {
              const r = l.getBoundingClientRect();
              return {
                text: l.textContent.trim(),
                left: r.left - sr.left,
                right: r.right - sr.left,
                top: r.top - sr.top,
                bottom: r.bottom - sr.top,
                width: r.width,
                height: r.height,
                marginRight: sr.right - r.right,
                marginLeft: r.left - sr.left,
                marginTop: r.top - sr.top,
                marginBottom: sr.bottom - r.bottom
              };
            });

            // Check label bounds against SVG with 4px margin
            // All marker labels (Hari ini, Saldo habis, Terendah) and axis dates
            const oob = labelBoxes.filter(b => b.marginLeft < 3.5 || b.marginRight < 3.5);

            // Check collision between marker labels (today vs habis vs terendah)
            const markers = labelBoxes.filter(b => b.text.includes('Hari ini') || b.text.includes('Saldo habis') || b.text.includes('Terendah'));
            const collisions = [];
            for (let i = 0; i < markers.length; i++) {
              for (let j = i + 1; j < markers.length; j++) {
                const a = markers[i];
                const b = markers[j];
                const xOver = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
                const yOver = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
                if (xOver > 0.5 && yOver > 0.5) {
                  collisions.push({ a: a.text, b: b.text, area: Math.round(xOver * yOver) });
                }
              }
            }

            return {
              chartToLegendGap: Math.round(chartToLegendGap),
              legendToTilesGap: Math.round(legendToTilesGap),
              labelCount: labelBoxes.length,
              oobLabels: oob.map(b => ({ text: b.text, ml: Math.round(b.marginLeft), mr: Math.round(b.marginRight) })),
              markerCollisions: collisions
            };
          }, rw);

          results.push({
            viewport: vp,
            profile: pr,
            theme: th,
            runwayPct: rw === null ? 'none' : `${Math.round(rw * 100)}%`,
            ...metrics
          });
        }
      }
    }
  }

  await browser.close();

  const outDir = 'C:/Users/daffa/Documents/verif-fase-e';
  fs.writeFileSync(path.join(outDir, 'runway-verification-report.json'), JSON.stringify(results, null, 2));

  let fails = 0;
  for (const r of results) {
    const gapOk = r.legendToTilesGap >= 12 && r.legendToTilesGap <= 16;
    const chartGapOk = r.chartToLegendGap <= 16;
    const oobOk = r.oobLabels.length === 0;
    const collOk = r.markerCollisions.length === 0;
    if (!gapOk || !chartGapOk || !oobOk || !collOk) {
      console.log(`FAIL at vp=${r.viewport} pr=${r.profile} th=${r.theme} rw=${r.runwayPct}: gap=${r.legendToTilesGap} (ok:${gapOk}), chartGap=${r.chartToLegendGap} (ok:${chartGapOk}), oob=${JSON.stringify(r.oobLabels)}, coll=${JSON.stringify(r.markerCollisions)}`);
      fails++;
    }
  }

  console.log(`Total test cases: ${results.length}. Failures: ${fails}`);
  if (fails === 0) {
    console.log('ALL RUNWAY AND LEGEND TESTS PASSED 100%!');
  }
}

testRunway().catch(console.error);
