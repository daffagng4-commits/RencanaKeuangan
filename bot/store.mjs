// State dari Supabase (tabel rk_state), dengan penulisan bersyarat rev (cegah balapan bot vs web).
const H = (env) => ({ apikey: env.SB_KEY, authorization: 'Bearer ' + env.SB_KEY, 'content-type': 'application/json' });

export async function load(env) {
  const url = env.SB_URL + '/rest/v1/rk_state?select=user_id,data,rev&limit=1';
  const r = await fetch(url, { headers: H(env) });
  if (!r.ok) throw new Error('Supabase GET ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const rows = await r.json();
  if (!rows.length) throw new Error('rk_state kosong — buka web sekali dan aktifkan sinkronisasi.');
  return rows[0];
}

/** tulis hanya bila rev di cloud masih sama dengan yang dibaca; false = ada perubahan lain. */
export async function save(env, row, data) {
  const rev = Date.now();
  const url = env.SB_URL + '/rest/v1/rk_state?user_id=eq.' + row.user_id + '&rev=eq.' + row.rev,
    r = await fetch(url, {
      method: 'PATCH',
      headers: { ...H(env), prefer: 'return=representation' },
      body: JSON.stringify({ data, rev, updated_at: new Date().toISOString() }),
    });
  if (!r.ok) throw new Error('Supabase PATCH ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const rows = await r.json();
  return { ok: rows.length > 0, rev };
}
