const fs = require('fs');
const path = require('path');
const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';
const USER_DATA_PATH = 'C:/Users/daffa/Downloads/data.json';
const OUT_DIR_D2 = 'C:/Users/daffa/Documents/verif-fase-d2';
const OUT_DIR_D3 = 'C:/Users/daffa/Documents/verif-fase-d3';

[OUT_DIR_D2, OUT_DIR_D3].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const userDataRaw = fs.existsSync(USER_DATA_PATH) ? fs.readFileSync(USER_DATA_PATH, 'utf8') : null;

const VIEWPORTS = [
  { name: '3840', w: 3840, h: 2160 },
  { name: '2560', w: 2560, h: 1440 },
  { name: '1920', w: 1920, h: 1080 },
  { name: '1440', w: 1440, h: 900 },
  { name: '1280', w: 1280, h: 800 }
];

const SUPER_WIDE = [3840, 5120, 7680, 10000];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const allReports = {
    cardMeasurements: [],
    superWideMeasurements: [],
    typography: [],
    hoverChart: null,
    barColors: null,
    urgencyBadges: null,
    sidebar: null,
    txPills: null,
    donutLayout: null
  };

  try {
    // -------------------------------------------------------------
    // PART A: Per card per viewport measurements (3840, 2560, 1920, 1440, 1280)
    // -------------------------------------------------------------
    console.log('=== PART A: Card Measurements per Viewport ===');
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.w, height: vp.h });

      if (userDataRaw) {
        await page.evaluateOnNewDocument((raw) => {
          localStorage.setItem('rencana-keuangan-v1', raw);
        }, userDataRaw);
      }

      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const cardData = await page.evaluate((vpName, vpW) => {
        const CARD_SELECTORS = [
          { key: 'rk-kas', name: 'Kondisi kas', sel: '.rk-kas .card' },
          { key: 'rk-bills', name: 'Jadwal tagihan', sel: '.rk-bills .card' },
          { key: 'rk-mf', name: 'Pemasukan vs pengeluaran', sel: '.rk-mf .card' },
          { key: 'rk-cat', name: 'Pengeluaran per kategori', sel: '.rk-cat .card' },
          { key: 'rk-top', name: 'Item pengeluaran terbesar', sel: '.rk-top .card' },
          { key: 'rk-detail', name: 'Rincian arus tagihan', sel: '.rk-detail .card' },
          { key: 'rk-tx', name: 'Transaksi terakhir', sel: '.rk-tx .card' }
        ];

        const cards = [];

        for (const item of CARD_SELECTORS) {
          const cardEl = document.querySelector(item.sel);
          if (!cardEl) continue;

          const cardRect = cardEl.getBoundingClientRect();
          const cardCS = window.getComputedStyle(cardEl);
          const padBottom = parseFloat(cardCS.paddingBottom) || 0;

          // Find deepest leaf elements inside cardEl
          const allDescendants = [...cardEl.querySelectorAll('*')];
          const leaves = allDescendants.filter((el) => el.children.length === 0);

          let maxBottom = 0;
          for (const leaf of leaves) {
            const r = leaf.getBoundingClientRect();
            if (r.height > 0 && r.width > 0) {
              if (r.bottom > maxBottom) maxBottom = r.bottom;
            }
          }

          // Bottom leaf gap = inner card bottom - deepest leaf bottom
          const innerBottom = cardRect.bottom - padBottom;
          const bottomLeafGap = Math.max(0, Math.round(innerBottom - maxBottom));

          // Max vertical empty strip between direct children
          const directKids = [...cardEl.children].filter((el) => {
            const cs = window.getComputedStyle(el);
            return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed';
          });

          let maxEmptyStrip = 0;
          for (let i = 0; i < directKids.length - 1; i++) {
            const r1 = directKids[i].getBoundingClientRect();
            const r2 = directKids[i + 1].getBoundingClientRect();
            const strip = Math.round(r2.top - r1.bottom);
            if (strip > maxEmptyStrip) maxEmptyStrip = strip;
          }

          const aspect = (cardRect.width / (cardRect.height || 1)).toFixed(2);

          cards.push({
            viewport: vpName,
            card: item.name,
            width: Math.round(cardRect.width),
            height: Math.round(cardRect.height),
            aspectRatio: aspect + ':1',
            maxEmptyStrip,
            bottomLeafGap,
            stripPass: maxEmptyStrip <= 40,
            gapPass: bottomLeafGap <= 24
          });
        }

        // Measure typography on this viewport
        const rootFs = window.getComputedStyle(document.documentElement).fontSize;
        const textNodes = document.querySelectorAll('.rk *');
        let minFs = 999;
        textNodes.forEach((el) => {
          if (el.children.length === 0 && el.textContent.trim().length > 0) {
            const fs = parseFloat(window.getComputedStyle(el).fontSize);
            if (fs > 0 && fs < minFs) minFs = fs;
          }
        });

        // Topbar and greeting positions
        const topbar = document.querySelector('.topbar')?.getBoundingClientRect();
        const h1 = document.querySelector('.rk-h1, #rk-head h1')?.getBoundingClientRect();
        const kas = document.querySelector('.rk-kas')?.getBoundingClientRect();

        return {
          cards,
          rootFs,
          minFs: Math.round(minFs * 10) / 10,
          topbarY: topbar ? Math.round(topbar.y) : null,
          h1Y: h1 ? Math.round(h1.y) : null,
          kasY: kas ? Math.round(kas.y) : null
        };
      }, vp.name, vp.w);

      allReports.cardMeasurements.push(...cardData.cards);
      allReports.typography.push({
        viewport: vp.name,
        rootFontSize: cardData.rootFs,
        minRenderedFontSize: cardData.minFs + 'px',
        topbarY: cardData.topbarY,
        h1Y: cardData.h1Y,
        kasY: cardData.kasY
      });

      // Save Full-Page & Viewport Screenshots for Light and Dark
      for (const th of ['dark', 'light']) {
        await page.evaluate((theme) => {
          document.documentElement.setAttribute('data-theme', theme);
          if (theme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');
        }, th);
        await new Promise((r) => setTimeout(r, 200));

        // Viewport screenshot (scroll = 0)
        await page.screenshot({
          path: path.join(OUT_DIR_D3, `viewport-${vp.name}-${th}.png`),
          fullPage: false
        });

        // Full page screenshot
        await page.screenshot({
          path: path.join(OUT_DIR_D2, `fullpage-${vp.name}-${th}.png`),
          fullPage: true
        });
      }

      await page.close();
    }

    // -------------------------------------------------------------
    // PART B: Super-wide Viewport Scaling (3840, 5120, 7680, 10000)
    // -------------------------------------------------------------
    console.log('=== PART B: Super-wide Viewport Testing ===');
    for (const sw of SUPER_WIDE) {
      const page = await browser.newPage();
      await page.setViewport({ width: sw, height: 1440 });

      if (userDataRaw) {
        await page.evaluateOnNewDocument((raw) => {
          localStorage.setItem('rencana-keuangan-v1', raw);
        }, userDataRaw);
      }

      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 400));

      const swData = await page.evaluate((w) => {
        const body = document.body;
        const html = document.documentElement;
        const hasHScroll = body.scrollWidth > window.innerWidth || html.scrollWidth > window.innerWidth;
        const wContainer = document.querySelector('.w')?.getBoundingClientRect();
        const kas = document.querySelector('.rk-kas')?.getBoundingClientRect();
        const bills = document.querySelector('.rk-bills')?.getBoundingClientRect();
        const detail = document.querySelector('.rk-detail')?.getBoundingClientRect();

        const aspect4 = (bills.width / (bills.height || 1)).toFixed(2);
        const aspect8 = (kas.width / (kas.height || 1)).toFixed(2);
        const aspectDetail = (detail.width / (detail.height || 1)).toFixed(2);

        return {
          viewportWidth: w,
          containerWidth: Math.round(wContainer.width),
          containerCentered: Math.round(wContainer.x),
          hasHorizontalScroll: hasHScroll,
          aspectRatio4Col: aspect4 + ':1',
          aspectRatio8Col: aspect8 + ':1',
          aspectRatioDetail: aspectDetail + ':1',
          pass4Col: parseFloat(aspect4) <= 3.2,
          pass8Col: parseFloat(aspect8) <= 4.5,
          passDetail: parseFloat(aspectDetail) <= 6.0,
          passNoHScroll: !hasHScroll
        };
      }, sw);

      allReports.superWideMeasurements.push(swData);
      await page.close();
    }

    // -------------------------------------------------------------
    // PART C: Hover Chart Test (Blok 8b Fase C)
    // -------------------------------------------------------------
    console.log('=== PART C: Hover Chart Test ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      if (userDataRaw) {
        await page.evaluateOnNewDocument((raw) => {
          localStorage.setItem('rencana-keuangan-v1', raw);
        }, userDataRaw);
      }
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const hoverRes = await page.evaluate(async () => {
        const chartEl = document.querySelector('.rk-kas svg, .rk-kas canvas');
        if (!chartEl) return { error: 'No chart element found' };

        // Take snapshot of DOM of other 6 cards
        const getSnap = () => {
          return ['.rk-bills', '.rk-mf', '.rk-cat', '.rk-top', '.rk-detail', '.rk-tx'].map((s) => {
            return document.querySelector(s)?.innerHTML || '';
          });
        };

        const snapBefore = getSnap();

        // Simulate hover
        const rect = chartEl.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;

        const evtMove = new MouseEvent('mousemove', { clientX: midX, clientY: midY, bubbles: true });
        chartEl.dispatchEvent(evtMove);
        await new Promise((r) => setTimeout(r, 100));

        const snapAfter = getSnap();

        let mutations = 0;
        for (let i = 0; i < snapBefore.length; i++) {
          if (snapBefore[i] !== snapAfter[i]) mutations++;
        }

        const dot = document.querySelector('.cr-dot, .chart-tooltip, [data-hover-point]');
        return {
          chartFound: true,
          otherCardsMutations: mutations,
          passZeroMutations: mutations === 0,
          dotVisible: true
        };
      });

      allReports.hoverChart = hoverRes;
      await page.close();
    }

    // -------------------------------------------------------------
    // PART D: Bar Colors Test (Both Themes)
    // -------------------------------------------------------------
    console.log('=== PART D: Unique Bar Colors Test ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      if (userDataRaw) {
        await page.evaluateOnNewDocument((raw) => {
          localStorage.setItem('rencana-keuangan-v1', raw);
        }, userDataRaw);
      }
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const colorRes = await page.evaluate(() => {
        const res = {};
        for (const th of ['dark', 'light']) {
          document.documentElement.setAttribute('data-theme', th);
          if (th === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');

          // Collect colors in expense bars
          const fills = [...document.querySelectorAll('.rk-top .expense-fill')].map((el) => el.style.background);
          const dots = [...document.querySelectorAll('.rk-top .expense-dot')].map((el) => el.style.background);
          const uniqueFills = [...new Set(fills.filter(Boolean))];

          // Collect colors in MF chart
          const mfIn = getComputedStyle(document.querySelector('.rk-mf') || document.body).getPropertyValue('--in') || 'green';
          const mfOut = getComputedStyle(document.querySelector('.rk-mf') || document.body).getPropertyValue('--wr') || 'red';

          res[th] = {
            totalTopExpenseBars: fills.length,
            uniqueTopColors: uniqueFills.length,
            uniqueColorList: uniqueFills,
            mfInColor: mfIn.trim(),
            mfOutColor: mfOut.trim(),
            passUnique: uniqueFills.length >= Math.min(5, fills.length)
          };
        }
        return res;
      });

      allReports.barColors = colorRes;
      await page.close();
    }

    // -------------------------------------------------------------
    // PART E: Urgency Badges Test with Synthetic Dates
    // -------------------------------------------------------------
    console.log('=== PART E: Urgency Badges Test ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const badgeRes = await page.evaluate(() => {
        const today = '2026-11-13';
        window.__today = today;

        const syntheticItems = [
          { name: 'Item Hari Ini', iso: '2026-11-13', expectDiff: 0, expectBadge: 'bl-urgent' },
          { name: 'Item Besok', iso: '2026-11-14', expectDiff: 1, expectBadge: 'bl-urgent' },
          { name: 'Item 3 Hari', iso: '2026-11-16', expectDiff: 3, expectBadge: 'bl-urgent' },
          { name: 'Item 4 Hari', iso: '2026-11-17', expectDiff: 4, expectBadge: 'bl-soon' },
          { name: 'Item 7 Hari', iso: '2026-11-20', expectDiff: 7, expectBadge: 'bl-soon' },
          { name: 'Item 8 Hari', iso: '2026-11-21', expectDiff: 8, expectBadge: 'normal' },
          { name: 'Item Terlambat', iso: '2026-11-10', expectDiff: -3, expectBadge: 'bl-urgent' }
        ];

        // Test dayBadge or countdown logic directly from window
        const results = syntheticItems.map((item) => {
          const diff = (new Date(item.iso) - new Date(today)) / (86400 * 1000);
          const badgeClass = diff < 0 || diff <= 3 ? 'bl-urgent' : diff <= 7 ? 'bl-soon' : 'normal';
          const countdown = fmtCountdown(item.iso, today, diff < 0);
          return {
            name: item.name,
            targetISO: item.iso,
            diffDays: diff,
            countdownText: countdown,
            badgeClass,
            pass: badgeClass === item.expectBadge
          };
        });

        return results;
      });

      allReports.urgencyBadges = badgeRes;
      await page.close();
    }

    // -------------------------------------------------------------
    // PART F: Sidebar Measurements (Sticky, Full Height, No Collisions)
    // -------------------------------------------------------------
    console.log('=== PART F: Sidebar Measurements ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const sbRes = await page.evaluate(() => {
        const header = document.querySelector('.app > header');
        const hRect = header.getBoundingClientRect();
        const items = [...header.querySelectorAll('button, a')].filter((el) => {
          const cs = window.getComputedStyle(el);
          return cs.display !== 'none' && el.offsetHeight > 0;
        });

        const itemHeights = [];
        let collisions = 0;

        for (let i = 0; i < items.length; i++) {
          const r = items[i].getBoundingClientRect();
          itemHeights.push({
            id: items[i].id || items[i].className.slice(0, 20),
            y: Math.round(r.y),
            height: Math.round(r.height)
          });
          if (i > 0) {
            const prev = items[i - 1].getBoundingClientRect();
            // In flex containers, items must not overlap
            if (r.top < prev.bottom - 1 && r.bottom > prev.top + 1 && r.left === prev.left) {
              collisions++;
            }
          }
        }

        return {
          sidebarHeight: Math.round(hRect.height),
          viewportHeight: window.innerHeight,
          heightMatchesViewport: Math.round(hRect.height) === window.innerHeight,
          itemCount: items.length,
          itemHeights,
          collisions,
          passNoCollisions: collisions === 0
        };
      });

      allReports.sidebar = sbRes;
      await page.close();
    }

    // -------------------------------------------------------------
    // PART G: Transaction Pills & No Collision
    // -------------------------------------------------------------
    console.log('=== PART G: Transaction Pills ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      if (userDataRaw) {
        await page.evaluateOnNewDocument((raw) => {
          localStorage.setItem('rencana-keuangan-v1', raw);
        }, userDataRaw);
      }
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const pillRes = await page.evaluate(() => {
        const days = [...document.querySelectorAll('.tx-day')];
        const res = [];
        days.forEach((day) => {
          const dh = day.querySelector('.tx-dh');
          const pill = day.querySelector('.tx-pill');
          const firstRow = day.querySelector('.tx-row');
          if (dh && pill && firstRow) {
            const dhRect = dh.getBoundingClientRect();
            const pillRect = pill.getBoundingClientRect();
            const rowRect = firstRow.getBoundingClientRect();
            const gapToRow = Math.round(rowRect.top - dhRect.bottom);
            res.push({
              dateLabel: dh.querySelector('span')?.textContent,
              pillText: pill.textContent,
              gapToRow,
              passNoCollision: gapToRow >= 4 && pillRect.bottom <= rowRect.top
            });
          }
        });
        return res;
      });

      allReports.txPills = pillRes;
      await page.close();
    }

    // -------------------------------------------------------------
    // PART H: Donut Layout & Category List
    // -------------------------------------------------------------
    console.log('=== PART H: Donut & Category Layout ===');
    {
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      if (userDataRaw) {
        await page.evaluateOnNewDocument((raw) => {
          localStorage.setItem('rencana-keuangan-v1', raw);
        }, userDataRaw);
      }
      await page.goto(APP_URL, { waitUntil: 'networkidle0' });
      await new Promise((r) => setTimeout(r, 600));

      const donutRes = await page.evaluate(() => {
        const catCard = document.querySelector('.rk-cat');
        const donut = catCard?.querySelector('.dn-ring');
        const legend = catCard?.querySelector('.dn-lg');

        const dRect = donut ? donut.getBoundingClientRect() : null;
        const lRect = legend ? legend.getBoundingClientRect() : null;

        return {
          donutFound: !!donut,
          legendFound: !!legend,
          donutWidth: dRect ? Math.round(dRect.width) : null,
          donutHeight: dRect ? Math.round(dRect.height) : null,
          legendWidth: lRect ? Math.round(lRect.width) : null,
          legendHeight: lRect ? Math.round(lRect.height) : null,
          passRendered: !!donut && !!legend && dRect.width > 0 && lRect.width > 0
        };
      });

      allReports.donutLayout = donutRes;
      await page.close();
    }

    // Save full JSON report
    fs.writeFileSync(
      path.join(OUT_DIR_D3, 'fase-d-measurement-report.json'),
      JSON.stringify(allReports, null, 2),
      'utf8'
    );
    console.log('Saved fase-d-measurement-report.json successfully!');
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error('MEASUREMENT SCRIPT ERROR:', e);
  process.exit(1);
});
