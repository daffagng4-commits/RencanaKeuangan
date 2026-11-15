/**
 * Fase D Verification & Measurement Script
 * Generates verified measurements for Section 8 and saves screenshots to C:/Users/daffa/Documents/verif-fase-d/
 */
const puppeteer = require('C:/Users/daffa/Documents/verif-fase-c/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP_URL = 'file:///C:/Users/daffa/Music/backup/untuk antigravity14 nov-RencanaKeuangan-main/RencanaKeuangan-main/index.html';
const OUT_DIR = 'C:/Users/daffa/Documents/verif-fase-d';

const VIEWPORTS = [
  { name: '3840x2160', width: 3840, height: 2160, desc: 'Desktop Ultrawide' },
  { name: '2560x1440', width: 2560, height: 1440, desc: 'Desktop QHD/2K' },
  { name: '1920x1080', width: 1920, height: 1080, desc: 'Desktop FHD Standar' },
  { name: '1440x900',  width: 1440, height: 900,  desc: 'Laptop' },
  { name: '1280x800',  width: 1280, height: 800,  desc: 'Laptop kecil' },
  { name: '1024x768',  width: 1024, height: 768,  desc: 'Tablet Landscape' },
  { name: '768x1024',  width: 768,  height: 1024, desc: 'Tablet Portrait' },
  { name: '390x844',   width: 390,  height: 844,  desc: 'Mobile' }
];

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();

  // Load app at 1920x1080 default
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(APP_URL, { waitUntil: 'networkidle0' });

  // Wait for initial entrance animations (donut, bars, etc.) to fully finish
  await new Promise(r => setTimeout(r, 1200));

  console.log('=== RUNNING FASE D MEASUREMENTS ===\n');

  // --- MEASUREMENT 1: Stabilitas Tinggi Kartu (Tabel 1) ---
  console.log('--- Measuring Table 1: Card Height Stability across Toggles ---');
  const table1Results = await page.evaluate(async () => {
    const results = [];
    const getH = sel => Math.round(document.querySelector(sel)?.getBoundingClientRect().height || 0);

    // 1. Kondisi kas: Bulan -> Tahun -> Minggu
    const h1_before = getH('.rk-kas');
    document.querySelector('.rk-kas [data-flowp="y"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h1_after_y = getH('.rk-kas');
    document.querySelector('.rk-kas [data-flowp="w"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h1_after_w = getH('.rk-kas');
    document.querySelector('.rk-kas [data-flowp="m"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    results.push({ card: 'Kondisi kas', before: h1_before, after: h1_after_y, delta: Math.abs(h1_after_y - h1_before), notes: 'Toggle Tahun/Minggu' });

    // 2. Pemasukan vs pengeluaran: Bulan -> Tahun
    const h2_before = getH('.rk-mf');
    document.querySelector('.rk-mf [data-bsp="y"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h2_after = getH('.rk-mf');
    document.querySelector('.rk-mf [data-bsp="m"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    results.push({ card: 'Pemasukan vs pengeluaran', before: h2_before, after: h2_after, delta: Math.abs(h2_after - h2_before), notes: 'Toggle Tahun' });

    // 3. Pengeluaran per kategori: Keluar -> Masuk
    const h3_before = getH('.rk-cat');
    document.querySelector('.rk-cat [data-catd="+"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h3_after = getH('.rk-cat');
    document.querySelector('.rk-cat [data-catd="-"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    results.push({ card: 'Pengeluaran per kategori', before: h3_before, after: h3_after, delta: Math.abs(h3_after - h3_before), notes: 'Toggle Masuk' });

    // 4. Item pengeluaran terbesar: Tahun -> Bulan
    const h4_before = getH('.rk-top');
    document.querySelector('.rk-top [data-expm="m"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h4_after = getH('.rk-top');
    document.querySelector('.rk-top [data-expm="y"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    results.push({ card: 'Item pengeluaran terbesar', before: h4_before, after: h4_after, delta: Math.abs(h4_after - h4_before), notes: 'Toggle Bulan (+dropdown)' });

    // 5. Transaksi terakhir: Keluar -> Masuk -> Semua
    const h5_before = getH('.rk-tx');
    document.querySelector('.rk-tx [data-txd="+"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h5_after_in = getH('.rk-tx');
    document.querySelector('.rk-tx [data-txd="all"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const h5_after_all = getH('.rk-tx');
    document.querySelector('.rk-tx [data-txd="-"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    results.push({ card: 'Transaksi terakhir', before: h5_before, after: h5_after_in, delta: Math.abs(h5_after_in - h5_before), notes: 'Toggle Masuk/Semua' });

    // 6. Rincian arus tagihan: Klik baris bulan expand/collapse
    const h6_before = getH('.rk-detail');
    const row = document.querySelector('.rk-detail tr.row');
    if (row) {
      row.click();
      await new Promise(r => setTimeout(r, 60));
    }
    const h6_after_open = getH('.rk-detail');
    if (row) {
      row.click();
      await new Promise(r => setTimeout(r, 60));
    }
    results.push({ card: 'Rincian arus tagihan', before: h6_before, after: h6_after_open, delta: Math.abs(h6_after_open - h6_before), notes: 'Buka rincian baris bulan' });

    return results;
  });
  console.log('Table 1 Results:', JSON.stringify(table1Results, null, 2));

  // --- MEASUREMENT 2: Hover Stability pada Item Pengeluaran Terbesar (Tabel 2) ---
  console.log('\n--- Measuring Table 2: Hover Stability on Top Expenses ---');
  const table2Results = await page.evaluate(async () => {
    const card = document.querySelector('.rk-top .card') || document.querySelector('.rk-top');
    const before = Math.round(card.getBoundingClientRect().height * 10) / 10;
    
    // Simulate hover on first item
    const firstRow = document.querySelector('.expense-row');
    let during = before;
    if (firstRow) {
      const detail = firstRow.querySelector('.expense-detail');
      if (detail) {
        detail.style.display = 'block'; // simulate hover popover display
      }
      during = Math.round(card.getBoundingClientRect().height * 10) / 10;
      if (detail) {
        detail.style.display = '';
      }
    }
    return {
      card: 'Item pengeluaran terbesar',
      before: before,
      during: during,
      delta: Math.abs(during - before)
    };
  });
  console.log('Table 2 Results:', JSON.stringify(table2Results, null, 2));

  // --- MEASUREMENT 3: Isolasi Render (Tabel 3) ---
  console.log('\n--- Measuring Table 3: Render Isolation (Mutations on Other Cards) ---');
  await new Promise(r => setTimeout(r, 600));
  const table3Results = await page.evaluate(async () => {
    const cardSelectors = {
      'Kondisi kas': '.rk-kas',
      'Pemasukan vs pengeluaran': '.rk-mf',
      'Pengeluaran per kategori': '.rk-cat',
      'Item pengeluaran terbesar': '.rk-top',
      'Transaksi terakhir': '.rk-tx',
      'Rincian arus tagihan': '.rk-detail'
    };

    const countMutationsOnOthers = async (targetCardName, triggerFn) => {
      let mutationCount = 0;
      const observers = [];

      for (const [name, sel] of Object.entries(cardSelectors)) {
        if (name === targetCardName) continue;
        const el = document.querySelector(sel);
        if (!el) continue;
        const obs = new MutationObserver(muts => {
          mutationCount += muts.length;
        });
        obs.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
        observers.push(obs);
      }

      await triggerFn();
      await new Promise(r => setTimeout(r, 60));

      observers.forEach(o => o.disconnect());
      return mutationCount;
    };

    const res = [];

    // Test 1: Toggle Kondisi kas
    const muts1 = await countMutationsOnOthers('Kondisi kas', async () => {
      document.querySelector('.rk-kas [data-flowp="y"]')?.click();
    });
    res.push({ trigger: 'Toggle Minggu/Bulan/Tahun di Kondisi kas', mutationsOnOthers: muts1, status: muts1 === 0 ? 'TERISOLASI' : 'BOCOR' });

    // Test 2: Toggle Pemasukan vs pengeluaran
    const muts2 = await countMutationsOnOthers('Pemasukan vs pengeluaran', async () => {
      document.querySelector('.rk-mf [data-bsp="y"]')?.click();
    });
    res.push({ trigger: 'Toggle Bulan/Tahun di Pemasukan vs pengeluaran', mutationsOnOthers: muts2, status: muts2 === 0 ? 'TERISOLASI' : 'BOCOR' });

    // Test 3: Toggle Pengeluaran per kategori
    const muts3 = await countMutationsOnOthers('Pengeluaran per kategori', async () => {
      document.querySelector('.rk-cat [data-catd="+"]')?.click();
    });
    res.push({ trigger: 'Toggle Keluar/Masuk di Pengeluaran per kategori', mutationsOnOthers: muts3, status: muts3 === 0 ? 'TERISOLASI' : 'BOCOR' });

    // Test 4: Toggle Item pengeluaran terbesar
    const muts4 = await countMutationsOnOthers('Item pengeluaran terbesar', async () => {
      document.querySelector('.rk-top [data-expm="m"]')?.click();
    });
    res.push({ trigger: 'Toggle Minggu/Bulan/Tahun di Item terbesar', mutationsOnOthers: muts4, status: muts4 === 0 ? 'TERISOLASI' : 'BOCOR' });

    // Test 5: Toggle Transaksi terakhir
    const muts5 = await countMutationsOnOthers('Transaksi terakhir', async () => {
      document.querySelector('.rk-tx [data-txd="+"]')?.click();
    });
    res.push({ trigger: 'Toggle Keluar/Masuk/Semua di Transaksi terakhir', mutationsOnOthers: muts5, status: muts5 === 0 ? 'TERISOLASI' : 'BOCOR' });

    // Test 6: Klik baris di Rincian arus tagihan
    const muts6 = await countMutationsOnOthers('Rincian arus tagihan', async () => {
      document.querySelector('.rk-detail tr.row')?.click();
    });
    res.push({ trigger: 'Klik baris bulan di Rincian arus tagihan', mutationsOnOthers: muts6, status: muts6 === 0 ? 'TERISOLASI' : 'BOCOR' });

    return res;
  });
  console.log('Table 3 Results:', JSON.stringify(table3Results, null, 2));

  // --- MEASUREMENT 4: Lebar Konten vs Viewport (Tabel 4) ---
  console.log('\n--- Measuring Table 4: Content Width across 8 Viewports ---');
  const table4Results = [];
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await new Promise(r => setTimeout(r, 200));

    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('#rk-nav');
      const rk = document.querySelector('.rk');
      const wEl = document.querySelector('.w');
      const vpW = window.innerWidth;
      
      const isColSidebar = nav && window.getComputedStyle(nav).display !== 'none' && Math.round(nav.getBoundingClientRect().width) < vpW;
      const sbW = isColSidebar ? Math.round(nav.getBoundingClientRect().width) : 0;
      const contentW = rk ? Math.round(rk.getBoundingClientRect().width) : (wEl ? Math.round(wEl.getBoundingClientRect().width) : 0);
      const remainingW = vpW - sbW;
      const ratio = remainingW > 0 ? Math.round((contentW / remainingW) * 100) : 0;

      return { sbW, contentW, remainingW, ratio };
    });

    table4Results.push({
      viewport: vp.name,
      description: vp.desc,
      viewportWidth: vp.width,
      sidebarWidth: metrics.sbW,
      contentWidth: metrics.contentW,
      remainingWidth: metrics.remainingW,
      ratio: metrics.ratio + '%'
    });

    // Save screenshots for Light and Dark themes for Section 6 verification
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => {
        document.documentElement.setAttribute('data-theme', t);
        if (t === 'dark') document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      }, theme);
      await new Promise(r => setTimeout(r, 100));

      const screenshotName = `${vp.width}-${theme}-2026-full.png`;
      await page.screenshot({ path: path.join(OUT_DIR, screenshotName), fullPage: false });
    }
  }
  console.log('Table 4 Results:', JSON.stringify(table4Results, null, 2));

  // Reset to 1920x1080 light
  await page.setViewport({ width: 1920, height: 1080 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  // --- MEASUREMENT 5: Profil 2026 vs Profil 2027 (Tabel 5) ---
  console.log('\n--- Measuring Table 5: Row Heights Profile 2026 vs 2027 ---');
  const table5Results = await page.evaluate(async () => {
    const getRowHeights = () => {
      const getH = sel => Math.round(document.querySelector(sel)?.getBoundingClientRect().height || 0);
      return {
        row1_left: getH('.rk-kas'),
        row1_right: getH('.rk-bills'),
        row2_left: getH('.rk-mf'),
        row2_mid: getH('.rk-cat'),
        row2_right: getH('.rk-top'),
        row3_left: getH('.rk-detail'),
        row3_right: getH('.rk-tx')
      };
    };

    // 1. Measure 2026
    if (window.switchYear) window.switchYear(2026);
    else {
      const y26 = document.querySelector('[data-y="2026"]');
      if (y26) y26.click();
    }
    await new Promise(r => setTimeout(r, 200));
    const h2026 = getRowHeights();

    // 2. Measure 2027
    if (window.switchYear) window.switchYear(2027);
    else {
      const y27 = document.querySelector('[data-y="2027"]');
      if (y27) y27.click();
    }
    await new Promise(r => setTimeout(r, 200));
    const h2027 = getRowHeights();

    // Reset back to 2026
    if (window.switchYear) window.switchYear(2026);
    await new Promise(r => setTimeout(r, 100));

    return [
      {
        row: 'Baris 1 (Kondisi kas & Jadwal tagihan)',
        height2026: `${h2026.row1_left}px / ${h2026.row1_right}px`,
        height2027: `${h2027.row1_left}px / ${h2027.row1_right}px`,
        delta: `${Math.abs(h2027.row1_left - h2026.row1_left)}px`,
        status: h2026.row1_left === h2027.row1_left ? 'TERKUNCI IDENTIK' : 'BERGESER'
      },
      {
        row: 'Baris 2 (Arus, Kategori, Item terbesar)',
        height2026: `${h2026.row2_left}px / ${h2026.row2_mid}px / ${h2026.row2_right}px`,
        height2027: `${h2027.row2_left}px / ${h2027.row2_mid}px / ${h2027.row2_right}px`,
        delta: `${Math.abs(h2027.row2_left - h2026.row2_left)}px`,
        status: h2026.row2_left === h2027.row2_left ? 'TERKUNCI IDENTIK' : 'BERGESER'
      },
      {
        row: 'Baris 3 (Rincian arus & Transaksi terakhir)',
        height2026: `${h2026.row3_left}px / ${h2026.row3_right}px`,
        height2027: `${h2027.row3_left}px / ${h2027.row3_right}px`,
        delta: `${Math.abs(h2027.row3_left - h2026.row3_left)}px`,
        status: h2026.row3_left === h2027.row3_left ? 'TERKUNCI IDENTIK' : 'BERGESER'
      }
    ];
  });
  console.log('Table 5 Results:', JSON.stringify(table5Results, null, 2));

  // --- MEASUREMENT 6: Item pengeluaran terbesar Toggle Shift (Issue 12) ---
  console.log('\n--- Measuring Issue 12: Item pengeluaran terbesar Toggle Position Shift ---');
  const toggleShiftResults = await page.evaluate(async () => {
    const getPos = () => {
      const el = document.querySelector('.expense-tabs') || document.querySelector('[data-expm="y"]')?.parentElement;
      return el ? Math.round(el.getBoundingClientRect().right) : 0;
    };
    
    // Mode 'y'
    document.querySelector('.rk-top [data-expm="y"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const posX_y = getPos();

    // Mode 'm' (adds month dropdown)
    document.querySelector('.rk-top [data-expm="m"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const posX_m = getPos();

    // Mode 'w'
    document.querySelector('.rk-top [data-expm="w"]')?.click();
    await new Promise(r => setTimeout(r, 60));
    const posX_w = getPos();

    // Return to 'y'
    document.querySelector('.rk-top [data-expm="y"]')?.click();

    return {
      rightEdge_Tahun: posX_y,
      rightEdge_Bulan: posX_m,
      rightEdge_Minggu: posX_w,
      shiftDelta: Math.abs(posX_m - posX_y),
      status: Math.abs(posX_m - posX_y) === 0 ? '0 px (TIDAK BERGESER)' : `${Math.abs(posX_m - posX_y)}px`
    };
  });
  console.log('Issue 12 Toggle Shift Results:', JSON.stringify(toggleShiftResults, null, 2));

  // Write full JSON output
  const finalSummary = {
    table1: table1Results,
    table2: table2Results,
    table3: table3Results,
    table4: table4Results,
    table5: table5Results,
    toggleShift: toggleShiftResults
  };

  fs.writeFileSync(path.join(OUT_DIR, 'verification-summary.json'), JSON.stringify(finalSummary, null, 2));
  console.log(`\nVerification summary written to ${path.join(OUT_DIR, 'verification-summary.json')}`);

  await browser.close();
  console.log('\nAll measurements and screenshots completed successfully!');
}

main().catch(err => {
  console.error('Fatal error during measurement:', err);
  process.exit(1);
});
