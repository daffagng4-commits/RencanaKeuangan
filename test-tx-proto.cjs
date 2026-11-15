const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');

async function testTxCardPrototype() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');

  await page.evaluateOnNewDocument((r) => {
    localStorage.setItem('rencana-keuangan-v1', r);
  }, rawData);

  await page.setViewport({ width: 1280, height: 1200 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));

  // Also let's simulate adding the transactions that the user had in their screenshot:
  // User had on 13 Nov: btc cicil des (-100k), beli token ai (-18k), Tambahan (+100k)
  // and on 15 Nov: beli email (-25.275)
  // Let's test with the EXACT data from data.json first, and then with user's screenshot data
  const resultDataJson = await page.evaluate(() => {
    // Check raw transactions in kasLinked
    const P = kasLinked();
    const today = todayISO();
    const cut = addDaysISO(today, -6);
    const all = kasRows(P);
    const inWin = all.filter(x => x.d >= cut && x.d <= today);
    return {
      today,
      cut,
      inWin: inWin.map(x => ({ d: x.d, t: x.t, amt: x.amt, note: x.note }))
    };
  });
  console.log('Transactions in window in data.json:', resultDataJson);

  await browser.close();
}

testTxCardPrototype().catch(console.error);
