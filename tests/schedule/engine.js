// Memuat mesin jadwal (util + schedule) langsung dari index.html yang hidup, tanpa DOM.
const vm = require("vm");
const fs = require("fs");
const path = require("path");
function loadEngine() {
  const html = fs.readFileSync(process.env.INDEX_PATH || path.join(__dirname, "..", "..", "index.html"), "utf8");
  const a = html.indexOf("/* ===== js/config.js ===== */");
  const b = html.indexOf("/* ===== js/core/state.js ===== */");
  if (a < 0 || b < 0) throw new Error("penanda bagian tidak ditemukan di index.html");
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, RegExp, parseInt, parseFloat, isNaN });
  vm.runInContext(html.slice(a, b), ctx, { filename: "index.html(core)" });
  const r1 = html.indexOf("function remapStatus(");
  const r2 = html.indexOf("/** Jalankan `mutate()`");
  vm.runInContext(html.slice(r1, r2), ctx, { filename: "index.html(remapStatus)" });
  return ctx;
}
module.exports = { loadEngine };
