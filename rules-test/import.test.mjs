/**
 * import.test.mjs — exercises the 1.x → 2.0 migration against the emulator
 * with the REAL firestore-2.0.rules and a REAL export file.
 *
 * This is the test import.html cannot be. It proves three things that could
 * otherwise only be discovered by running the migration for real on the one
 * board that must not be got wrong:
 *
 *   1. Every document the plan produces is ACCEPTED BY THE RULES when the
 *      importer is the owner. A migration that dies two-thirds through leaves
 *      a half-built board.
 *   2. No document contains `undefined`. Firestore rejects it outright, and a
 *      1.x export is full of absent fields — five task fields are missing on
 *      more than half the documents.
 *   3. The counts match, and the E7 tierRanks key is the composite
 *      `${wsId}:${tierId}` rather than the bare tierId.
 *
 * RUN:  EXPORT_JSON=/path/to/export.json node import.test.mjs
 *       (with the emulator already up, or via emulators:exec)
 *
 * ⚠️ The export file is somebody's real board. It is read from a path, never
 * committed. There is no fixture in this repo for that reason.
 */
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";
import * as T from "./import-transform.js";

const EXPORT = process.env.EXPORT_JSON || "/home/claude/imp/export.json";
const data = JSON.parse(readFileSync(EXPORT, "utf8"));

const OWNER = (data.workspace.memberEmails || [])[1] || "owner@example.com";
const WS = "ws-imported";
const NOW = 1785400000000;

const env = await initializeTestEnvironment({
  projectId: "fantasktic-octodo",
  firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 }
});
const as = email => env.authenticatedContext(email, { email, email_verified: true }).firestore();

let pass = 0, fail = 0;
const t = async (id, note, fn) => {
  try { await fn(); console.log(` ✓  ${id.padEnd(12)} ${note}`); pass++; }
  catch (e) { console.log(` ✗  ${id.padEnd(12)} ${note}\n        → ${e.message.split("\n")[0]}`); fail++; }
};
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: expected ${b}, got ${a}`); };

await env.clearFirestore();

// ── IMPORT-1: the file validates, and its findings are the ones we expect to
// have to ask about.
const v = T.validateExport(data);
await t("IMPORT-1a", "the export validates with no blocking errors", () => {
  if (!v.ok) throw new Error("errors: " + v.errors.join(" | "));
});
await t("IMPORT-1b", "validation reports document counts for every collection", () => {
  for (const c of T.KNOWN_COLLECTIONS) if (typeof v.counts[c] !== "number") throw new Error(`no count for ${c}`);
});

// ── IMPORT-2: the interview is derived from the file, not hardcoded. An export
// with no open clocks must not be asked about open clocks.
const qs = T.buildInterview(data, OWNER, v);
const answers = T.defaultAnswers(qs);
await t("IMPORT-2a", "every question has a default, so a preview needs no answers", () => {
  for (const q of qs) if (q.default === undefined) throw new Error(`${q.id} has no default`);
});
await t("IMPORT-2b", "one role question per other member, none for the importer", () => {
  const roleQs = qs.filter(q => q.id.startsWith("role:"));
  const others = (data.workspace.memberEmails || []).filter(e => e.toLowerCase() !== OWNER.toLowerCase());
  eq(roleQs.length, others.length, "role question count");
  if (roleQs.some(q => q.id === `role:${OWNER.toLowerCase()}`)) throw new Error("asked the importer about their own role");
});
await t("IMPORT-2c", "the open-clock question appears only when a clock is open", () => {
  const asked = qs.some(q => q.id === "openClocks");
  eq(asked, v.findings.openSessions.length > 0, "openClocks asked");
});

// ── IMPORT-3: the plan is well-formed BEFORE anything is written. This is the
// undefined check, and it is the one that would otherwise fail at document 140.
const plan = T.buildPlan(data, answers, { wsId: WS, me: OWNER, now: NOW });
await t("IMPORT-3a", "no document anywhere contains `undefined`", () => {
  const bad = [];
  const walk = (o, p) => {
    if (o === null) return;
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, `${p}[${i}]`));
    if (typeof o === "object") return Object.entries(o).forEach(([k, x]) => {
      if (x === undefined) bad.push(`${p}.${k}`); else walk(x, `${p}.${k}`);
    });
  };
  for (const w of plan.writes) walk(w.doc, w.path.join("/"));
  if (bad.length) throw new Error(`${bad.length} undefined field(s), first: ${bad[0]}`);
});
await t("IMPORT-3b", "eventsCache is skipped by default and counted as skipped", () => {
  eq(plan.skipped.eventsCache, (data.collections.eventsCache || []).length, "skipped eventsCache");
  if (plan.writes.some(w => w.path[1] === "eventsCache")) throw new Error("wrote eventsCache despite skipping");
});
await t("IMPORT-3c", "the orphan session is skipped by default", () => {
  eq(plan.skipped.orphanSessions, v.findings.orphanSessions.length, "skipped orphans");
});
await t("IMPORT-3d", "E7 tierRanks use the composite `wsId:tierId` key", () => {
  const prof = plan.writes.find(w => w.collection === "root");
  if (!prof) throw new Error("no users/{email} write");
  const keys = Object.keys(prof.doc.tierRanks);
  if (!keys.length) throw new Error("tierRanks empty");
  for (const k of keys) if (!k.startsWith(`${WS}:`)) throw new Error(`bare key: ${k}`);
});
await t("IMPORT-3e", "the workspace document carries pollIntervalMinutes (E14/item 7)", () => {
  const w = plan.writes[0];
  if (typeof w.doc.pollIntervalMinutes !== "number") throw new Error("missing or not a number");
});
await t("IMPORT-3f", "ownerEmail is the importer, whatever the source said", () => {
  eq(plan.writes[0].doc.ownerEmail, OWNER.toLowerCase(), "ownerEmail");
});

// ── IMPORT-4: THE REAL TEST. Commit the whole plan as the owner, through the
// actual rules, in the actual order import.html will use.
await t("IMPORT-4a", `all ${plan.writes.length} writes are accepted by rules 1.2.1`, async () => {
  const db = as(OWNER);
  for (const w of plan.writes) {
    const ref = w.collection === "root"
      ? doc(db, "users", w.path[1])
      : doc(db, "workspaces", ...w.path);
    await assertSucceeds(setDoc(ref, w.doc, w.merge ? { merge: true } : undefined));
  }
});

// ── IMPORT-5: read it back and count. A migration that reports success and
// lands 240 of 245 documents is the failure this checks for.
await t("IMPORT-5a", "every collection landed with the expected count", async () => {
  const db = as(OWNER);
  const expect = {
    tiers: v.counts.tiers, tasks: v.counts.tasks,
    projects: v.counts.projects,
    sessions: v.counts.sessions - v.findings.orphanSessions.length,
    settings: 3
  };
  for (const [name, n] of Object.entries(expect)) {
    const snap = await getDocs(collection(db, "workspaces", WS, name));
    eq(snap.size, n, `${name} count`);
  }
});
await t("IMPORT-5b", "the named pipeline landed in the library", async () => {
  const snap = await getDoc(doc(as(OWNER), "workspaces", WS, "settings", "projectTypes"));
  const types = snap.data().types || [];
  if (!types.length) throw new Error("library is empty");
  if (!types[0].stages?.length) throw new Error("named type has no stages");
});
await t("IMPORT-5c", "hand-edited project stage lists survived intact", async () => {
  const src = data.collections.projects;
  const snap = await getDocs(collection(as(OWNER), "workspaces", WS, "projects"));
  const got = new Map([...snap.docs].map(d => [d.id, d.data()]));
  for (const p of src) {
    eq(got.get(p.id)?.stages.length, (p.stages || []).length, `stage count for ${p.id}`);
  }
});
await t("IMPORT-5d", "every stage has a completedBy slot (E9), null where unknown", async () => {
  const snap = await getDocs(collection(as(OWNER), "workspaces", WS, "projects"));
  for (const d of snap.docs) {
    for (const s of d.data().stages) {
      if (!("completedBy" in s)) throw new Error(`stage "${s.name}" has no completedBy`);
    }
  }
});

// ── IMPORT-6: a member who is NOT the owner cannot run this. RULES-6b proved
// an editor cannot write the board document; this proves it in the migration's
// own shape, because "add me as an editor and I'll import it" was the plan of
// record in §11 until tonight.
await t("IMPORT-6a", "a non-owner is REFUSED the workspace document write", async () => {
  const other = (data.workspace.memberEmails || []).find(e => e.toLowerCase() !== OWNER.toLowerCase()) || "other@example.com";
  const db = as(other);
  let denied = false;
  try { await setDoc(doc(db, "workspaces", WS), { name: "hijack" }, { merge: true }); }
  catch { denied = true; }
  if (!denied) throw new Error("a non-owner was allowed to write the board document");
});

// ── IMPORT-7: the checklist names the things no code can do.
await t("IMPORT-7a", "the checklist mentions re-sharing calendars", () => {
  const list = T.postImportChecklist(data, answers).join(" ").toLowerCase();
  if (!list.includes("service account")) throw new Error("no mention of the service account re-share");
});

console.log("\n" + "─".repeat(72));
console.log(`   ${pass} passed, ${fail} failed   ·   ${plan.writes.length} writes planned, ` +
            `${plan.skipped.eventsCache + plan.skipped.orphanSessions} documents deliberately skipped`);
console.log("─".repeat(72) + "\n");
await env.cleanup();
process.exit(fail ? 1 : 0);
