/**
 * Cicilan & utang: item berjadwal terbatas (berhenti setelah N kali bayar atau sampai tanggal tertentu).
 * Menghitung kemajuan, sisa kewajiban, tanggal lunas, dan (bila "pokok pinjaman" diisi) total bunga/biaya.
 * Status lunas dibaca dari data tiap tahun; tahun yang TIDAK ada datanya dan sudah lewat dianggap lunas
 * (pembayaran sebelum aplikasi dipakai), tahun mendatang tanpa data dianggap belum lunas. Tagihan yang dilewati tidak dihitung.
 * @returns urut dari yang paling cepat selesai: {it, n, paidN, paidSum, remN, remSum, total, last, next, assumed, pokok, bunga}
 */
function cicilanData() {
  var todayMs = Date.parse(todayISO() + 'T00:00:00Z'),
    far = Date.UTC(+S.year + 12, 11, 31),
    out = [];
  S.items.forEach(function (it) {
    if (it.unit === 'sekali' || !(+it.cnt > 0 || it.end)) return;
    var n = 0,
      paidN = 0,
      paidSum = 0,
      remN = 0,
      remSum = 0,
      total = 0,
      assumed = 0,
      next = null,
      last = null;
    series(it, far).forEach(function (t) {
      var Yd = ALL.data[new Date(t).getUTCFullYear()],
        key = it.id + '|' + isoD(t);
      if (Yd && Yd.skip && Yd.skip[key]) return;
      var price = priceAt(it, t),
        paid = Yd ? !!(Yd.paid && Yd.paid[key]) : t < todayMs;
      if (!Yd && t < todayMs) assumed++;
      n++;
      total += price;
      last = t;
      if (paid) {
        paidN++;
        paidSum += price;
      } else {
        remN++;
        remSum += price;
        if (next === null) next = t;
      }
    });
    if (!n) return;
    var pokok = +it.pokok || 0;
    out.push({ it: it, n: n, paidN: paidN, paidSum: paidSum, remN: remN, remSum: remSum, total: total, last: last, next: next, assumed: assumed, pokok: pokok, bunga: pokok > 0 && total > pokok ? total - pokok : 0 });
  });
  return out.sort(function (a, b) {
    return a.last - b.last;
  });
}
