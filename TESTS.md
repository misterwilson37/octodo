# TESTS — what still needs running

**Version 2.6.0 · current as of 2026-08-01 (Thaumoctopus)**

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
| **TOUR-** | The onboarding tours and hints. | TOUR-5, the Settings tour |
| **RULES-** | Firestore security rules, run in the emulator by Claude, not by Jake. | RULES-6b |

**And the two that are NOT tests, which is where most of the confusion came
from:**

- **D-numbers (D1–D143)** are Tentacalendar **1.x** changes. Historical. If
  you see D112 it means "the feature the clock came from," not a task.
- **E-numbers (E1–E41)** are **2.0** decisions and defects. E1 is the security
  model, E9 is provenance, E41 is onboarding. Also not tasks.
- **"item 1–9"** are the nine pieces of the 2.0 plan. Item 5 is shared tiers,
  item 7 is calendars, item 9 is the importer.

⚠️ **`E41-1`…`E41-7` are now `TOUR-1`…`TOUR-7`.** Jake, 2026-07-31: *"in
spite of the silly naming system for onboarding (e41? Really?)"* — right. E41
is a *defect number*, and naming tests after it broke the rule stated one
paragraph above. Same mistake as `0c-n`, made in the same document.

⚠️ **`0c-1`…`0c-7` were badly named and are now `STAGE-1`…`STAGE-7`.** They
were numbered after a *section of the handoff document*, which means nothing
outside that document — Jake, reasonably: *"How in the sam hell did you name
these things?"* A test id should say what it tests. **Do not name a test after
where it is written down.**

⚠️ **`whereis.html` 1.4.0 answers a lot of this list now.** Five tests —
TIER-6, TIER-7, SKIN-1, SKIN-2, BASE-7 — were written as *"open the Firestore
console, click into a document, eyeball a field,"* some of them from two
accounts. Every fact they need is now on one page from one sign-in. Where a
test says *→ `whereis`*, that is the cheap way to run it.

---

## ▶ START HERE — one ordered list, and it is the only "first"

⚠️ **Do not add a second "first."** This file once had two sections claiming
the top rank and MOVE-3 in both. One ordered list; the order is the answer.

⚠️ **IMPORT-1's dry run is WITHDRAWN, not deferred.** Jake, 2026-08-01: there
are no throwaway accounts and no re-shares to rehearse — **Katie's transfer is
the test**, and 1.x stays live so a failed import costs a wiped 2.0 board and
nothing else. Do not put it back. Handoff §0k.5 has the reasoning and the
super-admin wipe/export panel the plan now depends on.

---

### 1. RETIER-1. The stranded follow-up walks home.
Open **`and then this`**, re-pick tier **Work**, save. Re-scan `whereis` — the
✗ must be gone and the task must sit in `Jake (personal)` with its parent.
→ *store 0.29.1. `rehomeFor` fires on any edit naming a tier on another board,
so the repair is an ordinary save — MOVE-1's specimen fix in a new costume.*

### 2. RETIER-2. A whole chain moves and lands routable.
Make a task with a chained follow-up on a personal tier. Change the **parent's**
tier to the shared one. `whereis` from **both** accounts: parent *and* child on
the shared board, **no ✗**, and the child still has its own title and dates.
Then undo. Both come home together.
→ *⚠️ This is MOVE-3's other half and the regression test for 0.29.1: the child
used to arrive on the new board still pointing at the old board's tier. Covered
by `move.test.mjs` too, but only the browser proves the chain walk.*

### 3. DIRTY-2. The project form after a NEW project.
Add a project. Hard refresh. Click ✎ on a project as your **first** action —
no "unsaved changes". Then type in the name, click ✎ on a **different**
project — the prompt **should** appear.
→ *⚠️ Adding a project is load-bearing: `bestFreeColor()` changes its
suggestion when the colour set changes, which is what made this fail when
1.41.0's version of the fix passed. Both halves matter.*

### 4. MOVE-4b. Deleting a project still warns honestly.
Unchanged behaviour — re-run only to confirm 0.29.1 did not disturb it. The
confirm names the hours and no orphaned session is left.
→ *⚠️ **You do not like this behaviour and you are right** — see handoff
§0k.3. The soft delete is not built. This test asserts today's truth, not the
one you want.*

### 5. IMPORT-3. Calendar permissions do not travel. **Flip day.**
Every calendar re-shared with the 2.0 service account — inbound **and** the
outbound mirror.
→ *Not a rehearsal, a step. The export holds calendar IDs and cannot hold
calendar PERMISSIONS. Get it wrong and the tiers import perfectly and stay
empty forever: no error, no warning, nothing.*

### 6. IMPORT-2. Katie runs it herself, or gets Co-owner.
RULES-6b measured it: an editor cannot write `pollIntervalMinutes` to the
workspace document, so *"Katie adds Jake as an editor and he imports"* cannot
execute. She owns her board and needs nothing extra.

### 7. HURRAH-2. Re-ticking does not mint a second task.
Un-tick the hurrah, tick it again. **Still exactly one** follow-up task, and
the first is not deleted by the un-tick.
→ *`spawnedTaskId` guards this, and it is the same guard the completion-modal
version in §0k.4 will use. Worth knowing it holds before that is built.*

### 8. HURRAH-3. The field only shows on the hurrah.
Move the 🎆 to a different stage. `↳ +Nd` follows it, and the old row's value
is dropped rather than riding along on a stage that is no longer the climax.

---

## 🟠 New from the primary user's reports — unrun

**HURRAH-1. ⚠️ Mechanically passed, wrong placement — do not re-run.**
The spawn works. Katie wants the offer at the **moment of completion**, in the
same breath as "duplicate for next year," not only as a `↳ +Nd` decided when
the pipeline was built. Both, not either — the pipeline field stays. Handoff
§0k.4. **HURRAH-2 and HURRAH-3 moved to START HERE**, because the guard they
test is the one the new version will reuse.

**LATER-1** ✅ *Passed.* The duplicate lands in the collapsed **Later** group.
⚠️ Jake: *"I'm not sure Katie's going to love that it's there, but it's better
than it showing."* Filed as a reaction to watch, not a defect.

**LATER-2. ⚠️ SUPERSEDED — do not run.** It tested that a stage anchored
before the start keeps its project visible. Katie's correction (handoff §0h)
says such a stage should have left as a *task*, so the behaviour this test
protects is being removed. Left here so nobody re-derives it from the code.

**LABEL-1. The date range is whole on the TV.**
The year view's header should read the full range, with the Layout/Year/Bars
controls wrapping to a second row rather than eating it.
⚠️ **This will pass in Octodo and is still broken on Katie's screen.** Her
2026-08-01 screenshot shows `Jul 2026 – J…` truncated — because she is on
**1.x v1.21.0**, and the fix is in 2.0's css 0.58.0. Same for DASH-FILL.
Handoff §0j has the decision that follows from that; it is Jake's to make.

---

## 🔴 Still open — known, not yet fixed

**DELETEALL-ROLLBACK.** `deleteAll` commits in batches; each is atomic, the
sequence is not. store 0.27.0 made it *report* a partial delete honestly
instead of promising "nothing was lost." It still cannot put back what it
removed.

**TIER-MEMBER-ROLES.** Anyone holding a shared tier can remove anyone,
including the owner. Boards have four roles; tiers have none.

**DASH-FILL. ✅ Fixed in app 1.41.1 — moved to the fix-verification list
below.** The screenshot settled it: Katie runs **Timeline**, so the binding
ceiling was 34px, not the wall layout's 14px. ⚠️ **The wall/Annual and Months
layouts still have the ceiling** and were deliberately not touched — they
build a different DOM and need their own screenshot.

**AGENDA-ACTIVE.** *"Projects that are not currently active should not appear
in the daily agenda at all."* Partly served by Later; the full version is
deliberately unbuilt. Jake called the current rule temporary.

---

## 🟠 Blocks Katie moving to 2.0 — **moved to the top of this file**

IMPORT-1, IMPORT-2 and IMPORT-3 were here. They are now items **1, 2 and 3**
of START HERE, because Katie moves this weekend and the import has never
written to live Firestore.

**Left as a pointer rather than deleted outright,** because deleting a heading
somebody has been navigating by is how a reader concludes the tests were
dropped. Removing the *text* is the point — this is the file that just had two
copies of MOVE-3 in it.

---

## 🟡 Built but never seen working

### Shared tiers (item 5)

**TIER-4b. Re-run once §0d is fixed.** The pre-share half passed: a project
made on the tier before sharing came across with all its clocked work. The
failing half was a document that had already been mis-routed, so this is
really a §0d test wearing a TIER-4 label.



### Onboarding — the tours

**TOUR-1** ✅ *Passed.* New account → intro appears; reload → gone.

**TOUR-2. A guest on somebody else's board can dismiss the intro.**
Plain version: sign in as an account that has **no board of its own** — one
that only holds a key to someone else's — and check the intro **closes**. It
used to appear and refuse to close, because closing it tried to write to a
board the guest cannot write to. *Jake: "no idea what you mean" — that was a
fair complaint about the wording, not the test.*

**TOUR-3.** Nico on his own dependent board → intro dismisses.

**TOUR-4** ✅ *Passed.* Running a tour to the end closes clean.

**TOUR-5. Start the "add a tier" tour with Settings CLOSED.**
Step 2 must open Settings and point at **+ Add tier** — not at an empty screen
corner.

**TOUR-6. Dismissal is per person, not per device.**
Dismiss a hint on one board, check it stays dismissed on another.
⚠️ **Jake saw the intro again in a second browser, and liked it.** Worth
deciding rather than assuming: if dismissal is meant to be per-person it
should NOT reappear, so either the state is per-device or something is
writing it in the wrong place. **Not filed as a bug until somebody decides
which behaviour is wanted.**

**TOUR-7. ⚙️ → change the calendar poll interval → confirm the workspace
document changed too.** Item 7's regression test and the one that matters
most.

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

**2026-08-01, the second run.**

- **OFFDAY-1** — the off-day task is reachable in WAITING and checkable there.
- **MOVE-1, MOVE-2** — re-run to set up HURRAH; both passed again. **Bonus
  finding, and it is a feature working:** moving a project from a personal
  tier to the shared one *pulled its start date onto a working day.*
  Jake: *"Well done!"*
- **MOVE-4** — the delete confirm named the hours and did not lie. ⚠️ *Passed
  and the behaviour is wrong* — §0k.3.
- **DASH-FILL-1, 2, 3** — all three. *"The timeline resizes correctly no
  matter how silly I am with the resizing."*
- **LATER-1** — the plate clears.
- **DIRTY-1** — passed on the **task** form. Failed on projects → DIRTY-2.
- **MOVE-3** — the chain moved; the follow-up landed mis-routed → RETIER-2.

**2026-08-01.** Jake: *"Move 1 and Move 2 worked before."*

- **MOVE-1** — the specimen repair. `gmail made I` moved out of its tier and
  back, clearing the only live mis-route in the data.
- **MOVE-2** — a project took its clocked sessions across a board boundary.
  ⚠️ **Neither was ever written down**, because only the MOVE-3 *failure*
  produced a conversation (handoff §0i) and the passes did not. That is how
  this file came to say *"none of it has been run in a browser"* about tests
  that had. **A test that passes is a document edit, not just a relief.**
  `whereis` re-confirms MOVE-1 in one page load if you want it belt-and-braces
  — the ✗ on `gmail made I` should be gone.

**2026-07-31, the big sweep.** Jake ran most of the list in one sitting.

- **TIER-9** — the owner brings a shared tier back; it leaves the guest's app.
  *(The guest-side half became the UNSHARE-PARTIAL bug above.)*
- **TIER-10** — ⚠️ *the one that could have lost data.* A task made by one
  person, deleted by the other, then undone, **came back on both boards** and
  is still there in `whereis`. The tombstone map routes correctly.
- **TIER-6, TIER-7, TIER-8** — *"everyone keeps their own order! And their own
  colors! And their own stuff! Full success on all three."*
- **KEYS-2** — being invited to a board.
- **KEYS-4** — settings stay yours. *Jake wasn't sure how to test it; the
  answer is that it's the same independence TIER-6/7/8 demonstrated, so it
  passed with them.*
- **KEYS-5** — it remembers which board you were on.
- **KEYS-6** — a key can be taken back. *(Surfaced TIER-MEMBER-ROLES above.)*
- **SKIN-1** — colours and names are independent.
- **SKIN-2** — ⚠️ **passed, and the test was wrong.** See below.
- **BASE-7** — who did what is recorded. *When* is now shown too (whereis
  1.5.0 timeline), which was Jake's feature request, not a failure.
- **TOUR-1, TOUR-4** — the intro appears once and the tours close clean.
- **BASE-6, BASE-9, TIER-3, STAGE-3/4** — re-confirmed as standing checks.
- **STAGE-1…7** (2026-07-30) — the shared-project repair, all seven.
- **TIER-1, TIER-5, KEYS-1** — earlier passes.
- **RULES-1b…1e, RULES-6b** and 24 emulator tests — green against rules 1.2.1.

### ⚠️ SKIN-2 was written backwards, and Jake caught it

The test said per-user colours and names *"do not follow you between
devices,"* and told him to confirm that as expected behaviour. He opened a
second browser, his overrides **were** there, and said: *"Isn't that what I
want? Why in the world would I want a tier to be named one thing on one
computer and something else on another? If that's a bug, then I like the
bug."*

He is right, and the bug was in the documentation. The overrides live in
`users/{email}` **in Firestore**, so any fresh sign-in loads them — they
follow you everywhere. What does *not* happen is live sync between two
already-open tabs, because nothing subscribes to that document. The handoff
compressed "no live sync" into "does not follow you between devices," which is
a different and much worse claim.

**This is the fourth comment in this project found more confident than its
code**, after E41's, §0b's and `TIER_RANKS`'s. The pattern is always the same:
a true narrow statement gets restated as a broad one, and the broad one is
what the next person believes.

## What Claude runs, so Jake never has to

Both need Node, which Jake does not have and **should not need**. They exist
so they arrive in the repo for the next session, and they gate every drop.

| | |
|---|---|
| `node version-check.mjs` | Every banner, constant, `?v=` pin and the handoff version row. **This is what the amber ⚠️ on the app's version badge does in the browser** (app 1.36.0) — same check, no terminal. |
| `node stage-merge.test.mjs` | 34 assertions on the merge rule that decides whether somebody's finished work survives. Extracted live from `store.js`, so it cannot drift. Verified by sabotage: re-introducing the defect turns it red. |

---

## ✅ The unshare question is answered

Both scans came back on 2026-07-31 and they agree. **Nothing was stranded by
the unshare.** No tier, task or project is split across two boards, so the
guest guard shipped in app 1.37.0 / store 0.27.0 is the whole fix for that
path, and `deleteAll`'s missing rollback is a latent risk rather than an
active mess.

The two ✗ rows were something else entirely:

1. **`gmail made I`** — the §0d tier-change hole. Now fixed; MOVE-1 clears it.
2. **An orphaned session**, 8:02 PM, on a personal board, whose project
   `zybmi5sjq11uhBG9FFxq` reads *"not visible to you"* from **both** accounts
   that hold keys to that board. The project was deleted; its ledger was not.
   `deleteProject` deleted exactly one document and nothing else.

That second one is a bug nobody was looking for. It was found by a session
audit written to catch mis-*routing*, which is worth remembering the next time
a diagnostic seems to be reporting something boring.
