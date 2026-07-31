# TESTS — what still needs running

**Version 1.0.0 · current as of 2026-07-30 (Haliphron)**

This is the only list Jake needs. `HANDOFF-2.0.md` keeps the reasoning, the
history and the failure modes; **this file keeps the to-do**. When a test
passes it comes OFF this list — Jake, 2026-07-28: *"you could safely just
clean them out of the document when they're passed."*

---

## The name decoder — read once, never again

Seven numbering schemes accumulated in this project. Six are legitimate; one
was a mistake and has been renamed. Here is all of it:

| Prefix | What it is | Example |
|---|---|---|
| **BASE-** | Foundation. The security model and sign-in. | BASE-6, isolation |
| **KEYS-** | Sharing a whole **board** with somebody. | KEYS-2, being invited |
| **TIER-** | Sharing a single **tier**. This is "item 5". | TIER-9, unsharing |
| **STAGE-** | Two people on one project's stage pipeline. | STAGE-1, a tick surviving |
| **CAL-** | Google Calendar. This is "item 7". | CAL-8, per-person errors |
| **E41-** | The onboarding tours and hints. | E41-5, the Settings tour |
| **RULES-** | Firestore security rules, run in the emulator by Claude, not by Jake. | RULES-6b |

**And the two that are NOT tests, which is where most of the confusion came
from:**

- **D-numbers (D1–D143)** are Tentacalendar **1.x** changes. Historical. If
  you see D112 it means "the feature the clock came from," not a task.
- **E-numbers (E1–E41)** are **2.0** decisions and defects. E1 is the security
  model, E9 is provenance, E41 is onboarding. Also not tasks.
- **"item 1–9"** are the nine pieces of the 2.0 plan. Item 5 is shared tiers,
  item 7 is calendars, item 9 is the importer.

⚠️ **`0c-1`…`0c-7` were badly named and are now `STAGE-1`…`STAGE-7`.** They
were numbered after a *section of the handoff document*, which means nothing
outside that document — Jake, reasonably: *"How in the sam hell did you name
these things?"* A test id should say what it tests. **Do not name a test after
where it is written down.**

---

## 🔴 Can lose data — run these before trusting real work to a shared tier

Both are the same shape: they look fine on your screen and are wrong on
somebody else's. Neither has ever been run.

**TIER-9. Unshare gives everything back.**
🤝 ▸ *Bring it back to my board*. Everything returns to you, the tier's hidden
board disappears from the Firestore console, and the other person can no
longer see any of it.
→ *If it half-works, the documents that didn't come back are gone.*

**TIER-10. Undo puts things back on the right board.**
Delete a task on a **shared** tier, then undo it. Then open `whereis.html`
**as the other person** and confirm the task is there.
→ *Its failure is silent: the task looks correct on your screen and is gone
forever from theirs. This is the only test of the tombstone map.*
→ **`whereis` is now the better instrument for this than the console was** —
run it from both accounts and the task must appear in both.

---

## 🟠 Blocks Katie moving to 2.0 — which is the whole point of 2.0

**IMPORT-1. A dry run on a throwaway account.**
Export a scratch 1.x board, run `import.html` against a spare Google account,
walk the checklist. The importer is emulator-true against Katie's real
245-document export and **has never touched live Firestore**.

**IMPORT-2. Katie runs it herself.**
Not a preference — an editor physically cannot (RULES-6b, measured). On flip
day Katie either gets Co-owner or runs the import from her own account. She
owns her board and needs nothing extra.

**IMPORT-3. Calendar permissions do not travel.**
The tiers import perfectly and then stay empty forever, silently, until
somebody re-shares each calendar. Put this on the flip-day checklist.

---

## 🟡 Built but never seen working

### Shared tiers (item 5)

**TIER-4. The tier went across whole.**
After sharing, the projects on that tier came too — **and so did their clocked
sessions**. Open `whereis.html`: every project and session must show the
shared board, with no ✗. Then check the Time Report still totals the hours.
→ *Most likely to be half-done: sessions are matched to their projects
client-side.*

**TIER-6. Everyone keeps their own order.**
Reorder with ▲▼ (there is no number to type any more). Your order holds and
so does theirs.

**TIER-7. Visiting shows THEIR order, not yours.**
Rank the shared tier differently from them and **save yours last**, then visit
their board — it must show at their position.
→ *Saving last is the test. Run it the other way and the broken and fixed
versions both pass.*

**TIER-8. The merge rule.**
On someone's board: a tier you share **with them** is still there. A tier you
share with a **third** person must **not** appear.
→ *Nothing else tests the rule Jake corrected mid-build.*

### Sharing a whole board (item 4)

**KEYS-2. Somebody invites you to a board.**
They go ⚙️ ▸ People, enter your address, "Can edit", *Give them a key*.
Nothing for you to accept — reload and the chip appears.

**KEYS-4. Your settings stay yours.**
In their house you keep your view, your hidden tiers, your week layout.
Per-device, not per-board, deliberately.

**KEYS-5. It remembers where you were.**
Switch to Nico's board, reload, land back on Nico's. One reload is the whole
test.

**KEYS-6. They can take the key back.**
Removed in ⚙️ ▸ People → that board leaves your switcher on reload, and
opening it directly fails.

### Per-user tier colour and name (app 1.34.0)

**SKIN-1. Your colour, their colour.**
Recolour and rename a shared tier on your board. The other person still sees
the original. Settings shows a "shared as …" line with the canonical name.
→ *Known limitation, not a bug: nobody can rename a shared tier for everyone,
owner included. Owner rename-for-everyone is queued.*

**SKIN-2. It does not follow you between devices.**
Both maps hydrate once at sign-in. Sign in on a second device and the override
will NOT be there. **This is currently expected** — confirm it, so nobody
later reports it as a regression.

### Provenance (E9)

**BASE-7. All four stamps are landing.**
Firestore console ▸ `workspaces` ▸ your board ▸ `tasks` ▸ a completed task.
Want `createdBy`, `createdAt`, `completedBy`, `completedAt`.
→ *The stage half of this test is now covered by STAGE-1, which passed.*

### Onboarding (E41)

**E41-1** New Google account → splash appears once; reload → gone.
**E41-2** A viewer/helper on someone else's board → splash appears **and
dismisses**. *(This is the defect that shipped; it failed before.)*
**E41-3** Nico on his own dependent board → splash dismisses.
**E41-4** Run the `firstTask` tour to the end → "Done" closes cleanly, no
console error, splash does not return.
**E41-5** Start `firstTier` from a **closed** Settings → step 2 opens Settings
and highlights **+ Add tier**, not the screen corner.
**E41-6** Dismiss a hint on board A → still dismissed on board B.
**E41-7** ⚙️ → change the calendar poll interval → confirm the **workspace
document** changed too. *This is item 7's regression test and the one that
matters most.*

⚠️ **Also unfinished, and not a test:** the tours are unreachable for anyone
already signed in, because they only launch from a splash that shows once. A
row of buttons in Settings fixes it.

### Calendars (item 7)

**CAL-1…8** live in `SETUP-PHASE3-2.0.md` Part 6 as WW1–WW8. CAL-8 is new and
1.x could not have had it: the report must name more than one board, and one
person's broken calendar share must show as `error` on **their** row while
everybody else's is fine.

---

## 🔁 Standing checks — re-run after ANY data-layer change

These passed. They are here because they can regress without anybody noticing.

**BASE-6. Isolation.** A second account gets its own board with its own three
tiers and **cannot see Jake's tasks**.
→ *This is the entire security model. If it ever fails, nothing else on this
page matters.*

**BASE-9. You can sign in as somebody else.** After ⏻, sign-in must offer an
account list including *Use another account*.
→ *Regressing this makes every two-person test unreachable and looks like a
broken sign-out.*

**TIER-3. One document, two real people, live.** Both see one task and either
can toggle it.

**STAGE-3/4. One clock each.** A clocking in must not stop B's running timer.

---

## ✅ Passed — do not run again

- **STAGE-1…7** (2026-07-30) — the shared-project repair, all seven. A tick
  survives a colleague's stale reorder; a reorder cannot redirect a tick; the
  clocks are per-person; per-person and team totals both read correctly;
  a removed stage refuses rather than hitting its neighbour; legacy stages
  still work.
- **TIER-1** — a colleague invited Jake to a tier.
- **TIER-3** — moved to standing checks above.
- **TIER-5** — new work lands on the right board. **Answered permanently by
  `whereis.html`**, which audits every task, project and session against its
  tier's board from both accounts. Better evidence than the console poke this
  test originally asked for.
- **KEYS-1** — one key, no switcher. Confirmed by Jake's colleague.
- **BASE-6, BASE-9** — moved to standing checks above.
- **RULES-1b…1e, RULES-6b** and the other 24 emulator tests — green against
  rules 1.2.1. Claude runs these, not Jake.
- **Item 9 importer** — 18 emulator assertions green, including all 157 writes
  accepted by the rules. Still needs IMPORT-1 above against live Firestore.

---

## What Claude runs, so Jake never has to

Both need Node, which Jake does not have and **should not need**. They exist
so they arrive in the repo for the next session, and they gate every drop.

| | |
|---|---|
| `node version-check.mjs` | Every banner, constant, `?v=` pin and the handoff version row. **This is what the amber ⚠️ on the app's version badge does in the browser** (app 1.36.0) — same check, no terminal. |
| `node stage-merge.test.mjs` | 34 assertions on the merge rule that decides whether somebody's finished work survives. Extracted live from `store.js`, so it cannot drift. Verified by sabotage: re-introducing the defect turns it red. |
