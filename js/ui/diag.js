/**
 * Cek sistem: memeriksa penyimpanan, unduhan, dan koneksi Supabase.
 */

function dgRow(r) {
  var ic = { ok: '&#10003;', bad: '&#10007;', warn: '&#9888;', info: '&#8505;' }[r[0]],
    col = { ok: 'var(--ac)', bad: 'var(--wr)', warn: 'var(--wr)', info: 'var(--mut)' }[r[0]];
  return (
    '<div class="it2" style="align-items:flex-start;gap:10px"><span style="color:' +
    col +
    ';font-weight:700;min-width:18px">' +
    ic +
    '</span><div style="flex:1"><b>' +
    r[1] +
    '</b><div class="sub">' +
    esc(r[2]) +
    '</div></div></div>'
  );
}

/** Terjemahkan error Supabase menjadi saran perbaikan. */
function sbErrHint(e) {
  var m = String((e && (e.message || e.error_description)) || ''),
    c = (e && e.code) || '';
  if (/Invalid API key|apikey/i.test(m))
    return 'API key salah. Salin lagi Publishable key dari Project Settings > API Keys.';
  if (c === '42P01' || /does not exist|Could not find the table/i.test(m))
    return 'Tabel rk_state belum ada. Jalankan schema.sql di SQL Editor Supabase.';
  if (/JWT|expired/i.test(m)) return 'Sesi login kedaluwarsa. Keluar lalu masuk lagi.';
  if (c === '42501' || /row-level security|permission denied/i.test(m))
    return 'Ditolak aturan keamanan (RLS). Jalankan ulang schema.sql dan pastikan policy ada.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m))
    return 'Tidak bisa menghubungi Supabase. Cek koneksi dan pastikan SB_URL hanya https://xxxx.supabase.co.';
  return m || 'Penyebab tidak diketahui.';
}

/** Jalankan semua pemeriksaan sistem dan tampilkan hasilnya. */
async function runDiag() {
  var R = [],
    out = $('dgr');
  out.innerHTML = '<div class="sub">Memeriksa...</div>';
  try {
    localStorage.setItem('rk-test', '1');
    localStorage.removeItem('rk-test');
    R.push(['ok', 'Penyimpanan di browser', 'Berfungsi. Data tersimpan otomatis di perangkat ini.']);
  } catch (e) {
    R.push([
      'bad',
      'Penyimpanan di browser',
      'Tidak tersedia (mode privat atau diblokir). Data hanya ada selama tab terbuka. Gunakan Cadangan.',
    ]);
  }
  R.push([
    'info',
    'Layar dan tema',
    innerWidth +
      ' x ' +
      innerHeight +
      ' px, tema ' +
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'gelap' : 'terang') +
      (matchMedia('(display-mode: standalone)').matches ? ', mode aplikasi' : '') +
      '.',
  ]);
  var dl = typeof URL !== 'undefined' && !!URL.createObjectURL && 'download' in document.createElement('a');
  R.push([
    dl ? 'ok' : 'warn',
    'Unduh file',
    dl
      ? 'Didukung. Tekan "Tes unduh file", lalu cek folder Unduhan.'
      : 'Browser ini tidak mendukung unduhan langsung. Pakai cara teks (salin/tempel).',
  ]);
  if (typeof sb === 'undefined') {
    R.push(['info', 'Supabase', 'Versi ini tidak memakai Supabase (hanya penyimpanan lokal).']);
  } else if (!sb) {
    R.push([
      'bad',
      'Supabase',
      !SB_URL || !SB_KEY
        ? 'SB_URL atau SB_KEY belum diisi di index.html.'
        : !window.supabase
          ? 'Pustaka Supabase gagal dimuat (koneksi atau pemblokir iklan?).'
          : 'Konfigurasi tidak valid.',
    ]);
  } else {
    var okU = false;
    try {
      var o = new URL(SB_URL.trim());
      okU = o.protocol === 'https:' && /\.supabase\.co$/.test(o.hostname);
    } catch (e) {}
    R.push([
      okU ? 'ok' : 'warn',
      'Alamat proyek (SB_URL)',
      okU ? new URL(SB_URL.trim()).origin : 'Bentuknya harus https://xxxx.supabase.co',
    ]);
    var k = SB_KEY.trim(),
      role = '';
    try {
      if (/^eyJ/.test(k)) role = JSON.parse(atob(k.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role;
    } catch (e) {}
    if (/^sb_secret_/.test(k) || role === 'service_role')
      R.push([
        'bad',
        'Kunci (SB_KEY)',
        'BAHAYA: ini kunci rahasia. Ganti dengan Publishable key dan hapus kunci ini dari repo.',
      ]);
    else
      R.push([
        /^sb_publishable_/.test(k) || role === 'anon' ? 'ok' : 'warn',
        'Kunci (SB_KEY)',
        /^sb_publishable_/.test(k)
          ? 'Publishable key.'
          : role === 'anon'
            ? 'Kunci anon (lama).'
            : 'Bentuk kunci tidak dikenali.',
      ]);
    if (!sbUser) {
      R.push(['warn', 'Login', 'Belum masuk. Klik Masuk lalu jalankan cek lagi.']);
    } else {
      R.push(['ok', 'Login', 'Masuk sebagai ' + (sbUser.email || sbUser.id) + '.']);
      var t0 = Date.now(),
        r;
      try {
        r = await sb.from('rk_state').select('rev').eq('user_id', sbUser.id).maybeSingle();
      } catch (e) {
        r = { error: e };
      }
      if (r.error) {
        R.push(['bad', 'Baca tabel rk_state', sbErrHint(r.error)]);
      } else {
        var rr = r.data ? +r.data.rev || 0 : null,
          lr = +ALL.rev || 0;
        R.push([
          'ok',
          'Baca tabel rk_state',
          'Berhasil (' +
            (Date.now() - t0) +
            ' ms). ' +
            (r.data ? 'Data cloud ada.' : 'Belum ada data cloud.'),
        ]);
        if (rr !== null)
          R.push([
            'info',
            'Versi data',
            rr === lr
              ? 'Perangkat ini dan cloud sama.'
              : lr > rr
                ? 'Data perangkat ini lebih baru dari cloud.'
                : 'Data cloud lebih baru dari perangkat ini.',
          ]);
        if (syncBlocked) {
          R.push([
            'warn',
            'Tes tulis',
            'Dilewati: sinkron sedang ditunda karena data berbeda. Selesaikan dulu lewat tautan di bagian atas.',
          ]);
        } else if (rr !== null && lr < rr) {
          R.push([
            'warn',
            'Tes tulis',
            'Dilewati: data cloud lebih baru. Muat ulang halaman agar data cloud dimuat dulu.',
          ]);
        } else {
          await push();
          var r2;
          try {
            r2 = await sb.from('rk_state').select('rev').eq('user_id', sbUser.id).maybeSingle();
          } catch (e) {
            r2 = { error: e };
          }
          if (r2.error || !r2.data)
            R.push([
              'bad',
              'Tes tulis',
              r2.error
                ? sbErrHint(r2.error)
                : 'Data tidak ditemukan setelah menulis. Periksa policy RLS (insert/update).',
            ]);
          else
            R.push([
              +r2.data.rev === ALL.rev ? 'ok' : 'bad',
              'Tes tulis dan baca balik',
              +r2.data.rev === ALL.rev
                ? 'Berhasil. Menyimpan ke cloud dan membacanya kembali sama.'
                : 'Tulis tidak tercatat di cloud. Status: ' + $('sbs').textContent,
            ]);
        }
      }
    }
  }
  out.innerHTML =
    R.map(dgRow).join('') +
    '<div class="sub" style="margin-top:6px">Selesai ' +
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
    '.</div>';
}

/** Pasang event listener halaman ini. */
function bindDiag() {
  $('dgb').onclick = runDiag;
  $('dgd').onclick = function () {
    exportFile(
      'tes-rencana-keuangan.txt',
      'Tes unduh Rencana Keuangan berhasil.\n' + new Date().toISOString() + '\n',
    );
  };
}
