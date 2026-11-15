const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-e/transaksi-filter';
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function runPreTxTest() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.evaluateOnNewDocument((r) => {
    localStorage.setItem('rencana-keuangan-v1', r);
  }, rawData);

  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  const filters = ['-', '+', 'all'];
  const filterNames = { '-': 'Keluar', '+': 'Masuk', 'all': 'Semua' };
  const txReport = {};

  for (const f of filters) {
    await page.evaluate((dir) => {
      const btn = document.querySelector(`.rk-tx button[data-txd="${dir}"]`);
      if (btn) btn.click();
    }, f);
    await new Promise(r => setTimeout(r, 200));

    const cardInfo = await page.evaluate(() => {
      const card = document.querySelector('.rk-tx');
      const subtitle = card.querySelector('.sub') ? card.querySelector('.sub').textContent.trim() : '';
      const days = Array.from(card.querySelectorAll('.tx-day')).map(d => {
        const title = d.querySelector('.tx-dh span') ? d.querySelector('.tx-dh span').textContent.trim() : '';
        const pills = Array.from(d.querySelectorAll('.tx-pill')).map(p => p.textContent.trim());
        const items = Array.from(d.querySelectorAll('.tx-row')).map(it => {
          const note = it.querySelector('.tx-note') ? it.querySelector('.tx-note').textContent.trim() : '';
          const amt = it.querySelector('.tx-amt') ? it.querySelector('.tx-amt').textContent.trim() : '';
          const cat = it.querySelector('.tx-cat') ? it.querySelector('.tx-cat').textContent.trim() : '';
          return { note, amt, cat };
        });
        return { title, pills, items };
      });
      const rowsCount = card.querySelectorAll('.tx-row').length;
      return { subtitle, days, rowsCount };
    });

    txReport[filterNames[f]] = cardInfo;

    // Take screenshot of viewport and card
    const cardEl = await page.$('.rk-tx');
    if (cardEl) {
      await cardEl.screenshot({ path: path.join(OUT_DIR, `pre-card-${filterNames[f].toLowerCase()}.png`) });
    }
    await page.screenshot({ path: path.join(OUT_DIR, `pre-viewport-${filterNames[f].toLowerCase()}.png`), fullPage: false });
  }

  // Also log raw data transactions in window 9-15 Nov 2026
  const dataAnalysis = await page.evaluate(() => {
    const P = kasLinked();
    const today = todayISO();
    const cut = addDaysISO(today, -6);
    const allRows = kasRows(P);
    const inWin = allRows.filter(x => x.d >= cut && x.d <= today);
    return {
      today,
      cut,
      totalInKas: allRows.length,
      inWindowTotal: inWin.length,
      inWindowKeluar: inWin.filter(x => x.t === '-').length,
      inWindowMasuk: inWin.filter(x => x.t === '+').length,
      inWindowDetails: inWin.map(x => ({ id: x.id, d: x.d, t: x.t, note: x.note, amt: x.amt, cat: x.cat }))
    };
  });

  await browser.close();

  const finalOutput = { dataAnalysis, txReport };
  fs.writeFileSync('C:/Users/daffa/Documents/verif-fase-e/transaksi-filter/pre-fix-report.json', JSON.stringify(finalOutput, null, 2));
  console.log('Pre-fix TX analysis:');
  console.log(JSON.stringify(dataAnalysis, null, 2));
  console.log('Pre-fix TX Report:');
  console.log(JSON.stringify(txReport, null, 2));
}

runPreTxTest().catch(console.error);
