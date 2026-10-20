// Memuat tools/rebalance/index.html ke jsdom (tanpa CDN) supaya app.js bisa diuji.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const dir = path.join(__dirname, "..", "..", "tools", "rebalance");

function load(opts = {}) {
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  html = html.replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<link[^>]*href="https?:[^"]*"[^>]*>/g, "")
    .replace(/<script>\s*tailwind\.config[\s\S]*?<\/script>/, "")
    .replace(/<link rel="stylesheet" href="styles.css">/, "")
    .replace(/<script src="\.\.\/bridge\.js"><\/script>/, "");
  const app = fs.readFileSync(opts.appFile || path.join(dir, "app.js"), "utf8");
  html = html.replace(/<script src="app\.js"><\/script>\s*<script src="journal\.js"><\/script>/, "");
  const journalJs = opts.noJournal ? "" : fs.readFileSync(path.join(dir, "journal.js"), "utf8");
  const dom = new JSDOM(html, { url: opts.url || "http://localhost/tools/rebalance/index.html", runScripts: "dangerously", pretendToBeVisual: true });
  const w = dom.window;
  const errors = [];
  w.addEventListener("error", (e) => errors.push(e.message));
  if (opts.beforeApp) opts.beforeApp(w);
  const s = w.document.createElement("script");
  s.textContent = app;
  w.document.body.appendChild(s);
  if (journalJs) { const j = w.document.createElement("script"); j.textContent = journalJs; w.document.body.appendChild(j); }
  const $ = (id) => w.document.getElementById(id);
  const ev = (code) => w.eval(code);
  const set = (id, value) => { const el = $(id); el.value = value; el.dispatchEvent(new w.Event("input", { bubbles: true })); el.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const flush = () => new Promise((r) => setTimeout(r, 40));
  return { dom, w, $, ev, set, flush, errors };
}
module.exports = { load };
