/**
 * Fixture snapshot: data buatan sendiri (bukan data akun) untuk regresi tata letak jangka panjang.
 * Ditulis ke localStorage sebelum skrip aplikasi berjalan, jadi kedua versi (lama & baru)
 * menerima data identik. Tanggal acuan tetap 2026-11-12.
 */
const KEY = 'rencana-keuangan-v1';

/** @param {Window} w jendela jsdom */
function seed(w) {
  const data = {
    year: 2026,
    rev: 1,
    kas: {
      pr: {
        utama: {
          id: 'utama',
          name: 'Utama',
          saldo: 1472000,
          link: true,
          tx: [
            { id: 'k1', d: '2026-11-01', t: '+', amt: 4500000, cat: 'Gaji', note: 'Gaji November' },
            { id: 'k2', d: '2026-11-04', t: '-', amt: 1250000, cat: 'Belanja', note: 'Belanja bulanan' },
            { id: 'k3', d: '2026-11-07', t: '-', amt: 45000, cat: 'Jajan', note: 'Kopi' },
            { id: 'k4', d: '2026-11-09', t: '+', amt: 900000, cat: 'Sampingan', note: 'Freelance' },
            { id: 'k5', d: '2026-11-10', t: '-', amt: 275000, cat: 'Transport', note: 'Transport' },
            { id: 'k6', d: '2026-11-12', t: '-', amt: 180000, cat: 'Makan', note: 'Makan' },
          ],
        },
      },
    },
    data: {
      2026: {
        saldo: 1472000,
        startMonth: 9,
        items: [
          { id: 1, name: 'Vidio', price: 200000, n: 1, unit: 'bulan', start: '2026-01-20', cat: 'Langganan' },
          { id: 2, name: 'BPJS', price: 150000, n: 1, unit: 'bulan', start: '2026-01-05', cat: 'Kesehatan' },
          { id: 3, name: 'Kuota', price: 50000, n: 28, unit: 'hari', start: '2026-10-21', cat: 'Tagihan rutin' },
          { id: 4, name: 'Saham', price: 620000, n: 1, unit: 'bulan', start: '2026-01-01', cat: 'Investasi' },
          { id: 5, name: 'TorBox', price: 450000, n: 1, unit: 'tahun', start: '2026-11-15', cat: 'Langganan' },
          { id: 6, name: 'Laptop', price: 1800000, n: 1, unit: 'sekali', start: '2026-12-10', cat: 'Belanja' },
        ],
        paid: {},
        skip: {},
      },
      2027: {
        saldo: 1472000,
        startMonth: 0,
        items: [],
        paid: {},
        skip: {},
      },
    },
  };
  w.localStorage.setItem(KEY, JSON.stringify(data));
  w.localStorage.setItem('rk-sb', '0');
}

module.exports = { seed, KEY };
