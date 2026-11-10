// Daftarkan menu "/" di Telegram: node bot/commands.mjs <TOKEN>
// Nama command: huruf kecil/angka/underscore, maks 32 karakter. Deskripsi maks 256.
const T = (process.argv[2] || process.env.TG_TOKEN || '').trim();
if (!T) {
  console.log('Pakai: node bot/commands.mjs TOKEN');
  process.exit(0);
}

const list = [
  ['keterangan', 'Daftar semua perintah'],
  ['start', 'Mulai & daftar perintah'],
  ['saldo', 'Saldo realtime, bulan ini, sisa akhir tahun'],
  ['jatah', 'Jatah jajan per bulan'],
  ['tagihan', 'Jatuh tempo 7 hari & yang telat'],
  ['jadwal', 'Semua tagihan satu bulan (mis. /jadwal nov)'],
  ['rekap', 'Ringkas satu bulan (mis. /rekap nov 2027)'],
  ['kas', 'Transaksi kas terakhir'],
  ['masuk', 'Catat uang masuk (mis. /masuk 500k gaji)'],
  ['keluar', 'Catat uang keluar (mis. /keluar 25k kopi)'],
  ['utang', 'Catat utang saya (mis. /utang Budi motor 500k)'],
  ['piutang', 'Catat piutang (mis. /piutang Ani 200k)'],
  ['bayarutang', 'Bayar utang (mis. /bayarutang Budi 300k)'],
  ['bayarpiutang', 'Terima bayar piutang (mis. /bayarpiutang Ani)'],
  ['utangku', 'Sisa utang & piutang'],
  ['beli', 'Tambah Cepat item (mis. /beli Netflix 186k tiap tgl 15)'],
  ['lunas', 'Tandai tagihan lunas'],
  ['hapus', 'Hapus item'],
  ['cari', 'Cari item'],
  ['tahun', 'Daftar tahun & tahun aktif'],
  ['pakai', 'Ganti tahun aktif (mis. /pakai 2027)'],
  ['laporanharian', 'PDF laporan hari ini'],
  ['laporanmingguan', 'PDF 7 hari terakhir'],
  ['laporanbulanan', 'PDF sebulan'],
  ['laporantahun', 'PDF rekap setahun'],
  ['debug', 'Sidik state yang dipakai bot'],
].map(([command, description]) => ({ command, description }));

const r = await fetch('https://api.telegram.org/bot' + T + '/setMyCommands', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ commands: list }),
});
const j = await r.json().catch(() => ({ ok: false, description: 'balasan bukan JSON' }));
if (!j.ok) {
  console.log('Gagal: ' + (j.error_code || r.status) + ' ' + (j.description || ''));
  if (j.error_code === 401) console.log('→ token salah atau sudah di-revoke.');
  if (j.error_code === 400) console.log('→ periksa nama/deskripsi command (huruf kecil, tanpa spasi).');
  process.exit(1);
}
console.log('OK: ' + list.length + ' command terdaftar. Buka chat bot, ketik "/" untuk melihat menunya.');
