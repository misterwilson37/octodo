#!/usr/bin/env node
// ============================================================
// Tentacalendar — move.test.mjs  (2.0 / OCTODO LINE)
// Version 1.0.0
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
  const open = SRC.indexOf("{", m.index);
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === "{") depth++;
    else if (SRC[i] === "}" && --depth === 0) return SRC.slice(m.index, i + 1);
  }
  throw new Error(`EXTRACTION FAILED: unbalanced braces reading ${name}`);
}

// rehomeFor leans on wsOf/wsOfTier, which touch module state we do not want
// to reconstruct. Inject them instead — the DECISION is what is under test.
const src = [extract("walkChain"), extract("rehomeFor")].join("\n\n").replace(/export\s+/g, "");
let WS_OF = () => null, WS_OF_TIER = () => null;
const { walkChain, rehomeFor } = new Function("wsOf", "wsOfTier",
  `${src}\nreturn { walkChain, rehomeFor };`)(
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

console.log(`\n${fail === 0 ? "\u2705" : "\u274c"} ${pass} passed, ${fail} failed` +
  `  (extracted live from store.js: walkChain, rehomeFor)\n`);
process.exit(fail ? 1 : 0);
