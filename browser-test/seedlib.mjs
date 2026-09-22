// ============================================================
// browser-test/seedlib.mjs — Version 1.0.0
//
// Seeding and assertion helpers: put/get/list against window.__fs, day(n, h)
// for dates relative to today, ok()/summary() for the tally.
// ============================================================

export async function info(page) {
  return page.evaluate(() => {
    const keys = [...window.__fs.keys()];
    const ws = keys.find(k => /^workspaces\/[^/]+$/.test(k)).split("/")[1];
    const tiers = keys.filter(k => k.startsWith(`workspaces/${ws}/tiers/`)).map(k => ({ id: k.split("/").pop(), ...window.__fs.get(k) }));
    return { ws, tiers };
  });
}
export async function put(page, path, data) {
  await page.evaluate((p, d) => { window.__fs.set(p, d); window.__fsNotify(); }, path, data);
}
export async function get(page, path) { return page.evaluate(p => window.__fs.get(p) ?? null, path); }
export async function list(page, prefix) {
  return page.evaluate(pre => [...window.__fs.entries()].filter(([k]) => k.startsWith(pre)).map(([k, v]) => ({ id: k.split("/").pop(), ...v })), prefix);
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export function day(offset, h = 0) { const d = new Date(); d.setHours(h, 0, 0, 0); d.setDate(d.getDate() + offset); return d.getTime(); }
let pass = 0, fail = 0;
export const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };
export const summary = () => { console.log(`\n${fail ? "❌" : "✅"} ${pass} passed, ${fail} failed`); return fail; };
