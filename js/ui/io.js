/**
 * Impor dan ekspor data (JSON/CSV) + unduhan.
 */

var DL = null;

/** Tulis pesan di jendela impor/ekspor. */
function setX(t, ok) {
  var e = $('xm');
  if (e) {
    e.textContent = t;
    e.style.color = ok ? 'var(--emerald, var(--in))' : 'var(--crimson, var(--wr))';
  }
  if (t && typeof toast === 'function') toast(t);
}

/** Bersihkan nama berkas agar aman untuk path cache native tanpa path traversal. */
function rkSafeExportFilename(name) {
  var base = String(name || 'unduhan.bin').split(/[\\/]/).pop() || 'unduhan.bin';
  var dot = base.lastIndexOf('.');
  var stem = (dot > 0 ? base.slice(0, dot) : base).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'unduhan';
  var ext = dot > 0 ? base.slice(dot).replace(/[^a-zA-Z0-9.]/g, '').slice(0, 16) : '';
  return stem + ext;
}

/** Konversi Uint8Array ke base64 per potongan agar tidak overflow tumpukan pada berkas besar. */
function rkBytesToBase64(bytes) {
  var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  var CHUNK = 12288; // kelipatan 3 agar btoa per potongan bebas padding tengah
  var parts = [];
  for (var i = 0; i < u8.length; i += CHUNK) {
    var sub = u8.subarray(i, Math.min(i + CHUNK, u8.length));
    var s = '';
    for (var j = 0; j < sub.length; j += 1024) {
      s += String.fromCharCode.apply(null, sub.subarray(j, Math.min(j + 1024, sub.length)));
    }
    parts.push(btoa(s));
  }
  return parts.join('');
}

function rkRawToBytes(data, blob) {
  if (data instanceof Uint8Array) return Promise.resolve(data);
  if (data instanceof ArrayBuffer) return Promise.resolve(new Uint8Array(data));
  if (typeof data === 'string') {
    if (typeof TextEncoder !== 'undefined') return Promise.resolve(new TextEncoder().encode(data));
    var rawS = unescape(encodeURIComponent(data));
    var outS = new Uint8Array(rawS.length);
    for (var i = 0; i < rawS.length; i++) outS[i] = rawS.charCodeAt(i);
    return Promise.resolve(outS);
  }
  if (blob && typeof blob.arrayBuffer === 'function') {
    return Promise.resolve(blob.arrayBuffer()).then(function (ab) { return new Uint8Array(ab); });
  }
  if (blob && typeof FileReader !== 'undefined') {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(new Uint8Array(fr.result || new ArrayBuffer(0))); };
      fr.onerror = function () { reject(new Error('Gagal membaca data berkas.')); };
      fr.readAsArrayBuffer(blob);
    });
  }
  return Promise.resolve(new Uint8Array(0));
}

function rkIsShareCancelErr(err) {
  if (!err) return false;
  if (err.name === 'AbortError') return true;
  var msg = String(err.message || err || '');
  return /share\s*canceled|cancell?ed|abort|dibatalkan/i.test(msg);
}

/** Bersihkan berkas ekspor lama di cache native (sisakan maks 5 terbaru); gagal membersihkan tidak menggagalkan ekspor. */
function rkCleanupCacheExports(fsPlugin, keepName) {
  if (!fsPlugin || typeof fsPlugin.readdir !== 'function' || typeof fsPlugin.deleteFile !== 'function') {
    return Promise.resolve();
  }
  return Promise.resolve(fsPlugin.readdir({ path: 'rk-export', directory: 'CACHE' })).then(function (res) {
    var list = (res && Array.isArray(res.files) ? res.files : []).map(function (entry) {
      var nm = entry && typeof entry === 'object' ? (entry.name || '') : String(entry || '');
      var mt = entry && typeof entry === 'object' ? Number(entry.mtime || entry.ctime || 0) : 0;
      return { name: nm, mtime: nm === keepName ? Number.MAX_SAFE_INTEGER : mt };
    }).filter(function (x) { return x.name; });
    list.sort(function (a, b) { return b.mtime - a.mtime; });
    var stale = list.slice(5);
    return Promise.all(stale.map(function (x) {
      return Promise.resolve(fsPlugin.deleteFile({ path: 'rk-export/' + x.name, directory: 'CACHE' })).catch(function () {});
    }));
  }).catch(function () {});
}

/** Unduh Blob/teks dengan aman di Browser, PWA Standalone, maupun Android WebView/APK. */
function rkDownloadBlob(name, data, mime) {
  var type = mime || 'text/plain;charset=utf-8';
  var blob = data instanceof Blob ? data : new Blob([data], { type: type });
  var isNative = typeof isNativeShellEnv === 'function' && isNativeShellEnv();

  function triggerHref(url, revokeLater) {
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revokeLater) {
      setTimeout(function () {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 4000);
    }
  }

  if (isNative) {
    var cap = typeof window !== 'undefined' ? window.Capacitor : null;
    var plugins = cap && cap.Plugins ? cap.Plugins : null;
    var capAvail = function (pname) {
      if (!plugins || !plugins[pname]) return false;
      if (typeof cap.isPluginAvailable === 'function') return !!cap.isPluginAvailable(pname);
      return true;
    };
    var fsPlugin = capAvail('Filesystem') ? plugins.Filesystem : null;
    var sharePlugin = capAvail('Share') ? plugins.Share : null;

    if (fsPlugin && typeof fsPlugin.writeFile === 'function' && typeof fsPlugin.getUri === 'function' && sharePlugin && typeof sharePlugin.share === 'function') {
      var safeName = rkSafeExportFilename(name);
      var exportPath = 'rk-export/' + safeName;
      var capDone = rkRawToBytes(data, blob)
        .then(function (bytes) {
          var b64 = rkBytesToBase64(bytes);
          return Promise.resolve(fsPlugin.writeFile({
            path: exportPath,
            data: b64,
            directory: 'CACHE',
            recursive: true,
          })).then(function (wRes) {
            return rkCleanupCacheExports(fsPlugin, safeName).then(function () {
              return Promise.resolve(fsPlugin.getUri({ path: exportPath, directory: 'CACHE' })).then(function (uRes) {
                var uri = (uRes && uRes.uri) || (wRes && wRes.uri) || '';
                if (!uri) throw new Error('URI berkas cache tidak tersedia.');
                return Promise.resolve(sharePlugin.share({ title: safeName, files: [uri] })).then(function () {
                  return { ok: true, method: 'capacitor-share', path: exportPath };
                });
              });
            });
          });
        })
        .catch(function (err) {
          var cancelled = rkIsShareCancelErr(err);
          return {
            ok: false,
            method: 'capacitor-share',
            cancelled: cancelled,
            error: (err && err.message) || String(err || 'Gagal membagikan file'),
          };
        });
      return { ok: true, method: 'capacitor-share', done: capDone };
    }

    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && typeof File !== 'undefined') {
      try {
        var f = new File([blob], rkSafeExportFilename(name), { type: type });
        if (navigator.canShare({ files: [f] })) {
          var shareDone = Promise.resolve(navigator.share({ files: [f], title: name })).then(
            function () { return { ok: true, method: 'share' }; },
            function (err) {
              var cancelled = rkIsShareCancelErr(err);
              return { ok: false, method: 'share', cancelled: cancelled, error: (err && err.message) || String(err || 'Gagal membagikan file') };
            }
          );
          return { ok: true, method: 'share', done: shareDone };
        }
      } catch (e) {}
    }

    var nativeErr = 'Pengiriman berkas native tidak tersedia. Gunakan "Salin teks" atau coba lagi.';
    return {
      ok: false,
      method: 'none',
      done: Promise.resolve({ ok: false, method: 'none', cancelled: false, error: nativeErr }),
    };
  }

  var url = URL.createObjectURL(blob);
  triggerHref(url, true);
  return { ok: true, method: 'blob', done: Promise.resolve({ ok: true, method: 'blob' }) };
}

/** Unduh file; bila tidak bisa, isinya ditaruh di kolom teks agar bisa disalin. */
function exportFile(name, data, mime) {
  if (!DL) {
    try {
      var dlRes = rkDownloadBlob(name, data, mime);
      var isNat = typeof isNativeShellEnv === 'function' && isNativeShellEnv();
      if (!isNat && (!dlRes || dlRes.ok !== false)) {
        setX('File diunduh: ' + name, 1);
      }
      Promise.resolve((dlRes && dlRes.done) ? dlRes.done : dlRes).then(function (res) {
        if (res && res.ok !== false) {
          if (isNat || res.method !== 'blob') setX('File siap dibagikan: ' + name, 1);
        } else if (res && res.cancelled) {
          setX('Unduhan dibatalkan.', 0);
        } else {
          if ($('ta') && typeof data === 'string') $('ta').value = data;
          if ($('dt')) $('dt').open = true;
          var errMsg = (res && res.error) ? ' (' + res.error + ')' : '';
          setX('Gagal mengirim file' + errMsg + '. Gunakan "Salin teks" atau coba lagi.', 0);
        }
      });
      return dlRes;
    } catch (e) {
      if ($('ta') && typeof data === 'string') $('ta').value = data;
      if ($('dt')) $('dt').open = true;
      setX('Gagal mengunduh file. Coba ulangi atau periksa izin penyimpanan.', 0);
      return { ok: false, method: 'none', done: Promise.resolve({ ok: false, error: (e && e.message) || 'Gagal mengunduh file.' }) };
    }
  }
  DL.save({ filename: name, data: data })
    .then(function () {
      setX('File dikirim: ' + name, 1);
    })
    .catch(function (e) {
      setX(
        e && e.code === 'declined'
          ? 'Unduhan dibatalkan.'
          : 'Gagal menyimpan file (' + ((e && e.code) || 'error') + ').',
        0,
      );
    });
}

/** Ekspor: json (cadangan lengkap) | items | hist | bulan. */
function doExport(kind) {
  var y = S.year,
    c = calc(),
    rows,
    name;
  if (kind === 'json') {
    ALL.data[S.year] = S;
    ALL.year = S.year;
    return exportFile(
      'rencana-keuangan-cadangan-' + isoD(Date.now()) + '.json',
      JSON.stringify(ALL, null, 1),
    );
  }
  if (kind === 'ics') {
    var events = [];
    var icsT = function (s) {
      return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    };
    var dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    S.items.forEach(function (it) {
      (c.occs[it.id] || []).forEach(function (t) {
        var d = isoD(t);
        var kk = it.id + '|' + d;
        if (S.skip && S.skip[kk]) return;
        var p = priceAt(it, t);
        var dt = d.replace(/-/g, '');
        var isPaid = !!(S.paid && S.paid[kk]),
          ev = [
            'BEGIN:VEVENT',
            'UID:rk-' + kk + '@rencanakeuangan',
            'DTSTAMP:' + dtstamp,
            'DTSTART;VALUE=DATE:' + dt,
            'SUMMARY:Bayar ' + icsT(it.name) + ' (' + rp(p) + ')',
            'DESCRIPTION:Tagihan: ' + icsT(it.name) + ' sebesar ' + rp(p) + (isPaid ? ' [Lunas]' : ' [Belum Lunas]'),
            'STATUS:' + (isPaid ? 'CONFIRMED' : 'TENTATIVE')
          ];
        if (!isPaid) {
          // Dua pengingat untuk tagihan belum lunas: H-1 pukul 09.00 dan hari-H pukul 09.00.
          ev.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Besok jatuh tempo: ' + icsT(it.name), 'TRIGGER:-PT15H', 'END:VALARM');
          ev.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Hari ini jatuh tempo: ' + icsT(it.name), 'TRIGGER:PT9H', 'END:VALARM');
        }
        ev.push('END:VEVENT');
        events.push(ev.join('\r\n'));
      });
    });
    var icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rencana Keuangan//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      events.join('\r\n'),
      'END:VCALENDAR'
    ].join('\r\n');
    return exportFile('tagihan-' + y + '.ics', icsContent, 'text/calendar;charset=utf-8');
  }
  if (kind === 'items') {
    rows = [['Nama', 'Harga', 'Tiap', 'Satuan', 'Mulai', 'Sampai', 'Jumlah kali', 'Kategori']];
    S.items.forEach(function (it) {
      rows.push([it.name, it.price, it.n, it.unit, it.start, it.end || '', it.cnt || '', it.cat || '']);
    });
    name = 'item-' + y;
  }
  if (kind === 'hist') {
    rows = [['Tanggal', 'Item', 'Jumlah', 'Status']];
    var ev = [];
    S.items.forEach(function (it) {
      (c.occs[it.id] || []).forEach(function (t) {
        ev.push({ t: t, it: it });
      });
    });
    ev.sort(function (a, b) {
      return a.t - b.t;
    });
    ev.forEach(function (e) {
      var kk = e.it.id + '|' + isoD(e.t),
        sx = S.skip[kk];
      rows.push([
        isoD(e.t),
        e.it.name,
        sx ? 0 : priceAt(e.it, e.t),
        sx ? 'Dilewati' : S.paid[kk] ? 'Lunas' : 'Belum',
      ]);
    });
    name = 'riwayat-pembayaran-' + y;
  }
  if (kind === 'bulan') {
    rows = [['Bulan', 'Saldo awal', 'Penyesuaian', 'Pengeluaran', 'Saldo akhir']];
    c.rows.forEach(function (r) {
      rows.push([MON[r.m] + ' ' + y, r.aw, r.ad || 0, r.sp, r.ak]);
    });
    name = 'rincian-bulanan-' + y;
  }
  exportFile(name + '.csv', toCSV(rows));
}

/** Impor teks JSON (cadangan) atau CSV (item). Mode gabung/timpa dari pilihan di jendela. */
function doImport(text) {
  var mode = $('im') ? $('im').value : 'merge',
    t = String(text || '')
      .replace(/^\uFEFF/, '')
      .trim();
  if (!t) {
    setX('Data impor kosong. Tempel teks JSON/CSV atau pilih file terlebih dahulu.', 0);
    return;
  }
  try {
    if (t[0] === '{') {
      var d = JSON.parse(t);
      if (!d || !(d.data || Array.isArray(d.items))) throw 0;
      var sn = snap('Sebelum impor data');
      if (mode === 'replace') {
        ALL = norm(d);
        S = ALL.data[ALL.year];
        save();
        syncUI();
        setX('Semua data diganti dari cadangan.', 1);
        toast('Data diganti dari cadangan.', function () {
          restoreSnap(sn.t);
        });
      } else {
        var r = mergeAll(d);
        save();
        syncUI();
        setX(
          'Digabung: ' + r.items + ' item baru' + (r.years ? ', ' + r.years + ' tahun baru' : '') + '.',
          1,
        );
        toast('Impor digabung.', function () {
          restoreSnap(sn.t);
        });
      }
      return;
    }
    var cs = csvItems(parseCSV(t));
    if (!cs.ok.length) throw 1;
    var sn2 = snap('Sebelum impor CSV');
    if (mode === 'replace') {
      S.items = [];
      S.paid = {};
    }
    var add = 0;
    cs.ok.forEach(function (it, i) {
      if (
        !S.items.some(function (x) {
          return sameItem(x, it);
        })
      ) {
        it.id = Date.now() + i;
        S.items.push(it);
        add++;
      }
    });
    save();
    syncUI();
    setX(
      add + ' item ditambahkan ke tahun ' + S.year + (cs.bad ? ', ' + cs.bad + ' baris dilewati' : '') + '.',
      1,
    );
    toast('Impor CSV selesai.', function () {
      restoreSnap(sn2.t);
    });
  } catch (e) {
    setX('File tidak dikenali. Pakai cadangan .json atau .csv item dari aplikasi ini.', 0);
  }
}

/** Pasang event listener halaman ini. */
function bindIo() {
  try {
    claude
      .use('downloads')
      .then(function (d) {
        DL = d;
      })
      .catch(function () {});
  } catch (e) {}
  $('exb').onclick = function (e) {
    var b = e.target.closest('button[data-ex]');
    if (b) doExport(b.dataset.ex);
  };
  $('fi').onchange = function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      doImport(rd.result);
    };
    rd.onerror = function () {
      setX('Gagal membaca file. Pastikan file valid dan tidak rusak.', 0);
    };
    rd.readAsText(f);
    this.value = '';
  };
  $('ld').onclick = function () {
    doImport($('ta').value);
  };
}
