// ============================================================
// waiting.test.mjs — Version 1.0.0
//
// Katie, 2026-09: *"'Waiting on' tasks seem to only appear on weekends."*
//
// queue 0.21.0 moved a task DATED TO its tier's off day into Waiting, so it
// could be reached at all. But the off-day test ran before the due-today
// test, so on a Saturday it swept up EVERY dated task on every Mon–Fri
// tier — due next week, due next month — and the section appeared every
// weekend and vanished every Monday. queue 1.1.1 fixed the order.
//
// These are the cases that pin it. Imports queue.js directly, like
// outrider.test.mjs, because queue.js imports nothing.
//
//   node waiting.test.mjs
// ============================================================

import { buildQueue } from "./queue.js";

let passed = 0, failed = 0;
const ok = (cond, msg) => cond
  ? (passed++, true)
  : (failed++, console.log(`  ❌ ${msg}`), false);

const at = (y, m, d, h = 9) => new Date(y, m - 1, d, h, 0, 0, 0).getTime();

// 2026-09-19 is a Saturday; 2026-09-21 a Monday.
const SAT = at(2026, 9, 19, 10);
const MON = at(2026, 9, 21, 10);

const tiers = [
  { id: "work", name: "Work", rank: 1, allowedDays: [1, 2, 3, 4, 5] },
  { id: "home", name: "Home", rank: 2, allowedDays: [0, 1, 2, 3, 4, 5, 6] }
];

const task = (id, tierId, dueAt, o = {}) => ({
  id, title: id, tierId, dueAt, completedAt: null,
  escalation: { every: 1, unit: "hours" }, parentTaskId: null, ...o
});

const tasks = [
  task("work-due-saturday",  "work", at(2026, 9, 19, 17)),   // dated TO the off day
  task("work-due-next-week", "work", at(2026, 9, 24, 17)),   // the bug: swept up on Saturday
  task("work-due-march",     "work", at(2027, 3, 3, 17)),    // the bug, further out
  task("work-overdue-thu",   "work", at(2026, 9, 17, 17)),   // overdue — must not nag Saturday
  task("home-due-saturday",  "home", at(2026, 9, 19, 17)),   // a 7-day tier: ordinary queue item
  task("undated-follow-up",  "work", null, { parentTaskId: "work-due-next-week", offsetDays: 2 })
];

const run = (now) => buildQueue({ tasks, events: [], tiers, projects: [], now, viewDay: now });
const ids = arr => arr.map(x => x.id);

// ---- Saturday ----
{
  const q = run(SAT);
  const w = ids(q.waiting), a = ids(q.items);
  ok(w.includes("work-due-saturday"), "a Work task dated TO Saturday waits there on Saturday (0.21.0's rescue, kept)");
  ok(q.waiting.find(t => t.id === "work-due-saturday")?.offDay === true, "…and carries offDay so the row can say why");
  ok(!w.includes("work-due-next-week"), "THE BUG: a Work task due next week is NOT in Saturday's Waiting");
  ok(!w.includes("work-due-march"), "THE BUG: a Work task due in March is NOT in Saturday's Waiting");
  ok(!w.includes("work-overdue-thu") && !a.includes("work-overdue-thu"),
     "an overdue Work task does not nag on Saturday — not queued, not parked (D61)");
  ok(a.includes("home-due-saturday"), "a 7-day tier's Saturday task is an ordinary queue item");
  ok(w.includes("undated-follow-up"), "an undated follow-up waits, as it does every day");
  ok(w.length === 2, `Saturday's Waiting holds exactly the two things that belong there (got ${w.join(", ")})`);
}

// ---- Monday ----
{
  const q = run(MON);
  const w = ids(q.waiting), a = ids(q.items);
  ok(w.includes("undated-follow-up"), "Monday still shows the undated follow-up — Waiting is not weekend-only");
  ok(!w.some(id => id.startsWith("work-due")), "no dated Work task sits in Monday's Waiting");
  ok(a.includes("work-overdue-thu"), "the overdue Thursday task is back in the queue on Monday");
  ok(a.includes("work-due-saturday"), "the Saturday task is overdue into Monday's queue");
  ok(!a.includes("work-due-next-week"), "next week's task is not in Monday's queue yet");
}

// ---- viewing a future Saturday (◀ ▶ day navigation) ----
{
  const q = buildQueue({ tasks, events: [], tiers, projects: [], now: MON, viewDay: at(2026, 9, 26, 10) });
  ok(ids(q.waiting).length === 1 && ids(q.waiting)[0] === "undated-follow-up",
     "browsing ahead to next Saturday parks nothing dated (none of them is due that day)");
}

console.log(failed
  ? `\n❌ ${passed} passed, ${failed} failed`
  : `\n✅ ${passed} passed, 0 failed  (imported directly from queue.js)`);
process.exit(failed ? 1 : 0);
