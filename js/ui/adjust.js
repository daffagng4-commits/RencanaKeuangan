/**
 * Jendela Tambah / kurangi saldo. Penyesuaian bisa digabung ke saldo awal, dimulai di bulan tertentu,
 * atau (opsional) berulang tiap N bulan (mis. gaji bulanan).
 */

var adjT = '+';

/** Daftar penyesuaian saldo tahun aktif. */
function adjList() {
  return S.adj || (S.adj = []);
}

/** Ringkasan di bawah kolom Saldo awal. */
function renderAdj() {
  var c = calc(),
    e = $('adjs');
  if (!c.adjIn && !c.adjLate) {
    e.textContent = '';
    return;
  }
  e.innerHTML =
    (c.adjIn
      ? (c.adjIn > 0 ? '+ ' : '&minus; ') + rp(Math.abs(c.adjIn)) + ' penyesuaian = <b>' + rp(c.open) + '</b>'
      : '') +
    (c.adjLate
      ? (c.adjIn ? '<br>' : '') +
        'penyesuaian bulan berikutnya: ' +
        (c.adjLate > 0 ? '+ ' : '&minus; ') +
        rp(Math.abs(c.adjLate))
      : '');
}

/** Teks "tiap bulan mulai Jan, 12 kali" untuk penyesuaian berulang. */
function repText(a) {
  return (
    'tiap ' +
    (a.rep.n === 1 ? 'bulan' : a.rep.n + ' bulan') +
    ' mulai ' +
    MON[a.m] +
    (a.rep.cnt ? ', ' + a.rep.cnt + ' kali' : '')
  );
}

/** Isi bagian atas dan riwayat di jendela penyesuaian. */
function renderAm() {
  var c = calc();
  $('ami').innerHTML =
    'Saldo awal sekarang <b>' +
    rp(S.saldo) +
    '</b>' +
    (c.adjIn
      ? ' ' + (c.adjIn > 0 ? '+' : '&minus;') + ' ' + rp(Math.abs(c.adjIn)) + ' = <b>' + rp(c.open) + '</b>'
      : '') +
    '. Penyesuaian dihitung bersama saldo awal.';
  $('ahl').innerHTML =
    adjList()
      .slice()
      .reverse()
      .map(function (a) {
        var when = a.rep ? repText(a) : a.m == null ? 'gabung ke saldo awal' : 'mulai ' + MON[a.m];
        return (
          '<div class="it2"><div><b' +
          (a.t === '-' ? ' class="neg"' : '') +
          '>' +
          (a.t === '-' ? '&minus; ' : '+ ') +
          rp(a.amt) +
          '</b> <span class="sub">' +
          when +
          (a.at ? ' &middot; ' + fmtD(a.at) : '') +
          '</span>' +
          (a.note ? '<br><span class="sub">' + esc(a.note) + '</span>' : '') +
          '</div><button class="g d" data-adel="' +
          a.id +
          '">Hapus</button></div>'
        );
      })
      .join('') || '<div class="sub">Belum ada penyesuaian.</div>';
}

/** Pengulangan terpilih: {n, cnt} atau null. */
function adjRepeat() {
  var n = +$('ar').value;
  return n > 0 ? { n: n, cnt: Math.max(0, parseInt($('arn').value, 10) || 0) } : null;
}

/** Bulan mulai terpilih (0-11) atau null (= gabung ke saldo awal). */
function adjStartMonth() {
  return $('aw').value === 'month' ? +$('amo').value : null;
}

/** Pratinjau hasil sebelum disimpan. */
function amPrev() {
  var P = parseRp($('aa').value),
    sg = adjT === '-' ? -1 : 1,
    c = calc(),
    sm = +S.startMonth || 0,
    m = adjStartMonth(),
    p = $('apv');
  if (P <= 0) {
    p.className = 'sub';
    p.textContent = 'Isi jumlah untuk melihat hasilnya.';
    return;
  }
  p.className = 'prev';
  var rep = adjRepeat();
  if (rep) {
    var months = adjMonths({ m: m, rep: rep });
    p.innerHTML =
      '<b>' +
      (sg > 0 ? '+ ' : '&minus; ') +
      rp(P) +
      '</b> ' +
      repText({ m: m, rep: rep }) +
      ': ' +
      months.length +
      '&times; = <b>' +
      (sg > 0 ? '+ ' : '&minus; ') +
      rp(P * months.length) +
      '</b> sampai Des ' +
      S.year +
      '. Lanjut ke tahun berikutnya lewat "Bawa jadwal".';
    return;
  }
  p.innerHTML =
    m == null || m <= sm
      ? 'Saldo awal jadi <b>' + rp(c.open + sg * P) + '</b> (dari ' + rp(c.open) + ').'
      : 'Mulai ' +
        MON[m] +
        ', saldo awal bulan itu ' +
        (sg > 0 ? 'bertambah' : 'berkurang') +
        ' ' +
        rp(P) +
        '.';
}

/** Atur ulang isian saat jendela dibuka. */
function openAdjust() {
  adjT = '+';
  Array.prototype.forEach.call($('atp').querySelectorAll('button'), function (b) {
    b.classList.toggle('on', b.dataset.t === '+');
  });
  $('aa').value = '';
  $('an').value = '';
  $('aw').value = 'open';
  $('aw').disabled = false;
  $('amw').hidden = true;
  $('ar').value = '0';
  $('arn').value = '';
  $('arw').hidden = true;
  $('aer').textContent = '';
  if (!$('amo').options.length)
    MON.forEach(function (n, i) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = n;
      $('amo').appendChild(o);
    });
  Array.prototype.forEach.call($('amo').options, function (o) {
    o.textContent = MON[o.value] + ' ' + S.year;
  });
  renderAm();
  amPrev();
  $('am').hidden = false;
  $('aa').focus();
}

/** Saat "Ulangi" dipilih: pengulangan selalu dimulai dari bulan tertentu. */
function onRepeatChange() {
  var on = +$('ar').value > 0;
  $('arw').hidden = !on;
  $('aw').disabled = on;
  if (on) {
    $('aw').value = 'month';
    $('amw').hidden = false;
    if (!$('amo').dataset.touched)
      $('amo').value = S.year === new Date().getFullYear() ? new Date().getMonth() : 0;
  }
  amPrev();
}

/** Simpan penyesuaian dari isian jendela. */
function saveAdjust() {
  var P = parseRp($('aa').value);
  if (P <= 0) {
    $('aer').textContent = 'Isi jumlah yang valid. Contoh: 500k atau 500.000.';
    return;
  }
  adjList().push({
    id: Date.now(),
    t: adjT,
    amt: P,
    note: $('an').value.trim().slice(0, 60),
    m: adjStartMonth(),
    rep: adjRepeat(),
    at: new Date().toISOString().slice(0, 10),
  });
  save();
  $('am').hidden = true;
  renderAll();
  $('status').textContent = (adjT === '-' ? 'Saldo dikurangi ' : 'Saldo ditambah ') + rp(P) + '.';
  var s = $('adjs');
  s.classList.remove('flashb');
  void s.offsetWidth;
  s.classList.add('flashb');
}

/** Pasang event listener halaman ini. */
function bindAdjust() {
  $('adjb').onclick = openAdjust;
  $('atp').onclick = function (e) {
    var b = e.target.closest('button[data-t]');
    if (!b) return;
    adjT = b.dataset.t;
    Array.prototype.forEach.call(this.querySelectorAll('button'), function (x) {
      x.classList.toggle('on', x === b);
    });
    amPrev();
  };
  $('aa').addEventListener('input', function () {
    fmtLive(this);
    amPrev();
  });
  $('aw').onchange = function () {
    $('amw').hidden = this.value !== 'month';
    amPrev();
  };
  $('amo').onchange = function () {
    this.dataset.touched = 1;
    amPrev();
  };
  $('ar').onchange = onRepeatChange;
  $('arn').oninput = amPrev;
  $('acl').onclick = function () {
    $('am').hidden = true;
  };
  $('aps').onclick = saveAdjust;
  $('ahl').onclick = function (e) {
    var b = e.target.closest('button[data-adel]');
    if (!b) return;
    var sn = snap('Sebelum hapus penyesuaian');
    S.adj = adjList().filter(function (a) {
      return String(a.id) !== b.dataset.adel;
    });
    save();
    renderAll();
    renderAm();
    amPrev();
    toast('Penyesuaian dihapus.', function () {
      restoreSnap(sn.t);
    });
  };
}
