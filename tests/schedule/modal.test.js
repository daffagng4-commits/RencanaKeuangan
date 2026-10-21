// Uji jendela geser tanggal bayar (UI nyata): validasi rentang, kotak tanggal terisi, satu pesan galat, lintas tahun, bentrok.
const assert = require("assert");
const { boot } = require("./ui.js");
let pass = 0;
const ok = (c, m) => { assert(c, m); pass++; console.log("ok -", m); };

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire } = t;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
  const setItem = (it, year) => { w.switchYear(year); w.S.items = [it]; w.S.paid = {}; w.S.skip = {}; w.renderAll(); w.openPm(it.id); };
  const pick = (d) => click($("pdc").querySelector(`button[data-d="${d}"]`));
  const setTo = (v) => { $("pdt").value = v; fire($("pdt"), "input"); };
  const sched = (it, y) => w.occ(it, y).map(iso);
  const ser = (it) => w.series(it, Date.UTC(2032, 11, 31)).map(iso);
  const item = () => w.S.items[0];
  const mk = (o) => Object.assign({ id: 501, name: "ya", price: 100000, ch: [] }, o);

  // ---- A. Kasus pengguna: tiap 13 hari mulai 1 Jan 2028, geser 14 Jan
  setItem(mk({ start: "2028-01-01", n: 13, unit: "hari" }), 2028);
  click($("psc").querySelector('button[data-sc="geser"]'));
  pick("2028-01-14");
  ok($("pdt").value === "2028-01-14", "memilih tagihan mengisi kotak tanggal dengan tanggal tagihan (kalender terbuka di tahun yang benar)");
  ok($("pdt").min === "2028-01-02" && $("pdt").max === "2028-01-26", "kotak tanggal dibatasi 2 Jan - 26 Jan 2028 (min/max)");
  ok(/antara 2 Jan 2028 dan 26 Jan 2028/.test($("pdh").textContent), "petunjuk menyebut rentang tanggal yang boleh");
  setTo("2027-01-21");
  ok(/di antara 2 Jan 2028 dan 26 Jan 2028/.test($("ppv").textContent), "tahun salah (2027): pesan menyebut rentang yang benar");
  click($("psv") || [...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));
  const visible = [$("ppv"), $("pme")].filter((e) => e.textContent.trim());
  ok(visible.length === 1 && $("ppv").classList.contains("bad"), "pesan galat hanya tampil SATU kali (merah di pratinjau)");
  setTo("2028-01-20");
  ok(!$("ppv").classList.contains("bad") && /Tagihan sesudah perubahan/.test($("ppv").textContent), "tanggal benar: pratinjau normal, tanpa galat");
  click([...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));
  ok(ser(item()).slice(0, 4).join() === "2028-01-01,2028-01-20,2028-02-02,2028-02-15", "tersimpan: 1 Jan, 20 Jan, lalu tiap 13 hari (2 Feb, 15 Feb)");

  // ---- B. Lintas tahun: tagihan pertama tahun 2028, tagihan sebelumnya ada di 2027
  setItem(mk({ start: "2027-06-01", n: 13, unit: "hari" }), 2028);
  click($("psc").querySelector('button[data-sc="geser"]'));
  const first = sched(item(), 2028)[0];
  const prev = ser(item()).filter((d) => d < first).pop();
  pick(first);
  ok($("pdt").min === w.addDaysISO(prev, 1), `tagihan pertama 2028 (${first}): batas bawah memakai tagihan akhir 2027 (${prev})`);
  setTo(w.addDaysISO(prev, 0));
  ok(/sesudah tagihan sebelumnya|di antara/.test($("ppv").textContent) && $("ppv").className.includes("sub"), "digeser sebelum/di atas tagihan tahun lalu: ditolak");
  setTo(w.addDaysISO(prev, 1));
  ok(/Tagihan sesudah perubahan/.test($("ppv").textContent), "tepat sehari sesudah tagihan tahun lalu: diterima");

  // ---- C. Mode "bulan ini dan sesudahnya" tidak boleh melompati tagihan berikutnya
  setItem(mk({ start: "2028-01-01", n: 13, unit: "hari" }), 2028);
  click($("psc").querySelector('button[data-sc="geser"]'));
  pick("2028-01-14");
  setTo("2028-01-27");
  ok(/di antara 2 Jan 2028 dan 26 Jan 2028/.test($("ppv").textContent), "geser sampai/lewat tagihan berikutnya (27 Jan) ditolak, karena tagihan itu akan hilang diam-diam");
  setTo("2028-01-26");
  ok(/Tagihan sesudah perubahan/.test($("ppv").textContent), "26 Jan (sehari sebelum tagihan berikutnya) diterima");

  // ---- D. Ganti tagihan terpilih: kotak tanggal ikut berganti
  pick("2028-01-27");
  ok($("pdt").value === "2028-01-27" && $("pdt").min === "2028-01-15", "pindah memilih tagihan lain: kotak tanggal & batas ikut berganti (tidak membawa tanggal lama)");

  // ---- E. Mode "pilih sendiri": dua tagihan ke tanggal yang sama ditolak
  setItem(mk({ start: "2028-01-01", n: 13, unit: "hari" }), 2028);
  click($("psc").querySelector('button[data-sc="geser"]'));
  $("pgm").value = "pilih"; fire($("pgm"), "change");
  pick("2028-01-14"); pick("2028-01-27");
  $("pgd").value = "20"; fire($("pgd"), "input");
  ok(/Dua tagihan akan pindah ke tanggal yang sama/.test($("ppv").textContent), "pilih sendiri: 14 Jan dan 27 Jan sama-sama ke tanggal 20 -> ditolak");

  // ---- F. Matriks: geser lewat jendela untuk banyak siklus & posisi; hasil harus tepat dan jadwal tidak boleh hilang
  const cycles = [{ n: 13, unit: "hari" }, { n: 28, unit: "hari" }, { n: 2, unit: "minggu" }, { n: 1, unit: "bulan" }, { n: 3, unit: "bulan" }];
  let cases = 0;
  for (const cy of cycles) for (const mode of ["semua", "satu"]) for (const idx of [0, 1, 2]) for (const dir of [-1, 1]) {
    const base = mk({ start: "2028-02-05", ...cy });
    setItem(base, 2028);
    click($("psc").querySelector('button[data-sc="geser"]'));
    $("pgm").value = mode; fire($("pgm"), "change");
    const list = sched(item(), 2028);
    const from = list[idx];
    pick(from);
    const min = $("pdt").min, max = $("pdt").max;
    const to = dir < 0 ? min : max;
    if (!to || to === from) continue;
    const before = ser(item());
    setTo(to);
    ok(!/harus|sama/.test($("ppv").textContent), `rentang ujung diterima (${cy.n} ${cy.unit}, ${mode}, ${from} -> ${to})`);
    click([...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));
    const after = ser(item());
    ok(after.includes(to) && !after.includes(from), `tersimpan: ${from} pindah ke ${to} (${cy.n} ${cy.unit}, ${mode})`);
    ok(new Set(after).size === after.length && Math.abs(after.length - before.length) <= 1, "tidak ada duplikat / tagihan hilang");
    if (mode === "satu") ok(after.filter((d) => d !== to).join() === before.filter((d) => d !== from).join(), "mode satu bulan: tagihan lain tidak berubah");
    cases++;
  }
  console.log(`ok - matriks jendela geser: ${cases} kasus`);

  // ---- G. Fuzz berurutan: geser berkali-kali (campur "semua"/"satu", maju/mundur, ganti tahun) pada satu item
  {
    let seed = 12345;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pickOf = (a) => a[Math.floor(rnd() * a.length)];
    let steps = 0, rejected = 0;
    for (const cy of cycles) {
      const base = mk({ start: "2027-03-17", ...cy, price: 100000 });
      setItem(base, 2028);
      const horizon = (it) => ser(it).filter((d) => d <= "2031-12-31");
      for (let step = 0; step < 14; step++) {
        const year = pickOf([2027, 2028, 2029]);
        w.switchYear(year);
        w.S.items = w.S.items.length ? w.S.items : [base];
        const cur = w.ALL.data[2028] && w.ALL.data[2028].items[0] ? w.ALL.data[2028].items[0] : item();
        // satu item dipakai bersama semua tahun: samakan referensi
        w.ALL.data[year].items = [cur]; w.ALL.data[year].paid = {}; w.ALL.data[year].skip = {};
        w.S = w.ALL.data[year];
        w.renderAll(); w.openPm(cur.id);
        click($("psc").querySelector('button[data-sc="geser"]'));
        const mode = pickOf(["semua", "satu"]);
        $("pgm").value = mode; fire($("pgm"), "change");
        const list = sched(cur, year);
        if (list.length < 2) continue;
        const from = pickOf(list);
        pick(from);
        const min = $("pdt").min, max = $("pdt").max;
        const span = [min, max].filter(Boolean);
        if (!span.length) continue;
        const lo = min || w.addDaysISO(from, -3), hi = max || w.addDaysISO(from, 3);
        const days = Math.round((Date.parse(hi) - Date.parse(lo)) / 864e5);
        const to = w.addDaysISO(lo, Math.floor(rnd() * (days + 1)));
        const before = horizon(cur);
        setTo(to);
        if (to === from) { rejected++; continue; }
        const preview = $("ppv").textContent;
        ok(!/harus|sama dengan/.test(preview), `fuzz ${cy.n} ${cy.unit} langkah ${step}: tanggal dalam rentang diterima (${from} -> ${to})`);
        click([...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));
        const now = w.ALL.data[year].items[0];
        const after = horizon(now);
        if (!after.includes(to)) console.log("DEBUG", JSON.stringify({ cy, step, year, mode, from, to, min, max, ch: now.ch, before: before.slice(0, 14), after: after.slice(0, 14) }));
        ok(after.includes(to), `fuzz: ${to} ada di jadwal sesudah geser`);
        ok(new Set(after).size === after.length && after.join() === [...after].sort().join(), "fuzz: urut & tanpa duplikat");
        ok(Math.abs(after.length - before.length) <= 1, `fuzz: jumlah tagihan wajar (${before.length} -> ${after.length})`);
        steps++;
        // gabungkan perubahan ke referensi bersama
        base.ch = now.ch;
        w.ALL.data[2028].items = [now];
        cur.ch = now.ch;
      }
    }
    console.log(`ok - fuzz geser berurutan: ${steps} langkah, ${rejected} dilewati (tanggal sama)`);
  }

  // ---- H. Mode "pilih sendiri": beberapa tagihan dipindah ke tanggal (1-28) yang sama di bulannya masing-masing
  {
    let seed = 777;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    let done = 0, refused = 0;
    for (const cy of [{ n: 1, unit: "bulan" }, { n: 2, unit: "minggu" }, { n: 28, unit: "hari" }, { n: 3, unit: "bulan" }]) {
      for (let k = 0; k < 8; k++) {
        const base = mk({ start: "2028-01-10", ...cy });
        setItem(base, 2028);
        click($("psc").querySelector('button[data-sc="geser"]'));
        $("pgm").value = "pilih"; fire($("pgm"), "change");
        const list = sched(item(), 2028);
        const chosen = list.filter(() => rnd() < 0.35).slice(0, 4);
        if (!chosen.length) continue;
        w.pmDates.length = 0;
        chosen.forEach((d) => pick(d));
        const day = 1 + Math.floor(rnd() * 28);
        $("pgd").value = String(day); fire($("pgd"), "input");
        const before = ser(item());
        const err = /harus|sama|bentrok|Dua tagihan|Isi/.test($("ppv").textContent);
        click([...w.document.querySelectorAll("button")].find((b) => /Simpan perubahan/.test(b.textContent)));
        const after = ser(item());
        if (err) { ok(after.join() === before.join(), "pilih sendiri: input ditolak, jadwal tidak berubah"); refused++; continue; }
        const expected = chosen.map((d) => d.slice(0, 8) + String(day).padStart(2, "0"));
        ok(expected.every((d) => after.includes(d)), `pilih sendiri (${cy.n} ${cy.unit}): ${chosen.length} tagihan pindah ke tanggal ${day}`);
        ok(new Set(after).size === after.length && after.length === before.length, "pilih sendiri: tidak ada duplikat / tagihan hilang");
        done++;
      }
    }
    console.log(`ok - pilih sendiri: ${done} diterima, ${refused} ditolak dengan benar`);
  }
  ok(t.errs.length === 0, "tidak ada galat JavaScript selama pengujian: " + t.errs.slice(0, 2).join("|"));
  console.log(`\n${pass} pengecekan lulus`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
