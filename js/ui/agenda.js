/**
 * Agenda 30 hari ke depan (Rincian Bulanan): arus kas yang akan datang berurutan tanggal + saldo berjalan,
 * dengan grafik tangga dan penanda titik saldo terendah. Titik awal = Saldo Realtime.
 * Yang dihitung: (1) tagihan belum lunas, (2) baris Catatan Kas di bulan SESUDAH bulan saldo (mis. gaji bulan depan,
 * transfer tabungan), karena yang di bulan saldo atau sebelumnya sudah ada di Saldo Realtime.
 * Hanya tampil bila Catatan Kas tergabung ada dan tahun aktif = tahun berjalan (sama seperti kartu "Aman dipakai hari ini").
 */
var AGENDA_DAYS = 30,
  AGENDA_SHOW = 6;

/** Susun agenda dari saldo awal `bal`. Tagihan terlambat dihitung di hari ini. */
function agendaData(bal, days, P, sm) {
  var D = days || AGENDA_DAYS,
    rem = reminders(D),
    today = rem.today,
    endISO = addDaysISO(today, D),
    ev = rem.late.concat(rem.soon).map(function (r) {
      var late = r.iso < today;
      return { iso: r.iso, t: r.t, off: late ? 0 : dayDiff(today, r.iso), name: r.it.name, delta: -r.price, late: late, inv: isInvestCat(r.it.cat), kas: false };
    });
  if (P)
    kasRows(P).forEach(function (x) {
      // tagihan lunas (baris turunan) sudah selesai; baris di bulan saldo atau sebelumnya sudah ada di saldo
      if (x.ro === 'tagihan' || x.d <= today || x.d > endISO || +x.d.slice(5, 7) - 1 <= sm) return;
      ev.push({ iso: x.d, t: Date.parse(x.d + 'T00:00:00Z'), off: dayDiff(today, x.d), name: x.note || x.cat || 'Catatan kas', delta: x.t === '+' ? x.amt : -x.amt, late: false, inv: false, kas: true });
    });
  ev.sort(function (a, b) {
    return a.late !== b.late ? (a.late ? -1 : 1) : a.t - b.t;
  });
  var run = bal,
    lowIdx = -1,
    lowBal = bal;
  ev.forEach(function (r, i) {
    run += r.delta;
    r.bal = run;
    if (run < lowBal) {
      lowBal = run;
      lowIdx = i;
    }
  });
  if (lowIdx >= 0) ev[lowIdx].low = true;
  return { today: today, start: bal, rows: ev, lowIdx: lowIdx, low: lowBal, end: run, days: D };
}

/** Selisih hari antara dua tanggal ISO (b - a). */
function dayDiff(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
}

/** Grafik tangga saldo selama agenda (SVG). Garis putus-putus = nol; titik = saldo terendah. */
function agendaChart(A) {
  var W = 600,
    H = 110,
    pl = 8,
    pr = 8,
    pt = 12,
    pb = 12,
    vals = [A.start].concat(
      A.rows.map(function (r) {
        return r.bal;
      }),
    ),
    lo = Math.min(0, Math.min.apply(null, vals)),
    hi = Math.max.apply(null, vals);
  if (hi <= lo) hi = lo + 1;
  var X = function (d) {
      return pl + ((W - pl - pr) * d) / A.days;
    },
    Y = function (v) {
      return pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
    },
    pts = [[0, A.start]],
    prev = A.start;
  A.rows.forEach(function (r) {
    pts.push([r.off, prev], [r.off, r.bal]);
    prev = r.bal;
  });
  pts.push([A.days, prev]);
  var path = pts
      .map(function (p, i) {
        return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1);
      })
      .join(' '),
    lowRow = A.lowIdx >= 0 ? A.rows[A.lowIdx] : null,
    neg = A.low < 0;
  return (
    '<svg class="ag-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Grafik saldo ' + A.days + ' hari ke depan">' +
    (lo < 0
      ? '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="var(--wr)" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>'
      : '') +
    '<path d="' + path + '" fill="none" stroke="var(--ac)" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
    (lowRow
      ? '<circle cx="' + X(lowRow.off).toFixed(1) + '" cy="' + Y(A.low).toFixed(1) + '" r="5" fill="' + (neg ? 'var(--wr)' : 'var(--ac)') + '" stroke="var(--sf)" stroke-width="2" vector-effect="non-scaling-stroke"/>'
      : '') +
    '</svg>'
  );
}

/** Satu baris agenda. */
function agendaRow(r) {
  return (
    '<div class="ag-row' + (r.low ? ' low' : '') + (r.late ? ' late' : '') + '">' +
    '<span class="ag-d">' + (r.late ? 'Terlambat' : fd(r.t, { weekday: 'short', day: 'numeric', month: 'short' })) + '</span>' +
    '<span class="ag-n">' + esc(r.name) + (r.inv ? ' <span class="chp">aset</span>' : '') + (r.kas ? ' <span class="chp">kas</span>' : '') + (r.low ? ' <span class="chp warn">terendah</span>' : '') + '</span>' +
    '<span class="ag-a pv' + (r.delta > 0 ? ' in' : '') + '">' + (r.delta > 0 ? '+' : '&minus;') + rp(Math.abs(r.delta)) + '</span>' +
    '<span class="ag-b pv">' + rp(r.bal) + '</span></div>'
  );
}

/** Kartu agenda untuk Rincian Bulanan ('' bila tidak berlaku). */
function agendaHtml() {
  var P = kasLinked();
  if (!P || +S.year !== +todayISO().slice(0, 4)) return '';
  var KB = kasBal(P),
    A = agendaData(KB.bal, AGENDA_DAYS, P, KB.sm),
    head = '<div class="card agenda" style="margin-top:14px"><h2>Agenda ' + A.days + ' hari ke depan</h2>',
    from =
      '<div class="sub">Mulai dari Saldo Realtime <b class="pv">' + rp(A.start) + '</b>. Dihitung: tagihan belum lunas dan catatan kas bulan-bulan berikutnya (mis. gaji).</div>';
  if (!A.rows.length)
    return head + from + '<div class="sub" style="margin-top:8px">Tidak ada tagihan atau catatan kas yang akan datang dalam ' + A.days + ' hari.</div></div>';
  var lowRow = A.lowIdx >= 0 ? A.rows[A.lowIdx] : null,
    note = !lowRow
      ? '<div class="sub" style="margin-top:8px">Saldo tidak turun di bawah titik awal sepanjang ' + A.days + ' hari.</div>'
      : A.low < 0
        ? '<div class="err" style="margin-top:8px">Saldo diperkirakan <b>habis</b> setelah ' + esc(lowRow.name) + ' (' + (lowRow.late ? 'terlambat' : fd(lowRow.t, { day: 'numeric', month: 'short' })) + '). Terendah <span class="pv">' + rp(A.low) + '</span>.</div>'
        : '<div class="sub" style="margin-top:8px">Saldo terendah <b class="pv">' + rp(A.low) + '</b> setelah ' + esc(lowRow.name) + ' (' + (lowRow.late ? 'terlambat' : fd(lowRow.t, { day: 'numeric', month: 'short' })) + '); masih aman, tidak sampai nol.</div>',
    rows = A.rows.map(agendaRow),
    shown = rows.slice(0, AGENDA_SHOW).join(''),
    more =
      rows.length > AGENDA_SHOW
        ? '<details class="ag-more"><summary>+' + (rows.length - AGENDA_SHOW) + ' lagi</summary>' + rows.slice(AGENDA_SHOW).join('') + '</details>'
        : '';
  return head + from + agendaChart(A) + note + '<div style="margin-top:6px">' + shown + more + '</div></div>';
}
