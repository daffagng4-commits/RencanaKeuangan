// Cari chat id tanpa mengetik URL: node bot/whoami.mjs <TOKEN>
const T = (process.argv[2] || process.env.TG_TOKEN || '').trim();
if (!T) {
  console.log('Pakai: node bot/whoami.mjs <TOKEN>');
  process.exit(0);
}
const call = async (m) => {
  const r = await fetch('https://api.telegram.org/bot' + T + '/' + m);
  const j = await r.json().catch(() => ({ ok: false, description: 'balasan bukan JSON' }));
  if (!j.ok) {
    const map = {
      401: 'token salah / sudah di-revoke. Ambil token baru di BotFather.',
      404: 'token tidak valid (bentuk harus 123456789:Axxx…), atau sudah di-revoke.',
      409: 'webhook masih aktif — jalankan deleteWebhook dulu, atau pakai chat id di bawah.',
    };
    throw new Error(m + ' gagal: ' + (j.error_code || r.status) + ' ' + (j.description || '') + (map[j.error_code || r.status] ? ' → ' + map[j.error_code || r.status] : ''));
  }
  return j.result;
};

try {
  const me = await call('getMe');
  console.log('Bot: @' + me.username + ' (id ' + me.id + ')');
  try {
    const ups = await call('getUpdates');
    const chats = [...new Set(ups.map((u) => u.message && u.message.chat && u.message.chat.id).filter(Boolean))];
    if (!chats.length) console.log('Belum ada pesan masuk. Kirim satu pesan ke @' + me.username + ', lalu jalankan lagi.');
    else chats.forEach((id) => console.log('MY_TG=' + id));
  } catch (e) {
    console.log(e.message);
  }
} catch (e) {
  console.log(e.message);
}
