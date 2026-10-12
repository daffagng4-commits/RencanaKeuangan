/**
 * Sinkron Supabase: login, dorong/tarik data, dialog konflik.
 */

var pushT = null;

var sb = null,
  sbUser = null;

/** Tulis status sinkron di header. */
function sbStat(t, bad) {
  var e = $('sbs');
  e.textContent = t;
  e.style.color = bad ? 'var(--wr)' : 'var(--mut)';
}

/** Jam sekarang (HH.MM). */
function clock() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/** Buat klien Supabase bila SB_URL/SB_KEY valid dan pustaka termuat. */
function sbInit() {
  if (!SB_URL || !SB_KEY || !window.supabase) {
    $('lgb').hidden = true;
    sbStat('Mode lokal (Supabase belum diisi)');
    return;
  }
  var u0;
  try {
    u0 = new URL(SB_URL.trim()).origin;
  } catch (e) {
    $('lgb').hidden = true;
    sbStat('SB_URL tidak valid. Harus berbentuk https://xxxx.supabase.co', 1);
    return;
  }
  sb = supabase.createClient(u0, SB_KEY.trim());
  sbStat('Belum masuk. Data tersimpan lokal.');
  sb.auth.getSession().then(function (r) {
    setUser(r.data.session);
  });
  sb.auth.onAuthStateChange(function (_e, s) {
    setUser(s);
  });
}

/** Dipanggil saat sesi login berubah; memulai tarik data setelah login. */
function setUser(s) {
  var u = (s && s.user) || null;
  if ((u && u.id) === (sbUser && sbUser.id)) return;
  sbUser = u;
  syncBlocked = false;
  $('lgb').textContent = u ? 'Keluar' : 'Masuk';
  if (u) {
    sbStat('Menyinkronkan...');
    pull();
  } else sbStat('Belum masuk. Data tersimpan lokal.');
}

/** Jadwalkan kirim ke cloud 1,2 detik setelah perubahan terakhir. */
function schedPush() {
  if (!sb || !sbUser || syncBlocked) return;
  sbStat('Menyimpan ke cloud...');
  clearTimeout(pushT);
  pushT = setTimeout(push, 1200);
}

var syncBlocked = false,
  cfRow = null;

/** Versi (rev) terakhir yang berhasil disinkronkan perangkat ini untuk akun aktif. */
function getSync() {
  try {
    var s = JSON.parse(localStorage.getItem('rk-sync') || 'null');
    return s && sbUser && s.u === sbUser.id ? +s.rev : null;
  } catch (e) {
    return null;
  }
}

/** Catat versi sinkron terakhir. */
function setSync(rev) {
  try {
    localStorage.setItem('rk-sync', JSON.stringify({ u: sbUser.id, rev: rev }));
  } catch (e) {}
}

/** Kirim state ke cloud (upsert satu baris per akun). */
function push() {
  pushT = null;
  if (!sb || !sbUser || syncBlocked) return Promise.resolve();
  if (!ALL.rev) {
    ALL.rev = Date.now();
    try {
      localStorage.setItem(KEY, JSON.stringify(ALL));
    } catch (e) {}
  }
  return sb
    .from('rk_state')
    .upsert({ user_id: sbUser.id, data: ALL, rev: ALL.rev, updated_at: new Date().toISOString() })
    .then(function (r) {
      if (r.error) {
        sbStat('Gagal simpan ke cloud: ' + r.error.message, 1);
      } else {
        setSync(ALL.rev);
        sbStat('Tersinkron ' + clock());
      }
    });
}

/** Tanda tangan isi data (untuk membandingkan lokal vs cloud). */
function dataSig(a) {
  return JSON.stringify(a.data);
}

/** Apakah data lokal masih data contoh yang belum diubah. */
function isPristine() {
  return dataSig(ALL) === dataSig(norm(null));
}

/** Pakai data cloud di perangkat ini (data lokal dicadangkan dulu). */
function applyRemote(row, label) {
  var sn = snap(label || 'Sebelum memuat data cloud'),
    rr = +row.rev || 0;
  ALL = norm(JSON.parse(JSON.stringify(row.data)));
  ALL.rev = rr;
  S = ALL.data[ALL.year];
  lastData = JSON.stringify(ALL.data);
  try {
    localStorage.setItem(KEY, JSON.stringify(ALL));
  } catch (e) {}
  setSync(rr);
  syncUI();
  sbStat('Tersinkron ' + clock() + ' (data cloud dimuat)');
  return sn;
}

/** Bandingkan cloud vs lokal: sama -> selesai; hanya satu sisi berubah -> ikuti; keduanya berubah -> dialog konflik. */
function pull() {
  if (!sb || !sbUser) return Promise.resolve();
  return sb
    .from('rk_state')
    .select('data,rev')
    .eq('user_id', sbUser.id)
    .maybeSingle()
    .then(function (r) {
      if (r.error) {
        sbStat('Gagal sinkron: ' + r.error.message, 1);
        return;
      }
      var row = r.data;
      if (!row) return push();
      var rr = +row.rev || 0,
        lr = +ALL.rev || 0,
        ls = getSync(),
        rn = norm(JSON.parse(JSON.stringify(row.data)));
      if (dataSig(rn) === dataSig(ALL)) {
        ALL.rev = Math.max(lr, rr);
        try {
          localStorage.setItem(KEY, JSON.stringify(ALL));
        } catch (e) {}
        setSync(ALL.rev);
        sbStat('Tersinkron ' + clock());
        return;
      }
      var localChanged = !isPristine() && (ls === null || lr === 0 || lr > ls),
        remoteChanged = ls === null || rr > ls;
      if (!localChanged) {
        applyRemote(row);
        return;
      }
      if (!remoteChanged) return push();
      askConflict(row, rn);
    });
}

/** Ringkasan data untuk dialog konflik. */
function descAll(a, rev) {
  var cur = a.data[a.year] || {},
    ys = Object.keys(a.data).sort(),
    n = ys.reduce(function (s, k) {
      return s + (a.data[k].items || []).length;
    }, 0);
  return (
    (rev ? new Date(rev).toLocaleString('id-ID') : 'waktu tidak diketahui') +
    '<br>Tahun: ' +
    ys.join(', ') +
    '<br>Item: ' +
    n +
    '<br>Saldo awal ' +
    a.year +
    ': ' +
    rp(cur.saldo || 0)
  );
}

/** Tampilkan dialog pilihan saat data cloud dan lokal sama-sama berubah; sinkron diblokir sampai ada pilihan. */
function askConflict(row, rn) {
  syncBlocked = true;
  cfRow = row;
  var lr = +ALL.rev || 0,
    rr = +row.rev || 0;
  $('cf-l').className = 'cfc' + (lr > rr ? ' new' : '');
  $('cf-r').className = 'cfc' + (rr > lr ? ' new' : '');
  $('cf-l').innerHTML =
    '<div class="h3" style="margin:0 0 4px">Di perangkat ini' +
    (lr > rr ? ' (lebih baru)' : '') +
    '</div>' +
    descAll(ALL, lr);
  $('cf-r').innerHTML =
    '<div class="h3" style="margin:0 0 4px">Di cloud' +
    (rr > lr ? ' (lebih baru)' : '') +
    '</div>' +
    descAll(rn, rr);
  $('cf').hidden = false;
  sbStat('Menunggu pilihan: data berbeda.', 1);
}

/** Tampilkan tautan "Selesaikan sekarang" saat sinkron ditunda. */
function sbPending() {
  $('sbs').style.color = 'var(--wr)';
  $('sbs').innerHTML = 'Sinkron ditunda karena data berbeda. <a href="#" id="sbr">Selesaikan sekarang</a>';
}

/** Masuk (in) atau daftar (up) dengan email dan password. */
function auth(kind) {
  var e = $('le').value.trim(),
    p = $('lp').value;
  if (!e || p.length < 6) {
    $('lm').textContent = 'Isi email dan password (min. 6 karakter).';
    return;
  }
  (kind === 'up'
    ? sb.auth.signUp({ email: e, password: p })
    : sb.auth.signInWithPassword({ email: e, password: p })
  ).then(function (r) {
    if (r.error) {
      $('lm').textContent = r.error.message;
      return;
    }
    if (kind === 'up' && !r.data.session) {
      $('lm').textContent = 'Cek email untuk konfirmasi, lalu masuk.';
      return;
    }
    $('lg').hidden = true;
    $('lp').value = '';
  });
}

/** Pasang event listener halaman ini. */
function bindSync() {
  $('sbs').onclick = function (e) {
    if (e.target.id === 'sbr') {
      e.preventDefault();
      syncBlocked = false;
      pull();
    }
  };
  $('cf').onclick = function (e) {
    var b = e.target.closest('button[data-cf]');
    if (!b || !cfRow) return;
    var c = b.dataset.cf,
      row = cfRow;
    if (c === 'later') {
      $('cf').hidden = true;
      sbPending();
      return;
    }
    $('cf').hidden = true;
    cfRow = null;
    syncBlocked = false;
    if (c === 'remote') {
      var sn = applyRemote(row, 'Sebelum memakai data cloud');
      toast('Memakai data cloud.', function () {
        restoreSnap(sn.t);
      });
    } else if (c === 'local') {
      var cs = snapRaw('Data cloud sebelum ditimpa', JSON.stringify(row.data));
      ALL.rev = Date.now();
      try {
        localStorage.setItem(KEY, JSON.stringify(ALL));
      } catch (e) {}
      push();
      toast('Memakai data perangkat ini.', function () {
        restoreSnap(cs.t);
      });
    } else if (c === 'merge') {
      var sm2 = snap('Sebelum menggabungkan');
      mergeAll(row.data);
      lastData = '';
      save();
      syncUI();
      clearTimeout(pushT);
      push();
      toast('Data digabung.', function () {
        restoreSnap(sm2.t);
      });
    }
  };
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && sbUser && !pushT && !syncBlocked) pull();
  });
  $('lgb').onclick = function () {
    if (sbUser) {
      sb.auth.signOut();
      return;
    }
    $('lm').textContent = '';
    $('lg').hidden = false;
  };
  $('lgc').onclick = function () {
    $('lg').hidden = true;
  };
  $('lin').onclick = function () {
    auth('in');
  };
  $('lup').onclick = function () {
    auth('up');
  };
}
