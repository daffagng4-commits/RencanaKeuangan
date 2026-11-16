const assert = require('assert');
const { boot } = require('./ui.js');

(async () => {
  const t = boot();
  try {
    await t.ready();
    const doc = t.w.document;

    // Load standard data fixture
    const fs = require('fs');
    const rawData = fs.readFileSync('C:/Users/daffa/Downloads/data.json', 'utf8');
    t.w.__today = '2026-11-15';
    t.w.ALL = t.w.norm(JSON.parse(rawData));
    t.w.ALL.year = 2026;
    t.w.S = t.w.ALL.data[2026];
    t.w.save();
    if (t.w.switchYear) t.w.switchYear('2026');
    if (t.w.render) t.w.render();
    if (t.w.navGo) t.w.navGo('jadwal');
    else if (t.w.tab) t.w.tab('jadwal');

    await new Promise(r => setTimeout(r, 100));

    // 1. Verifikasi Ringkasan Global (Summary)
    const statsText = (doc.getElementById('jad-paid-amt').parentElement.textContent + ' ' + doc.getElementById('jad-unpaid-amt').parentElement.textContent).replace(/\s+/g, ' ');
    assert(statsText.includes('Rp 2.615.000') && statsText.includes('6 dari 15 tagihan'), 'Sudah dibayar global: Rp 2.615.000 (6 dari 15): ' + statsText);
    assert(statsText.includes('Rp 4.985.000') && statsText.includes('9 tagihan'), 'Belum dibayar global: Rp 4.985.000 (9): ' + statsText);

    // 2. Verifikasi Tabel Mempertahankan 12 Kolom Bulan Penuh (Jan-Des)
    const ths = Array.from(doc.querySelectorAll('#tab-jadwal thead th')).map(th => th.textContent.trim());
    assert.strictEqual(ths.length, 15, 'Tabel harus memiliki 15 kolom (Item, Biaya, 12 Bulan Jan-Des, Total)');
    assert.strictEqual(ths[0], 'Item');
    assert.strictEqual(ths[1], 'Biaya');
    assert.strictEqual(ths[2], 'Jan');
    assert.strictEqual(ths[13], 'Des');
    assert.strictEqual(ths[14], 'Total');

    // 3. Verifikasi Filter Segmen (Semua 9, Belum lunas 8, Lunas 1)
    const btnAll = doc.querySelector('#tab-jadwal [data-jfilter="all"]');
    const btnOpen = doc.querySelector('#tab-jadwal [data-jfilter="unpaid"]');
    const btnDone = doc.querySelector('#tab-jadwal [data-jfilter="paid"]');
    assert(btnAll && btnOpen && btnDone, 'Tiga tombol filter harus ada');
    assert.strictEqual(doc.getElementById('jf-cnt-all').textContent.trim(), '9');
    assert.strictEqual(doc.getElementById('jf-cnt-unpaid').textContent.trim(), '8');
    assert.strictEqual(doc.getElementById('jf-cnt-paid').textContent.trim(), '1');
    assert.strictEqual(btnAll.getAttribute('aria-pressed'), 'true');
    assert.strictEqual(btnOpen.getAttribute('aria-pressed'), 'false');
    assert.strictEqual(btnDone.getAttribute('aria-pressed'), 'false');

    // 4. Baris dan Total pada Filter 'Semua'
    let rows = doc.querySelectorAll('#jadwal-tbody tr[data-r]');
    assert.strictEqual(rows.length, 9, 'Filter Semua harus menampilkan seluruh 9 item');
    let footCells = Array.from(doc.querySelectorAll('#jadwal-tfoot td')).map(td => td.textContent.trim());
    assert.strictEqual(footCells[0], 'Total per bulan', 'Footer Semua tidak memiliki keterangan filter');
    assert(footCells[12].includes('3,17') || footCells[12].includes('3.165') || footCells[12].includes('3,2'), 'Total Nov: ' + footCells[12]);
    assert(footCells[13].includes('4,44') || footCells[13].includes('4.435') || footCells[13].includes('4,4'), 'Total Des: ' + footCells[13]);
    assert(footCells[14].includes('7.600.000'), 'Total keseluruhan harus 7.600.000');

    const jktItem = t.w.S.items.find(x => x.name.includes('JKT48'));
    const vidioItem = t.w.S.items.find(x => x.name.includes('Vidio'));
    const etfItem = t.w.S.items.find(x => x.name.includes('ETF'));

    // 5. Verifikasi Filter 'Belum lunas'
    btnOpen.click();
    await new Promise(r => setTimeout(r, 60));
    rows = doc.querySelectorAll('#jadwal-tbody tr[data-r]');
    assert.strictEqual(rows.length, 8, 'Filter Belum lunas harus menampilkan 8 item (JKT48 disembunyikan)');
    const ids = Array.from(rows).map(r => r.getAttribute('data-r'));
    assert(!ids.includes(String(jktItem.id)), 'JKT48 harus tidak ada di Belum lunas');
    footCells = Array.from(doc.querySelectorAll('#jadwal-tfoot td')).map(td => td.textContent.trim());
    assert(footCells[0].includes('Total per bulan') && footCells[0].includes('(filter: Belum lunas)'), 'Footer harus berlabel (filter: Belum lunas)');
    assert(footCells[14].includes('7.250.000'), 'Total keseluruhan Belum lunas harus 7.250.000');

    // 6. Verifikasi Filter 'Lunas'
    btnDone.click();
    await new Promise(r => setTimeout(r, 60));
    rows = doc.querySelectorAll('#jadwal-tbody tr[data-r]');
    assert.strictEqual(rows.length, 1, 'Filter Lunas harus menampilkan 1 item (JKT48 saja)');
    assert.strictEqual(rows[0].getAttribute('data-r'), String(jktItem.id), 'Item lunas harus JKT48');
    footCells = Array.from(doc.querySelectorAll('#jadwal-tfoot td')).map(td => td.textContent.trim());
    assert(footCells[0].includes('(filter: Lunas)'), 'Footer harus berlabel (filter: Lunas)');
    assert(footCells[14].includes('350.000'), 'Total keseluruhan Lunas harus 350.000');

    // 7. Verifikasi Perilaku Menandai Lunas Saat Filter Belum Lunas Aktif via UI (Tidak Melompat)
    btnOpen.click();
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(doc.querySelectorAll('#jadwal-tbody tr[data-r]').length, 8);

    const vidioChip = doc.querySelector(`#jadwal-tbody [data-chip-it="${vidioItem.id}"][data-chip-iso="2026-12-12"]`);
    assert(vidioChip, 'Chip Vidio harus ada');
    vidioChip.click();
    doc.querySelector('#chip-popover [data-cp-act="paid"]').click();
    await new Promise(r => setTimeout(r, 60));

    // Baris Vidio tetap harus tampil di DOM (tidak langsung hilang mendadak)
    rows = doc.querySelectorAll('#jadwal-tbody tr[data-r]');
    assert.strictEqual(rows.length, 8, 'Baris yang baru ditandai lunas TETAP tampil di tabel sampai filter diganti');
    const vidioRow = doc.querySelector('#jadwal-tbody tr[data-r="' + vidioItem.id + '"]');
    assert(vidioRow && vidioRow.classList.contains('done'), 'Baris Vidio sekarang memiliki kelas .done');
    assert.strictEqual(doc.getElementById('jf-cnt-all').textContent.trim(), '9');
    assert.strictEqual(doc.getElementById('jf-cnt-unpaid').textContent.trim(), '7');
    assert.strictEqual(doc.getElementById('jf-cnt-paid').textContent.trim(), '2');

    // Klik filter Belum lunas ulang -> Vidio tereliminasi
    btnOpen.click();
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(doc.querySelectorAll('#jadwal-tbody tr[data-r]').length, 7);

    // Kembalikan status Vidio sebelum tes lanjutan
    delete t.w.S.paid[vidioItem.id + '|2026-12-12'];
    t.w.save(); t.w.renderAll(); await new Promise(r => setTimeout(r, 60));
    btnAll.click();
    await new Promise(r => setTimeout(r, 60));
    assert.strictEqual(doc.querySelectorAll('#jadwal-tbody tr[data-r]').length, 9);

    // 8. Verifikasi Lencana & Posisi Tag di Sel ITEM
    const etfRow = doc.querySelector('#jadwal-tbody tr[data-r="' + etfItem.id + '"]');
    assert(etfRow, 'Baris ETF 60% harus ada');
    assert(etfRow.querySelector('td:first-child .item-tags'), 'Kontainer .item-tags berada di td:first-child');
    const biayaCell = etfRow.querySelector('td:nth-child(2)');
    assert(!biayaCell.querySelector('.badge'), 'Kolom Biaya TIDAK boleh memuat lencana');

    // 9. Verifikasi 0 mutasi DOM di luar #tab-jadwal saat filter diganti
    let outsideMutations = 0;
    const mo = new t.w.MutationObserver((muts) => {
      for (const m of muts) {
        if (!doc.getElementById('tab-jadwal').contains(m.target)) outsideMutations++;
      }
    });
    mo.observe(doc.querySelector('.workspace'), { childList: true, subtree: true, attributes: true, characterData: true });
    for (let i = 0; i < 5; i++) {
      btnOpen.click(); btnDone.click(); btnAll.click();
    }
    await new Promise(r => setTimeout(r, 40));
    mo.disconnect();
    assert.strictEqual(outsideMutations, 0, 'Tidak boleh ada mutasi DOM di luar #tab-jadwal saat mengganti filter');

    // 10. Ganti tahun mempertahankan daftar kosong yang rapi
    btnDone.click();
    t.w.switchYear(2027);
    await new Promise(r => setTimeout(r, 60));
    if (doc.querySelectorAll('#jadwal-tbody tr[data-r]').length === 0) {
      assert(doc.getElementById('jadwal-empty-msg').style.display !== 'none', 'Pesan kosong tampil saat hasil 0');
    }

    console.log('Semua invariant jadwal_tab_structure.test.js lulus.');
  } finally {
    t.w.close();
  }
})();
