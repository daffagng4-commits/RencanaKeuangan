/**
 * Sinkron Supabase: login, dorong/tarik data, dialog konflik.
 */

var pushT = null;

var sb = null,
  sbUser = null;

var syncBlocked = false,
  syncSchemaBlocked = false,
  cfRow = null;

function rkRemoteSchemaVer(data) {
  var raw = data && data.sv != null ? Number(data.sv) : 1;
  return Number.isFinite(raw) && raw >= 1 ? raw : 1;
}

function rkSchemaBlockMessage() {
  return 'Data cloud dibuat oleh versi aplikasi yang lebih baru. Perbarui aplikasi agar tidak ada data yang hilang.';
}

function rkSchemaBlockDesktopHtml() {
  return '<strong>' + rkSchemaBlockMessage() + '</strong> Muat ulang halaman untuk memperbarui aplikasi, lalu coba lagi. <a href="#" id="sbr">Coba lagi</a>';
}

/** Tulis status sinkron di header. */
function sbStat(t, bad) {
  var e = $('sbs'), vi = $('ver-info');
  if (!e) return;
  if (syncSchemaBlocked) {
    e.style.display = 'block';
    e.style.color = 'var(--crimson, var(--wr))';
    if (e.classList && e.classList.add) e.classList.add('rk-schema-banner');
    e.innerHTML = rkSchemaBlockDesktopHtml();
    var tsBlk = $('tsync');
    if (tsBlk) tsBlk.textContent = '\u2601 Sinkron dijeda (perbarui aplikasi)';
    if (typeof syncMobileCloudUI === 'function') syncMobileCloudUI();
    return;
  }
  if (e.classList && e.classList.remove) e.classList.remove('rk-schema-banner');
  if (bad) {
    e.style.display = 'block';
    e.style.color = 'var(--wr)';
    e.textContent = t;
  } else {
    e.style.display = 'none';
    e.textContent = '';
    if (vi && t) {
      if (vi.dataset && vi.dataset.baseTitle == null) vi.dataset.baseTitle = vi.title || '';
      var baseT = (vi.dataset && vi.dataset.baseTitle) || '';
      vi.title = (baseT ? baseT + ' · ' : '') + t;
    }
  }
  var ts = $('tsync');
  if (ts) ts.textContent = '\u2601 ' + t;
  if (typeof syncMobileCloudUI === 'function') syncMobileCloudUI();
}

/** Jam sekarang (HH.MM). */
function clock() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

/** Buat klien Supabase bila SB_URL/SB_KEY valid dan pustaka termuat. */
function sbInit() {
  if (!SB_URL || !SB_KEY) {
    acctUI(null);
    sbStat('Mode lokal (Supabase belum dikonfigurasi)');
    return;
  }
  if (!window.supabase) {
    acctUI(null);
    sbStat('Mode lokal (offline, sinkron cloud tidak tersedia)');
    return;
  }
  var u0;
  try {
    u0 = new URL(SB_URL.trim()).origin;
  } catch (e) {
    acctUI(null);
    sbStat('SB_URL tidak valid. Harus berbentuk https://xxxx.supabase.co', 1);
    return;
  }
  sb = supabase.createClient(u0, SB_KEY.trim(), {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  sbStat('Belum masuk. Masuk akun untuk sinkron cloud.');
  // Tampilkan error OAuth bila Google/Supabase mengembalikan parameter error di URL
  try {
    if (typeof location !== 'undefined') {
      var qp = new URLSearchParams(location.search || '');
      var hp = new URLSearchParams((location.hash || '').replace(/^#/, ''));
      var oauthErr = qp.get('error_description') || hp.get('error_description') || qp.get('error') || hp.get('error');
      if (oauthErr) {
        var rawErr = decodeURIComponent(oauthErr.replace(/\+/g, ' '));
        var msg = /Signups not allowed/i.test(rawErr)
          ? 'Pendaftaran akun baru dimatikan di Supabase. Aktifkan "Allow new users to sign up" di Authentication → Sign In / Providers.'
          : ('Login Google gagal: ' + rawErr);
        sbStat(msg, 1);
        if ($('lm')) $('lm').textContent = msg;
        if ($('m-lg-err')) $('m-lg-err').textContent = msg;
        if (typeof toast === 'function') toast(msg);
        if (typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', location.pathname);
      }
    }
  } catch (e) {}
  sb.auth.getSession().then(function (r) {
    var s0 = r && r.data ? r.data.session : null;
    if (s0 || !sbUser) setUser(s0);
  }).catch(function () {
    if (!sbUser) setUser(null);
  });
  sb.auth.onAuthStateChange(function (_e, s) {
    setUser(s);
  });
  rkInitCapacitorAuth();
}

/** Perbarui tombol akun, avatar, dan nama sapaan sesuai sesi login Supabase. */
function acctUI(u) {
  if (u !== undefined) sbUser = u || null;
  var du = typeof rkDisplayUser === 'function'
    ? rkDisplayUser(u)
    : { loggedIn: !!u, name: u ? ((u.email || '').split('@')[0] || 'Pengguna') : 'XXX', initial: u ? ((u.email || 'U')[0].toUpperCase()) : '' };
  if (typeof USER_NAME !== 'undefined') USER_NAME = du.name;
  var b = $('acct'),
    ini = $('acct-ini'),
    sbIni = $('sb-ini'),
    sbNm = $('sb-name'),
    av = b && b.querySelector('.av-circle');
  if (b) {
    b.classList.toggle('on', du.loggedIn);
    b.title = du.loggedIn ? (u.email || du.name) + ' · opsi akun' : 'Masuk / daftar untuk sinkron';
  }
  if (av) av.classList.toggle('anon', !du.loggedIn);
  if (ini) ini.textContent = du.initial;
  if (sbIni) sbIni.textContent = du.initial;
  if (sbNm) sbNm.textContent = 'Halo, ' + du.name;
  if (typeof brSyncAccountUI === 'function') brSyncAccountUI();
  if (typeof brRenderLgModal === 'function') brRenderLgModal();
  if (typeof renderShell === 'function') renderShell();
  if (typeof syncMobileCloudUI === 'function') syncMobileCloudUI();
}

/** Reset state ke kosong total & hapus cache lokal lama saat logout/ganti akun agar data tidak bocor. */
function rkResetToEmptyState(prevUid) {
  clearTimeout(pushT);
  pushT = null;
  if (typeof window !== 'undefined') {
    window._rkBootDataAnimated = false;
    clearTimeout(window._rkEnterT);
    if (window._rkEnterRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(window._rkEnterRaf);
  }
  if (typeof rkCancelAllCountUps === 'function') rkCancelAllCountUps();
  if (typeof ALL !== 'undefined' && typeof emptyAllState === 'function') {
    ALL = emptyAllState();
    S = ALL.data[ALL.year];
    lastData = typeof dsig === 'function' ? dsig() : '';
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(KEY);
      if (prevUid) localStorage.removeItem(KEY + ':' + prevUid);
      localStorage.removeItem('rk-sync');
      localStorage.removeItem('rk-snap');
      localStorage.removeItem('rk-tool-rebalance');
      localStorage.removeItem('rk-tool-ibkr');
    }
  } catch (e) {}
}

/** Dipanggil saat sesi login berubah; pastikan akun baru kosong total & mode logout tidak menampilkan localStorage. */
function setUser(s) {
  var u = (s && s.user) || null,
    was = sbUser,
    sameUser = (u && u.id) === (was && was.id);
  sbUser = u;
  if (u && typeof location !== 'undefined' && (/[?&](code|access_token)=/.test(location.search || '') || /access_token=|refresh_token=/.test(location.hash || ''))) {
    try { if (typeof history !== 'undefined' && history.replaceState) history.replaceState(null, '', location.pathname); } catch (e) {}
  }
  if (!sameUser) {
    syncBlocked = false;
    syncSchemaBlocked = false;
    rkResetToEmptyState(was && was.id);
    if (u && typeof loadState === 'function') {
      loadState(u.id);
    }
    if (typeof syncUI === 'function') syncUI();
  }
  acctUI(u);
  if (sameUser) return;
  if (u) {
    sbStat('Menyinkronkan...');
    pull();
    toolsPull();
  } else sbStat('Belum masuk. Masuk akun untuk melihat & menyimpan data.');
}

/** Jadwalkan kirim ke cloud 300 ms setelah perubahan terakhir. */
function schedPush() {
  if (!sb || !sbUser || syncBlocked || syncSchemaBlocked) return;
  sbStat('Menyimpan ke cloud...');
  clearTimeout(pushT);
  pushT = setTimeout(push, 300);
}

/** Kirim segera bila masih ada perubahan tertunda (mis. halaman akan ditutup). */
function flushPush() {
  if (!pushT) return;
  clearTimeout(pushT);
  pushT = null;
  push();
}

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

/** Kirim state ke cloud (update bersyarat where rev = prevRev untuk cegah balapan data). */
function push() {
  pushT = null;
  if (!sb || !sbUser || syncBlocked || syncSchemaBlocked) return Promise.resolve();
  if (ALL && typeof RK_SCHEMA_VER === 'number') ALL.sv = RK_SCHEMA_VER;
  if (!ALL.rev) {
    ALL.rev = Date.now();
    try {
      if (typeof rkWriteCache === 'function') rkWriteCache(ALL);
      else localStorage.setItem(KEY, JSON.stringify(ALL));
    } catch (e) {}
  }
  var prevRev = getSync();
  var payload = { user_id: sbUser.id, data: ALL, rev: ALL.rev, updated_at: new Date().toISOString() };
  var q = prevRev != null
    ? sb.from('rk_state').update(payload).eq('user_id', sbUser.id).eq('rev', prevRev).select('rev')
    : sb.from('rk_state').upsert(payload).select('rev');

  return q.then(function (r) {
    if (r.error) {
      sbStat('Gagal simpan ke cloud: ' + r.error.message, 1);
    } else if (prevRev != null && (!r.data || !r.data.length)) {
      sbStat('Versi cloud berubah di perangkat lain, menyelaraskan...', 1);
      return pull();
    } else {
      setSync(ALL.rev);
      sbStat('Tersinkron ' + clock());
    }
  }).catch(function (err) {
    sbStat('Gagal simpan (offline): ' + (err.message || 'koneksi'), 1);
  });
}

/** Tanda tangan isi data kanonik (untuk membandingkan lokal vs cloud tanpa false-positive urutan kunci). */
function dataSig(a) {
  var c = typeof norm === 'function' ? norm(JSON.parse(JSON.stringify(a || {}))) : (a || {});
  return JSON.stringify(c.data) + JSON.stringify((c.kas || {}).pr || null);
}

/** Apakah data lokal masih kosong/contoh yang belum diubah oleh akun ini. */
function isPristine() {
  var sig = dataSig(ALL);
  return sig === dataSig(norm(null)) || (typeof emptyAllState === 'function' && sig === dataSig(emptyAllState(ALL && ALL.year)));
}

/** Pakai data cloud di perangkat ini (data lokal dicadangkan dulu). */
function applyRemote(row, label) {
  var sn = snap(label || 'Sebelum memuat data cloud'),
    rr = +row.rev || 0;
  ALL = norm(JSON.parse(JSON.stringify(row.data)));
  ALL.rev = rr;
  S = ALL.data[ALL.year];
  lastData = dsig();
  try {
    if (typeof rkWriteCache === 'function') rkWriteCache(ALL);
    else localStorage.setItem(KEY, JSON.stringify(ALL));
  } catch (e) {}
  setSync(rr);
  syncUI();
  if (typeof checkDueNotifications === 'function') checkDueNotifications(false);
  sbStat('Tersinkron ' + clock() + ' (data cloud dimuat)');
  return sn;
}

/** Bandingkan cloud vs lokal: akun baru tanpa data cloud selalu mulai kosong total (bukan data lokal/admin). */
function pull() {
  if (!sb || !sbUser) return Promise.resolve();
  if (typeof rkSetSyncLoading === 'function') rkSetSyncLoading(true);
  if (typeof window !== 'undefined') {
    window._rkLastPullOk = true;
    window._rkLastPullErr = '';
  }
  var finishSync = function (shouldAnimate) {
    if (typeof rkSetSyncLoading === 'function') rkSetSyncLoading(false, shouldAnimate);
  };
  return sb
    .from('rk_state')
    .select('data,rev')
    .eq('user_id', sbUser.id)
    .maybeSingle()
    .then(function (r) {
      if (r.error) {
        if (typeof window !== 'undefined') {
          window._rkLastPullOk = false;
          window._rkLastPullErr = r.error.message || 'sinkronisasi gagal';
        }
        finishSync(false);
        sbStat('Gagal sinkron: ' + r.error.message, 1);
        return;
      }
      var row = r.data;
      if (!row) {
        syncSchemaBlocked = false;
        syncBlocked = false;
        ALL = typeof emptyAllState === 'function' ? emptyAllState() : norm(null);
        S = ALL.data[ALL.year];
        lastData = dsig();
        ALL.rev = Date.now();
        try { if (typeof rkWriteCache === 'function') rkWriteCache(ALL); } catch (e) {}
        syncUI();
        finishSync(true);
        return push();
      }
      var remoteSv = rkRemoteSchemaVer(row.data);
      if (typeof RK_SCHEMA_VER === 'number' && remoteSv > RK_SCHEMA_VER) {
        syncBlocked = true;
        syncSchemaBlocked = true;
        clearTimeout(pushT);
        pushT = null;
        cfRow = null;
        if (typeof brCloseModal === 'function' && $('cf')) brCloseModal('cf');
        else if ($('cf')) $('cf').hidden = true;
        finishSync(false);
        sbStat(rkSchemaBlockMessage(), 1);
        return;
      }
      syncSchemaBlocked = false;
      syncBlocked = false;
      var rr = +row.rev || 0,
        lr = +ALL.rev || 0,
        ls = getSync(),
        rn = norm(JSON.parse(JSON.stringify(row.data)));
      if (dataSig(rn) === dataSig(ALL)) {
        ALL.rev = Math.max(lr, rr);
        try {
          if (typeof rkWriteCache === 'function') rkWriteCache(ALL);
          else localStorage.setItem(KEY, JSON.stringify(ALL));
        } catch (e) {}
        setSync(ALL.rev);
        sbStat('Tersinkron ' + clock());
        finishSync(!window._rkBootDataAnimated);
        return;
      }
      var localChanged = !isPristine() && ls !== null && lr > ls;
      if (typeof brCloseModal === 'function' && $('cf')) brCloseModal('cf');
    else if ($('cf')) $('cf').hidden = true;
      if (!localChanged || rr >= lr) {
        applyRemote(row);
        finishSync(true);
        return;
      }
      setSync(rr);
      finishSync(!window._rkBootDataAnimated);
      return push();
    }, function (err) {
      if (typeof window !== 'undefined') {
        window._rkLastPullOk = false;
        window._rkLastPullErr = (err && err.message) || 'koneksi';
      }
      finishSync(!window._rkBootDataAnimated);
      sbStat('Gagal sinkron: ' + ((err && err.message) || 'koneksi'), 1);
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
  if (typeof brOpenModal === 'function') brOpenModal('cf');
  else $('cf').hidden = false;
  sbStat('Menunggu pilihan: data berbeda.', 1);
}

/** Tampilkan tautan "Selesaikan sekarang" saat sinkron ditunda. */
function sbPending() {
  var e = $('sbs');
  e.style.display = 'block';
  e.style.color = 'var(--wr)';
  e.innerHTML = 'Sinkron ditunda karena data berbeda. <a href="#" id="sbr">Selesaikan sekarang</a>';
}

/** Keluar dari akun Supabase secara aman (tetap membersihkan sesi lokal & UI meski jaringan/token gagal). */
function rkSignOut() {
  var clearSbStorage = function () {
    var sweep = function (st) {
      if (!st) return;
      try {
        if (typeof sb !== 'undefined' && sb && sb.auth && sb.auth.storageKey) st.removeItem(sb.auth.storageKey);
        if (typeof SB_URL === 'string' && SB_URL.trim()) {
          try {
            var ref = new URL(SB_URL.trim()).hostname.split('.')[0];
            if (ref) st.removeItem('sb-' + ref + '-auth-token');
          } catch (e) {}
        }
        var keys = [];
        if (typeof st.length === 'number' && typeof st.key === 'function') {
          for (var i = 0; i < st.length; i++) keys.push(st.key(i));
        }
        keys = keys.concat(Object.keys(st));
        keys.forEach(function (k) {
          if (k && /^sb-.*-auth-token/i.test(k)) st.removeItem(k);
        });
      } catch (e) {}
    };
    if (typeof localStorage !== 'undefined') sweep(localStorage);
    if (typeof sessionStorage !== 'undefined') sweep(sessionStorage);
    if (typeof sbUser !== 'undefined' && sbUser) setUser(null);
    else if (typeof acctUI === 'function') acctUI(null);
  };
  if (typeof sb === 'undefined' || !sb || !sb.auth || typeof sb.auth.signOut !== 'function') {
    clearSbStorage();
    return Promise.resolve({ error: null });
  }
  var p;
  try {
    p = Promise.resolve(sb.auth.signOut({ scope: 'local' })).catch(function () { return null; });
  } catch (e) {
    p = Promise.resolve(null);
  }
  var timer = new Promise(function (resolve) { setTimeout(resolve, 1200); });
  return Promise.race([p, timer]).then(function () {
    clearSbStorage();
    return { error: null };
  });
}

function rkNativeIsCapacitor() {
  return typeof window !== 'undefined' && !!window.Capacitor &&
    (typeof window.Capacitor.isNativePlatform !== 'function' || window.Capacitor.isNativePlatform());
}

function rkSetGoogleBtnsBusy(busy) {
  ['lg-google', 'm-lg-google'].forEach(function (id) {
    var btn = $(id);
    if (btn) btn.disabled = !!busy;
  });
}

function rkShowOAuthError(msg) {
  sbStat(msg, 1);
  if ($('lm')) $('lm').textContent = msg;
  if ($('m-lg-err')) $('m-lg-err').textContent = msg;
  if (typeof toast === 'function') toast(msg);
  if (typeof showMobToast === 'function' && typeof getShellMode === 'function' && getShellMode() === 'mobile-app') showMobToast(msg);
}

function rkHandleOAuthRedirectUrl(rawUrl) {
  if (!rawUrl || String(rawUrl).indexOf('id.renkeu.app://auth') !== 0) return Promise.resolve(false);
  if (typeof window !== 'undefined') window._rkOAuthPending = false;
  rkSetGoogleBtnsBusy(false);
  try {
    var br = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
    if (br && typeof br.close === 'function') Promise.resolve(br.close()).catch(function () {});
  } catch (e) {}

  if (!sb || !sb.auth) {
    rkShowOAuthError('Sinkron belum aktif. Pastikan Supabase dikonfigurasi.');
    return Promise.resolve(false);
  }

  var qStr = '', hStr = '';
  var qIdx = rawUrl.indexOf('?'), hIdx = rawUrl.indexOf('#');
  if (qIdx >= 0) qStr = rawUrl.slice(qIdx + 1, hIdx > qIdx ? hIdx : rawUrl.length);
  if (hIdx >= 0) hStr = rawUrl.slice(hIdx + 1);
  var qp = new URLSearchParams(qStr);
  var hp = new URLSearchParams(hStr);

  var oauthErr = qp.get('error_description') || hp.get('error_description') || qp.get('error') || hp.get('error');
  if (oauthErr) {
    var rawErr = decodeURIComponent(String(oauthErr).replace(/\+/g, ' '));
    var errMsg = /Signups not allowed/i.test(rawErr)
      ? 'Pendaftaran akun baru dimatikan di Supabase. Aktifkan "Allow new users to sign up" di Authentication → Sign In / Providers.'
      : ('Login Google gagal: ' + rawErr);
    rkShowOAuthError(errMsg);
    return Promise.resolve(false);
  }

  var code = qp.get('code');
  var accessToken = hp.get('access_token') || qp.get('access_token');
  var refreshToken = hp.get('refresh_token') || qp.get('refresh_token') || '';
  var recover = null;
  if (code && typeof sb.auth.exchangeCodeForSession === 'function') {
    recover = sb.auth.exchangeCodeForSession(code);
  } else if (accessToken && typeof sb.auth.setSession === 'function') {
    recover = sb.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  } else {
    rkShowOAuthError('Login Google dibatalkan atau respons sesi tidak lengkap.');
    return Promise.resolve(false);
  }

  return Promise.resolve(recover).then(function (res) {
    if (res && res.error) {
      rkShowOAuthError('Login Google gagal: ' + (res.error.message || 'Gagal memulihkan sesi'));
      return false;
    }
    var sess = res && res.data ? res.data.session : null;
    if (sess) setUser(sess);
    if ($('lm')) $('lm').textContent = '';
    if ($('m-lg-err')) $('m-lg-err').textContent = '';
    if (typeof brCloseModal === 'function') brCloseModal('lg');
    else if ($('lg')) $('lg').hidden = true;
    if (typeof mobCloseSheet === 'function' && $('m-sheet-acct') && $('m-sheet-acct').classList.contains('open')) {
      mobCloseSheet('m-sheet-acct');
    }
    return true;
  }).catch(function (e) {
    rkShowOAuthError('Login Google gagal: ' + ((e && e.message) || 'kesalahan jaringan'));
    return false;
  });
}

function rkInitCapacitorAuth() {
  if (!rkNativeIsCapacitor()) return;
  if (typeof window !== 'undefined' && window._rkCapAuthBound) return;
  var capPlugins = window.Capacitor && window.Capacitor.Plugins;
  var appPlugin = capPlugins && capPlugins.App;
  var browserPlugin = capPlugins && capPlugins.Browser;
  if (!appPlugin || typeof appPlugin.addListener !== 'function') return;
  window._rkCapAuthBound = true;

  appPlugin.addListener('appUrlOpen', function (ev) {
    if (ev && ev.url) rkHandleOAuthRedirectUrl(ev.url);
  });
  if (typeof appPlugin.getLaunchUrl === 'function') {
    Promise.resolve(appPlugin.getLaunchUrl()).then(function (launch) {
      if (launch && launch.url) rkHandleOAuthRedirectUrl(launch.url);
    }).catch(function () {});
  }
  if (browserPlugin && typeof browserPlugin.addListener === 'function') {
    browserPlugin.addListener('browserFinished', function () {
      if (window._rkOAuthPending) {
        window._rkOAuthPending = false;
        rkSetGoogleBtnsBusy(false);
        if (!sbUser) rkShowOAuthError('Login Google dibatalkan.');
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.rkHandleOAuthRedirectUrl = rkHandleOAuthRedirectUrl;
  window.rkInitCapacitorAuth = rkInitCapacitorAuth;
}

/** Masuk dengan akun Google (Gmail) melalui Supabase OAuth; data tersimpan ke rk_state sesuai user_id. */
function authGoogle() {
  if (!sb || !sb.auth) {
    if (typeof toast === 'function') toast('Sinkron belum aktif. Pastikan Supabase dikonfigurasi.');
    return Promise.resolve();
  }
  try {
    if (typeof getShellMode === 'function' && typeof localStorage !== 'undefined') {
      localStorage.setItem('rk-shell-mode', getShellMode());
    }
  } catch (e) {}

  if (rkNativeIsCapacitor()) {
    rkInitCapacitorAuth();
    rkSetGoogleBtnsBusy(true);
    if ($('lm')) $('lm').textContent = '';
    if ($('m-lg-err')) $('m-lg-err').textContent = '';
    return sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'id.renkeu.app://auth', skipBrowserRedirect: true },
    }).then(function (r) {
      if (r && r.error) {
        rkSetGoogleBtnsBusy(false);
        rkShowOAuthError('Gagal login Google: ' + (r.error.message || 'Gagal membuka login Google'));
        return r;
      }
      var authUrl = r && r.data && r.data.url;
      var br = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Browser;
      if (authUrl && br && typeof br.open === 'function') {
        window._rkOAuthPending = true;
        return Promise.resolve(br.open({ url: authUrl })).catch(function (err) {
          window._rkOAuthPending = false;
          rkSetGoogleBtnsBusy(false);
          rkShowOAuthError('Gagal membuka browser login: ' + ((err && err.message) || ''));
        }).then(function () { return r; });
      }
      rkSetGoogleBtnsBusy(false);
      rkShowOAuthError('Plugin Browser Capacitor tidak tersedia untuk login Google.');
      return r;
    }).catch(function (err) {
      rkSetGoogleBtnsBusy(false);
      rkShowOAuthError('Gagal login Google: ' + ((err && err.message) || 'kesalahan jaringan'));
    });
  }

  var redir;
  try {
    if (typeof location !== 'undefined' && /^(https?|capacitor|ionic):/i.test(location.origin || '')) {
      redir = location.origin + location.pathname;
    }
  } catch (e) {}
  if (!redir) {
    var errFile = 'Login Google memerlukan URL https:// atau http://localhost (tidak bisa dari file://).';
    if ($('lm')) $('lm').textContent = errFile;
    if ($('m-lg-err')) $('m-lg-err').textContent = errFile;
    if (typeof toast === 'function') toast(errFile);
    return Promise.resolve();
  }
  return sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redir },
  }).then(function (r) {
    if (r && r.error) {
      var msg = r.error.message || 'Gagal masuk dengan Google';
      if ($('lm')) $('lm').textContent = msg;
      if ($('m-lg-err')) $('m-lg-err').textContent = msg;
      if (typeof toast === 'function') toast('Gagal login Google: ' + msg);
    } else if (r && r.data && r.data.url && typeof location !== 'undefined') {
      location.assign(r.data.url);
    }
    return r;
  });
}

/** Masuk (in) atau daftar (up) dengan email dan password. */
function auth(kind) {
  var e = $('le').value.trim(),
    p = $('lp').value;
  if (!e || p.length < 6) {
    $('lm').textContent = 'Isi email dan password (min. 6 karakter).';
    if (typeof rkShakeInvalid === 'function') rkShakeInvalid(!e ? $('le') : $('lp'));
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
    if (typeof brCloseModal === 'function') brCloseModal('lg');
    else $('lg').hidden = true;
    $('lp').value = '';
  }).catch(function (err) {
    if ($('lm')) $('lm').textContent = 'Gagal terhubung ke server: ' + ((err && err.message) || 'periksa koneksi internet Anda.');
  });
}

/** Pasang event listener halaman ini. */
function bindSync() {
  $('sbs').onclick = function (e) {
    if (e.target.id === 'sbr') {
      e.preventDefault();
      if (!syncSchemaBlocked) syncBlocked = false;
      pull();
    }
  };
  $('cf').onclick = function (e) {
    var b = e.target.closest('button[data-cf]');
    if (!b || !cfRow) return;
    if (syncSchemaBlocked || rkRemoteSchemaVer(cfRow.data) > (typeof RK_SCHEMA_VER === 'number' ? RK_SCHEMA_VER : 2)) {
      if (typeof brCloseModal === 'function') brCloseModal('cf');
      else $('cf').hidden = true;
      syncBlocked = true;
      syncSchemaBlocked = true;
      cfRow = null;
      sbStat(rkSchemaBlockMessage(), 1);
      return;
    }
    var c = b.dataset.cf,
      row = cfRow;
    if (c === 'later') {
      if (typeof brCloseModal === 'function') brCloseModal('cf');
      else $('cf').hidden = true;
      sbPending();
      return;
    }
    if (typeof brCloseModal === 'function') brCloseModal('cf');
    else $('cf').hidden = true;
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
      setSync(+row.rev || 0);
      try {
        if (typeof rkWriteCache === 'function') rkWriteCache(ALL);
        else localStorage.setItem(KEY, JSON.stringify(ALL));
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
  if (typeof window !== 'undefined' && !window._rkSyncDocBound) {
    window._rkSyncDocBound = true;
    var lastDay = todayISO();
    setInterval(function () {
      if (todayISO() !== lastDay) {
        lastDay = todayISO();
        refreshToday();
      }
    }, 60000);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        flushPush();
        return;
      }
      refreshToday();
      if (sbUser && !pushT && !syncBlocked && !syncSchemaBlocked) pull();
    });
    window.addEventListener('pagehide', flushPush);
    window.addEventListener('online', function () {
      if (sbUser && !syncBlocked && !syncSchemaBlocked) {
        sbStat('Koneksi pulih, menyelaraskan...');
        pull();
      }
    });
  }
  $('acct').onclick = function () {
    if (!sb) {
      toast('Sinkron belum aktif. Isi Supabase di js/config.js.');
      return;
    }
    if (sbUser) {
      var em = sbUser.email || 'akun ini';
      askConfirm(
        'Keluar dari <b>' + esc(em) + '</b>? Data lokal tetap tersimpan di perangkat ini.',
        function () {
          rkSignOut().then(function () {
            toast('Keluar dari akun.');
          });
        },
        'Keluar',
        'Keluar dari akun'
      );
      return;
    }
    $('lm').textContent = '';
    if (typeof brOpenModal === 'function') brOpenModal('lg');
    else $('lg').hidden = false;
  };
  $('lgc').onclick = function () {
    if (typeof brCloseModal === 'function') brCloseModal('lg');
    else $('lg').hidden = true;
  };
  $('lin').onclick = function () {
    auth('in');
  };
  if ($('lin-google')) {
    $('lin-google').onclick = function () {
      authGoogle();
    };
  }
  if ($('lup')) {
    $('lup').onclick = function () {
      auth('up');
    };
  }
}
