#!/usr/bin/env node
// ============================================================
// Tentacalendar — move.test.mjs  (2.0 / OCTODO LINE)
// Version 1.1.0
//
// TESTS THE PARTS OF §0d THAT CAN BE TESTED WITHOUT A DATABASE.
//
// store 0.28.0 made a tier change across a board boundary MOVE the document
// instead of stranding it. Most of that work is Firestore reads and batched
// writes, which this cannot reach. Two pieces are pure, and they are the two
// where a bug would be silent rather than loud:
//
//   · walkChain — collects a follow-up chain. Miss a descendant and the chain
//     splits across two boards; rewindFollowUps queries ONE board, so it does
//     not error, it just stops seeing the far half. Loop on a cycle and the
//     whole app hangs.
//   · rehomeFor — decides whether an edit is a move at all. Say yes when it
//     should say no and an ordinary rename becomes a copy-verify-delete.
//   · movedTaskData (1.1.0) — what one document looks like on the far side.
//     It stranded every follow-up it carried for a whole release: the child
//     changed BOARD and kept the OLD board's tierId. Nothing errored; the
//     document simply became invisible to the person it was for. Lifted out
//     of moveTask in store 0.29.1 precisely so this could exist.
//
// ⚠️ IT READS THE REAL store.js, by brace-matching the source, exactly as
// stage-merge.test.mjs does. Nothing here is a re-implementation. If the
// extraction fails, the run FAILS.
//
// Run from the repo root:  node move.test.mjs
// ============================================================

import { readFileSync } from "node:fs";

const SRC = readFileSync("store.js", "utf8");

function extract(name) {
  const re = new RegExp(String.raw`(?:export\s+)?(?:async\s+)?function\s+${name}\b`);
  const m = re.exec(SRC);
  if (!m) throw new Error(`EXTRACTION FAILED: ${name} not found in store.js — renamed?`);
  // ⚠️ SKIP THE PARAMETER LIST FIRST. This used to be `indexOf("{", m.index)`,
  // which finds the body of a function whose parameters contain no braces —
  // and finds `{}` inside `patch = {}` for one that does. The extraction then
  // returns a truncated function and the run dies with a SyntaxError several
  // lines away from the cause. Loud, at least, but not obviously about this.
  // Match the parens, THEN look for the body.
  const lp = SRC.indexOf("(", m.index);
  let par = 0, afterParams = -1;
  for (let i = lp; i < SRC.length; i++) {
    if (SRC[i] === "(") par++;
    else if (SRC[i] === ")" && --par === 0) { afterParams = i; break; }
  }
  if (afterParams === -1) throw new Error(`EXTRACTION FAILED: unbalanced parens reading ${name}`);
  const open = SRC.indexOf("{", afterParams);
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === "{") depth++;
    else if (SRC[i] === "}" && --depth === 0) return SRC.slice(m.index, i + 1);
  }
  throw new Error(`EXTRACTION FAILED: unbalanced braces reading ${name}`);
}

// rehomeFor leans on wsOf/wsOfTier, which touch module state we do not want
// to reconstruct. Inject them instead — the DECISION is what is under test.
const src = [extract("walkChain"), extract("rehomeFor"), extract("movedTaskData")]
  .join("\n\n").replace(/export\s+/g, "");
let WS_OF = () => null, WS_OF_TIER = () => null;
const { walkChain, rehomeFor, movedTaskData } = new Function("wsOf", "wsOfTier",
  `${src}\nreturn { walkChain, rehomeFor, movedTaskData };`)(
    (...a) => WS_OF(...a), (...a) => WS_OF_TIER(...a));

let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  \u2713 ${label}`); }
  else { fail++; console.log(`  \u2717 ${label}${detail ? `\n      ${detail}` : ""}`); }
};
const eq = (label, a, e) => ok(label, JSON.stringify(a) === JSON.stringify(e),
  `expected ${JSON.stringify(e)}\n      got      ${JSON.stringify(a)}`);
const section = s => console.log(`\n${s}`);

// a fake tasks table: parent -> children
const table = edges => async id => edges[id] || [];

section("FOLLOW-UP CHAINS — walkChain");
{
  // createFollowUpChain builds a LINKED LIST: B follows A, C follows B.
  const line = { A: ["B"], B: ["C"], C: ["D"] };
  eq("a linked list is walked to the end", await walkChain("A", table(line)), ["A", "B", "C", "D"]);
  eq("starting mid-chain takes only what hangs below",
    await walkChain("C", table(line)), ["C", "D"]);

  eq("a lone task is its own chain", await walkChain("A", table({})), ["A"]);

  // Not the documented shape, but nothing prevents it.
  const tree = { A: ["B", "C"], B: ["D"], C: ["E"] };
  const got = await walkChain("A", table(tree));
  eq("a branching chain takes every branch", got.slice().sort(), ["A", "B", "C", "D", "E"]);
  eq("the root comes first", got[0], "A");
}

section("THE CYCLE — an app that hangs is worse than one that misbehaves");
{
  const cycle = { A: ["B"], B: ["C"], C: ["A"] };
  const out = await walkChain("A", table(cycle));
  eq("a cycle terminates, and visits each id once", out.sort(), ["A", "B", "C"]);

  const self = { A: ["A"] };
  eq("a task parented to itself terminates", await walkChain("A", table(self)), ["A"]);

  // The diamond: D is reachable two ways. Copying it twice would double it.
  const diamond = { A: ["B", "C"], B: ["D"], C: ["D"] };
  const d = await walkChain("A", table(diamond));
  eq("a diamond yields D exactly once", d.filter(x => x === "D").length, 1);
  eq("and yields four ids total", d.length, 4);
}

section("IS THIS EDIT A MOVE? — rehomeFor");
{
  WS_OF = () => "WS_HOME";
  WS_OF_TIER = t => (t === "tierOnShared" ? "WS_SHARED" : "WS_HOME");

  eq("a tier change ACROSS boards is a move",
    rehomeFor("projects", "p1", { tierId: "tierOnShared" }), { from: "WS_HOME", to: "WS_SHARED" });
  eq("a tier change WITHIN a board is not",
    rehomeFor("projects", "p1", { tierId: "tierAtHome" }), null);
  eq("an edit with no tierId is never a move",
    rehomeFor("projects", "p1", { name: "renamed", color: "#fff" }), null);
  eq("a null tierId is not a move (it would resolve to nothing)",
    rehomeFor("projects", "p1", { tierId: null }), null);
  eq("undefined fields do not throw", rehomeFor("projects", "p1", undefined), null);
  eq("an empty edit is not a move", rehomeFor("projects", "p1", {}), null);

  // The ordinary case has to stay ordinary: one updateDoc, no copy engine.
  let asked = 0;
  WS_OF_TIER = t => { asked++; return "WS_HOME"; };
  rehomeFor("tasks", "t1", { dueAt: 123 });
  eq("a plain reschedule never even resolves a tier", asked, 0);
}

{
  section("A MOVED CHAIN LANDS ROUTABLE \u2014 movedTaskData");
  const patch = { tierId: "tierOnShared", title: "renamed root", dueAt: 999 };
  const root  = { tierId: "tierAtHome", title: "root", dueAt: 1, notes: "r" };
  const child = { tierId: "tierAtHome", title: "and then this", dueAt: null,
                  notes: "c", parentTaskId: "t1", offsetDays: 3 };

  // ⚠️ THE REGRESSION. The child changed board and kept the old board's
  // tier: mis-routed on arrival, silently, on every chain that ever moved.
  eq("a follow-up takes the new tier with it",
    movedTaskData(child, false, patch).tierId, "tierOnShared");
  eq("the root takes the new tier too",
    movedTaskData(root, true, patch).tierId, "tierOnShared");

  // ...and ONLY the tier. patch is the whole edit from updateTask.
  eq("a follow-up keeps its own title", movedTaskData(child, false, patch).title, "and then this");
  eq("a follow-up keeps its own dueAt", movedTaskData(child, false, patch).dueAt, null);
  eq("a follow-up keeps its own notes", movedTaskData(child, false, patch).notes, "c");
  eq("a follow-up keeps its chain link", movedTaskData(child, false, patch).parentTaskId, "t1");
  eq("the root DOES take the rest of the edit", movedTaskData(root, true, patch).title, "renamed root");

  // A move that is not a tier change must not invent one.
  eq("no tierId in the patch leaves the child's tier alone",
    movedTaskData(child, false, { dueAt: 5 }).tierId, "tierAtHome");
  eq("no patch at all leaves the child's tier alone",
    movedTaskData(child, false).tierId, "tierAtHome");

  // E40 — a carried mirror id points at an event nothing on the new board owns.
  eq("the mirror id is dropped on the root",
    movedTaskData({ ...root, mirroredGcalEventId: "ev1" }, true, patch).mirroredGcalEventId, null);
  eq("the mirror id is dropped on a follow-up",
    movedTaskData({ ...child, mirroredGcalEventId: "ev2" }, false, patch).mirroredGcalEventId, null);
  eq("a task with no mirror id gains no field",
    "mirroredGcalEventId" in movedTaskData(child, false, patch), false);

  // Purity: the caller's document must not be mutated under it.
  const frozen = { tierId: "tierAtHome", title: "x" };
  movedTaskData(frozen, false, patch);
  eq("the source document is not mutated", frozen.tierId, "tierAtHome");
}

console.log(`\n${fail === 0 ? "\u2705" : "\u274c"} ${pass} passed, ${fail} failed` +
  `  (extracted live from store.js: walkChain, rehomeFor, movedTaskData)\n`);
process.exit(fail ? 1 : 0);
