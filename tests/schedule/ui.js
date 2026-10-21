// Memuat index.html (tanpa skrip eksternal) ke jsdom untuk menguji jendela "Ubah harga / jadwal" apa adanya.
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function boot() {
  let html = fs.readFileSync(process.env.INDEX_PATH || path.join(__dirname, "..", "..", "index.html"), "utf8")
    .replace(/<script[^>]*src="https?:[^"]*"[^>]*><\/script>/g, "").replace(/<link[^>]*href="https?:[^"]*"[^>]*>/g, "");
  const errs = [];
  const w = new JSDOM(html, { url: "https://t.test/", runScripts: "dangerously", pretendToBeVisual: true,
    beforeParse(x) {
      x.matchMedia = (q) => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      x.Element.prototype.scrollIntoView = function () {};
      x.addEventListener("error", (e) => errs.push(e.message));
    } }).window;
  const $ = (id) => w.document.getElementById(id);
  const fire = (el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
  const click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  return { w, $, errs, fire, click, ready: () => new Promise((r) => setTimeout(r, 500)) };
}
module.exports = { boot };
