const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const MOB_DIR = 'C:/Users/daffa/Documents/verif-fase-e/mobile';
if (!fs.existsSync(MOB_DIR)) fs.mkdirSync(MOB_DIR, { recursive: true });

const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');

async function auditPage(page, label) {
  return await page.evaluate((lbl) => {
    const issues = {
      overlaps: [],
      cardOverflows: [],
      pageOverflow: false,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      truncatedText: [],
      zeroWidthNames: []
    };

    if (document.documentElement.scrollWidth > window.innerWidth + 0.5) {
      issues.pageOverflow = true;
    }

    function getCls(el) {
      if (!el.className) return '';
      if (typeof el.className === 'string') return el.className;
      return el.className.baseVal || '';
    }

    // 1. Audit cards for child overflowing card padding
    const cards = Array.from(document.querySelectorAll('#v-rincian .card'));
    cards.forEach((card, ci) => {
      const cr = card.getBoundingClientRect();
      const cStyle = window.getComputedStyle(card);
      const pt = parseFloat(cStyle.paddingTop) || 0;
      const pb = parseFloat(cStyle.paddingBottom) || 0;
      const pl = parseFloat(cStyle.paddingLeft) || 0;
      const pr = parseFloat(cStyle.paddingRight) || 0;
      const innerRight = cr.right - pr;
      const innerBottom = cr.bottom - pb;

      const children = Array.from(card.querySelectorAll('*'));
      children.forEach(el => {
        // Skip hidden/inert/scrollable containers
        if (el.offsetParent === null && el.tagName !== 'svg') return;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return;
        if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowY === 'auto' || s.overflowY === 'scroll') return;
        if (el.classList.contains('lc-tip') || el.classList.contains('bs-tip') || el.classList.contains('insight-reserve')) return;

        const er = el.getBoundingClientRect();
        if (er.width === 0 || er.height === 0) return;

        // Check if child sticks out beyond card inner right/bottom
        if (er.right > innerRight + 1.0) {
          issues.cardOverflows.push({
            cardIdx: ci,
            cardTitle: card.querySelector('h2')?.textContent || 'Card',
            elem: el.tagName + '.' + getCls(el).split(' ').join('.'),
            text: el.textContent?.slice(0, 20),
            diffRight: Math.round(er.right - innerRight)
          });
        }
      });
    });

    // 2. Audit overlapping text elements
    const textEls = [];
    const allEls = Array.from(document.querySelectorAll('#v-rincian *'));
    allEls.forEach(el => {
      if (el.offsetParent === null && el.tagName !== 'text' && el.tagName !== 'svg') return;
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return;
      if (el.classList.contains('lc-tip') || el.classList.contains('bs-tip') || el.classList.contains('insight-reserve')) return;

      let hasDirectText = false;
      for (let n of el.childNodes) {
        if (n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0) {
          hasDirectText = true;
          break;
        }
      }
      if (hasDirectText || el.tagName === 'text') {
        const r = el.getBoundingClientRect();
        if (r.width > 1 && r.height > 1) {
          textEls.push({
            el,
            tag: el.tagName,
            cls: getCls(el),
            text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 25),
            rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }
          });
        }
      }
    });

    // Check pairwise intersections (excluding ancestor/descendant)
    for (let i = 0; i < textEls.length; i++) {
      for (let j = i + 1; j < textEls.length; j++) {
        const a = textEls[i];
        const b = textEls[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;

        const xOverlap = Math.max(0, Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left));
        const yOverlap = Math.max(0, Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top));
        const area = xOverlap * yOverlap;

        if (area > 1.0) {
          issues.overlaps.push({
            textA: a.text,
            textB: b.text,
            clsA: a.cls,
            clsB: b.cls,
            area: Math.round(area)
          });
        }
      }
    }

    // 3. Category & item names visible (width > 0)
    const catNames = Array.from(document.querySelectorAll('.where-panel .dn-lg .n, .rk-cat .dn-lg .n'));
    catNames.forEach(cn => {
      const r = cn.getBoundingClientRect();
      if (r.width < 10) {
        issues.zeroWidthNames.push({
          text: cn.textContent,
          width: Math.round(r.width)
        });
      }
    });

    // 4. Donut center text overflowing hole
    const dnCenter = document.querySelector('.where-panel .dn-c strong, .rk-cat .dn-c strong');
    const dnRing = document.querySelector('.where-panel .dn-ring, .rk-cat .dn-ring');
    if (dnCenter && dnRing) {
      const cr = dnCenter.getBoundingClientRect();
      const rr = dnRing.getBoundingClientRect();
      const holeWidth = rr.width * 0.65;
      if (cr.width > holeWidth) {
        issues.truncatedText.push({
          type: 'donut-center-overflow',
          text: dnCenter.textContent,
          textWidth: Math.round(cr.width),
          holeWidth: Math.round(holeWidth)
        });
      }
    }

    // 5. SVG label clipped or out of bounds (margin < 4px)
    const svgLabels = Array.from(document.querySelectorAll('svg.lc text'));
    const svgEl = document.querySelector('svg.lc');
    if (svgEl) {
      const sr = svgEl.getBoundingClientRect();
      svgLabels.forEach(txt => {
        const tr = txt.getBoundingClientRect();
        if (tr.right > sr.right - 2 || tr.left < sr.left + 2) {
          issues.truncatedText.push({
            type: 'svg-label-clipped',
            text: txt.textContent,
            svgRight: Math.round(sr.right),
            labelRight: Math.round(tr.right)
          });
        }
      });
    }

    return issues;
  }, label);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const widths = [360, 375, 384, 390, 412, 430, 600, 768];
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(r => localStorage.setItem('rencana-keuangan-v1', r), rawData);

  const report = {};

  for (const w of widths) {
    await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const ssPath = path.join(MOB_DIR, `pre-${w}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });

    const audit = await auditPage(page, `mobile-${w}`);
    report[w] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      overlaps: audit.overlaps.slice(0, 8),
      cardOverflowCount: audit.cardOverflows.length,
      cardOverflows: audit.cardOverflows.slice(0, 8),
      pageOverflow: audit.pageOverflow,
      zeroWidthNamesCount: audit.zeroWidthNames.length,
      zeroWidthNames: audit.zeroWidthNames,
      truncatedText: audit.truncatedText
    };
    console.log(`Pre-audit ${w}px: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}, zeroNames=${audit.zeroWidthNames.length}, pageOverflow=${audit.pageOverflow}`);
  }

  // Also desktop 1280
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 400));
  const dtAudit = await auditPage(page, 'desktop-1280');
  report['desktop-1280'] = dtAudit;
  console.log(`Pre-audit desktop 1280px: overlaps=${dtAudit.overlaps.length}, cardOverflows=${dtAudit.cardOverflows.length}`);

  fs.writeFileSync(path.join(MOB_DIR, 'pre-detector-report.json'), JSON.stringify(report, null, 2));
  console.log('Saved pre-detector-report.json successfully');
  await browser.close();
}

run().catch(console.error);
