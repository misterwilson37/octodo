// ============================================================
// browser-test/walk-phone.test.mjs — Version 1.0.0
//
// Katie's handwritten list, items 6, 5 and 1 at 412px with touch: Saturday Waiting on…, finger drag + wiggle, shift chips fit.
//   TZ=America/Chicago node browser-test/walk-phone.test.mjs
// ============================================================

import { boot, errors, dialogs } from "./harness.mjs";
import { info, put, get, list, sleep, day, ok, summary } from "./seedlib.mjs";
const { page, close } = await boot({ width: 412, height: 915, mobile: true });   // a Galaxy-ish phone
const { ws, tiers } = await info(page);
const work = tiers.find(t => t.name === "Work");
const P = `workspaces/${ws}`;
const task = (title, dueAt, o = {}) => ({ title, tierId: work.id, dueAt, escalation: { every: 1, unit: "hours" }, notes: "", projectId: null,
  completedAt: null, completedBy: null, parentTaskId: null, offsetDays: null, createdBy: "katie@example.com", createdAt: 1, ...o });
// Saturday is day(4) from Tue Sep 22
await put(page, `${P}/tasks/tNext`, task("Board pack", day(9, 16)));
await put(page, `${P}/tasks/tSat`, task("This happened (Saturday)", day(4, 16)));
await put(page, `${P}/projects/pW`, { workload: 2, completedAt: null, createdBy: "katie@example.com", name: "Acme 2026", color: "#e64980",
  tierId: work.id, startDate: day(-1), endDate: day(8), stages: ["Alpha", "Bravo", "Charlie", "Delta"].map((n, i) =>
  ({ sid: "s" + i, name: n, direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null })) });
await sleep(800);
if (await page.evaluate(() => !document.querySelector("#decision-modal").hidden)) { await page.click("#decision-close"); await sleep(200); }

console.log("\n— item 6: Waiting on… on Saturday (phone) —");
for (let i = 0; i < 4; i++) { await page.evaluate(() => document.querySelector("#day-next").click()); await sleep(200); }
const label = await page.evaluate(() => document.querySelector("#day-label").textContent);
const w = await page.evaluate(() => document.querySelector("#waiting").hidden ? "" : document.querySelector("#waiting-list").innerText);
ok(/Sat/.test(label), "viewing " + label);
ok(!/Board pack/.test(w), "a Work task due next week is NOT parked in Saturday's Waiting on…");
ok(/This happened/.test(w) && /doesn.t run that day|Work/.test(w), "the one dated TO Saturday is there, with its reason: " + w.replace(/\n/g, " | ").slice(0, 120));
await page.evaluate(() => document.querySelector("#day-today")?.click()); await sleep(200);
const wToday = await page.evaluate(() => document.querySelector("#waiting").hidden);
ok(wToday, "back on Tuesday, Waiting on… has nothing (no undated items seeded)");

console.log("\n— item 5: touch drag on a phone —");
await page.evaluate(() => { const c = document.querySelector('.project-card[data-project-id="pW"]');
  [...c.querySelectorAll(".proj-btns button")].find(b => b.textContent === "✎⋮").click(); });
await sleep(300);
const g = await page.evaluate(() => [...document.querySelectorAll("#stage-proj-editor .st-grip")].map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height }; }));
ok(g.length === 4, `grips present (${Math.round(g[0].w)}×${Math.round(g[0].h)}px each)`);
const cdp = await page.createCDPSession();
const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
await touch("touchStart", g[0].x, g[0].y);
for (let i = 1; i <= 12; i++) { await touch("touchMove", g[0].x, g[0].y + (g[3].y + 20 - g[0].y) * i / 12); await sleep(16); }
await touch("touchEnd"); await sleep(150);
const order = await page.evaluate(() => [...document.querySelectorAll("#stage-proj-editor .st-name")].map(i => i.value).join(","));
ok(order === "Bravo,Charlie,Delta,Alpha", "a finger drag moves Alpha from top to bottom: " + order);
const scrolled = await page.evaluate(() => document.scrollingElement.scrollTop);
console.log("  (page scrollTop after drag: " + scrolled + ")");
// wiggle: 15px down, 15px up, 10px down on the second grip — nothing should move
const g2 = await page.evaluate(() => [...document.querySelectorAll("#stage-proj-editor .st-grip")].map(e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }));
await touch("touchStart", g2[1].x, g2[1].y);
for (const dy of [5, 10, 15, 0, -10, -15, 0, 10]) { await touch("touchMove", g2[1].x, g2[1].y + dy); await sleep(16); }
await touch("touchEnd"); await sleep(100);
ok((await page.evaluate(() => [...document.querySelectorAll("#stage-proj-editor .st-name")].map(i => i.value).join(","))) === "Bravo,Charlie,Delta,Alpha", "a small wiggle on a grip reorders nothing");
await page.click("#stages-save"); await sleep(800);
ok((await get(page, `${P}/projects/pW`)).stages.map(s => s.name).join(",") === "Bravo,Charlie,Delta,Alpha", "…and it saves");

console.log("\n— item 1 on a phone: the shift chips fit and are tappable —");
await page.evaluate(() => { const c = document.querySelector('.project-card[data-project-id="pW"]');
  [...c.querySelectorAll(".proj-btns button")].find(b => b.textContent === "📋").click(); });
await sleep(300);
const chips = await page.evaluate(() => [...document.querySelectorAll("#dup-shift-row button")].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent, r: r.right, h: r.height }; }));
ok(chips.every(c => c.r <= 412), "all 7 chips stay on screen (they wrap): widest right edge " + Math.max(...chips.map(c => c.r)));
await page.tap('#dup-shift-row [data-shift="2w"]'); await sleep(100);
ok(await page.evaluate(() => document.querySelector('#dup-shift-row .active')?.dataset.shift === "2w"), "a tap selects +2 weeks");
console.log("\nERRORS:\n" + (errors.join("\n") || "(none)"));
const f = summary(); await close(); process.exit(f ? 1 : 0);
