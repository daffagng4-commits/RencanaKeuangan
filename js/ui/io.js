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

/** Unduh Blob/teks dengan aman di Browser, PWA Standalone, maupun Android WebView/APK tanpa window.open(). */
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

  if (isNative && typeof FileReader !== 'undefined') {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && typeof File !== 'undefined') {
      try {
        var f = new File([blob], name, { type: type });
        if (navigator.canShare({ files: [f] })) {
          var shareDone = Promise.resolve(navigator.share({ files: [f], title: name })).then(
            function () { return { ok: true, method: 'share' }; },
            function (err) {
              var cancelled = !!(err && err.name === 'AbortError');
              return { ok: false, method: 'share', cancelled: cancelled, error: (err && err.message) || String(err || 'Gagal membagikan file') };
            }
          );
          return { ok: true, method: 'share', done: shareDone };
        }
      } catch (e) {}
    }
    try {
      var fr = new FileReader();
      var dataDone = new Promise(function (resolve) {
        fr.onload = function () {
          if (typeof fr.result === 'string') {
            triggerHref(fr.result, false);
            resolve({ ok: true, method: 'data-url' });
          } else {
            resolve({ ok: false, method: 'data-url', error: 'Hasil unduhan tidak valid.' });
          }
        };
        fr.onerror = function () {
          resolve({ ok: false, method: 'data-url', error: 'Gagal membaca data file.' });
        };
        fr.readAsDataURL(blob);
      });
      return { ok: true, method: 'data-url', done: dataDone };
    } catch (e) {}
  }

  var url = URL.createObjectURL(blob);
  triggerHref(url, true);
  return { ok: true, method: 'blob', done: Promise.resolve({ ok: true, method: 'blob' }) };
}

/** Unduh file; bila tidak bisa, isinya ditaruh di kolom teks agar bisa disalin. */
function exportFile(name, data, mime) {
  if (!DL) {
    try {
      rkDownloadBlob(name, data, mime);
      setX('File diunduh: ' + name, 1);
    } catch (e) {
      if ($('ta') && typeof data === 'string') $('ta').value = data;
      if ($('dt')) $('dt').open = true;
      setX('Unduh file gagal.', 0);
    }
    return;
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
    setX('Isinya kosong.', 0);
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
      setX('Gagal membaca file.', 0);
    };
    rd.readAsText(f);
    this.value = '';
  };
  $('ld').onclick = function () {
    doImport($('ta').value);
  };
}
