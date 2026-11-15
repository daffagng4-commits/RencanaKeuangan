const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function checkFilters() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
  await page.evaluateOnNewDocument(r => localStorage.setItem('rencana-keuangan-v1', r), rawData);
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));

  const res = await page.evaluate(() => {
    const out = {};
    const dirs = ['-', '+', 'all'];
    for (const dir of dirs) {
      const btn = document.querySelector(`[data-txd="${dir}"]`);
      if (btn) btn.click();
      const rows = Array.from(document.querySelectorAll('.tx-card .tx-row')).map(el => {
        const note = el.querySelector('.tx-note')?.textContent?.trim() || '';
        const amt = el.querySelector('.tx-amt')?.textContent?.trim() || '';
        const cat = el.querySelector('.tx-cat')?.textContent?.trim() || '';
        return { note, amt, cat };
      });
      const dates = Array.from(document.querySelectorAll('.tx-card .tx-dh')).map(el => el.textContent.replace(/\s+/g, ' '));
      const more = document.querySelector('.tx-card .tx-more')?.textContent || null;
      out[dir] = { count: rows.length, rows, dates, more };
    }
    return out;
  });
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
}
checkFilters();
