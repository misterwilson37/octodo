# TESTS — what still needs running

**Version 2.0.0 · current as of 2026-07-31 (Haliphron)**

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

## 🔴 Can lose data — open bugs, not tests

**UNSHARE-PARTIAL. A failed "bring it back" left the tier gone anyway.**
2026-07-31. A guest pressed *Bring it back to my board*, was told permission
was refused, and the tier was gone from the owner's board regardless.
**Partly fixed** — app 1.37.0 hides the button from non-owners and store
0.27.0 refuses the call before it copies anything, so this exact path is shut.
**Still open:** `deleteAll` commits in batches and only the batch is atomic,
so a large tier can still half-delete on a permission failure mid-sequence.
0.27.0 makes it *report* that honestly instead of promising "nothing was
lost"; it does not yet roll back.
→ **Needs one thing from Jake: the order you did it in.** See the note at the
bottom of this file.

**TIER-MEMBER-ROLES. Anyone on a shared tier can remove anyone, including the
owner.** Jake, 2026-07-31: *"we run into the problem that anyone can remove
anyone from a tier…even if they're the owner. Perhaps we need the same levels
on tiers that we have on boards."* Agreed and unbuilt. Boards have four roles;
tier membership has none.

**§0d. A tier change does not move the document** — and this is now confirmed
to compound. `collectTier` queries the SOURCE board only, so a document that
is already mis-routed is **invisible to every later share, unshare and
re-share**. That is almost certainly what happened to `gmail made I`.

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

## ⚠️ One question waiting on Jake

**UNSHARE-PARTIAL: what order did you do it in?**

Two sequences fit what you described, and they need different repairs:

1. Sumner unshared successfully first, and then gmail's attempt acted on a
   tier that had already moved — in which case the guest guard shipped tonight
   is the whole fix.
2. Gmail's attempt ran against a live shared tier, copied everything to Jake
   (personal), and got partway through deleting the originals before the rules
   stopped it — in which case documents are currently **split across two
   boards** and `deleteAll` needs a rollback, not just an honest error.

Screenshot 2 shows the tier now living in a board called *sumner vs gmail
(shared)* with id `Lvl9aAZnpcTwcD2dnnso` — a **different** board from the old
`Testing Tier (shared)` `Vzrwrof…`. So there was at least one re-share in
there, which is why I can't reconstruct it from the evidence alone.

**Run `whereis` from both accounts and send the two "Mis-routed documents"
tables.** With the rescan button that is now about fifteen seconds, and it
tells us whether anything is actually stranded.
