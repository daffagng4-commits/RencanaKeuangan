// Sambungkan webhook tanpa mengetik URL: node bot/webhook.mjs <TOKEN> <URL_WORKER> [TG_SECRET]
const [T, W, S] = process.argv.slice(2).map((x) => (x || '').trim());
if (!T || !W) {
  console.log('Pakai: node bot/webhook.mjs TOKEN URL_WORKER [TG_SECRET]');
  console.log('Contoh: node bot/webhook.mjs 9188773826:AA... https://rencana-bot.daffa.workers.dev abc123');
  process.exit(0);
}
const base = 'https://api.telegram.org/bot' + T + '/';
const api = async (m, q) => {
  const r = await fetch(base + m + (q ? '?' + new URLSearchParams(q) : ''));
  const j = await r.json().catch(() => ({ ok: false, description: 'balasan bukan JSON' }));
  if (!j.ok) throw new Error(m + ' gagal: ' + (j.error_code || r.status) + ' ' + (j.description || ''));
  return j.result;
};
const url = W.replace(/\/+$/, '').replace(/\/tg$/, '') + '/tg';

try {
  const me = await api('getMe');
  console.log('Bot: @' + me.username);
  await api('setWebhook', S ? { url, secret_token: S } : { url });
  console.log('Webhook dipasang:', url, S ? '(dengan secret_token)' : '(TANPA secret_token)');
  const info = await api('getWebhookInfo');
  console.log('url:', info.url);
  console.log('pending:', info.pending_update_count, '| error terakhir:', info.last_error_message || 'tidak ada');
  if (!S) console.log('⚠️ TG_SECRET kosong: Worker Anda menolak (403) bila TG_SECRET terpasang. Jalankan ulang dengan argumen ke-3.');
} catch (e) {
  console.log(e.message);
  if (/401/.test(e.message)) console.log('→ token salah/revoke. Ambil token baru di BotFather.');
  if (/400/.test(e.message)) console.log('→ URL worker tidak valid atau bukan https.');
}
