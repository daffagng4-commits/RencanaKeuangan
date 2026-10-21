// Memuat tools/rebalance/index.html ke jsdom (tanpa CDN) supaya app.js bisa diuji.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const dir = path.join(__dirname, "..", "..", "tools", "rebalance");

function load(opts = {}) {
  let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const app = fs.readFileSync(opts.appFile || path.join(dir, "app.js"), "utf8");
  html = html.replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "")
    .replace(/<link[^>]*href="https?:[^"]*"[^>]*>/g, "")
    .replace(/<script>\s*tailwind\.config[\s\S]*?<\/script>/, "")
    .replace(/<script src="\.\.\/bridge\.js"><\/script>/, "")
    .replace(/<script src="app\.js"><\/script>/, () => `<script>${app}</script>`);
  if (opts.appFile) html = html.replace(/<body[^>]*>/, (m) => m + '<button id="save-rdn-button"></button><p id="rdn-auto-copy"></p>'); // elemen lama yang dicari app.js versi r18
  const dom = new JSDOM(html, { url: "http://localhost/tools/rebalance/index.html", runScripts: "dangerously", pretendToBeVisual: true });
  const w = dom.window;
  const errors = [];
  w.addEventListener("error", (e) => errors.push(e.message));
  if (opts.storage) Object.entries(opts.storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
  const $ = (id) => w.document.getElementById(id);
  const ev = (code) => w.eval(code);
  const set = (id, value) => { const el = $(id); el.value = value; el.dispatchEvent(new w.Event("input", { bubbles: true })); el.dispatchEvent(new w.Event("change", { bubbles: true })); };
  const flush = () => new Promise((r) => setTimeout(r, 40));
  return { dom, w, $, ev, set, flush, errors };
}
module.exports = { load };
