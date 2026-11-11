/**
 * Pengingat tagihan: banner ringkas di atas + jendela daftar (terlambat & akan datang)
 * dengan tombol cepat Lunas/Lewati. Memakai core/reminders.js.
 */

var remHz = 7;

/** Baca pilihan jumlah hari (horizon) pengingat. */
function loadRemPrefs() {
  try {
    remHz = +JSON.parse(localStorage.getItem('rk-ui') || '{}').hz || 7;
  } catch (e) {
    remHz = 7;
  }
}

/** Simpan pilihan horizon pengingat. */
function saveRemPrefs() {
  try {
    localStorage.setItem('rk-ui', JSON.stringify({ hz: remHz }));
  } catch (e) {}
}

/** Jumlah harga baris pengingat. */
function sumPrice(rows) {
  return rows.reduce(function (a, r) {
    return a + r.price;
  }, 0);
}

/** Banner ringkas (disembunyikan bila tidak ada yang perlu perhatian). */

/** Banner ringkas (disembunyikan bila tidak ada yang perlu perhatian). */

/** Banner ringkas (disembunyikan bila tidak ada yang perlu perhatian). */
function renderReminders() {
  // banner ringkasan dimatikan: status tagihan sudah ada di kartu Jadwal tagihan
  var el = $("rem");
  if (el) el.hidden = true;
}

/** Satu baris tagihan di jendela pengingat. */
function remRow(r) {
  var attrs = ' data-ry="' + r.year + '" data-rk="' + r.key + '"';
  return (
    '<div class="rr"><div class="rt"><b>' +
    esc(r.it.name) +
    '</b><br><span class="sub">' +
    fd(r.t, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) +
    '</span></div>' +
    '<div class="rpz">' +
    rp(r.price) +
    '</div>' +
    '<div class="ra"><button class="g" data-ra="paid"' +
    attrs +
    '>&#10003; Lunas</button><button class="g" data-ra="skip"' +
    attrs +
    '>Lewati</button></div></div>'
  );
}

/** Isi jendela pengingat. */
function renderRemModal() {
  var r = reminders(remHz),
    html = '';
  $('rmh').value = String(remHz);
  if (r.late.length || r.older) {
    html += '<div class="h3">Terlambat</div>' + r.late.map(remRow).join('');
    if (r.older)
      html +=
        '<div class="sub" style="margin:6px 0">+ ' +
        r.older +
        ' tagihan lebih lama dari ' +
        LATE_DAYS +
        ' hari belum ditandai (' +
        rp(r.olderSum) +
        ').</div>';
  }
  if (r.soon.length)
    html += '<div class="h3">Dalam ' + remHz + ' hari ke depan</div>' + r.soon.map(remRow).join('');
  $('rml').innerHTML = html || '<div class="empty">Tidak ada tagihan yang perlu perhatian.</div>';
  $('rmb').hidden = !(r.late.length || r.older);
  $('rmb').textContent = 'Tandai semua yang sudah lewat tanggal sebagai lunas';
  $('rmb').dataset.arm = '';
}

/** Buka jendela pengingat. */
function openReminders() {
  renderRemModal();
  $('rm').hidden = false;
}

/** Pasang event listener pengingat. */
function bindReminders() {
  loadRemPrefs();
  $('rem').onclick = openReminders;
  $('rmc').onclick = function () {
    $('rm').hidden = true;
  };
  $('rmh').onchange = function () {
    remHz = +this.value || 7;
    saveRemPrefs();
    renderAll();
    renderRemModal();
  };
  $('rml').onclick = function (e) {
    var b = e.target.closest('button[data-ra]');
    if (!b) return;
    setStatus(+b.dataset.ry, b.dataset.rk, b.dataset.ra);
    save();
    renderAll();
    renderRemModal();
  };
  $('rmb').onclick = function () {
    askConfirm('Tandai <b>semua tagihan yang sudah lewat</b> sebagai lunas?', function () {
      var sn = snap('Sebelum menandai semua lunas'),
        n = markPastPaid();
      save();
      renderAll();
      renderRemModal();
      toast(n + ' tagihan ditandai lunas.', function () {
        restoreSnap(sn.t);
      });
    }, 'Ya, tandai lunas');
  };
}
