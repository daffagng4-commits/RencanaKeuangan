// Jalankan: node tests/rebalance/run.js  (butuh jsdom: npm i)
const { spawnSync } = require("child_process");
let bad = 0;
for (const f of ["bundle.test.js", "journal.test.js"]) {
  const r = spawnSync("node", [require("path").join(__dirname, f)], { stdio: "inherit" });
  if (r.status !== 0) bad++;
}
process.exit(bad ? 1 : 0);
