const assert = require("assert");
const { boot } = require("./ui.js");

(async () => {
  const t = boot();
  await t.ready();
  const { w, $, click, fire } = t;

  console.log("=== Menguji Modal: Tombol Tutup & Tutup via Luar Kotak / Escape ===");

  const it = {
    id: 99,
    name: "Netflix",
    price: 186000,
    start: "2028-01-01",
    n: 1,
    unit: "bulan",
  };
  w.switchYear(2028);
  w.S.items = [it];
  w.S.paid = {};
  w.S.skip = {};
  w.renderAll();

  // 1. Verifikasi kelas tombol tutup pada semua modal
  const closeButtons = [
    { id: "pcl", modal: "pm" },
    { id: "cl", modal: "m" },
    { id: "rmc", modal: "rm" },
    { id: "kpc", modal: "kpm" },
    { id: "shx", modal: "shm" },
    { id: "lgc", modal: "lg" },
    { id: "skc", modal: "sk" },
    { id: "xlc", modal: "xlm" },
  ];

  closeButtons.forEach(({ id }) => {
    const btn = $(id);
    assert(btn, `Tombol #${id} harus ada`);
    assert(
      btn.classList.contains("c"),
      `Tombol #${id} harus memiliki kelas visual "c" (perbedaan warna)`
    );
  });

  const cfLater = w.document.querySelector('button[data-cf="later"]');
  assert(cfLater && cfLater.classList.contains("c"), 'Tombol "Nanti saja" di #cf harus berkelas "c"');

  // 2. Buka modal #pm (Ubah harga / jadwal)
  w.openPm(99);
  assert.strictEqual($("pm").hidden, false, "Modal #pm harus terbuka");

  // Klik di DALAM card tidak boleh menutup modal
  const card = $("pm").querySelector(".card");
  fire(card, "mousedown");
  fire(card, "click");
  assert.strictEqual($("pm").hidden, false, "Klik di dalam card tidak boleh menutup modal");

  // Klik di LUAR card (pada elemen .modal) harus menutup modal
  fire($("pm"), "mousedown");
  fire($("pm"), "click");
  assert.strictEqual($("pm").hidden, true, "Klik di luar card (backdrop modal) harus menutup modal");

  // 3. Buka lagi, lalu tes tombol Tutup langsung
  w.openPm(99);
  assert.strictEqual($("pm").hidden, false, "Modal #pm harus terbuka lagi");
  click($("pcl"));
  assert.strictEqual($("pm").hidden, true, "Tombol #pcl harus menutup modal");

  // 4. Buka modal Impor/Ekspor (#m)
  click($("bk"));
  assert.strictEqual($("m").hidden, false, "Modal #m harus terbuka");

  // Klik di luar #m
  fire($("m"), "mousedown");
  fire($("m"), "click");
  assert.strictEqual($("m").hidden, true, "Klik di luar card #m harus menutup modal");

  // 5. Buka modal dan tes tombol Escape
  w.openPm(99);
  assert.strictEqual($("pm").hidden, false, "Modal #pm harus terbuka");
  w.document.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.strictEqual($("pm").hidden, true, "Tekan Escape harus menutup modal");

  console.log("Semua pengujian modal, warna tombol tutup, dan backdrop berhasil!");
  process.exit(0);
})();
