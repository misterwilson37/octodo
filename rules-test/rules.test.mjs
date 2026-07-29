/**
 * firestore-2.0.rules — the first automated test this project has ever had.
 *
 * WHY THIS FILE EXISTS. HANDOFF-2.0 has said for three versions that "the two
 * rules bugs this project has shipped were both of a kind a three-line test
 * would have caught," and then a third one shipped anyway (E41 wrote
 * onboarding state to a document the rules let only an owner write). The
 * console has no Playground any more. This is the substitute, and it runs in
 * about ten seconds.
 *
 * RUN:  npx firebase emulators:exec --only firestore "node rules.test.mjs"
 *   or, with an emulator already up:  node rules.test.mjs
 *
 * SHAPE OF A TEST. assertFails/assertSucceeds from @firebase/rules-unit-testing
 * wrap a promise and assert on permission-denied. Seed data goes in through
 * withSecurityRulesDisabled, so a fixture can never be blocked by the very
 * rules under test.
 */
import {
  initializeTestEnvironment, assertFails, assertSucceeds
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

const OWNER  = "owner@example.com";
const EDITOR = "editor@example.com";
const HELPER = "helper@example.com";
const VIEWER = "viewer@example.com";
const KID    = "kid@example.com";
const STRANGER = "stranger@example.com";      // gets handed a key in RULES-3c
const OUTSIDER = "outsider@example.com";      // never touched by any test — the isolation probe
const WS = "ws-test";
const DEP = "ws-dependent";

const env = await initializeTestEnvironment({
  projectId: "fantasktic-octodo",
  firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 }
});

// auth().uid is not what these rules read — they read token.email — so every
// context is built with an email claim to match me().
const as = email => env.authenticatedContext(email, { email, email_verified: true }).firestore();

await env.clearFirestore();
await env.withSecurityRulesDisabled(async ctx => {
  const db = ctx.firestore();
  await setDoc(doc(db, "workspaces", WS), {
    name: "Test", kind: "personal", ownerEmail: OWNER,
    createdAt: Date.now(), createdBy: OWNER, pollIntervalMinutes: 60
  });
  for (const [email, role] of [[OWNER, "owner"], [EDITOR, "editor"], [HELPER, "helper"], [VIEWER, "viewer"]]) {
    await setDoc(doc(db, "workspaces", WS, "members", email), { email, role, addedBy: OWNER, addedAt: Date.now() });
  }
  // A dependent board: the adult holds the deed, the child holds a minor key.
  await setDoc(doc(db, "workspaces", DEP), {
    name: "Kid", kind: "personal", ownerEmail: OWNER,
    createdAt: Date.now(), createdBy: OWNER, pollIntervalMinutes: 60
  });
  await setDoc(doc(db, "workspaces", DEP, "members", KID), { email: KID, role: "editor", minor: true, addedBy: OWNER, addedAt: Date.now() });
  await setDoc(doc(db, "workspaces", DEP, "members", OWNER), { email: OWNER, role: "owner", addedBy: OWNER, addedAt: Date.now() });
  await setDoc(doc(db, "workspaces", WS, "tasks", "t1"), { title: "seeded", createdBy: OWNER, createdAt: Date.now() });
});

let pass = 0, fail = 0;
const results = [];
async function t(id, note, fn) {
  try { await fn(); results.push(["PASS", id, note]); pass++; }
  catch (err) { results.push(["FAIL", id, `${note}  →  ${err.message.split("\n")[0]}`]); fail++; }
}

// ── RULES-1: the bug this session found. E41 wrote onboarding state onto the
// workspace document; workspace update is canAdmin(), i.e. owner only. Every
// non-owner was refused, which made the welcome splash undismissable.
await t("RULES-1a", "owner CAN update the workspace document", () =>
  assertSucceeds(updateDoc(doc(as(OWNER), "workspaces", WS), { name: "Renamed" })));
await t("RULES-1b", "editor CANNOT update the workspace document (E41's defect)", () =>
  assertFails(updateDoc(doc(as(EDITOR), "workspaces", WS), { onboardingState: { firstVisit: false } })));
await t("RULES-1c", "helper CANNOT update the workspace document", () =>
  assertFails(updateDoc(doc(as(HELPER), "workspaces", WS), { onboardingState: { firstVisit: false } })));
await t("RULES-1d", "viewer CANNOT update the workspace document", () =>
  assertFails(updateDoc(doc(as(VIEWER), "workspaces", WS), { onboardingState: { firstVisit: false } })));
await t("RULES-1e", "a DEPENDENT cannot update their own board's document either", () =>
  assertFails(updateDoc(doc(as(KID), "workspaces", DEP), { onboardingState: { firstVisit: false } })));

// ── RULES-2: where E41's state lives now. users/{email} is writable by its
// owner and by nobody else. This is the fix, asserted rather than assumed.
await t("RULES-2a", "a user CAN write their own profile (E41 state lives here)", () =>
  assertSucceeds(setDoc(doc(as(HELPER), "users", HELPER),
    { onboardingDone: true, onboarding: { hints: { dueDate: true } } }, { merge: true })));
await t("RULES-2b", "a dependent CAN write their own profile", () =>
  assertSucceeds(setDoc(doc(as(KID), "users", KID), { onboardingDone: true }, { merge: true })));
await t("RULES-2c", "nobody can write somebody else's profile", () =>
  assertFails(setDoc(doc(as(EDITOR), "users", OWNER), { onboardingDone: true }, { merge: true })));
await t("RULES-2d", "nobody can read somebody else's profile", () =>
  assertFails(getDoc(doc(as(EDITOR), "users", OWNER))));

// ── RULES-3: the catch-all hole that 1.2.1 closed. A narrow rule cannot take
// back what a broad one gave, so this stays tested forever.
await t("RULES-3a", "editor CANNOT rewrite the member list (the 1.1.1 hole)", () =>
  assertFails(setDoc(doc(as(EDITOR), "workspaces", WS, "members", EDITOR), { email: EDITOR, role: "owner" })));
await t("RULES-3b", "editor CANNOT add a new member", () =>
  assertFails(setDoc(doc(as(EDITOR), "workspaces", WS, "members", STRANGER), { email: STRANGER, role: "editor" })));
await t("RULES-3c", "owner CAN hand out a key", () =>
  assertSucceeds(setDoc(doc(as(OWNER), "workspaces", WS, "members", STRANGER), { email: STRANGER, role: "viewer", addedBy: OWNER, addedAt: Date.now() })));

// ── RULES-4: the four roles, as the README's table promises. If this section
// and that table ever disagree, the UI is a promise the server breaks.
await t("RULES-4a", "helper CAN work the list", () =>
  assertSucceeds(setDoc(doc(as(HELPER), "workspaces", WS, "tasks", "t-helper"),
    { title: "helper's", createdBy: HELPER, createdAt: Date.now() })));
await t("RULES-4b", "helper CANNOT change the setup (tiers)", () =>
  assertFails(setDoc(doc(as(HELPER), "workspaces", WS, "tiers", "tier-x"), { name: "Nope", rank: 1 })));
await t("RULES-4c", "editor CAN change the setup", () =>
  assertSucceeds(setDoc(doc(as(EDITOR), "workspaces", WS, "tiers", "tier-y"), { name: "Fine", rank: 2 })));
await t("RULES-4d", "viewer CANNOT write a task", () =>
  assertFails(setDoc(doc(as(VIEWER), "workspaces", WS, "tasks", "t-viewer"),
    { title: "nope", createdBy: VIEWER, createdAt: Date.now() })));
await t("RULES-4e", "helper CANNOT delete a task somebody else created", () =>
  assertFails(deleteDoc(doc(as(HELPER), "workspaces", WS, "tasks", "t1"))));
await t("RULES-4f", "editor CAN delete anything on the list", () =>
  assertSucceeds(deleteDoc(doc(as(EDITOR), "workspaces", WS, "tasks", "t1"))));

// ── RULES-5: isolation by path (E1). A stranger is ABSENT from the tree, not
// filtered out of it.
// ⚠️ USE OUTSIDER, NOT STRANGER. RULES-3c hands STRANGER a viewer key, so by
// the time execution reaches here they are a member and the assertion inverts.
// The first run of this suite failed exactly that way — a test that polices
// isolation must use an identity no other test has touched.
await t("RULES-5a", "an outsider cannot read the workspace", () =>
  assertFails(getDoc(doc(as(OUTSIDER), "workspaces", WS))));
await t("RULES-5b", "an outsider cannot read a task", () =>
  assertFails(getDoc(doc(as(OUTSIDER), "workspaces", WS, "tasks", "t1"))));
await t("RULES-5c", "an outsider cannot read the member list", () =>
  assertFails(getDoc(doc(as(OUTSIDER), "workspaces", WS, "members", OWNER))));

// ── RULES-6: item 7's write path. saveConfig() mirrors pollIntervalMinutes
// onto the workspace document, and 0.23.0 deleted that line. This asserts who
// is actually allowed to perform it — the answer shapes the import runbook.
await t("RULES-6a", "owner CAN write pollIntervalMinutes to the workspace doc", () =>
  assertSucceeds(updateDoc(doc(as(OWNER), "workspaces", WS), { pollIntervalMinutes: 30 })));
await t("RULES-6b", "EDITOR CANNOT — so an editor cannot run the import (E22a/E25 assumed they could)", () =>
  assertFails(updateDoc(doc(as(EDITOR), "workspaces", WS), { pollIntervalMinutes: 30 })));

// ── RULES-7: ownerEmail is the root of trust and is locked after creation.
await t("RULES-7a", "even an owner cannot rewrite ownerEmail", () =>
  assertFails(updateDoc(doc(as(OWNER), "workspaces", WS), { ownerEmail: EDITOR })));

const W = 10;
console.log("\n" + "─".repeat(78));
for (const [state, id, note] of results) console.log(`${state === "PASS" ? " ✓" : " ✗"}  ${id.padEnd(W)} ${note}`);
console.log("─".repeat(78));
console.log(`   ${pass} passed, ${fail} failed\n`);
await env.cleanup();
process.exit(fail ? 1 : 0);
