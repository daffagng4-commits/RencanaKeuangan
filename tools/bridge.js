/* Jembatan antara alat (di dalam iframe) dan Rencana Keuangan (halaman induk).
 * Alat mendefinisikan window.rkGetState() dan window.rkSetState(state), lalu memanggil window.rkChanged()
 * setiap kali isiannya berubah. Induk yang menyimpan data (lokal + Supabase tabel rk_tools).
 * Dibuka sendiri (tanpa induk), file ini tidak melakukan apa-apa. */
(function () {
  if (window.parent === window) {
    window.rkChanged = function () {};
    return;
  }
  var target = location.origin === 'null' ? '*' : location.origin;
  var loaded = false, timer = null, lastSig = null;
  function send(m) {
    m.rkTool = true;
    try { window.parent.postMessage(m, target); } catch (e) {}
  }
  function sig() {
    try { return JSON.stringify(window.rkGetState()); } catch (e) { return null; }
  }
  // Di dalam iframe, tinggi ditentukan isi (bukan tinggi layar) supaya induk bisa mengatur tinggi iframe.
  var st = document.createElement('style');
  st.textContent = 'html,body,.min-h-screen{min-height:0!important;height:auto!important}';
  document.head.appendChild(st);

  window.rkChanged = function () {
    if (!loaded) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      var s = sig();
      if (s === null || s === lastSig) return;
      lastSig = s;
      send({ type: 'save', state: JSON.parse(s) });
    }, 500);
  };
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (e.source !== window.parent || !m || m.rkTool !== true || m.type !== 'load') return;
    if (m.theme === 'light' || m.theme === 'dark') document.documentElement.setAttribute('data-theme', m.theme);
    try { if (m.state) window.rkSetState(m.state); } catch (err) {}
    lastSig = sig();
    loaded = true;
  });
  function height() {
    send({ type: 'height', h: Math.ceil(document.documentElement.getBoundingClientRect().height) });
  }
  window.addEventListener('load', function () {
    send({ type: 'ready' });
    if (window.ResizeObserver) new window.ResizeObserver(height).observe(document.documentElement);
    height();
  });
})();
