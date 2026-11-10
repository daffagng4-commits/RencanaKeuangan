// Kirim pesan/dokumen lewat Telegram Bot API. Tanpa TG_TOKEN -> mode dry-run (cetak ke konsol).
const API = 'https://api.telegram.org/bot';

function chunk(text, max) {
  const out = [];
  let s = String(text);
  while (s.length > max) {
    let cut = s.lastIndexOf('\n', max);
    if (cut < max * 0.5) cut = max;
    out.push(s.slice(0, cut));
    s = s.slice(cut).replace(/^\n+/, '');
  }
  out.push(s);
  return out;
}

export async function send(env, chatId, text) {
  const parts = chunk(text, 3800);
  if (!env.TG_TOKEN) {
    console.log('[dry-run] chat ' + chatId + '\n' + parts.join('\n---\n'));
    return { ok: true, dry: true };
  }
  for (const part of parts) {
    const r = await fetch(API + env.TG_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: part, disable_web_page_preview: true }),
    });
    if (!r.ok) return { ok: false, status: r.status, body: await r.text() };
  }
  return { ok: true };
}

export async function sendDoc(env, chatId, filename, bytes, caption) {
  if (!env.TG_TOKEN) {
    console.log('[dry-run] dokumen ' + filename + ' (' + bytes.length + ' byte) untuk chat ' + chatId);
    return { ok: true, dry: true };
  }
  const fd = new FormData();
  fd.append('chat_id', String(chatId));
  if (caption) fd.append('caption', caption);
  fd.append('document', new Blob([bytes], { type: 'application/pdf' }), filename);
  const r = await fetch(API + env.TG_TOKEN + '/sendDocument', { method: 'POST', body: fd });
  return { ok: r.ok, status: r.status, body: r.ok ? '' : await r.text() };
}
