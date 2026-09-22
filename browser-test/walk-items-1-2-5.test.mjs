// ============================================================
// browser-test/walk-items-1-2-5.test.mjs — Version 1.0.0
//
// Katie's handwritten list, items 1, 2 and 5: Duplicate with date chips, 🎆/outrider carry-over, Someday copies; Save as template; drag (desktop + Settings); Pipeline + New.
//   TZ=America/Chicago node browser-test/walk-items-1-2-5.test.mjs
// ============================================================

import { boot, errors, dialogs, answers } from "./harness.mjs";
import { info, put, get, list, sleep, day, ok, summary } from "./seedlib.mjs";
const { page, close } = await boot();
const { ws, tiers } = await info(page);
const work = tiers.find(t => t.name === "Work"), pers = tiers.find(t => t.name === "Personal");
const P = `workspaces/${ws}`;
const base = { workload: 2, stretchUntilDone: false, completedAt: null, completedBy: null, createdBy: "katie@example.com", createdAt: Date.now() };
const iso = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
await put(page, `${P}/projects/pL`, { ...base, name: "Laundry", color: "#69db7c", tierId: pers.id, startDate: day(0), endDate: day(2),
  stages: [ { sid: "l1", name: "Wash", direction: "none", anchor: "start", offsetDays: 0, completedAt: day(0, 8), dueAt: null },
            { sid: "l2", name: "Dry", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null },
            { sid: "l3", name: "Fold", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null, hurrah: true, spawnDays: 3 } ]});
await put(page, `${P}/projects/pA`, { ...base, name: "Acme 2026", color: "#e64980", tierId: work.id, startDate: day(-3), endDate: day(8),
  stages: [ { sid: "a1", name: "Draft", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null } ]});
// Acme's two legacy outriders (as 2.1.0 made them): letter before start, invoice after end
const { stageScheduledAt } = await import("../queue.js");
const pAdoc = await get(page, `${P}/projects/pA`);
const task = (title, dueAt) => ({ title, tierId: work.id, dueAt, escalation: { every: 1, unit: "days" }, notes: "", projectId: null,
  completedAt: null, completedBy: null, parentTaskId: null, offsetDays: null, createdBy: "katie@example.com", createdAt: 1 });
await put(page, `${P}/tasks/out_pA_x1`, task("Engagement letter — Acme 2026", stageScheduledAt(pAdoc, { direction: "before", anchor: "start", offsetDays: 10 }, work.allowedDays)));
await put(page, `${P}/tasks/out_pA_x2`, task("Invoice — Acme 2026", stageScheduledAt(pAdoc, { direction: "after", anchor: "end", offsetDays: 4 }, work.allowedDays)));
await sleep(5500);   // let the re-peg settle (the invoice goes to Waiting)
const closeDecision = async () => { if (await page.evaluate(() => !document.querySelector("#decision-modal").hidden)) { await page.click("#decision-close"); await sleep(200); } };
await closeDecision();
const cardBtn = (pid, txt) => page.evaluate((pid, txt) => { const c = document.querySelector(`.project-card[data-project-id="${pid}"]`);
  const b = [...c.querySelectorAll(".proj-btns button")].find(b => b.textContent === txt); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }, pid, txt);
const clickCard = async (pid, txt) => { const p = await cardBtn(pid, txt); await page.mouse.click(p.x, p.y); await sleep(300); };

console.log("\n— item 1: Duplicate, Katie's laundry —");
await clickCard("pL", "📋");
let d = await page.evaluate(() => ({ open: !document.querySelector("#dup-modal").hidden, h: document.querySelector("#dup-heading").textContent,
  yes: document.querySelector("#dup-yes").textContent, no: document.querySelector("#dup-no").textContent,
  fu: document.querySelector("#dup-followup").hidden, sn: document.querySelector("#dup-snooze-row").hidden,
  start: document.querySelector("#dup-start").value, name: document.querySelector("#dup-name").value,
  active: document.querySelector("#dup-shift-row .active")?.dataset.shift }));
ok(d.open && d.h === "📋 Duplicate project" && d.yes === "Create the copy" && d.no === "Cancel", "📋 opens a plain Duplicate (heading, Create the copy, Cancel)");
ok(d.fu && d.sn, "…without the finished-project follow-up box or the snooze");
ok(d.active === "1y", `…with +1 year pre-selected (start ${d.start})`);
await page.click('#dup-shift-row [data-shift="1w"]'); await sleep(100);
await page.click('#dup-shift-row [data-shift="1w"]'); await sleep(100);   // twice: must NOT be +2 weeks
d = await page.evaluate(() => ({ start: document.querySelector("#dup-start").value, end: document.querySelector("#dup-end").value, name: document.querySelector("#dup-name").value,
  active: document.querySelector("#dup-shift-row .active")?.dataset.shift }));
ok(d.start === iso(day(7)) && d.end === iso(day(9)), `+1 week tapped twice is still +1 week from the ORIGINAL: ${d.start} → ${d.end}`);
ok(d.name === "Laundry" && d.active === "1w", "name untouched, +1 week highlighted");
await page.click('#dup-shift-row [data-shift="0d"]'); await sleep(100);
d = await page.evaluate(() => document.querySelector("#dup-start").value);
ok(d === iso(day(0)), "'same dates' puts the original dates back");
await page.click('#dup-shift-row [data-shift="3m"]'); await sleep(100);
await page.click("#dup-yes"); await sleep(1200);
const projs = await list(page, `${P}/projects/`);
const copy = projs.find(p => p.name === "Laundry" && p.startDate !== day(0));
const exp3m = new Date(day(0)); exp3m.setMonth(exp3m.getMonth() + 3);
ok(copy && iso(copy.startDate) === iso(exp3m.getTime()), `copy created 3 months out: ${copy && iso(copy.startDate)}`);
ok(copy && copy.stages.length === 3 && copy.stages.every(s => !s.completedAt), "…3 stages, every checkmark reset");
const fold = copy?.stages.find(s => s.name === "Fold");
ok(fold?.hurrah === true && fold?.spawnDays === 3 && !fold?.spawnedTaskId, "…🎆 and its ↳ +3d carried (this was being dropped)");

console.log("\n— item 1: Duplicate restores outriders —");
await clickCard("pA", "📋");
const txt = await page.evaluate(() => document.querySelector("#dup-text").textContent);
ok(/3-stage pipeline/.test(txt) && /including 2 steps/.test(txt), "the copy counts the letter and invoice back in: " + txt.slice(0, 140));
await page.click('#dup-shift-row [data-shift="1y"]');
await page.click("#dup-yes"); await sleep(1500);
const acmeCopy = (await list(page, `${P}/projects/`)).find(p => p.name === "Acme 2027");
ok(!!acmeCopy, "YYYY in the name followed the year: 'Acme 2027'");
ok(acmeCopy && acmeCopy.stages.length === 1 && acmeCopy.stages[0].name === "Draft", "…the letter and invoice left its pipeline again (syncOutriders ran on create)");
const acmeTasks = (await list(page, `${P}/tasks/out_${acmeCopy?.id}_`));
const letter = acmeTasks.find(t => /Engagement letter/.test(t.title)), inv = acmeTasks.find(t => /Invoice/.test(t.title));
ok(letter && letter.dueAt != null && letter.dueAt < acmeCopy.startDate, "…the new engagement letter is dated before next year's start");
ok(inv && inv.dueAt === null && inv.afterProjectWd === 4, "…the new invoice waits for next year's finish, +4 working days");

console.log("\n— item 1: a Someday project can be duplicated —");
await put(page, `${P}/tiers/tSome`, { name: "Someday", rank: 9, color: "#b197fc", kind: "task", timeless: true, allowedDays: [0,1,2,3,4,5,6], midnightCarryover: false });
await sleep(400);
const some = { id: "tSome" };
if (some) {
  await put(page, `${P}/projects/pS`, { ...base, name: "Library cabinets", color: "#b197fc", tierId: some.id, startDate: null, endDate: null,
    stages: [ { sid: "z1", name: "Measure", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null } ]});
  await sleep(400);
  await page.click("#mode-want"); await sleep(300);
  await clickCard("pS", "📋");
  const s = await page.evaluate(() => ({ dates: document.querySelector("#dup-dates-row").hidden, shift: document.querySelector("#dup-shift-row").hidden }));
  ok(s.dates && s.shift, "Someday copy: no date row, no shift chips");
  await page.click("#dup-yes"); await sleep(800);
  ok((await list(page, `${P}/projects/`)).filter(p => p.name === "Library cabinets").length === 2, "…and the copy is created");
  await page.click("#mode-have"); await sleep(300);
} else console.log("  (no Someday tier on a fresh board — skipped)");

console.log("\n— item 2: Save stages as a new template —");
await clickCard("pL", "✎⋮");
answers.push("Laundry routine");
await page.click("#stages-save-template"); await sleep(800);
const types = await get(page, `${P}/settings/projectTypes`);
const t = (types?.types || []).find(x => x.name === "Laundry routine");
ok(!!t, "a 'Laundry routine' template exists" + (types ? "" : " (projectTypes doc not found at settings/projectTypes)"));
ok(t && t.stages.map(s => s.name).join(",") === "Wash,Dry,Fold" && t.stages[2].hurrah === true, "…with the three stages and the 🎆");
ok(t && t.stages.every(s => s.completedAt === undefined && s.sid === undefined), "…and none of this project's history (ticks, sids)");
ok((await page.evaluate(() => !document.querySelector("#stages-modal").hidden)), "the stage editor stays open (the project itself is not saved by this)");

console.log("\n— item 5: drag a stage by its ⋮⋮ grip —");
const grips = await page.evaluate(() => [...document.querySelectorAll("#stage-proj-editor .st-grip")].map(g => { const r = g.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }));
ok(grips.length === 3, "every row has a grip");
await page.mouse.move(grips[2].x, grips[2].y); await page.mouse.down();
await page.mouse.move(grips[2].x, grips[1].y - 5, { steps: 6 });
await page.mouse.move(grips[2].x, grips[0].y - 8, { steps: 6 });
await page.mouse.up(); await sleep(150);
const order = await page.evaluate(() => [...document.querySelectorAll("#stage-proj-editor .st-name")].map(i => i.value).join(","));
ok(order === "Fold,Wash,Dry", "dragging Fold to the top reorders the rows: " + order);
await page.click("#stages-save"); await sleep(900);
const L = await get(page, `${P}/projects/pL`);
ok(L.stages.map(s => s.name).join(",") === "Fold,Wash,Dry", "…and Save stages writes that order");
ok(L.stages.find(s => s.name === "Wash").completedAt === day(0, 8), "…with Wash still ticked (completion follows the stage, not the slot)");

console.log("\n— item 2 bug: Settings ▸ Pipeline '+ New' —");
await page.click("#settings-btn"); await sleep(300);
await page.evaluate(() => [...document.querySelectorAll(".tab-btn")].find(b => /Pipeline/i.test(b.textContent))?.click()); await sleep(200);
answers.push("Quarterly review");
await page.evaluate(() => { const b = document.querySelector("#pipeline-new"); b.scrollIntoView({ block: "center" }); });
await page.click("#pipeline-new"); await sleep(200);
const sel = await page.evaluate(() => { const s = document.querySelector("#pipeline-target"); return s.options[s.selectedIndex]?.textContent; });
ok(/Quarterly review/.test(sel || ""), "'+ New' switches the picker to the new template (it threw before): " + sel);
const pg = await page.evaluate(() => [...document.querySelectorAll("#stage-template-editor .st-grip")].length);
for (const n of ["One", "Two", "Three"]) {
  await page.evaluate(() => document.querySelector("#stage-add").click()); await sleep(80);
  await page.evaluate(n => { const r = [...document.querySelectorAll("#stage-template-editor .st-name")].pop(); r.value = n; }, n);
}
ok((await page.evaluate(() => document.querySelectorAll("#stage-template-editor .st-grip").length)) === 3, "Settings' stage rows get the grip too");
const g2 = await page.evaluate(() => [...document.querySelectorAll("#stage-template-editor .st-grip")].map(g => { g.scrollIntoView({block:"center"}); const r = g.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }));
const g3 = await page.evaluate(() => [...document.querySelectorAll("#stage-template-editor .st-grip")].map(g => { const r = g.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }));
await page.mouse.move(g3[0].x, g3[0].y); await page.mouse.down();
await page.mouse.move(g3[0].x, g3[2].y + 30, { steps: 10 }); await page.mouse.up(); await sleep(100);
const o2 = await page.evaluate(() => [...document.querySelectorAll("#stage-template-editor .st-name")].map(i => i.value).join(","));
ok(o2 === "Two,Three,One", "dragging down in Settings works too: " + o2);

console.log("\nDIALOGS:\n" + dialogs.join("\n---\n"));
console.log("\nERRORS:\n" + (errors.join("\n") || "(none)"));
const f = summary(); await close(); process.exit(f ? 1 : 0);
