// ============================================================
// browser-test/walk-feedback.test.mjs — Version 1.1.0
//
// Katie's first feedback on 2.3.0 (app 2.4.0):
//   · clock-in looked like a reschedule button → "▶ Clock in"
//   · "I want to be able to type in a date from whatever portal"
//   · "I want to be able to check off stages out-of-order" from the main list
//   · the duplicate default "depends on the project" → remembered per project
//   TZ=America/Chicago node browser-test/walk-feedback.test.mjs
// ============================================================
import { boot, errors, dialogs } from "./harness.mjs";
import { info, put, get, list, sleep, day, ok, summary } from "./seedlib.mjs";
const phone = process.env.PHONE === "1";
const { page, close } = await boot(phone ? { width: 412, height: 915, mobile: true } : {});
const { ws, tiers } = await info(page);
const work = tiers.find(t => t.name === "Work"), pers = tiers.find(t => t.name === "Personal");
const P = `workspaces/${ws}`;
const iso = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const base = { workload: 2, stretchUntilDone: false, completedAt: null, completedBy: null, createdBy: "katie@example.com", createdAt: Date.now() };
await put(page, `${P}/projects/pW`, { ...base, name: "Acme 2026", color: "#e64980", tierId: work.id, startDate: day(-1), endDate: day(29),
  stages: ["Kickoff", "Draft", "Review", "Publish"].map((n, i) => ({ sid: "w" + i, name: n, direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null, ...(n === "Publish" ? { hurrah: true } : {}) })) });
await put(page, `${P}/projects/pL`, { ...base, name: "Laundry", color: "#69db7c", tierId: pers.id, startDate: day(0), endDate: day(1),
  stages: [{ sid: "l1", name: "Wash", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null }] });
await sleep(800);
if (await page.evaluate(() => !document.querySelector("#decision-modal").hidden)) { await page.click("#decision-close"); await sleep(200); }
const tag = async (fn, id) => { await page.evaluate(fn, id); };
const realClick = async sel => { const c = await page.evaluate(sel => { const el = document.querySelector(sel); el.scrollIntoView({ block: "center" }); const r = el.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; }, sel); await page.mouse.click(c.x, c.y); await sleep(250); };
const rowOf = name => `[...document.querySelectorAll("#queue .row")].find(r => r.querySelector(".row-main strong")?.textContent.includes(${JSON.stringify(name)}))`;

console.log("\n— clock-in says what it is —");
const btns = await page.evaluate(`[...${rowOf("Acme 2026")}.querySelectorAll(".row-actions button")].map(b => b.textContent.trim())`);
ok(btns.includes("▶ Clock in") && !btns.includes("⏱"), "Today row: " + JSON.stringify(btns));
ok(await page.evaluate(() => document.querySelector('.project-card[data-project-id="pW"] .clock-btn')?.textContent === "▶ in"), "the card's matches: '▶ in'");
const w = await page.evaluate(`(() => { const r = ${rowOf("Acme 2026")}; return [...r.querySelectorAll(".row-actions .icon-btn")].map(b => Math.round(b.getBoundingClientRect().height)); })()`);
ok(new Set(w).size === 1, "…and it's the same height as its neighbours: " + JSON.stringify(w));

console.log("\n— ▸ on the Today row: tick any stage, in any order —");
ok(await page.evaluate(`!${rowOf("Acme 2026")}.querySelector(".today-stages")`), "closed by default — the row is as short as before");
await page.evaluate(`[...${rowOf("Acme 2026")}.querySelectorAll("button")].find(b => b.textContent.trim() === "▸").id = "__exp"`);
await realClick("#__exp");
const listed = await page.evaluate(`[...${rowOf("Acme 2026")}.querySelectorAll(".today-stages .stage-name")].map(e => e.textContent)`);
ok(JSON.stringify(listed) === JSON.stringify(["Kickoff", "Draft", "Review", "Publish"]), "▸ shows the WHOLE pipeline under the row: " + listed.join(", "));
await page.evaluate(`[...${rowOf("Acme 2026")}.querySelectorAll(".today-stages .stage-row")].find(r => /Review/.test(r.textContent)).querySelector("input").id = "__rev"`);
await realClick("#__rev"); await sleep(700);
const st = (await get(page, `${P}/projects/pW`)).stages;
ok(st.find(x => x.name === "Review").completedAt && !st.find(x => x.name === "Kickoff").completedAt, "ticked Review while Kickoff and Draft are still open — out of order, saved");
ok(await page.evaluate(`!!${rowOf("Acme 2026")}?.querySelector(".today-stages")`), "the list stays open after the tick (the row re-rendered, it didn't collapse)");
ok(await page.evaluate(`${rowOf("Acme 2026")}.querySelector(".row-main strong").textContent.includes("Kickoff")`), "the row still leads with Kickoff — the NEXT stage is still the next stage");
ok(await page.evaluate(() => JSON.parse(localStorage.getItem("tc-today-expanded") || "[]").includes("pW")), "open/closed is remembered on this device");
await page.evaluate(`[...${rowOf("Acme 2026")}.querySelectorAll("button")].find(b => b.textContent.trim() === "▾").id = "__col"`);
await realClick("#__col");
ok(await page.evaluate(`!${rowOf("Acme 2026")}.querySelector(".today-stages")`), "▾ closes it");

console.log("\n— typing a date —");
const txtOf = id => `document.querySelector("#${id}").closest(".typed-date").querySelector(".date-typed")`;
ok(await page.evaluate(`${txtOf("task-date")}.value`) === `${new Date().getMonth()+1}/${new Date().getDate()}/${new Date().getFullYear()}`, "the task's due date shows as typed text, today by default");
const pickHit = await page.evaluate(() => { const p = document.querySelector("#task-date").closest(".typed-date").querySelector(".date-pick"); p.scrollIntoView({ block: "center" });
  const r = p.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width/2, r.y + r.height/2)?.id; });
ok(pickHit === "task-date", "a tap on 📅 lands on the REAL date input (so the phone's own calendar opens)");
await page.evaluate(`${txtOf("task-date")}.id = "__td"`);
await page.click("#task-title"); await page.keyboard.type("Pay the vet");
await page.click("#__td", { clickCount: 3 }); await page.keyboard.type("oct 15");
await page.keyboard.press("Enter"); await sleep(900);
let vet = (await list(page, `${P}/tasks/`)).find(t => t.title === "Pay the vet");
ok(vet && iso(vet.dueAt) === `${new Date().getFullYear()}-10-15`, "typed 'oct 15' + Enter → task created due Oct 15: " + (vet && iso(vet.dueAt)));
const cover = await page.evaluate(`(() => { const t = ${txtOf("task-date")}; t.scrollIntoView({block:"center"}); const r = t.getBoundingClientRect(); return document.elementFromPoint(r.x + r.width/2, r.y + r.height/2) === t; })()`);
ok(cover, "the first-time due-date hint does NOT sit on top of the box you type in (it did, before visibleAnchor)");
await page.click("#task-title"); await page.keyboard.type("Nonsense date");
await page.click("#__td", { clickCount: 3 }); await page.keyboard.type("the 45th");
await page.keyboard.press("Enter"); await sleep(600);
ok(!(await list(page, `${P}/tasks/`)).some(t => t.title === "Nonsense date"), "unreadable text does NOT create the task with a stale date");
ok(await page.evaluate(`${txtOf("task-date")}.classList.contains("bad") && ${txtOf("task-date")}.validationMessage.includes("isn't a date")`), "…the field turns red and says why");
await page.click("#__td", { clickCount: 3 }); await page.keyboard.type("+2w"); await page.keyboard.press("Tab"); await sleep(100);
ok(await page.evaluate(() => document.querySelector("#task-date").value) === iso(day(14)), "'+2w' reads as two weeks from today");
await page.evaluate(() => document.querySelector("#task-date-today").click()); await sleep(100);
ok(await page.evaluate(`${txtOf("task-date")}.value`) === `${new Date().getMonth()+1}/${new Date().getDate()}/${new Date().getFullYear()}`, "the Today button still works and the text follows it");

// The first-run hint (E41) stays until closed and floats over everything,
// pop-ups included — pre-existing, once per person. Close it like she would.
if (await page.evaluate(() => !document.querySelector("#popover-hint").hidden)) { await page.click("#popover-hint .popover-hint-close"); await sleep(150); }
console.log("\n— Duplicate remembers per project —");
let dupN = 0;   // a fresh id each time — an old tag left on another card would be found first
const openDup = async pid => { const id = `__dup${++dupN}`; await page.evaluate((pid, id) => { const c = document.querySelector(`.project-card[data-project-id="${pid}"]`); [...c.querySelectorAll(".proj-btns button")].find(b => b.textContent === "📋").id = id; }, pid, id); await realClick("#" + id); };
const active = () => page.evaluate(() => document.querySelector("#dup-shift-row .active")?.dataset.shift || null);
await openDup("pW");
ok(await active() === "1y", "a month-long work project opens on +1 year");
await page.click("#dup-no"); await sleep(150);
await openDup("pL");
ok(await active() === "1w", "Laundry (two days) opens on +1 week");
await page.click('#dup-shift-row [data-shift="2w"]');
await page.click("#dup-yes"); await sleep(900);
await openDup("pL");
ok(await active() === "2w", "…and next time on +2 weeks, because that's what she used");
await page.evaluate(`${txtOf("dup-start")}.id = "__ds"`);
await page.click("#__ds", { clickCount: 3 }); await page.keyboard.type("fri"); await page.keyboard.press("Tab"); await sleep(100);
ok(await active() === null, "typing a date turns the chips off (no chip describes it)");
ok(await page.evaluate(() => document.querySelector("#dup-start").value) === iso(day(((5 - new Date().getDay() + 7) % 7) || 7)), "'fri' is the coming Friday");
await page.click("#__ds", { clickCount: 3 }); await page.keyboard.type("banana");
await page.click("#dup-yes"); await sleep(300);
ok(await page.evaluate(() => !document.querySelector("#dup-modal").hidden), "an unreadable date keeps the modal open instead of copying with old dates");
await page.click("#dup-no"); await sleep(150);

console.log("\n— Waiting on… is for live projects (app 2.5.0 · queue 1.4.0) —");
{
  const { stageScheduledAt } = await import("../queue.js");
  const stg = (n, o = {}) => ({ sid: n, name: n, direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null, ...o });
  const alfa = { ...base, name: "Alabama Farmers 2027", color: "#fab005", tierId: work.id, startDate: new Date(2027, 3, 1).getTime(), endDate: new Date(2027, 4, 14).getTime(), stages: [stg("Publish", { hurrah: true })] };
  await put(page, `${P}/projects/pAF`, alfa);
  await put(page, `${P}/projects/pBon`, { ...base, name: "AFICC Bonnie", color: "#4dabf7", tierId: work.id, startDate: day(-20), endDate: day(10),
    stages: [stg("Publish", { hurrah: true, completedAt: day(-5, 15) })] });
  const tk = (title, dueAt, o = {}) => ({ title, tierId: work.id, dueAt, escalation: { every: 1, unit: "days" }, notes: "", projectId: null, completedAt: null, completedBy: null, parentTaskId: null, offsetDays: null, createdBy: "katie@example.com", createdAt: 1, ...o });
  // How hers most likely got there: a 2.2-era outrider dated from next year's planned end, then 2.3's re-peg.
  await put(page, `${P}/tasks/out_pAF_f1`, tk("Follow-up/finalize — Alabama Farmers 2027", stageScheduledAt(alfa, { direction: "after", anchor: "end", offsetDays: 14 }, work.allowedDays)));
  await put(page, `${P}/tasks/tBonFU`, tk("Follow up with client — AFICC Bonnie", day(9, 9), { fromProjectId: "pBon" }));
  await sleep(5500);   // the automatic re-peg runs ~4s after data settles
  const af = await get(page, `${P}/tasks/out_pAF_f1`);
  ok(af.dueAt === null && af.afterProjectId === "pAF", "the re-peg parks next year's follow-up (as it did on her board)…");
  const wt = await page.evaluate(() => document.querySelector("#waiting").hidden ? "" : document.querySelector("#waiting-list").innerText);
  ok(!/Alabama Farmers/.test(wt), "…but Waiting on… does NOT show it — April 2027 hasn't started");
  ok(/Follow up with client — AFICC Bonnie/.test(wt) && /in 9 days/.test(wt) && /follow-up to AFICC Bonnie, finished/.test(wt),
     "a finished project's follow-up 9 days out IS there, saying when: " + (wt.split("\n").find(l => /in 9 days/.test(l)) || "(missing)"));
  await page.evaluate(() => { const t = [...document.querySelectorAll("#projects-panel button")].find(b => /Later/.test(b.textContent)); if (t && !document.querySelector('.project-card[data-project-id="pAF"]')) t.click(); });
  await sleep(300);
  await page.evaluate(() => { const c = document.querySelector('.project-card[data-project-id="pAF"]'); if (c && !c.querySelector(".linked-tasks")) c.querySelector(".project-head").click(); });
  await sleep(300);
  const card = await page.evaluate(() => document.querySelector('.project-card[data-project-id="pAF"] .linked-tasks')?.innerText || "");
  ok(/Follow-up\/finalize/.test(card), "next year's follow-up is still on its project's card — where she said it belongs");
}

if (phone) {
  await page.evaluate(() => document.querySelector("#project-form").scrollIntoView());
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/phone-project-form.png` : "/dev/null" });
  await openDup("pL");
  await page.screenshot({ path: process.env.SHOT_DIR ? `${process.env.SHOT_DIR}/phone-dup-typed.png` : "/dev/null" });
}
console.log("\nERRORS:\n" + (errors.join("\n") || "(none)"));
const f = summary(); await close(); process.exit(f ? 1 : 0);
