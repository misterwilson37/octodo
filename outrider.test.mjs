// ============================================================
// outrider.test.mjs — Version 1.0.0
//
// §0h: "A project's pipeline is what happens DURING the project. Anything
// anchored outside the project window is a TASK, and always was."
//
// ⚠️ THIS IMPORTS queue.js DIRECTLY, unlike its two siblings. stage-merge and
// move.test lift functions out of store.js's TEXT because store.js imports
// Firebase and Node cannot resolve that. queue.js imports NOTHING — that is
// the whole reason the predicate was put there instead of in store.js — so it
// can just be imported. If this file ever starts failing on a Firebase
// resolution error, someone has given queue.js an import and the fix is to
// take it away again, not to switch this to text extraction.
//
//   node outrider.test.mjs
// ============================================================

import { isOutrider, splitOutriders, projectPipelineWindow } from "./queue.js";

let passed = 0, failed = 0;
const ok = (cond, msg) => cond
  ? (passed++, true)
  : (failed++, console.log(`  ❌ ${msg}`), false);
const eq = (a, b, msg) => ok(a === b, `${msg}\n     expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);

const WD = [1, 2, 3, 4, 5];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const day = (y, m, d) => new Date(y, m - 1, d, 0, 0, 0, 0).getTime();

// A project running Mon 2026-09-07 → Fri 2026-09-25.
const proj = (stages, over = {}) => ({
  id: "p1", name: "Audit", tierId: "t1",
  startDate: day(2026, 9, 7),
  endDate:   day(2026, 9, 25),
  stages, ...over
});

const stage = (name, o = {}) => ({
  sid: name.toLowerCase().replace(/\W/g, ""), name,
  direction: "none", anchor: "start", offsetDays: 0,
  completedAt: null, dueAt: null, ...o
});

console.log("\n— the rule itself —");
{
  // The engagement letter: 14 days BEFORE the start. Katie's example.
  const letter = stage("Engagement letter", { direction: "before", anchor: "start", offsetDays: 14 });
  const draft  = stage("Draft",             { direction: "after",  anchor: "start", offsetDays: 3 });
  const p = proj([letter, draft]);
  ok(isOutrider(p, letter, WD), "a stage 14 days before the start is an outrider");
  ok(!isOutrider(p, draft, WD), "a stage 3 days after the start is not");
}
{
  // The far end — the same feature, +N. A follow-up after the project ends.
  const follow = stage("Follow up", { direction: "after", anchor: "end", offsetDays: 14 });
  ok(isOutrider(proj([follow]), follow, WD), "a stage 14 days after the end is an outrider too");
}

console.log("\n— the boundaries, which is where an off-by-one would hide —");
{
  const onStart = stage("Kickoff", { direction: "after", anchor: "start", offsetDays: 0 });
  const onEnd   = stage("Ship",    { direction: "after", anchor: "end",   offsetDays: 0 });
  const p = proj([onStart, onEnd]);
  // ⚠️ Both land at DEADLINE_HOUR while startDate/endDate are midnights. A raw
  // instant comparison evicts BOTH of these, and the bug would look like
  // "kickoff mysteriously became a task".
  ok(!isOutrider(p, onStart, WD), "a stage ON the start day stays (DEADLINE_HOUR vs midnight)");
  ok(!isOutrider(p, onEnd, WD),   "a stage ON the end day stays");
}
{
  const dayBefore = stage("Prep", { direction: "before", anchor: "start", offsetDays: 1 });
  // Start is a Monday, so one ALLOWED day before it is the previous Friday.
  ok(isOutrider(proj([dayBefore]), dayBefore, WD), "one day before the start is out");
}

console.log("\n— null is not 'outside' (D50, D126) —");
{
  const weight = stage("Thinking time");   // direction none, no dueAt → undated
  ok(!isOutrider(proj([weight]), weight, WD), "an UNDATED stage is never an outrider");
}
{
  const s = stage("Anything", { direction: "before", anchor: "start", offsetDays: 30 });
  const timeless = proj([s], { startDate: null, endDate: null });
  ok(!isOutrider(timeless, s, WD),
     "a TIMELESS project keeps its whole pipeline (D126 — no anchor to compute from)");
  eq(splitOutriders(timeless, WD).outriders.length, 0, "…and splitOutriders agrees");
}

console.log("\n— a manual dueAt is the stage's real date (D-hard-due) —");
{
  const pinned = stage("Board pack", { dueAt: day(2026, 8, 1) });   // well before the start
  ok(isOutrider(proj([pinned]), pinned, WD), "a manual dueAt outside the window is an outrider");
  const inside = stage("Board pack", { dueAt: day(2026, 9, 15) });
  ok(!isOutrider(proj([inside]), inside, WD), "a manual dueAt inside the window is not");
}

console.log("\n— allowedDays changes the arithmetic, so it must be honoured —");
{
  // 3 days before a Monday start: on weekdays that is the previous Wednesday;
  // on a 7-day tier it is the previous Friday. Both are outside, but the
  // predicate must not silently default to Mon–Fri when a tier says otherwise.
  const s = stage("Prep", { direction: "before", anchor: "start", offsetDays: 3 });
  ok(isOutrider(proj([s]), s, WD),  "3 days before the start is out (weekday tier)");
  ok(isOutrider(proj([s]), s, ALL), "3 days before the start is out (7-day tier)");
}

console.log("\n— splitOutriders keeps order, and keeps both halves —");
{
  const a = stage("Letter", { direction: "before", anchor: "start", offsetDays: 14 });
  const b = stage("Draft",  { direction: "after",  anchor: "start", offsetDays: 2 });
  const c = stage("Review", { direction: "after",  anchor: "start", offsetDays: 5 });
  const d = stage("Debrief",{ direction: "after",  anchor: "end",   offsetDays: 10 });
  const { pipeline, outriders } = splitOutriders(proj([a, b, c, d]), WD);
  eq(pipeline.length, 2, "two stages stay");
  eq(outriders.length, 2, "two stages leave");
  eq(pipeline[0].name, "Draft", "pipeline order preserved (Draft first)");
  eq(pipeline[1].name, "Review", "pipeline order preserved (Review second)");
  eq(outriders[0].name, "Letter", "outrider order preserved (Letter first)");
  eq(outriders[1].name, "Debrief", "outrider order preserved (Debrief second)");
  // ⚠️ Nothing may be lost in the split. This is the assertion that would
  // catch a filter/reject pair that disagreed with each other.
  eq(pipeline.length + outriders.length, 4, "every stage lands in exactly one half");
}

console.log("\n— a ticked outrider is still an outrider —");
{
  // It must leave, carrying its completion. If completion exempted it, the
  // reflection Jake asked to preserve would stay locked in a pipeline the
  // project no longer shows.
  const done = stage("Letter", {
    direction: "before", anchor: "start", offsetDays: 14,
    completedAt: day(2026, 8, 20), completedBy: "katie@example.com"
  });
  ok(isOutrider(proj([done]), done, WD), "completion does not exempt a stage from the rule");
}

console.log("\n— projectPipelineWindow collapses once outriders are gone (§0h step 4) —");
{
  const p = proj([stage("Draft", { direction: "after", anchor: "start", offsetDays: 2 })]);
  const [first, last] = projectPipelineWindow(p, WD);
  eq(first, p.startDate, "window starts at startDate");
  eq(last, p.endDate, "window ends at endDate");
}
{
  // Before migration the window still spreads — which is exactly why isLater
  // must NOT use it any more.
  const letter = stage("Letter", { direction: "before", anchor: "start", offsetDays: 14 });
  const [first] = projectPipelineWindow(proj([letter]), WD);
  ok(first < proj([]).startDate,
     "an un-migrated outrider still widens the window (so isLater reads startDate instead)");
}

console.log(`\n${failed ? "❌" : "✅"} ${passed} passed, ${failed} failed  (imported directly from queue.js)\n`);
process.exit(failed ? 1 : 0);
