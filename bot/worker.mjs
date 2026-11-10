// Worker Cloudflare: webhook Telegram -> router -> Supabase -> balas Telegram.
import { reply } from './router.mjs';
import { reportKind, reportArg, build } from './report.mjs';
import { toPdf } from './pdf.mjs';
import { send, sendDoc } from './telegram.mjs';
import { load, save } from './store.mjs';

const allowed = (env) => String(env.MY_TG || '').split(',').map((x) => x.trim()).filter(Boolean);

// Secret yang ditempel lewat prompt sering membawa spasi/baris baru; rapikan sekali di sini.
function clean(raw) {
  const e = {};
  for (const k of Object.keys(raw || {})) {
    let v = raw[k];
    if (typeof v === 'string') {
      v = v.trim();
      if (k === 'SB_URL') v = v.replace(/\/+$/, '');
    }
    e[k] = v;
  }
  return e;
}

async function kirimLaporan(env, chatId, kind, arg) {
  const row = await load(env);
  const rep = build(kind, arg, row.data);
  if (rep.error) return send(env, chatId, '⚠️ ' + rep.error);
  const bytes = await toPdf(rep);
  return sendDoc(env, chatId, rep.filename, bytes, rep.title + ' — ' + rep.subtitle);
}

export default {
  async fetch(req, env) {
    env = clean(env);
    const url = new URL(req.url);
    if (req.method === 'GET') {
      // Diagnosa cepat: buka URL worker di browser. Nilai token tidak ditampilkan, hanya ada/kosong.
      const has = (k) => (env[k] ? 'ada' : 'KOSONG');
      const flags =
        'TG_TOKEN=' + has('TG_TOKEN') + '\n' +
        'TG_SECRET=' + has('TG_SECRET') + '\n' +
        'MY_TG=' + (env.MY_TG || 'KOSONG') + '\n' +
        'SB_URL=' + has('SB_URL') + '\n' +
        'SB_KEY=' + has('SB_KEY') + '\n';
      if (url.pathname !== '/diag') return new Response('rencana-bot ok\n' + flags);

      const out = [flags];
      try {
        const r = await fetch('https://api.telegram.org/bot' + (env.TG_TOKEN || '') + '/getMe');
        const j = await r.json().catch(() => ({ ok: false }));
        out.push('getMe=' + (j.ok ? 'ok @' + j.result.username : 'GAGAL ' + (j.error_code || r.status) + ' ' + (j.description || '')));
      } catch (e) {
        out.push('getMe=ERROR ' + e.message);
      }
      try {
        const row = await load(env);
        out.push('rk_state=ok rev=' + row.rev + ' user=' + row.user_id);
      } catch (e) {
        out.push('rk_state=GAGAL ' + e.message);
      }
      return new Response(out.join('\n'));
    }

    if (url.pathname !== '/tg') return new Response('not found', { status: 404 });
    if (env.TG_SECRET && req.headers.get('x-telegram-bot-api-secret-token') !== env.TG_SECRET)
      return new Response('forbidden', { status: 403 });

    let up;
    try {
      up = await req.json();
    } catch (e) {
      return new Response('bad json', { status: 400 });
    }

    const msg = up.message || up.edited_message;
    const chatId = msg && msg.chat && msg.chat.id;
    const text = msg && typeof msg.text === 'string' ? msg.text : '';
    // Selalu 200 supaya Telegram tidak mengulang kirim; kesalahan dilaporkan lewat chat.
    if (!chatId || !text) return new Response('ok');

    if (!allowed(env).includes(String(chatId))) {
      console.error('chat ditolak:', chatId, 'MY_TG=', env.MY_TG);
      await send(env, chatId, '🚫 Bot ini privat. Chat id Anda: ' + chatId);
      return new Response('ok');
    }

    try {
      const kind = reportKind(text);
      if (kind) {
        await kirimLaporan(env, chatId, kind, reportArg(text));
        return new Response('ok');
      }

      const row = await load(env);
      const res = reply(text, row.data);
      let note = '';
      if (res.changed) {
        const w = await save(env, row, row.data);
        note = w.ok ? '' : '\n\n⚠️ Data tidak tersimpan: web sedang mengubah data lain. Coba lagi.';
      }
      await send(env, chatId, res.text + note);
    } catch (e) {
      await send(env, chatId, '⚠️ Error: ' + (e && e.message ? e.message : String(e)));
    }
    return new Response('ok');
  },

  // Cron tgl 1: laporan bulanan bulan lalu dikirim otomatis.
  async scheduled(event, env) {
    const chat = allowed(env)[0];
    if (!chat) return;
    const now = new Date();
    const slip = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    await kirimLaporan(env, chat, 'bulanan', String(slip.getUTCMonth() + 1));
  },
};
