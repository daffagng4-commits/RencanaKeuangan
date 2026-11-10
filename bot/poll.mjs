// Tes bot sungguhan di laptop tanpa Cloudflare/Supabase: node bot/poll.mjs <TOKEN>
// State disimpan di bot/state.local.json (dibuat dari contoh bila belum ada).
import fs from 'node:fs';
import { reply } from './router.mjs';
import { build, reportKind, reportArg } from './report.mjs';
import { toPdf } from './pdf.mjs';
import { send, sendDoc } from './telegram.mjs';
import { fixture } from './dev.mjs';

const TOKEN = process.argv[2] || process.env.TG_TOKEN || '';
const FILE = 'bot/state.local.json';
if (!TOKEN) {
  console.log('Pakai: node bot/poll.mjs <TOKEN_BOTFATHER>');
  console.log('(tidak butuh Supabase — state contoh dipakai dulu)');
  process.exit(0);
}

const all = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : fixture();
const save = () => fs.writeFileSync(FILE, JSON.stringify(all, null, 1));
console.log('Bot jalan. Kirim pesan ke bot Anda; Ctrl+C untuk berhenti.');
if (!fs.existsSync(FILE)) save();

let offset = 0;
for (;;) {
  const r = await fetch('https://api.telegram.org/bot' + TOKEN + '/getUpdates?timeout=25&offset=' + offset);
  const j = await r.json();
  if (!j.ok) { console.log('Telegram error:', JSON.stringify(j)); break; }
  for (const up of j.result) {
    offset = up.update_id + 1;
    const msg = up.message;
    if (!msg || !msg.text) continue;
    console.log('←', msg.chat.id, msg.text);
    const kind = reportKind(msg.text);
    if (kind) {
      const rep = build(kind, reportArg(msg.text), all);
      if (rep.error) await send({ TG_TOKEN: TOKEN }, msg.chat.id, '⚠️ ' + rep.error);
      else await sendDoc({ TG_TOKEN: TOKEN }, msg.chat.id, rep.filename, await toPdf(rep), rep.title + ' — ' + rep.subtitle);
      continue;
    }
    const res = reply(msg.text, all);
    if (res.changed) save();
    await send({ TG_TOKEN: TOKEN }, msg.chat.id, res.text);
  }
}
