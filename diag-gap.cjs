const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';

async function diagnose(w, h, theme, sbOpen) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h });
  await page.goto(APP_URL, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  await page.evaluate((t, sb) => {
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');

    const app = document.querySelector('.app');
    if (sb) app.classList.add('sb-open');
    else app.classList.remove('sb-open');
  }, theme, sbOpen);
  await new Promise(r => setTimeout(r, 300));

  const diag = await page.evaluate(() => {
    const list = [];
    let curr = document.querySelector('.rk-kas');
    const path = [];
    while (curr && curr !== document.body) {
      path.unshift(curr);
      curr = curr.parentElement;
    }
    path.unshift(document.body);

    for (let el of path) {
      const b = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      list.push({
        tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
        y: Math.round(b.y),
        top: Math.round(b.top),
        height: Math.round(b.height),
        width: Math.round(b.width),
        minHeight: s.minHeight,
        margin: s.margin,
        padding: s.padding,
        position: s.position,
        gridRow: s.gridRow,
        display: s.display,
        transform: s.transform,
        zoom: s.zoom
      });
    }

    // Also inspect siblings of path elements
    const appChildren = [...document.querySelectorAll('.app > *')].map(el => {
      const b = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
        y: Math.round(b.y),
        top: Math.round(b.top),
        height: Math.round(b.height),
        gridRow: s.gridRow,
        gridColumn: s.gridColumn,
        display: s.display,
        position: s.position
      };
    });

    const wChildren = [...document.querySelectorAll('.w > *')].map(el => {
      const b = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        tag: el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className.split(' ').join('.') : ''),
        y: Math.round(b.y),
        top: Math.round(b.top),
        height: Math.round(b.height),
        display: s.display
      };
    });

    return { path: list, appChildren, wChildren };
  });

  console.log(`=== VIEWPORT ${w}x${h} (${theme}, sb-open=${sbOpen}) ===`);
  console.log('Path to .rk-kas:');
  console.table(diag.path);
  console.log('\nApp Children:');
  console.table(diag.appChildren);
  console.log('\n.w Children:');
  console.table(diag.wChildren);

  await browser.close();
}

async function run() {
  await diagnose(2560, 1440, 'dark', true);
  await diagnose(1920, 1080, 'dark', true);
  await diagnose(1440, 900, 'dark', true);
}

run().catch(console.error);
