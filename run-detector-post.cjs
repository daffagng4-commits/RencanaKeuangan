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
      zeroWidthNames: [],
      donutCenterMetrics: null,
      shortestCategoryNameWidth: 9999
    };

    if (document.documentElement.scrollWidth > window.innerWidth + 0.5) {
      issues.pageOverflow = true;
    }

    function getCls(el) {
      if (!el.className) return '';
      if (typeof el.className === 'string') return el.className;
      return el.className.baseVal || '';
    }

    // 1. Audit cards for child overflowing card padding (top-level cards in dashboard)
    const cards = Array.from(document.querySelectorAll('#v-rincian > .rk > .card, #v-rincian > .rk > * > .card'));
    cards.forEach((card, ci) => {
      const cr = card.getBoundingClientRect();
      const cStyle = window.getComputedStyle(card);
      const pr = parseFloat(cStyle.paddingRight) || 0;
      const pb = parseFloat(cStyle.paddingBottom) || 0;
      const innerRight = cr.right - pr;
      const innerBottom = cr.bottom - pb;

      const children = Array.from(card.querySelectorAll('*'));
      children.forEach(el => {
        if (el.offsetParent === null && el.tagName !== 'svg' && el.tagName !== 'text') return;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return;
        if (el.getAttribute('aria-hidden') === 'true') return;
        if (s.overflowX === 'auto' || s.overflowX === 'scroll' || s.overflowY === 'auto' || s.overflowY === 'scroll') return;
        if (el.classList.contains('lc-tip') || el.classList.contains('bs-tip') || el.classList.contains('insight-reserve')) return;

        // Skip elements inside a scrollable container (e.g. .tw / overflow-x: auto)
        let p = el.parentElement;
        let insideScroll = false;
        while (p && p !== card) {
          const ps = window.getComputedStyle(p);
          if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') {
            insideScroll = true;
            break;
          }
          p = p.parentElement;
        }
        if (insideScroll) return;

        const er = el.getBoundingClientRect();
        if (er.width === 0 || er.height === 0) return;

        // Check if child sticks out beyond card inner right (+1.5px tolerance for subpixel antialiasing)
        if (er.right > innerRight + 1.5) {
          issues.cardOverflows.push({
            cardIdx: ci,
            cardTitle: card.querySelector('h2, .rk-h3')?.textContent || 'Card',
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
      if (el.getAttribute('aria-hidden') === 'true') return;
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
    const catNames = Array.from(document.querySelectorAll('.where-panel .dn-lg .n, .rk-cat .dn-lg .n, .expense-top .n'));
    catNames.forEach(cn => {
      const r = cn.getBoundingClientRect();
      if (r.width < 10) {
        issues.zeroWidthNames.push({
          text: cn.textContent,
          width: Math.round(r.width)
        });
      }
      if (r.width > 0 && r.width < issues.shortestCategoryNameWidth) {
        issues.shortestCategoryNameWidth = Math.round(r.width);
      }
    });

    // 4. Donut center text overflowing hole
    const dnCenter = document.querySelector('.where-panel .dn-c strong, .rk-cat .dn-c strong');
    const dnRing = document.querySelector('.where-panel .dn-ring, .rk-cat .dn-ring');
    if (dnCenter && dnRing) {
      const cr = dnCenter.getBoundingClientRect();
      const rr = dnRing.getBoundingClientRect();
      const holeWidth = rr.width * 0.65;
      issues.donutCenterMetrics = {
        text: dnCenter.textContent,
        textWidth: Math.round(cr.width),
        holeWidth: Math.round(holeWidth),
        fits: cr.width <= holeWidth + 1
      };
      if (cr.width > holeWidth + 1) {
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

  const page = await browser.newPage();
  await page.evaluateOnNewDocument(r => localStorage.setItem('rencana-keuangan-v1', r), rawData);

  const report = {};

  // Standard Mobile Portrait (widths 360..768)
  const widths = [360, 375, 384, 390, 412, 430, 600, 768];
  for (const w of widths) {
    await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));

    const ssPath = path.join(MOB_DIR, `post-${w}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });

    const audit = await auditPage(page, `mobile-${w}`);
    report[`mobile-${w}`] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      overlaps: audit.overlaps,
      cardOverflowCount: audit.cardOverflows.length,
      cardOverflows: audit.cardOverflows,
      pageOverflow: audit.pageOverflow,
      zeroWidthNamesCount: audit.zeroWidthNames.length,
      zeroWidthNames: audit.zeroWidthNames,
      donutCenterMetrics: audit.donutCenterMetrics,
      shortestCategoryNameWidth: audit.shortestCategoryNameWidth,
      truncatedText: audit.truncatedText
    };
    console.log(`Post-audit mobile ${w}px: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}, zeroNames=${audit.zeroWidthNames.length}, pageOverflow=${audit.pageOverflow}`);
  }

  // DPR 2.625
  for (const w of [360, 412]) {
    await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2.625 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const ssPath = path.join(MOB_DIR, `post-dpr2625-${w}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    const audit = await auditPage(page, `mobile-dpr2625-${w}`);
    report[`mobile-dpr2625-${w}`] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      cardOverflowCount: audit.cardOverflows.length,
      pageOverflow: audit.pageOverflow
    };
    console.log(`Post-audit DPR 2.625 ${w}px: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}`);
  }

  // Landscape (600x360, 768x430)
  for (const [w, h] of [[600, 360], [768, 430]]) {
    await page.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 400));
    const ssPath = path.join(MOB_DIR, `post-landscape-${w}x${h}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    const audit = await auditPage(page, `landscape-${w}x${h}`);
    report[`landscape-${w}x${h}`] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      cardOverflowCount: audit.cardOverflows.length,
      pageOverflow: audit.pageOverflow
    };
    console.log(`Post-audit Landscape ${w}x${h}: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}`);
  }

  // Mobile Dark theme (360, 412)
  for (const w of [360, 412]) {
    await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      document.body.classList.add('dark');
      localStorage.setItem('rk-theme', 'dark');
    });
    await page.goto('file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html', { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.body.classList.add('dark'));
    await new Promise(r => setTimeout(r, 400));
    const ssPath = path.join(MOB_DIR, `post-dark-${w}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    const audit = await auditPage(page, `dark-${w}`);
    report[`dark-${w}`] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      cardOverflowCount: audit.cardOverflows.length,
      pageOverflow: audit.pageOverflow
    };
    console.log(`Post-audit Dark ${w}px: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}`);
  }

  // Mobile Profile 2027 (360, 412)
  for (const w of [360, 412]) {
    await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      document.body.classList.remove('dark');
      if (window.setProfile) window.setProfile('2027');
    });
    await new Promise(r => setTimeout(r, 400));
    const ssPath = path.join(MOB_DIR, `post-2027-${w}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    const audit = await auditPage(page, `profile2027-${w}`);
    report[`profile2027-${w}`] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      cardOverflowCount: audit.cardOverflows.length,
      pageOverflow: audit.pageOverflow
    };
    console.log(`Post-audit Profile 2027 ${w}px: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}`);
  }

  // Privacy on (360, 412)
  for (const w of [360, 412]) {
    await page.setViewport({ width: w, height: 800, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.evaluate(() => {
      if (window.setProfile) window.setProfile('2026');
      document.body.classList.add('privacy');
    });
    await new Promise(r => setTimeout(r, 400));
    const ssPath = path.join(MOB_DIR, `post-privacy-${w}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    const audit = await auditPage(page, `privacy-${w}`);
    report[`privacy-${w}`] = {
      screenshot: ssPath,
      overlapCount: audit.overlaps.length,
      cardOverflowCount: audit.cardOverflows.length,
      pageOverflow: audit.pageOverflow
    };
    console.log(`Post-audit Privacy ${w}px: overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}`);
  }

  // Desktop viewports: 1280, 1920, 2560, 3840 (light and dark, 2026 and 2027)
  const dtViewports = [1280, 1920, 2560, 3840];
  for (const vp of dtViewports) {
    for (const th of ['light', 'dark']) {
      for (const pr of ['2026', '2027']) {
        await page.setViewport({ width: vp, height: 900, isMobile: false });
        await page.evaluate((theme, profile) => {
          document.body.classList.remove('privacy');
          if (theme === 'dark') document.body.classList.add('dark');
          else document.body.classList.remove('dark');
          if (window.setProfile) window.setProfile(profile);
        }, th, pr);
        await new Promise(r => setTimeout(r, 300));
        const key = `desktop-${vp}-${th}-${pr}`;
        const ssPath = path.join(MOB_DIR, `post-${key}.png`);
        if (th === 'light' && pr === '2026') {
          await page.screenshot({ path: ssPath, fullPage: false });
        }
        const audit = await auditPage(page, key);
        report[key] = {
          screenshot: ssPath,
          overlapCount: audit.overlaps.length,
          overlaps: audit.overlaps,
          cardOverflowCount: audit.cardOverflows.length,
          cardOverflows: audit.cardOverflows,
          pageOverflow: audit.pageOverflow
        };
        console.log(`Post-audit desktop ${vp}px (${th}, ${pr}): overlaps=${audit.overlaps.length}, cardOverflows=${audit.cardOverflows.length}, pageOverflow=${audit.pageOverflow}`);
      }
    }
  }

  fs.writeFileSync(path.join(MOB_DIR, 'post-detector-report.json'), JSON.stringify(report, null, 2));
  console.log('Saved post-detector-report.json successfully!');
  await browser.close();
}

run().catch(console.error);
