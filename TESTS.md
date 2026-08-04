# TESTS — what still needs running

**Version 3.1.0 · current as of 2026-08-03 (Cirrothauma)**

> ⚠️ **EVERYTHING IN THIS FILE IS ALREADY LIVE.** There is no staging: Jake
> uploads each drop on receipt and GitHub Pages serves it immediately, so a
> test here is never a gate before release — it is a check on software Katie
> is already using. **Unrun does not mean unshipped.** Nothing on this list is
> waiting for permission; it is waiting for someone to look.

> 🔢 **THE 2.0.0 AUDIT DID NOT CHANGE THIS LIST, AND THAT IS THE POINT.**
> app 2.0.0 · store 1.0.0 · queue 1.0.0 shipped on 2026-08-02 after a
> file-by-file source read (handoff §0r). It removed six dead functions and
> trimmed one 191-line header; **no behaviour changed and nothing below got
> any closer to passing.** A major version number is a statement about code
> that has been *read*. Every item here is still a statement about code that
> has not been *run*. Do not let the first be mistaken for the second.
>
> One item was added by the audit and it is not a browser test — see
> **RULESTEST-1** under 🔴 Still open.

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

### 1. ⚠️ OUTRIDER-SWEEP. The migration has not been run, and it is the point.
`octodoOutriders()` for a dry run that writes nothing; `octodoOutriders({go:1})`
to apply. **Read the dry run first.** Once per board. Needs store 1.2.0.
→ *Ticked stages become COMPLETED tasks keeping their original date and owner.
`[no sid yet]` on imported stages is expected — 1.2.0 stamps them. Handoff §0s.*

### 2. OUTRIDER-1. Does the −14d engagement letter behave once swept?
The acceptance test for the whole feature. After the sweep, on a project with a
stage anchored before its start: the stage is gone from the pipeline, a task
exists on its computed day, the project shows `0/3` not `0/5`, and **the project
does not appear until its window opens.**
→ *⚠️ That last part is likeliest to be wrong — `isLater` was changed to measure
`startDate` in the same drop. Too early = the horizon is measuring something
else. Wrong day = `allowedDays` never reached the predicate.*

### 3. SAVE-2. The guard still guards.
Change something, hit **✕** instead of Save. It must still warn. Then Save,
reopen, and ✕ immediately — **no** warning that time.
→ *A save that clears the dirty flag without saving is worse than the bug.
⚠️ Not yet re-run since SAVE-1 was fixed, and SAVE-1's fix touched the same
save path — this is now a regression test, not just an unrun one.*

### 4. SAVE-3. The healed project type stays healed.
New in 2.1.1. After one successful save: reopen Settings → **Pipeline** — the
imported pipeline is listed and renameable. Then **New project** → its name is
in the dropdown, and picking it **actually applies its stages**.
→ *⚠️ The dropdown half is the part nobody would have reported: an id-less type
rendered `value="undefined"` and fell through to the default template silently.
Confirm the stages really arrive, not just that the name appears.*

### 5. SOFTDEL-1. The record survives the ✕. **The point of §0k.3.**
Clock some time on a project and tick a stage. ✕ it. Then: **a)** it is gone
from the timeline, the agenda and the project pane; **b)** Settings → Time
Report **still counts those hours**, under the project's real name and not
"another project"; **c)** the CSV export still names it; **d)** ↶ undo puts it
straight back with its sessions and ticks intact.
→ *⚠️ (b) is the assertion that matters. If the name reads "another project",
a ledger surface is reading `S.projects` instead of `S.projectsAll` — handoff
§0u's table says which is which.*

### 6. SOFTDEL-2. It stays gone across a reload, and comes back on demand.
✕ a project, hard refresh — still gone, still counted in the report. Then
console: `octodoBinned()` lists it with its id and who removed it;
`octodoBinned("<id>")` restores it.
→ *⚠️ There is no restore screen yet and the confirm dialog does not claim one.
If you want Settings → Data, that is the next slice — say so.*

### 7. SOFTDEL-3. Katie's side of the fear.
On a **shared** tier: Jake ✕ a project Katie has logged hours against. Her
hours are still in **her** Time Report, credited to her.
→ *⚠️ This is the actual requirement — "John can be pissed at Susan and delete
a whole project worth of work (and credit!)". Nothing else on this list tests
the shared case.*

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

## ✅ SAVE-1 — SOLVED 2026-08-03 (app 2.1.1 · import-transform 1.0.2)

**It was never about tier days.** Jake typed the toast out by hand:
*"Function setDoc() called with invalid data. Unsupported field value:
undefined (found in document workspaces/…/settings/projectTypes)."*

`import-transform.js` synthesised one project type out of the 1.x anonymous
stage template and gave it **no `id`**. Every type minted in the Pipeline tab
carries a `pt_…` id; that one had none. `openSettings` copies the library into
a draft as `{ id: t.id, … }` → `id: undefined`, and `setDoc` refuses an
undefined field value outright.

**Why it looked like the tier tab.** The draft is assembled when Settings
OPENS and written on EVERY save regardless of which tab was touched. Changing
a tier's days was the occasion, never the cause — which is why four theories
died against the code and a fifth guess would have too.
⚠️ **"Some of it may have gone through" was accurate**: `saveStageTemplate`
runs first and succeeds, then `saveProjectTypes` throws.

**Also silently broken by the same missing id:** the New Project selector
rendered `value="undefined"` for that pipeline, and picking it matched nothing
and fell through to the default template with no error. Nobody reported it
because it looked like a slightly wrong default rather than a failure.

**Fixed in two places on purpose.** app.js mints an id for any type lacking
one, so **the stored document heals on the next successful save** — Katie's
board is already imported and a fix to the importer cannot reach it. The
importer is fixed too, for boards that have not been imported yet.

→ *⚠️ VERIFY: open Settings, change anything, Save. It should close silently.
Then open Settings again — the Pipeline tab should list the imported pipeline,
and New Project's dropdown should offer it and actually apply its stages.*

---

## 🔴 Still open — known, not yet fixed

**OUTRIDER-SWEEP. ⚠️ THE MIGRATION HAS NOT BEEN RUN, AND IT IS THE POINT OF
THE FEATURE.** *Jake's job — console, once per board.* app 2.1.0 turns stages
anchored outside a project's window into tasks, but only for projects created
or edited SINCE. Katie's existing projects still hold theirs.
→ *`octodoOutriders()` for a dry run that writes nothing and lists every stage
that would move; `octodoOutriders({go:1})` to apply. **Read the dry run
first.** Ticked stages become COMPLETED tasks keeping their original date and
owner. ⚠️ **The dry run will flag NO SID on most or all imported stages — that
is expected and store 1.2.0 stamps them during the sweep.** Under store 1.1.0
it would have skipped every imported project instead; if you are somehow still
on 1.1.0, do not run it. Handoff §0s.*

**OUTRIDER-1. Does the −14d engagement letter behave once swept?** *Jake's
job — the acceptance test for the whole feature.* On a project with a stage
anchored before the start: after the sweep, the stage should be gone from the
pipeline, a task should exist on its computed day, the project should show
`0/3` rather than `0/5`, and the project itself should NOT appear until its
window opens.
→ *⚠️ The last part is the one most likely to be wrong: `isLater` was changed
to measure `startDate` again in the same drop. A project appearing too early
means the horizon is being measured against something else; a task appearing
on the wrong day means `allowedDays` did not reach the predicate.*

**RULESTEST-1. ⚠️ `rules-test/import.test.mjs` cannot run as documented.**
*Claude's job, not Jake's — it needs Node, the emulator and the egress
allowlist.* Two independent breaks: it imports `./import-transform.js` from
inside `rules-test/`, where no such file exists (the README documents copying
the **rules** file in and never mentions the transform), and `package.json`'s
`test` script invokes `rules.test.mjs` **only**. So the 18 assertions that
`import.html`'s own header cites as proof of the migration path have plausibly
never executed.
→ *⚠️ **Katie's 245-document migration succeeding is not this test passing.**
Both facts are real and they have been talked about interchangeably. The fix
is small — copy the module in alongside the rules file, add a script — and it
was deliberately left undone by the audit that found it, because it needs a
green run to verify rather than merely a correct-looking edit. Handoff §0r.5.*

**DELETEALL-ROLLBACK.** `deleteAll` commits in batches; each is atomic, the
sequence is not. store 0.27.0 made it *report* a partial delete honestly
instead of promising "nothing was lost." It still cannot put back what it
removed.

**HARDDEL-RULES. ⚠️ The rules still permit the destructive delete.** *Claude's
job — needs the emulator.* app 2.2.0's ✕ no longer calls `deleteProject`, so
the exposure is much smaller, but §0k.3 wants the hard delete to be an owner's
verb and that is a rules change. **Rules changes run through `rules-test/`
before the console** (1.2.0/1.2.1's lesson), and the emulator was not reachable
when soft delete shipped. **Do not record §0k.3 as fully closed until this
lands.** Handoff §0u. ⚠️ Do this together with TIER-MEMBER-ROLES below — same
file, same test run.

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
### ✅ Passed 2026-08-03 (Jake, two sittings)

**The 2.0/2.1 acceptance run. Everything here is confirmed by the primary
users and is OFF the list — do not re-run without a reason.**

- **HURRAH-4** — the follow-up offer on a real finished project. *"a win!"*
- **HURRAH-5** — no leak between projects. *"a win!"*
- **TOUR-REPLAY-1** — *"tour replay is a go!"*
- **DATE-1** — *"date 1 is great!"* The label stopped stacking three deep.
- **HEADER-1** — *"header 1 is a-okay!"* Two rows, right order.
- **SAVE-1** — ✅ **SOLVED**, see below. Settings save: *"hip hip!"*
- **TIMING-1** — the Timing pane is readable.
- **TOUR-1** — the 11-step tour reaches the moneymaker. ⚠️ *Jake: "it skipped
  the opening screen." **That is correct behaviour, not a miss.** The welcome
  splash is `showWelcomeSplash()`, which returns early once
  `onboardingState().splashDone` is set — once per PERSON, not per board. The
  replay buttons call `startTour(tourId)` directly and deliberately do not
  re-show it. Only a fresh account sees the splash again.*
- **RETIER-1 / RETIER-2** — the stranded follow-up walked home; a whole chain
  moved and landed routable, and the follow-ups materialised when their
  parents were checked off (D4, working as designed).
- **DIRTY-2** — *"dirty 2 is clean."* The project form after a NEW project.
- **FIT-1, FIT-2, TRAY-1** — *"all look good."* Katie's phone in one tap.
- **IMPORT-2, IMPORT-3** — *"Import is rocking!"* Katie ran it herself, the
  calendar synced afterwards, and the permissions directions were followed.
- **HURRAH-2** — *"allows me to make a second task if I choose to, but it does
  not automatically make one the second time."* ⚠️ That is exactly the
  `spawnedTaskId` contract: the guard blocks the automatic re-mint, and a
  deliberate second task stays possible. Passed.

**⚠️ MOVE-4b — behaviour unchanged, and Jake: *"still not what I want."***
Not a regression and not a new finding: the test asserts today's truth and
Jake dislikes today's truth. **The fix is the soft delete (handoff §0k.3),
which is not built.** Do not re-open this as a bug; build §0k.3 or leave it.

---

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
