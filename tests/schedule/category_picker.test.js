const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<input id="year" type="number" list="yl"><datalist id="yl"><option value="2026"></datalist>' +
  '<input id="f-cat" list="catlist"><input id="qkc" list="catlist">' +
  '<datalist id="catlist"><option value="Langganan"><option value="Makanan"></datalist>' +
  '<input id="kc" list="kcl"><datalist id="kcl"><option value="Transport"></datalist>',
{ runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
// Explicit upgrades keep this isolated picker check free of page lifecycle timers.
w.MutationObserver = undefined;
w.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
try {
  w.eval(fs.readFileSync(path.join(__dirname, '../../js/ui/datepick.js'), 'utf8'));
  w.upPickers();
  for (const id of ['f-cat', 'qkc', 'kc']) {
    const input = w.document.getElementById(id);
    assert.equal(input.list, null, id + ': native suggestions must not compete with custom picker');
    input.getBoundingClientRect = () => ({ left: 20, right: 300, top: 100, bottom: 140 });
    const trigger = input.parentElement.querySelector('.pk-tg');
    trigger.getBoundingClientRect = () => ({ left: 266, right: 300, top: 100, bottom: 140 });
    input.click();
    let panel = w.document.querySelector('.pk-list');
    assert(panel, id + ': clicking the category field opens custom choices');
    assert.equal(panel.style.left, '20px', id + ': menu aligns with field, not chevron');
    let inputs = 0, changes = 0;
    input.addEventListener('input', () => inputs++);
    input.addEventListener('change', () => changes++);
    const option = panel.querySelector('[data-v]');
    const expected = option.dataset.v;
    option.click();
    assert.equal(input.value, expected);
    assert.equal(inputs, 1);
    assert.equal(changes, 1);
    assert.equal(w.document.querySelector('.pk-list'), null);
    trigger.click();
    assert(w.document.querySelector('.pk-list .on'), id + ': current option highlighted');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(w.document.querySelector('.pk-list'), null);
    assert.equal(w.document.activeElement, trigger);
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    assert.equal(w.document.activeElement, w.document.querySelector('.pk-list button'), id + ': keyboard reaches choices');
    w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    w.upPickers();
    assert.equal(input.parentElement.querySelectorAll('.pk-tg').length, 1);
  }
  assert.equal(w.document.getElementById('year').list.id, 'yl', 'non-category numeric datalist unchanged');
  const list = w.document.getElementById('catlist');
  list.innerHTML = '<option value="Baru & unik">';
  w.document.getElementById('qkc').click();
  assert.equal(w.document.querySelector('.pk-list [data-v]').dataset.v, 'Baru & unik', 'updated suggestions read on open');
  w.document.body.dispatchEvent(new w.Event('pointerdown', { bubbles: true }));
  assert.equal(w.document.querySelector('.pk-list'), null);
  console.log('OK: category fields share custom picker; native conflict, alignment, selection, events, refresh, Escape, outside close');
} finally {
  w.close();
}
