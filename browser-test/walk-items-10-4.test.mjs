// ============================================================
// browser-test/walk-items-10-4.test.mjs — Version 1.0.0
//
// Katie's handwritten list, items 10 and 4: the automatic re-peg (AFICC Bonnie), waiting follow-ups dated on the 🎆 and rewound on un-tick, the linked-tasks list.
//   TZ=America/Chicago node browser-test/walk-items-10-4.test.mjs
// ============================================================

import { boot, errors, dialogs, answers } from "./harness.mjs";
import { info, put, get, list, sleep, day, ok, summary } from "./seedlib.mjs";
import { stageScheduledAt, afterFinishDue } from "../queue.js";
const { page, close } = await boot();
const { ws, tiers } = await info(page);
const work = tiers.find(t => t.name === "Work"), pers = tiers.find(t => t.name === "Personal");
const WD = work.allowedDays;
const P = `workspaces/${ws}`;
const base = { color: "#e64980", workload: 2, stretchUntilDone: false, completedAt: null, completedBy: null, createdBy: "katie@example.com", createdAt: Date.now() };
const pA = { ...base, name: "AFICC 2026", tierId: work.id, startDate: day(-10), endDate: day(3), stages: [
    { sid: "s1", name: "Draft", direction: "none", anchor: "start", offsetDays: 0, completedAt: day(-5, 10), dueAt: null },
    { sid: "s2", name: "Publish", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null, hurrah: true, spawnDays: 14 },
    { sid: "s3", name: "Final check-in", direction: "after", anchor: "end", offsetDays: 5, completedAt: null, dueAt: null } ]};
const pB = { ...base, name: "AFICC Bonnie", color: "#4dabf7", tierId: work.id, startDate: day(-20), endDate: day(10), stages: [
    { sid: "b1", name: "Publish", direction: "none", anchor: "start", offsetDays: 0, completedAt: day(-1, 15), dueAt: null, hurrah: true } ]};
const legacyDue = stageScheduledAt(pB, { direction: "after", anchor: "end", offsetDays: 5 }, WD);
const pC = { ...base, name: "Gamma Co 2026", color: "#ffa94d", tierId: work.id, startDate: day(-3), endDate: day(8), stages: [
    { sid: "c1", name: "Kickoff", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null } ]};
const legacyC = stageScheduledAt(pC, { direction: "after", anchor: "end", offsetDays: 3 }, WD);
const task = (title, dueAt, o = {}) => ({ title, tierId: work.id, dueAt, escalation: { every: 1, unit: "days" }, notes: "", projectId: null,
  completedAt: null, completedBy: null, parentTaskId: null, offsetDays: null, createdBy: "katie@example.com", createdAt: 1, ...o });

await put(page, `${P}/projects/pA`, pA);
await put(page, `${P}/projects/pB`, pB);
await put(page, `${P}/projects/pC`, pC);
await put(page, `${P}/tasks/out_pB_b9`, task("Final check-in — AFICC Bonnie", legacyDue));
await put(page, `${P}/tasks/out_pC_c9`, task("Invoice — Gamma Co 2026", legacyC));
await put(page, `${P}/tasks/out_pC_c0`, task("Engagement letter — Gamma Co 2026", day(-8, 16)));   // before start: stays
await put(page, `${P}/projects/pL`, { ...base, name: "Laundry", color: "#69db7c", tierId: pers.id, startDate: day(-1), endDate: day(1),
  stages: [ { sid: "l1", name: "Wash", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null } ]});

console.log("\n— item 10: the automatic re-peg (Bonnie) —");
await sleep(5500);
const b = await get(page, `${P}/tasks/out_pB_b9`);
ok(b.afterProjectId === "pB" && b.afterProjectWd === 5, "Bonnie's legacy check-in read back as +5 working days, linked to Bonnie");
ok(b.dueAt === afterFinishDue(day(-1, 15), 5, WD), `…and re-dated from YESTERDAY's publish: ${new Date(b.dueAt).toDateString()} (was ${new Date(legacyDue).toDateString()})`);
const c = await get(page, `${P}/tasks/out_pC_c9`);
ok(c.dueAt === null && c.afterProjectId === "pC" && c.afterProjectWd === 3, "an unfinished project's invoice moved to Waiting on… (+3wd remembered)");
const e = await get(page, `${P}/tasks/out_pC_c0`);
ok(e.dueAt === day(-8, 16) && !e.afterProjectId, "the before-start engagement letter was left alone");
const toast = await page.evaluate(() => [document.querySelector("#alert-toast-title").textContent, document.querySelector("#alert-toast-body").textContent]);
ok(/real finish/.test(toast[0]) && /1 moved/.test(toast[1]) && /1 re-dated/.test(toast[1]), `toast says so: "${toast[1]}"`);
const waitingTxt = await page.evaluate(() => document.querySelector("#waiting-list")?.innerText || "");
ok(/Invoice — Gamma Co 2026/.test(waitingTxt) && /3 working days after\s+Gamma Co 2026 is finished/.test(waitingTxt), "Waiting on… explains it: " + waitingTxt.split("\n").find(l => /working days/.test(l)));

if (await page.evaluate(() => !document.querySelector("#decision-modal").hidden)) { await page.click("#decision-close"); await sleep(200); }
console.log("\n— item 10: new after-end stage, then finishing the project —");
// a stage edit triggers syncOutriders: open ✎⋮ on AFICC 2026 and save unchanged
await page.evaluate(() => { const card = document.querySelector('.project-card[data-project-id="pA"]');
  [...card.querySelectorAll(".proj-btns button")].find(b => b.textContent === "✎⋮").click(); });
await sleep(200);
await page.click("#stages-save"); await sleep(800);
const aTasks = await list(page, `${P}/tasks/out_pA_`);
ok(aTasks.length === 1 && aTasks[0].dueAt === null && aTasks[0].afterProjectWd === 5, "the +5wd-after-end stage became a WAITING task, not one dated from the planned end");
ok(aTasks[0].fromStage?.name === "Final check-in" && aTasks[0].fromProjectId === "pA", "…carrying fromStage and fromProjectId");
const pAnow = await get(page, `${P}/projects/pA`);
ok(pAnow.stages.length === 2, "…and left the pipeline (2 stages remain)");
// tick Publish (the 🎆) from the card
await page.evaluate(() => { const card = document.querySelector('.project-card[data-project-id="pA"]');
  if (!card.querySelector(".stage-list")) card.querySelector(".project-head").click(); });
await sleep(300);
await page.evaluate(() => { const card = document.querySelector('.project-card[data-project-id="pA"]');
  const row = [...card.querySelectorAll(".stage-row")].find(r => /Publish/.test(r.textContent)); row.querySelector("input").click(); });
await sleep(1500);
const dated = (await list(page, `${P}/tasks/out_pA_`))[0];
ok(dated.dueAt === afterFinishDue(Date.now(), 5, WD), `ticking 🎆 dated it +5wd from TODAY: ${new Date(dated.dueAt).toDateString()}`);
const hurr = (await list(page, `${P}/tasks/`)).find(t => /Publish — AFICC 2026/.test(t.title));
ok(hurr && hurr.fromProjectId === "pA", "the 🎆's own +14d follow-up is linked to the project too");
await sleep(2000);
const dupState = await page.evaluate(() => ({ open: !document.querySelector("#dup-modal").hidden, h: document.querySelector("#dup-heading").textContent,
  fu: !document.querySelector("#dup-followup").hidden, snooze: !document.querySelector("#dup-snooze-row").hidden }));
ok(dupState.open && /next year/.test(dupState.h) && dupState.fu && dupState.snooze, "finishing still offers 'Same time next year?' with its follow-up box and snooze");
await page.click("#dup-no"); await sleep(200);
await page.evaluate(() => { const t = [...document.querySelectorAll(".finished-toggle")].find(b => /Finished/.test(b.textContent)); if (t && /▸/.test(t.textContent)) t.click(); });
await sleep(300);
// un-tick
await page.evaluate(() => { const card = document.querySelector('.project-card[data-project-id="pA"]');
  const row = [...card.querySelectorAll(".stage-row")].find(r => /Publish/.test(r.textContent)); row?.querySelector("input")?.click(); });
await sleep(1200);
const rew = (await list(page, `${P}/tasks/out_pA_`))[0];
ok(rew.dueAt === null, "un-ticking the 🎆 sent it back to Waiting on…");

console.log("\n— item 4: tasks listed with the project —");
const linked = await page.evaluate(() => document.querySelector('.project-card[data-project-id="pA"] .linked-tasks')?.innerText || "");
ok(/Tasks from this project \(2\)/i.test(linked) && /Final check-in/.test(linked) && /Publish — AFICC 2026/.test(linked), "expanded card lists both: " + linked.replace(/\n/g, " | "));

await page.evaluate(() => { window.__errs = 1; });
console.log("\nDIALOGS:\n" + dialogs.join("\n")); console.log("\nERRORS:\n" + (errors.join("\n") || "(none)"));
const f = summary(); await close(); process.exit(f ? 1 : 0);
