# `rules-test/` — automated tests for `firestore-2.0.rules`

**24 tests. First run green 2026-07-29 (Bimac, 16th instance).** This is the first automated test of any kind in this project.

---

## Why this exists

`HANDOFF-2.0.md` has said since rules 1.1.1 that *"the two rules bugs this project has shipped were both of a kind a three-line test would have caught."* A third then shipped anyway: E41 wrote onboarding state to the workspace document, which `canAdmin()` gates to owners only, so the welcome splash was undismissable for every helper, editor, viewer and dependent. Nobody found it for a full version because **a rules refusal is silent from the outside** — the write just doesn't happen.

The Firebase console **no longer has an inline Rules Playground**; its "Develop & Test" button only links to the Emulator Suite docs. So this is not a nice-to-have, it is the only remaining way to test rules at all.

---

## Running it

Requires Java (21 is fine) and Node.

```bash
cd rules-test
cp ../firestore-2.0.rules ./firestore.rules   # ⚠️ see "the copy problem" below
npm install
npm test
```

`npm test` starts the emulator, runs the suite against it, and shuts it down. Expect ~10 seconds and a table of ticks.

First run on a clean machine also needs the emulator jar (~138 MB), fetched once:

```bash
npx firebase setup:emulators:firestore
```

**In a Claude session:** this needs `storage.googleapis.com` on the egress allowlist, and the allowlist is baked into the session token at session start — so it works only in a conversation opened *after* that setting was changed.

---

## ⚠️ The copy problem

`firestore.rules` here is a **copy**. The rules that matter live in the Firebase console, and the repo's `firestore-2.0.rules` is already a second copy that has drifted before — it sat at 1.1.1, the version *with* the catch-all hole, while 1.2.1 was live.

So there are now potentially three. **Always `cp ../firestore-2.0.rules ./firestore.rules` immediately before testing**, and check the repo file's declared version against the console. A green test against a stale file is worse than no test, because it is confidently wrong.

---

## What is covered

| Group | What it pins down |
|---|---|
| **RULES-1** | Workspace-document update is **owner only**. Editor, helper, viewer and a dependent-on-their-own-board are all refused. *This is the E41 defect, now a regression test.* |
| **RULES-2** | `users/{email}` is readable and writable by its owner and nobody else. *This is where E41 state lives now — the fix, asserted rather than assumed.* |
| **RULES-3** | The 1.1.1 catch-all hole stays closed: an editor cannot rewrite the member list or add a member. |
| **RULES-4** | The four roles behave as the README table and the People tab promise. Helper works the list but cannot touch setup; helper cannot delete someone else's task; editor can. |
| **RULES-5** | Isolation by path (E1) — an outsider cannot read the workspace, a task, or the member list. |
| **RULES-6** | **An editor CANNOT write `pollIntervalMinutes` to the workspace document.** This mechanically confirms what §0a had only reasoned about: the E22(a)/E25 runbook step *"Katie adds Jake as editor and he imports"* **cannot work**. Either she grants Co-owner, or she runs `import.html` herself. |
| **RULES-7** | `ownerEmail` is locked after creation, even against an owner. |

---

## Writing more tests

`assertFails` / `assertSucceeds` wrap a promise and assert on `permission-denied`. Fixtures go in through `withSecurityRulesDisabled`, so seeding can never be blocked by the rules under test.

Two traps, both of which bit on the first run of this very file and are worth knowing before they bite you:

**1. `signedIn()` reads `token.email_verified`.** An auth context without that claim fails *every* rule, which means every "should succeed" test fails **and every "should fail" test passes for the wrong reason.** The first run reported 15 passing and was measuring nothing. Always:

```js
env.authenticatedContext(email, { email, email_verified: true })
```

**2. Tests share one database and run in order.** `RULES-3c` hands `STRANGER` a viewer key, so the isolation tests that followed were probing a *member*. They correctly failed. The isolation group now uses `OUTSIDER`, an identity no other test touches. **If a test grants access, no later test may use that identity as a negative control.**

---

## Standing instruction

**Run this whenever `firestore-2.0.rules` changes, and before publishing to the console — not after.** Add a test for every new clause; a collection with no clause is now *denied* (1.2.1 removed the wildcard), so a missing clause fails closed and loudly, which is the good direction but only if somebody is looking.
