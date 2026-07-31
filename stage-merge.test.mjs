#!/usr/bin/env node
// ============================================================
// Tentacalendar — stage-merge.test.mjs  (2.0 / OCTODO LINE)
// Version 1.0.0
//
// TESTS THE RULE THAT DECIDES WHETHER SOMEBODY'S FINISHED WORK SURVIVES.
//
// store.js 0.26.0 fixed the defect where reordering a shared project's
// pipeline silently un-ticked whatever a colleague had ticked while the
// editor was open. The fix is a merge rule, and a merge rule is exactly the
// kind of thing that looks obviously correct in a diff and is wrong in the
// third case nobody thought about.
//
// ⚠️ IT READS THE REAL store.js. It does not re-implement anything.
// `mergeStages`, `ensureSids` and `resolveStage` are lifted out of the source
// text by a brace-matching scan and evaluated here, so this cannot drift from
// what ships. If the extraction fails, the run FAILS — a test harness that
// quietly tests nothing is worse than no harness. (That is this codebase's
// own lesson: six files told the reader to run `version-check.mjs` for a day
// before anyone noticed it did not exist.)
//
// Why not just import store.js? It pulls in the Firebase SDK at module load
// and expects a browser. Jake has no CLI toolchain on a school-managed Mac
// and should not need one to run this.
//
// Run from the repo root:  node stage-merge.test.mjs
// Exit 0 = all pass, 1 = something is wrong. No install, no dependencies.
// ============================================================

import { readFileSync } from "node:fs";

const SRC = readFileSync("store.js", "utf8");

// ---- lift the pure functions out of the real source ----------------------
/** Find `name`'s declaration and return its full text, brace-matched. */
function extract(name) {
  const re = new RegExp(String.raw`(?:export\s+)?(?:function|const)\s+${name}\b`);
  const m = re.exec(SRC);
  if (!m) throw new Error(`EXTRACTION FAILED: ${name} not found in store.js — was it renamed?`);
  const start = m.index;
  const open = SRC.indexOf("{", start);
  // an arrow const like `const newSid = () => ...;` has no body brace
  const semi = SRC.indexOf(";", start);
  if (open < 0 || (semi > 0 && semi < open)) return SRC.slice(start, semi + 1);
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === "{") depth++;
    else if (SRC[i] === "}" && --depth === 0) return SRC.slice(start, i + 1);
  }
  throw new Error(`EXTRACTION FAILED: unbalanced braces reading ${name}`);
}

const NAMES = ["newSid", "ensureSids", "resolveStage", "mergeStages"];
const src = NAMES.map(extract).join("\n\n").replace(/export\s+/g, "");
const { mergeStages, ensureSids, resolveStage } =
  new Function(`${src}\nreturn { mergeStages, ensureSids, resolveStage };`)();

// ---- tiny harness --------------------------------------------------------
let pass = 0, fail = 0;
function ok(label, cond, detail = "") {
  if (cond) { pass++; console.log(`  \u2713 ${label}`); }
  else { fail++; console.log(`  \u2717 ${label}${detail ? `\n      ${detail}` : ""}`); }
}
function eq(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  ok(label, a === e, `expected ${e}\n      got      ${a}`);
}
const section = (s) => console.log(`\n${s}`);

// a stage as the editor produces one
const st = (name, extra = {}) => ({
  name, direction: "none", anchor: "start", offsetDays: 0,
  completedAt: null, completedBy: null, ...extra
});
const done = (name, sid, by = "her@x.com", at = 1000) =>
  st(name, { sid, completedAt: at, completedBy: by });

// =========================================================================
section("THE DEFECT THIS EXISTS FOR");
// Jake's live repro, 2026-07-30: A ticks a stage; B reorders with the editor
// already open, holding a snapshot from before the tick.
{
  const live = [done("write", "s1"), st("edit", { sid: "s2" }), st("ship", { sid: "s3" })];
  // B's stale copy: "write" not yet ticked, and B has reordered.
  const incoming = [st("ship", { sid: "s3" }), st("write", { sid: "s1" }), st("edit", { sid: "s2" })];
  const r = mergeStages(incoming, live);

  eq("B's reorder is honoured (editor owns shape)",
    r.stages.map(s => s.name), ["ship", "write", "edit"]);
  ok("A's tick SURVIVES B's stale save (server owns completion)",
    r.stages.find(s => s.sid === "s1").completedAt === 1000);
  ok("and it keeps A's name on it",
    r.stages.find(s => s.sid === "s1").completedBy === "her@x.com");
  eq("B is told one stage was reconciled", r.reconciled, 1);
}

section("COMPLETION IS NEVER INVENTED, ONLY PRESERVED");
{
  // The reverse: B's stale copy says DONE, the server says it was un-ticked.
  const live = [st("write", { sid: "s1" })];
  const incoming = [done("write", "s1", "him@x.com")];
  const r = mergeStages(incoming, live);
  ok("a stale 'done' does not resurrect a tick the server cleared",
    r.stages[0].completedAt === null && r.stages[0].completedBy === null);
  eq("and that also counts as reconciled", r.reconciled, 1);
}

section("STAGES THE SERVER DOES NOT HAVE");
{
  const live = [done("write", "s1")];
  const incoming = [st("write", { sid: "s1" }), st("brand new")];
  const r = mergeStages(incoming, live);
  ok("a brand-new stage gets a sid minted", !!r.stages[1].sid);
  ok("a brand-new stage starts un-done", r.stages[1].completedAt === null);

  // Undo after a delete: the caller holds the ONLY copy of that completion.
  const r2 = mergeStages([done("deleted then undone", "gone-sid")], []);
  ok("undo restores completion the server no longer has",
    r2.stages[0].completedAt === 1000 && r2.stages[0].completedBy === "her@x.com");
  eq("restoring is not counted as a reconcile", r2.reconciled, 0);
}

section("PROJECT COMPLETION");
{
  eq("all stages done -> allDone", mergeStages([done("a", "1"), done("b", "2")],
    [done("a", "1"), done("b", "2")]).allDone, true);
  eq("one undone -> not allDone", mergeStages([done("a", "1"), st("b", { sid: "2" })],
    [done("a", "1"), st("b", { sid: "2" })]).allDone, false);
  eq("EMPTY pipeline is not 'complete'", mergeStages([], []).allDone, false);
  ok("empty pipeline does not throw", true);
}

section("SIDS");
{
  const legacy = [st("old one"), st("old two")];      // pre-0.26.0, no sids
  const r = ensureSids(legacy);
  ok("legacy stages are backfilled", r.every(s => !!s.sid));
  ok("backfilled sids are unique", new Set(r.map(s => s.sid)).size === 2);

  const kept = ensureSids([st("x", { sid: "keep-me" })]);
  eq("an existing sid is never reassigned", kept[0].sid, "keep-me");

  // Duplicating a row in the editor clones its sid; two stages sharing one id
  // would make every later write ambiguous.
  const dup = ensureSids([st("x", { sid: "same" }), st("copy of x", { sid: "same" })]);
  ok("a duplicated sid is broken apart", dup[0].sid !== dup[1].sid);
  eq("the first keeps the original", dup[0].sid, "same");

  eq("ensureSids survives null", ensureSids(null), []);
  ok("ensureSids does not mutate its input",
    (() => { const a = [st("x")]; ensureSids(a); return a[0].sid === undefined; })());
}

section("ADDRESSING A STAGE — resolveStage");
{
  const stages = [st("a", { sid: "s1" }), st("b", { sid: "s2" }), st("c", { sid: "s3" })];
  eq("finds by sid", resolveStage(stages, { sid: "s2", index: 99 }), 1);
  eq("sid beats a WRONG index (the reorder race)",
    resolveStage(stages, { sid: "s3", index: 0 }), 2);
  eq("bare index still works (legacy callers)", resolveStage(stages, 1), 1);

  // The refusal. Falling back to the index here would tick the neighbour.
  let threw = null;
  try { resolveStage(stages, { sid: "deleted", index: 0 }); } catch (e) { threw = e; }
  ok("REFUSES a missing sid rather than hitting the neighbour", threw !== null);
  eq("and refuses with the code app.js listens for",
    threw && threw.code, "octodo/stage-gone");

  // But a pre-0.26.0 project has no sids at all — that must still work.
  const old = [st("a"), st("b")];
  eq("falls back to index when the array has NO sids at all",
    resolveStage(old, { sid: "whatever", index: 1 }), 1);

  eq("garbage returns -1 rather than 0", resolveStage(stages, { index: "x" }), -1);
  eq("undefined returns -1 rather than 0", resolveStage(stages, undefined), -1);
}

section("ORDER OF THE MERGED RESULT");
{
  // A subtle one: the caller's order must be the OUTPUT order, or a reorder
  // would appear to save and then snap back on the next snapshot.
  const live = [st("a", { sid: "1" }), st("b", { sid: "2" }), st("c", { sid: "3" })];
  const incoming = [st("c", { sid: "3" }), st("b", { sid: "2" }), st("a", { sid: "1" })];
  eq("output follows the caller, not the server",
    mergeStages(incoming, live).stages.map(s => s.sid), ["3", "2", "1"]);
}

section("FIELDS THE EDITOR OWNS ARE NOT CLOBBERED BY THE SERVER");
{
  const live = [done("old name", "s1")];
  const incoming = [st("renamed", { sid: "s1", offsetDays: 5, direction: "after" })];
  const r = mergeStages(incoming, live);
  eq("rename survives the merge", r.stages[0].name, "renamed");
  eq("offsetDays survives the merge", r.stages[0].offsetDays, 5);
  eq("direction survives the merge", r.stages[0].direction, "after");
  ok("while completion still comes from the server", r.stages[0].completedAt === 1000);
}

// =========================================================================
console.log(`\n${fail === 0 ? "\u2705" : "\u274c"} ${pass} passed, ${fail} failed` +
  `  (extracted live from store.js: ${NAMES.join(", ")})\n`);
process.exit(fail ? 1 : 0);
