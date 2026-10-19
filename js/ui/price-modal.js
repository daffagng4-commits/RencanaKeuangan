/**
 * Jendela Ubah harga / jadwal (berbasis tujuan).
 */

var pmId = null,
  pmInit = null,
  pmScen = null;

/** Pesan di jendela ubah harga (ok = hijau, selain itu merah). */
function pmMsg(t, ok) {
  var e = $('pme');
  e.textContent = t;
  e.style.color = ok ? 'var(--ac)' : 'var(--wr)';
}

/** Nilai isian harga/siklus saat ini. */
function pmCur() {
  var it = item(pmId),
    sek = it && it.unit === 'sekali';
  return {
    P: parseRp($('pp').value),
    n: sek ? it.n : Math.max(1, parseInt($('pn').value, 10) || 1),
    u: sek ? it.unit : $('pu').value,
  };
}

/** Deskripsi satu perubahan untuk daftar riwayat. */
function descCh(it, c) {
  var p = [];
  if (c.price != null) p.push(rp(c.price));
  if (c.n || c.unit) p.push('tiap ' + (c.n || it.n) + ' ' + (c.unit || it.unit));
  return (
    '<b>' +
    fmtD(c.from) +
    (c.to ? ' &ndash; ' + fmtD(c.to) : ' &rarr; seterusnya') +
    '</b><br><span class="sub">' +
    (p.join(' &middot; ') || 'Kembali ke pengaturan awal') +
    (c.to ? ' (lalu kembali ke awal)' : '') +
    (c.cut ? ' &middot; tagihan sebelumnya dihapus' : '') +
    '</span>'
  );
}

/** Isi info awal dan daftar perubahan yang sudah ada. */
function renderPm() {
  var it = item(pmId);
  if (!it) return;
  $('pmi').textContent =
    'Pengaturan awal: ' + rp(it.price) + ' · ' + every(it) + ' · mulai ' + fmtD(it.start) + '.';
  $('phl').innerHTML =
    (it.ch || [])
      .map(function (c, i) {
        return (
          '<div class="it2"><div>' +
          descCh(it, c) +
          '</div><button class="g d" data-pdel="' +
          i +
          '">Hapus</button></div>'
        );
      })
      .join('') || '<div class="sub">Belum ada perubahan.</div>';
}

/** Susun perubahan dari isian + validasi. @returns {c, it} atau {err} */
function pmDraft() {
  var it = item(pmId);
  if (!it) return { err: 'Item tidak ditemukan.' };
  var cu = pmCur(),
    P = cu.P,
    n = cu.n,
    u = cu.u,
    from = $('pdt').value,
    un = $('pw').value === 'until',
    to = un ? $('pto').value : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return { err: 'Pilih tanggal mulai berlaku.' };
  if (P <= 0) return { err: 'Isi harga. Contoh: 300k atau 300.000.' };
  if (un && (!to || to < from)) return { err: 'Isi tanggal "sampai" (sama atau sesudah tanggal mulai).' };
  var rs = $('pa').value === 'restart',
    drop = $('pw').value === 'forever' && $('pcut').value === 'drop';
  if (pmInit && P === pmInit.P && n === pmInit.n && u === pmInit.u && !rs && !drop) return { err: noopMsg() };
  var c = { from: from, to: to, price: P !== it.price ? P : null, n: null, unit: null };
  if (it.unit !== 'sekali' && (rs || n !== it.n || u !== it.unit)) {
    c.n = n;
    c.unit = u;
  }
  if (drop) c.cut = true;
  return { c: c, it: it };
}

/** Pratinjau tagihan sesudah perubahan. */
function pmPrev() {
  var d = pmDraft(),
    p = $('ppv'),
    it0 = item(pmId),
    cu = pmCur();
  if (it0 && it0.unit !== 'sekali')
    $('pah').textContent =
      cu.n !== it0.n || cu.u !== it0.unit
        ? 'Siklus berbeda dari awal: pembayaran pertama siklus baru jatuh di tanggal mulai berlaku.'
        : $('pa').value === 'restart'
          ? 'Pembayaran pertama jatuh di tanggal mulai berlaku, lalu mengikuti siklus.'
          : 'Tanggal bayar mengikuti jadwal sekarang. Pilih "Mulai ulang" jika ingin menggeser tanggalnya.';
  if (d.err) {
    p.className = 'sub';
    p.textContent = d.err;
    return;
  }
  var tmp = Object.assign({}, d.it, {
      ch: (d.it.ch || [])
        .filter(function (q) {
          return !(q.from === d.c.from && q.to === d.c.to);
        })
        .concat([d.c])
        .sort(cmpFrom),
    }),
    f = Date.parse(d.c.from + 'T00:00:00Z'),
    l = series(tmp, Date.UTC(+d.c.from.slice(0, 4) + 8, 11, 31))
      .filter(function (t) {
        return t >= f;
      })
      .slice(0, 6);
  var tmp2 = Object.assign({}, tmp, {
      ch: tmp.ch.map(function (g) {
        return g === d.c ? Object.assign({}, g, { cut: false }) : g;
      }),
    }),
    bf = series(tmp2, Date.UTC(+d.c.from.slice(0, 4) + 8, 11, 31))
      .filter(function (t) {
        return t < f;
      })
      .slice(-3);
  p.className = 'prev';
  p.innerHTML =
    '<b>' +
    pmSum(d) +
    '</b><br>' +
    (l.length
      ? 'Tagihan sesudah perubahan: ' +
        l
          .map(function (t) {
            return fd(t) + ' (' + rp(priceAt(tmp, t)) + ')';
          })
          .join(', ') +
        (l.length >= 6 ? ' &hellip;' : '')
      : 'Tidak ada tagihan pada rentang ini.') +
    (bf.length
      ? '<br>Sebelum ' +
        fd(f) +
        ': ' +
        bf
          .map(function (t) {
            return fd(t);
          })
          .join(', ') +
        (d.c.cut ? ' (dihapus)' : ' (tidak berubah)')
      : '');
}

/** Pesan saat tidak ada yang berubah (sesuai tujuan terpilih). */
function noopMsg() {
  return pmScen === 'harga' || pmScen === 'sementara'
    ? 'Harga yang diisi sama dengan harga sekarang. Isi harga yang berbeda.'
    : pmScen === 'siklus'
      ? 'Siklusnya sama dengan sekarang. Ubah angka atau satuannya.'
      : 'Belum ada yang diubah. Ubah harga atau siklus, atau pilih "Mulai ulang jadwal" / hapus tagihan sebelumnya.';
}

/** Kalimat ringkasan perubahan dalam bahasa biasa. */
function pmSum(d) {
  var c = d.c,
    it = d.it,
    f = fmtD(c.from),
    P = c.price != null ? c.price : it.price;
  if (c.to)
    return (
      'Dari ' +
      f +
      ' sampai ' +
      fmtD(c.to) +
      ', harga jadi ' +
      rp(P) +
      ', setelah itu kembali ke harga awal ' +
      rp(it.price) +
      '.'
    );
  var s = 'Mulai ' + f + ': ';
  if (c.n || c.unit) s += 'bayar tiap ' + (c.n || it.n) + ' ' + (c.unit || it.unit) + ', ';
  s += 'harga ' + rp(P) + (P !== it.price ? ' (awal ' + rp(it.price) + ')' : '');
  if (c.cut) s += '. Tagihan sebelum tanggal ini dihapus';
  return s + '.';
}

/** Isi awal form dengan nilai yang berlaku pada tagihan berikutnya. */
function pmPrefill(it) {
  var nx = occ(it, S.year).filter(function (t) {
      return !S.paid[it.id + '|' + isoD(t)] && !S.skip[it.id + '|' + isoD(t)];
    })[0],
    iso = isoD(nx != null ? nx : Date.now()),
    sg = segAt(it, iso);
  $('pdt').value = iso;
  $('pto').value = '';
  $('pp').value = (sg && sg.price != null ? sg.price : it.price).toLocaleString('id-ID');
  $('pn').value = (sg && sg.n) || it.n;
  $('pu').value = (sg && sg.unit) || (it.unit === 'sekali' ? 'bulan' : it.unit);
  $('pw').value = 'forever';
  $('pa').value = 'keep';
  $('pcut').value = 'keep';
  pmInit = pmCur();
}

/** Pilih tujuan (harga | sementara | siklus | geser | manual) dan tampilkan isian yang relevan. */
function pmSc(sc) {
  var it = item(pmId);
  if (!it) return;
  pmScen = sc;
  pmPrefill(it);
  if (sc === 'sementara') $('pw').value = 'until';
  if (sc === 'geser') $('pa').value = 'restart';
  var until = $('pw').value === 'until';
  $('pform').hidden = !sc;
  $('pps').hidden = !sc;
  $('psc').classList.toggle('picked', !!sc);
  $('pback').hidden = !sc;
  $('g-to').hidden = !(sc === 'sementara' || (sc === 'manual' && until));
  $('g-price').hidden = sc === 'geser';
  $('pcad').hidden = !((sc === 'siklus' || sc === 'manual') && it.unit !== 'sekali');
  $('pcw').hidden = !(sc === 'siklus' || sc === 'geser' || (sc === 'manual' && !until));
  $('pman').hidden = sc !== 'manual';
  if (sc) {
    $('l-pdt').textContent = LB[sc][0];
    $('l-pp').textContent = LB[sc][1];
    $('phint').textContent = PH[sc];
  }
  Array.prototype.forEach.call(document.querySelectorAll('#psc button'), function (b) {
    b.classList.toggle('on', b.dataset.sc === sc);
  });
  pmMsg('');
  if (sc) pmPrev();
}

/** Buka jendela ubah harga/jadwal untuk sebuah item. */
function openPm(id) {
  var it = item(id);
  if (!it) return;
  pmId = it.id;
  $('pmt').textContent = 'Ubah harga / jadwal: ' + it.name;
  Array.prototype.forEach.call(document.querySelectorAll('#psc button'), function (b) {
    b.hidden = it.unit === 'sekali' && (b.dataset.sc === 'siklus' || b.dataset.sc === 'geser');
  });
  pmPrefill(it);
  pmScen = null;
  $('pform').hidden = true;
  $('pps').hidden = true;
  $('psc').classList.remove('picked');
  $('pback').hidden = true;
  Array.prototype.forEach.call(document.querySelectorAll('#psc button'), function (b) {
    b.classList.remove('on');
  });
  pmMsg('');
  renderPm();
  $('pm').hidden = false;
  var cd = $('pm').querySelector('.card');
  if (cd) cd.scrollTop = 0;
}

var PH = {
  harga:
    'Tagihan sebelum tanggal ini tidak berubah. Harga baru berlaku untuk tagihan pada tanggal ini dan sesudahnya.',
  sementara:
    'Hanya tagihan dalam rentang tanggal ini yang berubah harganya. Sesudahnya kembali ke harga awal.',
  siklus:
    'Pembayaran pertama dengan siklus baru jatuh di tanggal mulai. Pilih apakah tagihan lama sebelum tanggal itu dibiarkan atau dihapus.',
  geser:
    'Tagihan berikutnya jatuh tepat di tanggal ini, lalu lanjut sesuai siklus. Tagihan sebelumnya tidak berubah.',
  manual: 'Atur semua pilihan sendiri. Lihat pratinjau di bawah sebelum menyimpan.',
};

var LB = {
  harga: ['Mulai tanggal', 'Harga baru'],
  sementara: ['Dari tanggal', 'Harga selama periode itu'],
  siklus: ['Mulai tanggal', 'Harga (biarkan jika tidak berubah)'],
  geser: ['Tanggal bayar pertama yang baru', 'Harga per bayar'],
  manual: ['Berlaku mulai tanggal', 'Harga per bayar'],
};

/** Pasang event listener halaman ini. */
function bindPrice() {
  $('psc').onclick = function (e) {
    var b = e.target.closest('button[data-sc]');
    if (b) pmSc(b.dataset.sc);
  };
  ['pdt', 'pp', 'pn', 'pu', 'pto', 'pa', 'pcut'].forEach(function (i) {
    $(i).oninput = pmPrev;
    $(i).onchange = pmPrev;
  });
  $('pw').onchange = function () {
    $('g-to').hidden = this.value !== 'until';
    $('pcw').hidden = this.value === 'until';
    pmPrev();
  };
  $('pp').addEventListener('input', function () {
    fmtLive(this);
  });
  $('pcl').onclick = function () {
    $('pm').hidden = true;
  };
  $('pps').onclick = function () {
    var d = pmDraft();
    if (d.err) return pmMsg(d.err);
    var it = d.it;
    trackSchedule(it, function () {
      it.ch = (it.ch || []).filter(function (q) {
        return !(q.from === d.c.from && q.to === d.c.to);
      });
      it.ch.push(d.c);
      it.ch.sort(cmpFrom);
    });
    save();
    $('pm').hidden = true;
    renderAll();
    $('status').textContent = 'Perubahan untuk "' + it.name + '" disimpan.';
    var r = document.querySelector('#v-jadwal tr[data-r="' + it.id + '"]');
    if (r) {
      r.classList.add('flash');
      r.scrollIntoView({ block: 'center' });
      setTimeout(function () {
        r.classList.remove('flash');
      }, 2600);
    }
  };
  $('phl').onclick = function (e) {
    var b = e.target.closest('button[data-pdel]');
    if (!b) return;
    var it = item(pmId);
    var sn = snap('Sebelum hapus perubahan harga');
    trackSchedule(it, function () {
      it.ch.splice(+b.dataset.pdel, 1);
    });
    save();
    renderAll();
    renderPm();
    pmPrev();
    toast('Perubahan dihapus.', function () {
      restoreSnap(sn.t);
    });
  };
  $('pback').onclick = function () {
    pmScen = null;
    $('psc').classList.remove('picked');
    $('pback').hidden = true;
    $('pform').hidden = true;
    $('pps').hidden = true;
    Array.prototype.forEach.call(document.querySelectorAll('#psc button'), function (b) {
      b.classList.remove('on');
    });
    pmMsg('');
  };
}
