// ============================================================
// browser-test/walk-items-6-7-8-9.test.mjs — Version 1.1.0
//
// Katie's handwritten list, items 7, 8 and 9: year-view tier chips, ⏱ ✎ on Today rows, edit pop-ups for projects and tasks (and that they are really on top).
//   TZ=America/Chicago node browser-test/walk-items-6-7-8-9.test.mjs
// ============================================================

import { boot, errors, dialogs, answers } from "./harness.mjs";
import { info, put, get, list, sleep, day, ok, summary } from "./seedlib.mjs";
const { page, close } = await boot();
const { ws, tiers } = await info(page);
const work = tiers.find(t => t.name === "Work"), pers = tiers.find(t => t.name === "Personal");
const P = `workspaces/${ws}`;
const base = { workload: 2, stretchUntilDone: false, completedAt: null, completedBy: null, createdBy: "katie@example.com", createdAt: Date.now() };
await put(page, `${P}/projects/pW`, { ...base, name: "Acme 2026", color: "#e64980", tierId: work.id, startDate: day(-1), endDate: day(8),
  stages: [ { sid: "a1", name: "Draft memo", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null } ]});
await put(page, `${P}/projects/pL`, { ...base, name: "Laundry", color: "#69db7c", tierId: pers.id, startDate: day(-1), endDate: day(1),
  stages: [ { sid: "l1", name: "Wash", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null } ]});
// a Work task due NEXT TUESDAY-ish (well in the future) and one due today
const task = (title, tierId, dueAt, o = {}) => ({ title, tierId, dueAt, escalation: { every: 1, unit: "hours" }, notes: "", projectId: null,
  completedAt: null, completedBy: null, parentTaskId: null, offsetDays: null, createdBy: "katie@example.com", createdAt: 1, ...o });
await put(page, `${P}/tasks/tFuture`, task("Board pack", work.id, day(9, 16)));
await put(page, `${P}/tasks/tToday`, task("Call Bob", work.id, day(0, 23)));
await sleep(800);
const closeDecision = async () => { if (await page.evaluate(() => !document.querySelector("#decision-modal").hidden)) { await page.click("#decision-close"); await sleep(200); } };
await closeDecision();
const center = sel => page.evaluate(sel => { const el = typeof sel === "string" ? document.querySelector(sel) : null; el.scrollIntoView({ block: "center" });
  const r = el.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }, sel);
const realClick = async sel => { const c = await center(sel); await page.mouse.click(c.x, c.y); await sleep(250); };
const hitIs = (sel, want) => page.evaluate((sel, want) => { const el = document.querySelector(sel); const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); return !!top?.closest(want); }, sel, want);

console.log("\n— item 8: ⏱ on the Today row —");
const rowBtns = () => page.evaluate(() => { const row = [...document.querySelectorAll("#queue .row")].find(r => /Draft memo/.test(r.textContent));
  return row ? [...row.querySelectorAll("button")].map(b => b.textContent.trim()) : null; });
const rb = await rowBtns();
ok(rb && rb.includes("▶ Clock in") && rb.includes("✎") && rb.includes("⏰"), "the stage row has ▶ Clock in, ✎, ⏰ (2.4.0: words, not a fourth clock face): " + JSON.stringify(rb));
await page.evaluate(() => { const row = [...document.querySelectorAll("#queue .row")].find(r => /Draft memo/.test(r.textContent));
  const b = [...row.querySelectorAll("button")].find(b => b.textContent.trim() === "▶ Clock in"); b.id = "__clk"; });
await realClick("#__clk"); await sleep(500);
const sess = await list(page, `${P}/sessions/`);
ok(sess.length === 1 && sess[0].projectId === "pW" && sess[0].end == null, "tapping ⏱ starts a session on Acme 2026");
const rb2 = await rowBtns();
ok(rb2 && rb2.some(t => /^⏹/.test(t)), "…and the row now shows ⏹ with the running time: " + rb2.find(t => /^⏹/.test(t)));
const cardClock = await page.evaluate(() => document.querySelector('.project-card[data-project-id="pW"] .clock-btn')?.textContent);
ok(/⏹/.test(cardClock || ""), "the project card's own clock agrees (one timer, two buttons)");
await page.evaluate(() => { const row = [...document.querySelectorAll("#queue .row")].find(r => /Draft memo/.test(r.textContent));
  [...row.querySelectorAll("button")].find(b => /^⏹/.test(b.textContent.trim())).id = "__stop"; });
await realClick("#__stop");
ok(await page.evaluate(() => [...document.querySelectorAll(".modal-shell")].some(m => !m.hidden && /clock/i.test(m.id))), "tapping ⏹ opens the clock-out dialog (to adjust the end time)");
await page.evaluate(() => { const m = [...document.querySelectorAll(".modal-shell")].find(m => !m.hidden && /clock/i.test(m.id)); m.querySelector("button.primary")?.click(); });
await sleep(400);

console.log("\n— item 9: edit a project where you are —");
await page.evaluate(() => { const row = [...document.querySelectorAll("#queue .row")].find(r => /Draft memo/.test(r.textContent));
  [...row.querySelectorAll("button")].find(b => b.textContent.trim() === "✎").id = "__pedit"; });
await realClick("#__pedit");
let st = await page.evaluate(() => ({ open: !document.querySelector("#yv-project-modal").hidden,
  inside: !!document.querySelector("#yv-project-modal #project-form"), name: document.querySelector("#project-name").value,
  stagesBtn: !document.querySelector("#project-edit-stages").hidden, title: document.querySelector("#project-form-title").textContent }));
ok(st.open && st.inside && st.name === "Acme 2026", "✎ on the Today row pops the project form up in place, filled in");
ok(st.stagesBtn, "…with '✎⋮ Stages…' available while editing");
ok(await hitIs("#project-name", "#yv-project-modal"), "…and it's really on top (a tap on the name field lands in the pop-up)");
await realClick("#project-edit-stages");
ok(await page.evaluate(() => !document.querySelector("#stages-modal").hidden), "'✎⋮ Stages…' opens the stage editor over it");
ok(await hitIs("#stages-save", "#stages-modal"), "…on top, where a tap reaches it");
await page.click("#stages-cancel"); await sleep(200);
await page.evaluate(() => { const i = document.querySelector("#project-name"); i.value = "Acme 2026 (renamed)"; i.dispatchEvent(new Event("input", { bubbles: true })); });
await page.evaluate(() => document.querySelector("#project-submit").click()); await sleep(800);
st = await page.evaluate(() => ({ open: !document.querySelector("#yv-project-modal").hidden, home: !!document.querySelector("#form-panel #project-form"),
  stagesBtn: document.querySelector("#project-edit-stages").hidden }));
ok((await get(page, `${P}/projects/pW`)).name === "Acme 2026 (renamed)", "saving writes the edit");
ok(!st.open && st.home && st.stagesBtn, "…closes the pop-up, and the form goes home (back to New-project mode)");

console.log("\n— item 9: card ✎ and Escape —");
await page.evaluate(() => { const c = document.querySelector('.project-card[data-project-id="pL"]'); [...c.querySelectorAll(".proj-btns button")].find(b => b.textContent === "✎").id = "__cedit"; });
await realClick("#__cedit");
ok(await page.evaluate(() => !document.querySelector("#yv-project-modal").hidden && document.querySelector("#project-name").value === "Laundry"), "card ✎ pops up too");
await page.keyboard.press("Escape"); await sleep(300);
st = await page.evaluate(() => ({ open: !document.querySelector("#yv-project-modal").hidden, home: !!document.querySelector("#form-panel #project-form"), editing: document.querySelector("#project-form-title").textContent }));
ok(!st.open && st.home, "Escape closes it and the form goes home: title now '" + st.editing + "'");

console.log("\n— item 9: edit a task where you are —");
await page.evaluate(() => { const row = [...document.querySelectorAll("#queue .row")].find(r => /Call Bob/.test(r.textContent));
  [...row.querySelectorAll("button")].find(b => b.textContent.trim() === "✎").id = "__tedit"; });
await realClick("#__tedit");
st = await page.evaluate(() => ({ open: !document.querySelector("#task-edit-modal").hidden, inside: !!document.querySelector("#task-edit-modal #task-form"), v: document.querySelector("#task-title").value }));
ok(st.open && st.inside && st.v === "Call Bob", "task ✎ pops the task form up in place");
ok(await hitIs("#task-title", "#task-edit-modal"), "…on top");
await page.evaluate(() => { document.querySelector("#task-title").value = "Call Bob back"; });
await page.evaluate(() => document.querySelector("#task-form").requestSubmit()); await sleep(800);
st = await page.evaluate(() => ({ open: !document.querySelector("#task-edit-modal").hidden, home: !document.querySelector("#task-edit-modal #task-form") }));
ok((await get(page, `${P}/tasks/tToday`)).title === "Call Bob back" && !st.open && st.home, "saving writes it, closes, and sends the form home");
await page.evaluate(() => { const row = [...document.querySelectorAll("#queue .row")].find(r => /Call Bob back/.test(r.textContent));
  [...row.querySelectorAll("button")].find(b => b.textContent.trim() === "✎").id = "__tedit2"; });
await realClick("#__tedit2"); await page.click("#task-edit-close"); await sleep(200);
st = await page.evaluate(() => ({ open: !document.querySelector("#task-edit-modal").hidden, home: !document.querySelector("#task-edit-modal #task-form"), t: document.querySelector("#task-title").value }));
ok(!st.open && st.home && st.t === "", "✕ cancels: closed, home, form cleared back to New task");

console.log("\n— item 7: tier chips on the year view —");
await page.click('#view-switch [data-view="year"]'); await sleep(500);
const chips = await page.evaluate(() => [...document.querySelectorAll("#yv-tier-filters .filter-chip")].map(c => c.textContent));
ok(chips.length === 2 && chips.some(c => /Work/.test(c)) && chips.some(c => /Personal/.test(c)), "a chip per tier with dated projects: " + chips.join(" | "));
const bars = () => page.evaluate(() => (document.querySelector("#yv-legend")?.innerText || "") + " " +
  [...document.querySelectorAll("#yv-grid [title]")].map(e => e.title).join(" "));
ok(/Laundry/.test(await bars()), "Laundry is on the calendar");
await page.evaluate(() => [...document.querySelectorAll("#yv-tier-filters .filter-chip")].find(c => /Personal/.test(c.textContent)).id = "__chip");
await realClick("#__chip"); await sleep(200);
ok(!/Laundry/.test(await bars()) && /Acme/.test(await bars()), "tapping Personal hides Laundry, keeps Acme");
ok(await page.evaluate(() => /○ Personal/.test(document.querySelector("#yv-tier-filters").innerText)), "…the chip shows ○ (off)");
await page.click('#view-switch [data-view="day"]'); await sleep(300);
ok(await page.evaluate(() => /● Personal/.test(document.querySelector("#tier-filters").innerText)), "the Today list's own Personal chip is untouched");
await page.reload({ waitUntil: "load" }); await sleep(2500);
await page.click('#view-switch [data-view="year"]').catch(() => {}); await sleep(400);
ok(await page.evaluate(() => JSON.parse(localStorage.getItem("tc-yv-hidden-tiers") || "[]").length === 1), "remembered on this device (localStorage)");

console.log("\nDIALOGS:\n" + dialogs.join("\n---\n"));
console.log("\nERRORS:\n" + (errors.join("\n") || "(none)"));
const f = summary(); await close(); process.exit(f ? 1 : 0);
