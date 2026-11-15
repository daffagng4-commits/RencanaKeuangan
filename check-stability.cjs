const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const raw = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  await page.evaluateOnNewDocument(r => localStorage.setItem('rencana-keuangan-v1', r), raw);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });

  const diff = await page.evaluate(async () => {
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

    const baseline = getSizes();
    const results = [];

    async function testAction(name, clickSel, restoreSel) {
      const btn = document.querySelector(clickSel);
      if (!btn) return;
      btn.click();
      await new Promise(r => setTimeout(r, 100));
      const after = getSizes();
      let diff = 0;
      cardSelectors.forEach(sel => {
        diff += Math.abs(after[sel].w - baseline[sel].w) + Math.abs(after[sel].h - baseline[sel].h);
      });
      results.push({ name, diff });
      if (restoreSel) {
        const rbtn = document.querySelector(restoreSel);
        if (rbtn) {
          rbtn.click();
          await new Promise(r => setTimeout(r, 100));
        }
      }
    }

    await testAction('Kas Flow (w)', '.rk-kas [data-flowp="w"]', '.rk-kas [data-flowp="y"]');
    await testAction('Cat Period (w)', '.where-panel.rk-cat [data-catp="w"]', '.where-panel.rk-cat [data-catp="y"]');
    await testAction('Cat Dir (+)', '.where-panel.rk-cat [data-catd="+"]', '.where-panel.rk-cat [data-catd="-"]');
    await testAction('Top Exp (m)', '.where-panel.rk-top [data-expm="m"]', '.where-panel.rk-top [data-expm="y"]');
    await testAction('Tx Dir (+)', '.rk-tx [data-txd="+"]', '.rk-tx [data-txd="-"]');

    return { baseline, results };
  });
  console.log('Real stability results:', JSON.stringify(diff, null, 2));
  await browser.close();
})();
