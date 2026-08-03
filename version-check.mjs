#!/usr/bin/env node
// ============================================================
// Tentacalendar — version-check.mjs  (2.0 / OCTODO LINE)
// Version 1.7.0 — says out loud that there is no staging.
//
// THE THING SIX FILES ALREADY TOLD YOU TO RUN.
//
// `app.js`, `store.js`, `queue.js`, `index.html`, `CHANGELOG.md` and
// `HANDOFF-2.0.md` have all instructed the reader to run
// `node version-check.mjs` before handing anything over. It did not exist.
// Every one of those instructions was a prose warning wearing a command's
// clothes — which is the exact failure mode the warnings were written to
// stop. Four banner/constant drifts and four stale `?v=` pins accumulated
// under a check nobody could run.
//
// It checks three things and nothing else:
//
//   1. BANNER vs CONSTANT. Every file declares its version twice — once in
//      the comment header a human reads first, once in the constant the code
//      actually uses. They must agree.
//
//   2. PIN vs TARGET. Every `?v=` cache-bust must equal the version of the
//      file it points at. A pin one patch behind is WORSE than no pin: the
//      file uploads cleanly and the browser serves the cached old one, so
//      the fix appears shipped and is not. This is how a repaired bug comes
//      back in a smoke test.
//
//   3. HANDOFF TABLE vs REALITY. The version row at the top of
//      HANDOFF-2.0.md is what the next instance believes. If it disagrees
//      with the files, the next instance starts wrong.
//
// Exit code 0 = clean, 1 = something drifted. No dependencies, no install.
//
// Run from the repo root:  node version-check.mjs
// ============================================================

import { readFileSync, existsSync } from "node:fs";

const VERSION_CHECK_VERSION = "1.7.0";

const SEMVER = String.raw`\d+\.\d+\.\d+`;

// ---- header budget ------------------------------------------------------
// ⚠️ A HEADER THAT REGROWS IS NOT A TIDINESS PROBLEM. CHANGELOG.md exists
// because app.js's header reached 949 lines and put the version banner 980
// lines away from the constant it must agree with — which is how they drifted
// apart four separate times, the last one costing a deploy. The rule was
// written down, and by 2026-08-02 app.js was back to 19 entries and 135 lines
// with nothing to stop it. Jake, unprompted: *"comments are getting deep
// again in some of the files."*
//
// A rule a human has to remember is a rule this project has already watched
// fail. So it is a check. Entries below the cap go to CHANGELOG.md verbatim.
const HEADER_MAX_LINES = 60;      // from line 1 to the first import/export
const HEADER_MAX_ENTRIES = 6;     // "// X.Y.Z — ..." blocks in the header

// ---- what carries a version, and how to read both copies of it ----------
// banner: the version in the comment header.  constant: the one code uses.
// label:  what this file is called in the handoff's **Versions** row.
//
// ⚠️ 1.4.0 — THIS IS NOW THE ONLY LIST. It used to be three: FILES, then
// LABELS, then rowOrder, each hand-written, each having to be extended
// whenever a file joined. That is the shape that has bitten this project
// four times (the keep-list that ate `completedBy`, the ?v= pins, whereis's
// column header, and this). LABELS and the paste-able row are now DERIVED
// from the `label` below, so adding a file here adds it everywhere.
const FILES = [
  { file: "app.js",              banner: /^\/\/\s*Version\s+(V)/m,           constant: /^export const APP_VERSION\s*=\s*"(V)"/m , label: "app" },
  { file: "store.js",            banner: /^\/\/\s*Version\s+(V)/m,           constant: /^export const STORE_VERSION\s*=\s*"(V)"/m , label: "store" },
  { file: "queue.js",            banner: /^\/\/\s*Version\s+(V)/m,           constant: /^export const QUEUE_VERSION\s*=\s*"(V)"/m , label: "queue" },
  { file: "celebrate.js",        banner: /^\/\/\s*Version\s+(V)/m,           constant: /^export const CELEBRATE_VERSION\s*=\s*"(V)"/m , label: "celebrate" },
  { file: "config.js",           banner: /^\/\/\s*Version\s+(V)/m,           constant: /^export const CONFIG_VERSION\s*=\s*"(V)"/m , label: "config" },
  { file: "import-transform.js", banner: /^\/\/\s*Version\s+(V)/m,           constant: /^export const TRANSFORM_VERSION\s*=\s*"(V)"/m , label: "import-transform" },
  { file: "tentacalendar.css",   banner: /^\s*Version\s+(V)/m,               constant: /--tc-version:\s*"(V)"/ , label: "css" },
  { file: "index.html",          banner: /^\s*Version\s+(V)/m,               constant: /data-html-version="(V)"/ , label: "html" },
  { file: "import.html",         banner: /^\s*Version\s+(V)/m,               constant: null , label: "import.html" },
  { file: "whereis.html",        banner: /^\s*Version\s+(V)/m,               constant: /id="wv">v(V)</ , label: "whereis.html" },
  { file: "firestore-2.0.rules", banner: /^\/\/\s*Version\s+(V)/m,           constant: null , label: "rules" },
  { file: "functions/index.js",  banner: /^\/\/.*—\s*Version\s+(V)/m,        constant: /^const FUNCTIONS_VERSION\s*=\s*"(V)"/m , label: "functions" },
  { file: "stage-merge.test.mjs", banner: /^\/\/\s*Version\s+(V)/m,          constant: null , label: "stage-merge.test" },
  { file: "move.test.mjs",       banner: /^\/\/\s*Version\s+(V)/m,          constant: null , label: "move.test" },
  { file: "outrider.test.mjs",   banner: /^\/\/\s*outrider\.test\.mjs\s+—\s+Version\s+(V)/m, constant: null , label: "outrider.test" },
  // ⚠️ THE CHECKER CHECKS THE CHECKER. This file shipped for three versions
  // unable to see its own drift — and drifted: the repo held 1.1.0 while the
  // handoff row said 1.3.0. That is the one file where the mistake is
  // invisible by construction, because a check blind to itself reports ok.
  { file: "version-check.mjs",   banner: /^\/\/\s*Version\s+(V)/m,          constant: /^const VERSION_CHECK_VERSION\s*=\s*"(V)"/m , label: "version-check" },
];

// Files that are pinned but carry no internal version to compare against.
// manifest.json has no version field; its pin is bumped by hand.
const UNVERIFIABLE_TARGETS = new Set(["manifest.json"]);

const rx = (r) => (r ? new RegExp(r.source.replace("(V)", `(${SEMVER})`), r.flags) : null);

let problems = 0;
const fail = (msg) => { problems++; console.log(`  \u2717 ${msg}`); };
const pass = (msg) => console.log(`  \u2713 ${msg}`);

// ---- 1. banner vs constant ---------------------------------------------
console.log("\nBANNER vs CONSTANT");
const actual = new Map();   // filename -> the version we believe it to be

// The header budget runs over the .js sources only — .rules, .html and the
// test harnesses do not carry a RECENT block.
for (const spec of FILES.filter(f => f.file.endsWith(".js") && !f.file.includes("test"))) {
  let text;
  try { text = readFileSync(spec.file, "utf8"); } catch { continue; }
  const lines = text.split("\n");
  const firstCode = lines.findIndex(l => /^(export |import |const |let |function )/.test(l));
  const headLines = firstCode === -1 ? lines.length : firstCode;
  const entries = lines.slice(0, headLines).filter(l => /^\/\/ \d+\.\d+\.\d+ /.test(l)).length;
  if (headLines > HEADER_MAX_LINES || entries > HEADER_MAX_ENTRIES) {
    fail(`${spec.file} header is ${headLines} lines / ${entries} entries ` +
         `(budget ${HEADER_MAX_LINES} / ${HEADER_MAX_ENTRIES})` +
         `\n      \u2192 move the oldest entries into CHANGELOG.md, verbatim. This is the ` +
         `drift that cost a deploy; the banner belongs NEXT TO its constant.`);
  } else {
    pass(`${spec.file} header ${headLines}L / ${entries} entries`);
  }
}

for (const spec of FILES) {
  if (!existsSync(spec.file)) { fail(`${spec.file} — MISSING FROM REPO`); continue; }
  const text = readFileSync(spec.file, "utf8");

  const bm = rx(spec.banner)?.exec(text);
  const cm = spec.constant ? rx(spec.constant).exec(text) : null;

  if (!bm) { fail(`${spec.file} — no version banner found (regex did not match; header reformatted?)`); continue; }

  if (!spec.constant) {
    actual.set(spec.file, bm[1]);
    pass(`${spec.file} ${bm[1]} (banner only)`);
    continue;
  }
  if (!cm) { fail(`${spec.file} — banner says ${bm[1]} but the version CONSTANT was not found`); continue; }

  actual.set(spec.file, cm[1]);   // the constant is what runs, so it is the truth
  if (bm[1] !== cm[1]) fail(`${spec.file} — banner ${bm[1]} \u2260 constant ${cm[1]}   <<< THE DRIFT`);
  else pass(`${spec.file} ${cm[1]}`);
}

// ---- 2. every ?v= pin vs its target -------------------------------------
console.log("\nCACHE-BUST PINS");
const PIN_HOSTS = ["index.html", "app.js", "store.js", "queue.js", "import.html", "whereis.html"];
const PIN_RX = /["'](?:\.\/)?([A-Za-z0-9._-]+\.(?:js|css|json))\?v=(\d+\.\d+\.\d+)["']/g;
let pinCount = 0;

for (const host of PIN_HOSTS) {
  if (!existsSync(host)) continue;
  const text = readFileSync(host, "utf8");
  for (const m of text.matchAll(PIN_RX)) {
    const [, target, pinned] = m;
    if (UNVERIFIABLE_TARGETS.has(target)) continue;
    pinCount++;
    const line = text.slice(0, m.index).split("\n").length;
    const truth = actual.get(target);
    if (!truth) { fail(`${host}:${line} pins ${target}?v=${pinned} — target has no readable version`); continue; }
    if (truth !== pinned) {
      fail(`${host}:${line} pins ${target}?v=${pinned} but ${target} is ${truth}` +
           `\n      \u2192 the file uploads fine and the browser keeps serving ${pinned}. The fix will look shipped and will not be.`);
    } else pass(`${host}:${line} \u2192 ${target} ${pinned}`);
  }
}
if (!pinCount) fail("no ?v= pins found at all — the pin regex or the markup changed");

// ---- 3. handoff table vs reality ----------------------------------------
console.log("\nHANDOFF TABLE");
const HANDOFF = "HANDOFF-2.0.md";
let handoffRow = "";
// the row reads: | **Versions** | app 1.34.0 · store 0.25.0 · ... |
// DERIVED from FILES (1.4.0) — see the note on that array.
const LABELS = Object.fromEntries(FILES.map((f) => [f.label, f.file]));

// Labels the row legitimately carries that no file can be read for.
// manifest.json has no version field; its number is maintained by hand.
const UNVERIFIABLE_LABELS = new Set(["manifest"]);
if (!existsSync(HANDOFF)) fail(`${HANDOFF} missing`);
else {
  const row = readFileSync(HANDOFF, "utf8").split("\n").find((l) => /\*\*Versions\*\*/.test(l));
  handoffRow = row || "";
  if (!row) fail(`${HANDOFF} — no "**Versions**" row found in the header table`);
  else {
    for (const [label, file] of Object.entries(LABELS)) {
      const m = new RegExp(`${label.replace(".", "\\.")}\\s+(${SEMVER})`).exec(row);
      const truth = actual.get(file);
      if (!truth) { fail(`${HANDOFF} row covers ${label}, but ${file} could not be read for a version`); continue; }
      if (!m) { fail(`${HANDOFF} row does not mention ${label} at all — it is ${truth}`); continue; }
      if (m[1] !== truth) fail(`${HANDOFF} says ${label} ${m[1]}, file is ${truth}`);
      else pass(`${label} ${m[1]}`);
    }
    // ⚠️ THE CHECK THAT WOULD HAVE CAUGHT move.test.mjs. The row announced
    // `move.test 1.0.0` for a session while no such file existed in the
    // repo — a version table describing a file nobody had shipped, which is
    // this project's signature failure (a warning wearing a command's
    // clothes). Anything the row NAMES must be a file that can be read.
    for (const m of row.matchAll(new RegExp(`([A-Za-z][\\w.-]*)\\s+(${SEMVER})`, "g"))) {
      const label = m[1];
      if (LABELS[label] || UNVERIFIABLE_LABELS.has(label)) continue;
      fail(`${HANDOFF} row claims "${label} ${m[2]}" and nothing in FILES answers to that name` +
           `\n      \u2192 either the file is missing from the repo, or the label drifted. Both look identical from the row.`);
    }
  }
}

// ---- the paste-able row -------------------------------------------------
// ⚠️ DERIVED, and it must stay that way. The old hand-written rowOrder
// listed twelve files while FILES held fourteen and the handoff row held
// sixteen — so pasting this row SILENTLY DELETED manifest, version-check
// and both test harnesses from the table. A suggestion that quietly drops
// rows is worse than no suggestion, because it looks authoritative.
// ⚠️ PRINTED ON EVERY RUN, PASS OR FAIL, BECAUSE AN INSTANCE CANNOT OBSERVE A
// DEPLOY AND WILL OTHERWISE ASSUME ONE HAS NOT HAPPENED. Jake uploads each
// drop on receipt and Pages serves main, so handing a file over IS shipping
// it. A whole session of advice was written on the opposite assumption —
// "untested in a browser" used as if it meant "not live yet" — about changes
// that were already rewriting a real person's task documents.
console.log("\n\u26a0\ufe0f  THERE IS NO STAGING. Handing these files over deploys them.");
console.log("   SHIPPED and EXERCISED are different questions. The versions below");
console.log("   are what a real user is running RIGHT NOW; TESTS.md is the only");
console.log("   record of what anybody has deliberately walked through.\n");

console.log("\nCURRENT STATE, ready to paste into the handoff table:\n");
const cells = FILES.filter((f) => actual.has(f.file)).map((f) => `${f.label} ${actual.get(f.file)}`);
for (const label of UNVERIFIABLE_LABELS) {
  const m = new RegExp(`${label}\\s+(${SEMVER})`).exec(handoffRow || "");
  if (m) cells.push(`${label} ${m[1]} (by hand)`);
}
console.log("| **Versions** | " + cells.join(" \u00b7 ") + " |\n");

console.log(problems === 0
  ? "\u2705 CLEAN \u2014 banners, constants, pins and the handoff table all agree.\n"
  : `\u274c ${problems} problem${problems === 1 ? "" : "s"}. Nothing goes to Jake until this is clean.\n`);

process.exit(problems ? 1 : 0);
