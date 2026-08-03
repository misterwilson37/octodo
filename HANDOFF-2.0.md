# HANDOFF-2.0.md — Tentacalendar 2.0 (the Octodo line)

**Document version 0.24.0** · Last updated 2026-08-02

| | |
|---|---|
| **Versions** | app 2.1.0 · store 1.1.0 · queue 1.1.0 · celebrate 0.2.0 · config 1.2.0 · import-transform 1.0.1 · css 0.59.4 · html 0.51.19 · import.html 1.0.1 · whereis.html 1.5.0 · rules 1.2.1 · functions 1.3.1 · stage-merge.test 1.0.0 · move.test 1.1.0 · outrider.test 1.0.0 · version-check 1.7.0 · manifest 0.2.0 |
| ⚠️ **THERE IS NO STAGING** | **Handing Jake a file IS deploying it.** He uploads each drop to the GitHub web portal as it arrives; Pages serves `main`; the app is live at that moment. There is no review branch, no soak, no staging URL. **Anything in this repo is what Katie is running right now.** See the box below — this cost a whole session of wrong advice.
| **Passing** | BASE-1…6, 8 · KEYS-3, 7, 8 · **TIER-1, 2, 3, 5** |
| **Next** | ⚠️ **DEPLOYED ≠ EXERCISED, AND BOTH ARE TRUE OF EVERYTHING HERE.** Every file is live and Katie used the app all day; `TESTS.md` START HERE still holds 20 items nobody has deliberately walked. **SAVE-1 first** — an unexplained crash that is now merely *visible*. Then §0k.3 soft delete, §0k.5 super-admin wipe/export, §0h outriders. |
| ✅ **Katie is on 2.0** | Migrated 2026-08-02, 245 documents, one run, no rehearsal. She has used it all day and filed four reports (§0n). 1.x remains live and untouched as the fallback. |
| **Unrun and can lose data** | **TIER-10** — undo a delete on a *shared* tier. |
| 🔢 **THE VERSION NUMBERS CHANGED SHAPE** | **app 1.46.0 → 2.0.0, store 0.29.1 → 1.0.0, queue 0.21.0 → 1.0.0**, on Jake's sign-off, 2026-08-02. Not a rewrite and not a feature — a declaration that these files run a real person's day. **Nothing about their behaviour changed in that drop.** `css`, `html` and `manifest` deliberately stayed 0.y.z; that is Jake's call to make and he has not made it. §0r. |
| ⚠️ **OUTRIDERS ARE BUILT; THE SWEEP IS NOT RUN** | app 2.1.0 / store 1.1.0 / queue 1.1.0 shipped §0h. **Katie's existing projects still hold their outrider stages until somebody runs `octodoOutriders({go:1})` from the console, once per board.** Dry run first — it writes nothing. §0s. |
| 🔍 **The 2.0.0 audit is §0r** | A file-by-file read, not a test run. Six dead functions removed, one header trimmed 191→57 lines, **and one wrong finding caught before it shipped.** Read §0r before trusting any "X is unused" claim in this document. |

### ⚠️ Three things to do before you write a line

**0. `TESTS.md` is the test list. `node version-check.mjs` and
`node stage-merge.test.mjs` both gate every drop, and BOTH ARE FOR YOU, NOT
FOR JAKE** — he has no CLI on a school-managed Mac and should never be told to
run one. Commit them; run them yourself. The browser-facing half of
version-check now lives in the app's version badge (1.36.0).

**1. `node version-check.mjs`.** It EXISTS NOW (Haliphron, 2026-07-30). Six
files had instructed the reader to run it since 2026-07-29 and it had never
been written — every one of those warnings was prose wearing a command's
clothes, which is the exact failure they were written to stop. Before handing
Jake anything. Every file
carries its version twice — a banner and a constant — and they have drifted
**four times**. The last drift cost a deploy: Jake opened `store.js`, saw the
version he already had, and reasonably concluded nothing had been sent, so a
routing fix he was waiting on sat unshipped for a session. Prose warnings failed
three times; this is the same warning as a thing that fails.

**2. Headers are short now — keep them short.** They had grown to 296 lines in
`store.js` and **949 in `app.js`**, which put each banner ~900 lines from its
constant. History moved to `CHANGELOG.md`; each constant now sits on the line
directly below its banner. **Do not start a new changelog in a header.**

**3. `whereis.html`, not the Firebase console,** for any "where does this live"
question. The console's subcollection list is a sample, not an inventory — it
showed `members, settings` for boards that demonstrably held tiers and tasks,
and two lines of investigation were wasted trusting it.

> ⚠️ **CHECK WHICH MODEL YOU ARE BEFORE A STRUCTURAL SESSION.** The 15th instance was Haiku, on a 340KB app with a 90KB handoff it did not open. The failure was not one bad edit; it was plausible-looking work at every level at once. If you are a small model and the task is "add a subsystem to this app," say so and ask for a bigger one.

## 0a. WHERE JAKE ACTUALLY IS, end of 2026-07-27

**Read this before anything else. It is the difference between resuming and re-deriving.**

| Thing | State |
|---|---|
| Firebase project, index | ✅ Done. Collection-group index on `members.email` created. |
| **Rules** | ✅ **1.2.1 published and live.** Four roles; catch-all removed. |
| Web app | ✅ Deployed and in daily-usable shape. Jake and Nico both sign in; boards, switcher, People, dependent workspaces all work. |
| **`firestore-2.0.rules` in the repo** | ⚠️ **WAS STALE AT 1.1.1 — the version WITH the catch-all hole — while 1.2.1 was live in the console.** Jake pasted 1.2.1 into the repo on 2026-07-28. **Check this file's declared version against the console every session;** a rules file that lives in two places is a rules file that will disagree with itself, and the stale copy is the one a new instance reads and believes. |
| **Repo vs. latest drop** | ⚠️ **STALE — the current drop is app 1.33.0 · store 0.24.0 · html 0.50.0 · css 0.55.1 and is NOT PUSHED.** The row below is the state this table was written at and is kept for the warning it carries: **app 1.31.0 · store 0.22.0 · css 0.54.0 · html 0.48.2.** ⚠️ **FIVE drops went out in one session:** 1.29.0/0.21.0/0.47.0 and 1.29.1/0.21.1/0.47.1 both preceded this one and are SUPERSEDED, not equivalent. Check the badge against this row before believing any bug report from that day. **Verify with the version badge, don't assume:** hover the version in the header, compare against the banner at the top of this file. Anything lower means the web files need re-uploading. `store.js`, `queue.js`, `celebrate.js`, `config.js` were NOT touched this session. |
| Cloud Run function | ✅ **1.3.0 live, and `?job=fixtags` has been run.** |
| `POLL_SECRET` / `TZ` | ✅ Both set and verified by a live curl. |
| Calendars connected | ✅ Jake's are connected and a mirror calendar exists. |
| **Cloud Scheduler** | ✅ **Created and firing.** Confirmed running at 18:07 on 2026-07-27, on schedule. Item 7 is closed. |
| **Rules emulator** | ✅ **USED, 2026-07-29. `rules-test/` is in the repo: 24 tests, all green against rules 1.2.1.** This is the project's first automated test of anything. `cd rules-test && npm install && npm test`. ⚠️ It tests a COPY — `cp ../firestore-2.0.rules ./firestore.rules` before every run, and check that file against the console. Java 21 and the egress allowlist are both already in place; the allowlist is baked in at session start, so it only works in a conversation opened after that setting changed. |
| Katie | ❌ Has never signed in to Octodo. Still on 1.x, by choice. |
| **Item 5 — shared tiers** | ✅ **BUILT, AND PROVEN BETWEEN TWO REAL PEOPLE.** A colleague shared a tier with Jake; both saw the same document and toggled it live (TIER-3). No rules change was needed. **TIER-4…10 still unrun** — including the two that can lose data. ⚠️ **The mis-routing bug is fixed in store 0.24.0 and NOT YET PUSHED — §0b. TIER-5 and TIER-10 are the tests that prove it; run them first.** |
| **TIER-5** | ✅ **PASSED 2026-07-29, AFTER store 0.24.0.** `whereis.html` from Jake's account shows every task in the `sumner vs gmail` tier sitting in `Testing Tier (shared)` regardless of which account typed it — including `Personal made & work deleted II`, a deliberate re-run of the exact repro that stranded the original. No task is flagged mis-routed. **The routing fix is verified in a browser, not just in code.** TIER-10 (undo lands on the right board) is still unrun on a SHARED tier; `Test delete and undo.` exercised it on a personal one, which does not test the tombstone map. |
| **The stranded task** | ⚠️ **STILL STRANDED.** `Personal made & work deleted` sits in gmail's personal board with its tier in the shared board. 0.24.0 stops NEW ones being created; **it does not move the existing one.** Delete it and retype it, or leave it as the specimen — but do not read it as evidence the fix failed. |
| `import.html` (item 9) | ❌ Not written. **The last thing before Katie moves.** |

### The two things Jake named as the road to 2.0, in his order

He set the order himself on 2026-07-27: **rules → shared tiers → import**, on the reasoning that rules were "most likely to bite us if we wait." Rules are done.

1. ~~**Item 5 — shared tiers.**~~ **BUILT 2026-07-28 (5a).** The plan in this row turned out to be exactly right and was followed to the letter: the work was all in `store.js`, the resolution is a runtime `docId → wsId` map, and **`app.js` gained no knowledge that more than one workspace exists.** Details in §3a. What is NOT built is 5b — the activity feed and kudos on a shared tier (that is item 6 anyway), and a role picker.
2. **Item 9 — import.** The last thing before Katie moves. ⚠️ **Re-check the collection list in rules 1.2.1 first.** The wildcard is gone, so if Katie's 1.x export carries a collection that has no clause, the import is denied. Loudly, which is the point — but find out before flip day, not during it.

**On who runs the import.** The runbook and E22(a)/E25 say Katie adds Jake as an *editor* and he imports. That fails: writing `pollIntervalMinutes` and `nextPollAt` to the **workspace document** needs role `owner`, and an editor doesn't have it. Either she gives him **Co-owner** (the option already exists in the People dropdown), or — simpler — **she runs `import.html` herself**, since she owns her own board and needs nothing extra. Costs her one more minute on flip day and no permission choreography.

**Nico's board is still named `nico.m.wilson`** (created before the E38 rename fix). Settings → People → Rename fixes it once the web files are current.

**Minor, unhurried:** `POLL_SECRET` and the service URL appear in the 2026-07-27 chat log. Nothing there reads tasks or calendars; the exposure is that someone could force-run the sync and see workspace names and the mirror calendar id. Two-minute env-var edit plus a Scheduler header update. Not urgent.

### 0b. THE TIER MIS-ROUTING BUG — FIXED, store 0.24.0 (Hapalochlaena)

**Was:** a task typed into a shared tier landed on the author's own board. It
resolved, drew, and was invisible to the person it was for — writing to your own
board is always permitted, so nothing reported a problem.

**Cause:** both board resolvers ended `|| ws()`, falling back to the ACTIVE
board when the ownership map had no entry. **The previous handoff named only
`wsOfTier`; `wsOf` had the same fallback and is worse — `restoreDoc` routes
through it with `setDoc`, which CREATES.** That was TIER-10's data-loss case.

**Fix:** both throw `octodo/unrouted`; every creator stamps the id it mints
(a guess had been standing in for a stamp); `app.js` catches refusals globally
because nearly every store call here is a bare `.then()`. Full detail in the
`store.js` router comment — read that, not this.

✅ **TIER-5 PASSED in a browser 2026-07-29.** `whereis.html` shows every task in
the shared tier on the shared board, including a deliberate re-run of the
original repro. **TIER-10 (undo on a SHARED tier) is still unrun.**

⚠️ **Root cause never established, and I did not pick one.** §0a offered two
candidate races; `_where` is never pruned, which makes both self-healing *for
routing* and argues the bad write came from a path that mints or resurrects an
id — a follow-up chain, a recurrence spawn, or an undo — rather than the tier
picker. **Hypothesis, not a finding.** The fix holds under all three.
`window.octodoWhere()` answers it in one console call if it recurs.

**Also fixed:** `saveTier`'s catch swallowed everything and blamed permissions;
a latent `rank: undefined` that would have landed in that catch; `trackShared`
updating `hidden` without recomputing the merge; `tierChip` black-on-black;
role dropdown descending.

⚠️ **The stranded task is still stranded.** 0.24.0 stops new ones; it does not
move the old one. Delete and retype it.

---

### 0c. SHARED PROJECTS — THREE DEFECTS FOUND BY USING IT (app 1.35.0 · store 0.26.0)

**All three are the same shape: item 5 made a board hold more than one
person, and code written when a board WAS one person kept running.** None was
findable by reading; all three came out of Jake driving two accounts against
one shared project on 2026-07-30, which is the third time that method has
beaten a code review on this project.

**⚠️ Defect 1 — THE STAGE EDITOR ATE THE OTHER PERSON'S TICKS. Data loss, in
ordinary use, on the flagship feature.** `setProjectStages` wrote the caller's
array verbatim, and app.js builds each row from a snapshot taken when the
MODAL OPENED. So every stage your colleague ticked while you had the pipeline
editor open was written back un-ticked. **Observed: both accounts read 4/8 and
the four were different stages.** The later reorder won and silently discarded
the other person's completions.

Fixed by splitting authority, which is unambiguous because *the editor has no
completion control on it* — `.st-name`, `.st-dir`, `.st-anchor`, `.st-off`,
`.st-hurrah`, nothing else. It therefore never has a legitimate opinion about
`completedAt`, and any it carries is stale by construction:

> **The editor owns SHAPE. The server owns COMPLETION.**

`setProjectStages` re-reads at write time and takes completion from the server
for every stage still present there. A stage the server does not have is
genuinely new — or is being restored by undo after a delete — and there the
caller's value is the only one in existence. It returns `reconciled`, and
app.js tells the user when it had to keep somebody else's ticks. **Last-write-
wins for order is deliberate and Jake parked it; nobody loses a tick either
way.**

**Defect 2 — STAGES HAD NO IDENTITY.** Every stage write addressed a stage by
POSITION, which is a bet that nothing reordered between the render that drew
the checkbox and the click that ticked it. On a shared project that bet is
off. Stages now carry `sid`, minted by `stampNewStages` and backfilled by
`ensureSids` on any array write. **It rides through renames and reorders for
free** because the editor rebuilds each row by spreading the ORIGINAL stage
object — the drop-list decision made for `completedBy` paid for this too.
`resolveStage()` **refuses** when a sid is supplied and missing rather than
falling back to the index: hitting a neighbouring stage is worse than hitting
none. Surfaced by `isStageGone` through the same global handler as
`isRouteError`.

**Defect 3 — ONE CLOCK PER BOARD, NOT ONE PER PERSON.** `openSessions()`
queried the whole merge set for `end == null` with **no `createdBy` filter**,
so clocking in closed your colleague's running timer, and `openSessionNow()`
in app.js drew *their* timer as YOURS with a ⏹ that would have stopped it from
your screen. D112's "at most one open session" was always meant to be one per
PERSON; it only looked like one per board because a board used to be one
person.

⚠️ **The `createdBy` filter is applied CLIENT-SIDE on purpose.** A second
equality clause in the query would want a composite index, an index is a
deploy step, and a deploy step nobody runs is a bug that ships (see rules
1.2.0/1.2.1, published without the tests). The open-session set is a handful
of documents.

**Jake's rule, and it is the design now:** *"if I spend 30 hours on a project
and my colleague spends 1, that's a very different thing than both of us
spending 31 hours on it."* `projectClockedMs` returns `{mine, team}`; the
badge reads `Σ 1h / 31h` only when somebody else has logged time, so a solo
project reads exactly as it always did. **The time report still rolls up
everyone** — that is the billable-hours surface — and `sessionsToCSV` already
emitted `createdBy`, so "who" was always recoverable from the export.

✅ **ALL SEVEN PASSED, 2026-07-30, two accounts.** The repair works. The
tests are recorded in `TESTS.md` under their proper names (`STAGE-1…7`) and
STAGE-3/4 have been promoted to standing checks, because "one clock each" can
regress the moment anything touches the session layer.

| id (now STAGE-n in TESTS.md) | test |
|---|---|
| 0c-1 | Two accounts, one shared project. A ticks stage 3. B — **with the pipeline editor already open** — reorders and saves. **A's tick survives, and B is told it was kept.** This is the data-loss case. |
| 0c-2 | B reorders while A's project card is on screen; A then ticks a stage. The tick lands on the stage A clicked, or refuses by name — never on its neighbour. |
| 0c-3 | A clocks in. B's screen shows **no running timer** and B's ⏱ button is available. |
| 0c-4 | B clocks in while A is still running. **A's clock keeps running.** Both appear in `whereis` sessions with different `created by`. |
| 0c-5 | Both log time on one project. Each card reads `Σ <yours> / <total>`; the totals differ per account and the team half matches. |
| 0c-6 | Delete a stage on B while A has it on screen; A ticks it. A gets "no longer in this pipeline", not a silently mis-aimed write. |
| 0c-7 | Legacy check: a project whose stages predate `sid` (any project made before 0.26.0) still ticks and reorders normally, and gains sids on the first save. |

---

### 0c-bis. WHAT HALIPHRON DID WHILE NOTHING WAS UPLOADED

Jake stepped away with §0c written but **not yet in a browser**. The safe work
in that window is not "more features" — a second untested subsystem stacked on
the first is how a session ends with two suspects instead of one. It is
**raising confidence in the drop that already exists**, and making the tests
in it cheaper to run.

**1. A bug found by reviewing, not running (app 1.35.1).** A refused stage
tick left the checkbox visually ticked. The checkbox flips itself — browser
default — and when store.js refuses the write, nothing is written, so no
snapshot arrives, so `render()` is never called. **The one screen whose job is
to say what is done was able to show a state that never reached the server.**
Both the local catch in `onStageToggle` and the global backstop now repaint.

**2. `node stage-merge.test.mjs` — 34 assertions, no dependencies.** The merge
rule decides whether somebody's finished work survives, and it was born
un-runnable: three awaits deep inside a network call. `mergeStages` is now a
pure function (store 0.26.1, behaviour byte-identical) and the harness
**extracts it, `ensureSids` and `resolveStage` from the real store.js source
by a brace-matching scan** — it cannot drift from what ships, and if the
extraction fails the run fails loudly.

⚠️ **It was verified by sabotage.** Re-introducing the original defect — write
the caller's completion verbatim — turns 34/0 into 28/6, and the first failure
reads *"A's tick SURVIVES B's stale save."* A suite that has never been seen
to fail is decoration. Do that again to any rule added here.

**3. whereis 1.3.0 — evidence instead of eyeballing.** `4/8` is the wrong
shape of evidence for this bug: it was **identical on both screens while the
data disagreed**. Projects now expand to per-stage name / tick / who ticked it
/ sid, so two accounts can be diffed line by line, and a new table breaks
project time down by person so `Σ 1h / 31h` can be checked against something
other than itself. Stages with no `sid` are flagged `pre-0.26.0` — watching
one gain a sid on first save is the cheapest possible check that the backfill
works on real data.

**Upload order matters, and only for one reason.** `whereis.html` is loaded by
URL and pinned by nothing, so it can go up alone and be run against the
CURRENT live data before anything else changes. **Do that first**: it captures
the before-picture of the four stale-order stages while the defect is still
live. Everything else is an ordinary drop.

---

### 0c-ter. THE BADGE NOW CHECKS ITSELF (app 1.36.0 · css 0.57.0)

D130 has watched for new deploys since 1.x, and it watches **one stamp** —
`index.html`'s `data-html-version`. That catches an ordinary deploy and is
blind to the thing that cost 2026-07-30 an evening: **a `?v=` pin left
pointing at the version before the one on the server.** index.html is never
cached, so it loads fresh and then asks the browser for a URL the browser
already holds. The fix is live on the server; the tab runs the old code;
nothing says so.

`checkDeployedVersions()` fetches **every module's banner from the server**
with the cache bypassed, reads only the first chunk (so it is not pulling
300KB of app.js hourly to look at line 3), and compares it to the constant
this tab is running. Stale rows go into the badge's tooltip and turn the badge
amber. It runs 4 seconds after boot and hourly.

⚠️ **This was nearly built as a separate `checkup.html`.** Jake killed that:
*"Isn't the whole point of the hover the version check? Can we just add it to
the hover in the top left to see if it's stale or not? Why would I want to
open a new page?"* He is right, and the principle generalises — **a check you
have to remember to open is a check that does not get run.** That is the same
failure as the `version-check.mjs` that six files told you to run and nobody
had written. Put the answer where the question gets asked.

**And the same mistake was made once more in the same session:** whereis 1.3.0
shipped with no version anywhere on the page. *"You didn't put the version
anywhere on that page, so I can't see what version it is on load."* A
diagnostic that cannot tell you whether IT is current is a diagnostic you have
to diagnose. Fixed in 1.3.1; version-check.mjs now reads the on-page badge as
that file's constant, so the banner and the badge can never drift apart.

---

### 0e. whereis 1.4.0 — TESTS THAT COST A CONSOLE SESSION DO NOT GET RUN

Jake went to bed with ~20 tests to burn down and said to work on whatever was
safe. **The temptation was §0d**, which was unblocked for the first time
(STAGE-1…7 passed, so nothing was stacked on an unverified base). It was still
the wrong call: shipping a subsystem the night before a test-burn-down day
*grows* the list he had just asked to have shrunk.

**So the night went on making the existing tests cheaper instead.** Five of
them — TIER-6, TIER-7, SKIN-1, SKIN-2, BASE-7 — were written as *"open the
Firestore console, click into a document, eyeball a field,"* two of them from
two accounts. Every fact they ask for is readable from `whereis`, which is
read-only and therefore cannot cost anything to be wrong about.

| new section | retires |
|---|---|
| Your order and colours, next to everybody else's | TIER-6, TIER-7, SKIN-1, SKIN-2 |
| Every key, on every board you can see | KEYS-2, KEYS-6, half of TIER-8 |
| Provenance (E9) | BASE-7, mechanically |

⚠️ **Provenance counts rather than samples.** BASE-7 asked for four fields to
be eyeballed on ONE completed task. One hand-picked document proves nothing
about the rest — the audit walks every task, project and stage. **Old gaps are
expected and are NOT failures**: completions predating E9 and everything
imported from 1.x never recorded who, and those stamps are unrecoverable
(5b-i). The test is now *"make a task, finish it, re-scan, it must not
appear."*

⚠️ **THE KEY SHAPES ARE DIFFERENT AND THAT IS A TRAP.** Your own ranks live in
`users/{you}.tierRanks` keyed **`"wsId:tierId"`**; the copy other people can
read lives in `workspaces/{ws}/members/{them}.tierRanks` keyed by **bare
`tierId`**, shared boards only. Using one shape against the other reads as
"unset" rather than erroring.

**A bug found while building it, worth more than the feature.** The boards
table's column header was a hand-written list sitting beside a
`SUBS.map()` loop. Adding `"members"` to the scan shifted every count one
column left — silently, with no error, and the numbers would simply have been
attributed to the wrong collections. The header is now derived from `SUBS`.
**That is the third instance of this exact shape in this project**: the
keep-list that ate `completedBy` (5b-i), the `?v=` pins against file versions,
and now this. *A second list that must be kept in step with the first is a bug
with a delay on it.*

**Render logic here is browser-only and was verified against fixtures offline**
(the skin, keys and provenance blocks were extracted and run over fake boards,
including the all-clean and unreadable-profile paths). That is weaker than a
committed test and is called out so nobody mistakes it for one.

---

### 0f. THE 2026-07-31 TEST SWEEP — what it found

Jake ran most of `TESTS.md` in one sitting. **TIER-6/7/8, KEYS-2/4/5/6,
SKIN-1, TIER-10 and the standing checks all passed** — item 5 works. TIER-10
mattered most: a task made by one person, deleted by the other, then undone,
came back **on both boards**. The tombstone map routes correctly and the one
test that could have silently lost data does not.

Four things came out of it that are not in `TESTS.md` because they are
findings, not tasks.

**⚠️ 1. A GUEST COULD RUN "BRING IT BACK", AND FAILING DID NOT MEAN NOTHING
HAPPENED.** `unshareTier` checked only that the tier *was* shared, never who
owned it, and the panel drew the button for everyone. A guest's press ran
`moveTier` — which **copies first and deletes second** — so the copy landed on
the guest's own board and only then did the rules refuse the delete. Jake:
*"It said it couldn't, but you can see that it definitely did."*

Fixed at both layers (store 0.27.0 refuses by owner, app 1.37.0 hides the
control and offers **Leave this tier** instead — the decision that IS a
guest's to make). **His framing is the general rule and belongs in the UI
everywhere:** *"if a user doesn't have the ability to steal a tier, they
probably shouldn't think they have an option."*

**⚠️ 2. `deleteAll` IS NOT ATOMIC AND THE ERROR MESSAGE CLAIMED IT WAS.**
Batches cap at `BATCH_LIMIT`; each commit is atomic, the *sequence* is not.
moveTier's rescue text promised "Nothing was lost" on any delete failure —
true for one batch, false for two. It now carries the count that committed and
distinguishes the two states. **It still does not roll back.** A real fix
copies, verifies, deletes, and on failure re-copies what it removed.

**3. §0d COMPOUNDS, AND THAT EXPLAINS TIER-4.** `collectTier` queries the
SOURCE board only. A document already mis-routed by the tier-change hole is
therefore **invisible to every later share, unshare and re-share** — it is not
picked up, not moved, and not reported. `gmail made I` sits on a personal
board with its tier on a shared one, which is exactly that signature. **This
raises §0d from "an uncommon deliberate action" to "quietly strands documents
during ordinary sharing," and it should now be built next.**

**4. TIER MEMBERSHIP HAS NO ROLES.** Anybody holding a shared tier can remove
anybody else, the owner included. Jake: *"Perhaps we need the same levels on
tiers that we have on boards."* Boards have four roles; tiers have none.
Unbuilt, and the natural companion to fix 1.

**And one correction, which is the fourth of its kind here.** SKIN-2 told Jake
that per-user colours and names *"do not follow you between devices"* and to
confirm that. They do follow — they live in `users/{email}` in Firestore, so
any fresh sign-in loads them. What does not happen is live sync between two
already-open tabs. *"If that's a bug, then I like the bug."* The narrow true
statement had been restated as a broad false one, which is precisely how
E41's, §0b's and `TIER_RANKS`'s comments went wrong. **Fourth instance. Assume
the next confident sentence in this codebase is also wrong until measured.**

**Naming, again.** `E41-1…7` are now `TOUR-1…7`. E41 is a *defect* number, and
naming tests after it repeats the `0c-n` mistake in the same document that
forbids it. Jake: *"the silly naming system for onboarding (e41? Really?)"*

---

### 0i. TWO BUGS FOUND BY RUNNING THE TESTS (app 1.41.0 · queue 0.21.0)

Both were found by Jake running TESTS.md, and neither was findable by reading.

**⚠️ 1. A DATED TASK COULD EXIST ON NO SCREEN AT ALL.** D61's off-day rule was
`if (offDay(t.tierId)) continue;` — which dropped the task out of active, out
of waiting, out of everything. **A Work task dated to a Saturday was in
Firestore and rendered nowhere**, returning silently on Monday as overdue.
Jake, running MOVE-3: *"I can't see 'This happened' anywhere to check it
off."* He read it as a follow-up bug; it was not, and MOVE-3 is still unrun.

D61's intent is kept — Work must not nag on a Saturday — but **"don't nag" and
"cannot be reached" are different things**, and the user typed that date
deliberately. It now lands in WAITING carrying `offDay: true`, with a checkbox
and the actual reason.

⚠️ `renderWaiting` had assumed every entry was a follow-up and rendered
`+Nd after: <parent>`. An off-day task has no parent, so it would have read
`+0d after: (deleted task)` — **a fix that lands in an unexamined renderer is
half a fix.** Check the consumer, not just the producer.

#### ⚠️ THE SECOND MECHANISM — and why browsing for the task never finds it

Jake pushed back, correctly, on the first write-up of this: *"I don't think
your theory is correct on the workday thing, as I went forward to Wednesday,
and the task is still not there. It's not on Friday or Monday, either. I do
not know where it is."*

The off-day rule was right but **it is only half the reason**, and the missing
half is the more surprising one:

```js
const overdueIntoToday = viewingToday && t.dueAt < dayStart;
if (!(dueThisDay || overdueIntoToday)) continue;
```

**An overdue task resurfaces ONLY on today.** Browse to any other day —
forward or back — and `viewingToday` is false, so the overdue carry does not
apply and a task due Aug 1 is invisible on Aug 5. That is deliberate and
correct: a browsed day shows what is due THAT day, not a running tally of
everything outstanding. It is not a bug.

So the task had exactly one day it could ever appear on — **Saturday Aug 1,
"today"** — and on that one day the off-day rule suppressed it. Two
independent, individually-sensible filters intersecting at zero. Neither is
wrong on its own, which is precisely why this read as a disappearance rather
than as a filter, and why hunting for it on other days could not work.

**Both halves are needed to explain the report, and queue 0.21.0 only fixes
one of them** — the suppressed one. The overdue-carry rule stays as it is.
**The lesson is the general one: when two filters are each defensible, check
whether their intersection is empty.** `whereis` is the instrument that
settles it — the task was in Firestore the whole time, which is what told us
this was a rendering question and not a write one.

**2. THE FIRST ✎ CLICK ALWAYS WARNED ABOUT UNSAVED CHANGES.** D131 baselines
the project form at boot — when `#project-tier` is still EMPTY, because tiers
arrive from Firestore a moment later. `refreshTierSelects` then fills the
options and picks a default, so the signature changed without the user
touching anything. *"Edit was the first button I clicked after a hard
refresh."*

The guard was right and the baseline was taken before the form finished
existing. The clean/dirty state now carries ACROSS a programmatic refill, so a
genuinely dirty form still warns. **General rule worth keeping: any code that
writes to a form field on the app's own initiative has to preserve the dirty
flag, or it manufactures dirt.**

---

### 0g. BUGS FROM THE PRIMARY USER, 2026-07-31 — two fixed, two waiting

Four reports came in from the person actually living in this thing daily.
**Two were fixed; two are held on a question**, because both change what a
production user sees every morning and a wrong guess costs her a week, not me
a rebuild.

**FIXED — the year label was eaten by the buttons beside it.** `.view-nav h2`
carried `flex: 1` (which is `flex: 1 1 0%`) plus `min-width: 0`, so in a flex
row it was the FIRST thing to surrender space: `.view-ctls` held its content
width, the label collapsed, and the ellipsis finished the job — *"Jul 2026–J…"
on a TV with a whole empty line underneath it.* `.view-nav` has always
wrapped, so the right answer was for the CONTROLS to drop a row.
`min-width: min(100%, max-content)` says exactly that: never truncate while it
fits on one line, never grow wider than the bar. (css 0.58.0)

**FIXED — finishing a project did not clear the plate.** *"I just completed a
couple of projects (huzzah!) and Tentacalendar helpfully duplicated them for
next year (double huzzah!). But now, they're already visible in my project
pane."* Duplicate-for-next-year works exactly as designed and handed the
reward straight back. Projects starting past a configurable horizon (default
90 days) now fold into a collapsed **Later** group. **Deliberately the same
idiom as Finished** — a second way to say "present but out of the way" would
be one to learn for nothing. Undated projects are never folded; undated means
someday, which is the Want-tos tab. (app 1.39.0 · html 0.51.8)

**✅ FIXED 2026-08-01 (app 1.41.1) — see §0j. The paragraph below is the
diagnosis as written when it was held; it was right about the mechanism and
wrong about which cap.** Katie's screenshot shows **Timeline**, so it is the
34px ceiling that binds, not the wall layout's 14px. Left as written because
the reasoning is what made the fix cheap.

**⚠️ HELD — the year grid does not fill a tall pane.** Diagnosed, not fixed.
`fitAvail(grid)` correctly measures the dashboard pane, but the wall layout
then clamps lane height with `GL = Math.max(3, Math.min(14, GL))`. On a 4K
pane with few concurrent projects the divisor is small, the computed height is
large, and **the 14px ceiling throws the surplus away** — which is the black
band below the grid. The timeline branch has the same shape with a 34px cap.

The fix is a measure-and-refit pass in the `settleWeekBars` idiom (*"the model
proposes, the layout disposes"*) rather than a new constant, because a
constant tuned blind to somebody else's 4K TV is a guess. **It needs a
screenshot of the actual dashboard, and which of the three layouts she uses.**

**FIXED — the follow-up stage kept finished projects at the top.** Publication
stays the last stage; ticking a 🎆 hurrah that carries `spawnDays` completes
the project AND creates an ordinary dated task. Jake's two rulings, both of
which shaped the build: *"The last hurrah should spawn the request. Otherwise,
it's just another step in the pipeline"* — so the field appears on the hurrah
row and nowhere else — and *"the project is done, but there is a follow-up
task. Two different things in this case."*

⚠️ **`spawnedTaskId` is the re-tick guard.** Un-ticking and re-ticking must not
mint a second task, and un-ticking deliberately does NOT delete the first:
somebody may have already worked it. ⚠️ `addTask` writes `escalation`
straight into the document, so omitting it is a Firestore *"Unsupported field
value: undefined"* that fails the whole tick — the spawn passes one
explicitly. The whole spawn is wrapped: a stage completion is what the user
asked for, and a missing follow-up is visible where a refused tick is
baffling. (app 1.40.0 · store 0.29.0)

**4a, and the safety property that survived it.** *"Projects that are not
currently active should not appear in the daily agenda view at all."* Jake
narrowed it: *"If there's a due date, then it should pop up a week before the
project window"* — and called it explicitly temporary. Later's horizon is
therefore 7 days by default and is measured against the **pipeline window**,
not `startDate`. That matters: a stage anchored BEFORE the start pulls its
project out of Later on its own, so nothing with real work in view can be
folded away. Undated projects are never folded. **The full 4a — removing
inactive projects from the agenda outright — is still not built, on purpose.**

---

### 0i-bis. ⚠️ READ THIS BEFORE YOU WRITE THE WORD "UNTESTED"

**Jake, 2026-08-02, correcting me at the end of a long session:**

> *"You said none of these have been launched. They all have. And my wife has
> been using the software all day. This is a hole I need to figure out how to
> plug… but here we are."*

**He is right and it was my error, repeated all session.** I wrote "untested in
a browser" about drop after drop and let it stand in for "not live yet" —
including a `moveTask` change that rewrites task documents, and a wrapped
`onSaveSettings`. Those went onto a board a real person was working from
within minutes of my handing them over. **I characterised live changes to
someone's working data as safe-to-iterate.**

⚠️ **TWO AXES, AND THEY ARE INDEPENDENT. NEVER COLLAPSE THEM INTO ONE WORD.**

| | question | how you know |
|---|---|---|
| **SHIPPED** | is it on the server? | **Always yes.** Jake uploads on receipt; Pages serves `main`. There is no staging. |
| **EXERCISED** | has a human walked this path on purpose? | **Only `TESTS.md`.** A passing test is a document edit. |

"Untested" answers the second and says **nothing** about the first. Written
without that distinction it reads as *not deployed*, which makes every risk
assessment in this document wrong in the same direction — toward "we can fix
that later."

⚠️ **WHY THIS WAS EASY TO GET WRONG, so the next instance does not repeat it:**
an instance cannot observe a deploy. It hands over files and the conversation
moves on. The temptation is to default to "presumably not live yet," which is
**an assumption dressed as caution** — and the caution runs backwards, because
it under-states the risk instead of over-stating it.

> **The rule: assume everything you hand over is in production within the
> minute. If a change should not go live untested, say so BEFORE handing it
> over — not in the test note afterwards.**

`node version-check.mjs` now prints this on every run, because a rule in a
document is a rule this project has repeatedly watched fail.

---

### 0j. CLOSED ON 2026-08-01/02 — the short version (Thaumoctopus)

**Full detail is in CHANGELOG.md and the session log at the end of this file.
These are the parts worth carrying forward.** Collapsed because six new
sections in one day had pushed this document past what anybody will read
before touching code, which is the failure mode §1 already warns about.

- **DASH-FILL** (app 1.41.1). The timeline year grid left a black band under
  itself on a tall pane: the lane fit is clamped at 34px and the surplus was
  discarded. `settleYearRows()` measures the gap and gives it **to the rows,
  not back into `LANE_H`** — feeding it into the lane pitch fills the pane too,
  with 30px bars floating 90px apart. Verified by Jake. ⚠️ **Timeline only**;
  the wall/Months branches build `.yvg-lanes` and still have the 14px ceiling.
- **FIT-1 / the phone header** (css 0.59.1–0.59.3, app 1.42.0–1.43.0). `header`
  and `.header-right` were unwrapped flex with nowrap labels — ~750px of
  min-content in a 360px viewport, which is why Katie's screen started too
  large. Now wrapped into two deliberate rows; ⏻ moves to `#phone-tray`.
  ⚠️ **`display: contents` and `header::after` are load-bearing**, not tidy-up
  candidates: the first lets the board chip share the brand's row, the second
  IS the row break. **`fitLine()` is the durable half** — the version tooltip
  and Settings versions line now report whether the document is wider than the
  viewport and which element is furthest right.
- **The Dashboard button was already hidden below 1200px** and had been since
  D105, in CSS *and* `setView` *and* the resize rule. ⚠️ **Raising that number
  means moving all three**, or a laptop gets a hidden button and a persisted
  `"dash"` that still renders.
- **The lesson that kept recurring, three times in one day:** *fix one caller,
  leave its twin.* D138 fixed the day-nav and not the header; 1.41.0 fixed one
  dirty-flag writer and not its two; `version-check` watched every file but
  itself. **When you harden one call, grep for the SHAPE, not the symptom.**

---

### 0k. THE 2026-08-01 TEST RUN — the three decisions that are still open (Thaumoctopus)

Jake ran the list. **OFFDAY-1, MOVE-1, MOVE-2, MOVE-4, DASH-FILL-1/2/3 and
LATER-1 all pass.** Two things failed and three things he does not like are
worth more than any of the passes.

#### ⚠️ 1. moveTask STRANDED EVERY FOLLOW-UP IT EVER CARRIED (store 0.29.1)

MOVE-3 *"passed… mostly."* `whereis` showed the task **`and then this`**
sitting in `sumner vs gmail (shared)` with its tier `Work` living in
`Jake (personal)` — the §0b signature, arriving through a door §0d had just
finished building.

**The cause is one line and it was a comment believing itself.** `moveTask`
rewrote `tierId` on the **root only**, commented *"a follow-up inherits its
parent's."* It does not. `addFollowUp` **writes an explicit `tierId` onto the
child document**, and both of its callers pass the root's. So the sentence was
true about CREATION and false about STORAGE — and the code believed the false
half. Every child landed on the new board still pointing at a tier on the old
one. **Mis-routed the instant the move committed, on every chain that has ever
moved, silently, because writing to a board you hold is always permitted.**

> **Sixth comment in this project found more confident than its code**, after
> E41's, §0b's, `TIER_RANKS`'s, SKIN-2's and `moveTier`'s rescue text. Five of
> the six are the same move: *a narrow true statement restated as a broad
> one.* Assume the next confident sentence here is also wrong until measured.

⚠️ **A chain must live on ONE board** — `addFollowUp`'s own comment says so,
because `rewindFollowUps` is a single query. That is what makes "propagate the
tier" the only available answer rather than a preference.

**`movedTaskData` was lifted out as a pure function** for exactly the reason
`mergeStages` was in 0.26.1: the rule decides whether a document lands
routable or stranded and it was born un-runnable, three awaits deep inside a
batched write. `move.test.mjs` 1.1.0 extracts it — **29 assertions, verified
by sabotage**: restoring the old line turns 29/0 into 28/1 and the failure
reads *"a follow-up takes the new tier with it."*

⚠️ **The extractor had a hole and it is fixed in the same drop.** It did
`indexOf("{", …)` from the function NAME, which finds the body of a function
whose parameters contain no braces — and finds `{}` inside `patch = {}` for
one that does, returning a truncated function and dying with a SyntaxError
several lines from the cause. It now matches the parens first. **Latent since
the harness was written; it only surfaced because a default parameter finally
arrived.**

**Repairing `and then this` needs no migration:** open it, re-pick `Work`,
save. `rehomeFor` fires on any edit naming a tier on another board and walks
it home — the MOVE-1 specimen repair in a different costume.

#### ⚠️ 2. DIRTY-1 FAILED ON PROJECTS — AND 1.41.0 IS WHY (app 1.41.2)

*"Added a new project, hard refresh three times, hit the pencil on the
project, and it told me I have unsaved changes."*

1.41.0 fixed manufactured dirt in `refreshTierSelects` **and stopped there.**
There were two more writers, both on Firestore subscriptions, both firing
after D131 takes its baseline, both writing fields that are in
`projectFormSignature()`:

| writer | field |
|---|---|
| `subscribeProjects` → `suggestProjectColor()` | `#project-color` |
| `subscribeProjectTypes` → `refreshTypeSelect()` | `#project-type` |

**And `bestFreeColor()` picks the colour furthest from the ones already in
use — so ADDING A PROJECT changes the suggestion.** That is why his repro
needed a new project and why the original one did not reproduce it.

> **This is §8c #4 verbatim, committed by the instance that wrote §8c down:**
> *"I fixed a failure mode and left its twin untouched. When you harden one
> call, grep for every other caller of the same thing before you ship."*

All three now go through **`preservingProjectFormState(fn)`** — a helper, not
a third copy of the same four lines, because a fourth writer is a matter of
time. **The rule, and it belongs in §6: any code that writes a form field on
the app's own initiative must preserve the dirty flag, or it manufactures
dirt.**

#### 3. ⚠️ DELETING A PROJECT DESTROYS THE RECORD — and Jake is right

MOVE-4 passed. The confirm told the truth (*"This also deletes 2 time
sessions (1.2h). That record cannot be recovered."*) and did exactly what it
said. **The test passed and the behaviour is wrong.**

> *"I think historical data should stay there no matter what, as work clocked
> happened and checkboxes happened, even if the project gets deleted from the
> timeline. I really don't like it on shared projects, as John can be pissed
> at Susan and delete a whole project worth of work (and credit!) with the
> click of a button."*

⚠️ **NOTE THE TENSION, because a successor will otherwise "fix" this by
reverting 0.28.0.** `deleteProject` started taking its sessions in store
0.28.0 *because it did not* — the 07-31 scan found an 8:02 PM session whose
project was gone, unreachable from every surface, invisible to both accounts
holding keys to that board. **Orphaning the ledger and destroying the ledger
are both wrong, and neither is the other's fix.**

**The shape that resolves both is a soft delete**: the project document stays,
flagged, and leaves the timeline, the agenda and the project pane. Its
sessions and stage completions stay reachable *through it* — so the Time
Report and `whereis` still total honestly, no row is orphaned, and nothing
anybody did is destroyed by somebody else's bad afternoon. **Not built. It
touches every project query and is a bigger change than it sounds**, which is
why it is written down here rather than attempted at the end of a test run.
⚠️ It is also the natural home for **TIER-MEMBER-ROLES**: a hard delete on a
shared board should be an owner's verb, and a soft one need not be.

#### 4. HURRAH-1 "probably worked" and is not what Katie asked for

The spawn works. The **placement** is wrong. Today `↳ +Nd` lives on the 🎆
row in the pipeline editor, decided when the pipeline is built. She wants it
offered **at the moment of completion**, beside the choice that is already
there:

> *"That 'Do you want to duplicate for next year?' modal should have a 'Do you
> want to add a follow-up task?' as well… Katie wants the option of creating a
> follow-up task immediately after completing the project as well as the
> option of duping the whole project."*

⚠️ **BOTH, NOT EITHER.** *"The old layout of adding offsets for projects in
the pipeline was fine — I'm sure the new one is fine, too."* The pipeline
field stays; the completion modal gains the same offer for the case where you
did not know at build time that there would be a follow-up. **Same idiom, two
entry points, one `spawnedTaskId` guard** — which already exists and already
prevents a second task.

⚠️ **DO NOT TOUCH THE SNOOZE.** *"She loves being able to snooze that dupe, so
don't get rid of that!"* Whether the two offers share one modal or run as two
consecutive ones is explicitly open.

#### 5. The import plan changed, and TESTS.md's top three are void

**Jake, 2026-08-01: there are no throwaway accounts and no re-shares to
rehearse. Katie's transfer IS the test.**

> *"If they fail, they fail — she's lost nothing, because Tentacalendar 1.0 is
> still live."*

That is a sound call and it rests on something real: **1.x is untouched and
running**, so the downside of a failed import is a wiped 2.0 board, not a lost
practice. IMPORT-1's dry run is therefore **withdrawn, not deferred** — do not
put it back. IMPORT-3 (calendar permissions do not travel) stays, because it
is not a rehearsal, it is a step on flip day and it fails silently.

**What the plan now REQUIRES that it did not before: a way to wipe and retry.**

> *"Deleting a user and all of their data sounds terrifying, but is an
> important part of any project that stores data. We can build that now or we
> can build that later, but it will need to be built."*

Spec, in his words: a **super-admin panel visible only to
`jacob.v.wilson@gmail.com`**, listing users, with a triple confirmation
(*"are you super duper duper sure"*) and an export/backup first.

⚠️ **THREE THINGS A SUCCESSOR MUST GET RIGHT HERE:**

1. **The rules must enforce the super-admin, not the UI.** A panel that hides
   itself is a panel, not a permission. R1's lesson: Firestore ORs every
   matching `allow`, so this needs its own clause and the emulator suite
   needs a negative test that a non-Jake account is refused. **Rules change →
   `rules-test/` runs BEFORE the console, per 1.2.0/1.2.1's mistake.**
2. **Export before delete, and verify the export landed.** `moveTier`'s
   copy → verify → delete, at the scale of a whole person. `deleteAll` still
   does not roll back (§0f), and this is the operation where that finally
   matters — a half-deleted user is worse than a whole one.
3. **On encrypting the export, Jake answered his own question and is right:**
   *"Ideally that export would be hashed… but I can read it in Firestore so it
   probably doesn't matter."* It does not. Encrypting a backup against a
   threat model where the holder already has console access is theatre, and
   it costs a lost key later. Plain JSON.

---

### 0n. ⚠️ KATIE IS ON 2.0. HER FIRST HOUR. (app 1.44.0 · html 0.51.15)

**The import worked.** Jake: *"Katie is in! It imported her stuff like a
dream."* IMPORT-1's withdrawn dry run cost nothing. Four things came back.

#### 1. ⚠️ SAVE SETTINGS "DID NOTHING" — AND JAKE DIAGNOSED IT IN THE REPORT

> *"Clicking save settings didn't do anything… changing the days of a tier
> didn't close on save settings either. Maybe it's saving, but it's not
> closing the window. Hitting the X gave us an unsaved progress warning."*

**That symptom pair is one fact, and his guess was right.** `onSaveSettings`
ends with `delete dirtySnapshots["settings"]` and then `closeSettings()`. If
anything above throws, **both are skipped** — modal stays open (looks like a
dead button) and the old snapshot survives (so ✕ still warns). Everything
above the throw had already been written. **It was saving. It could not admit
it.**

⚠️ **I DO NOT KNOW WHICH LINE THREW AND I DID NOT SHIP A GUESS.** Four
candidates were checked against the source and eliminated: a missing `#cfg-*`
element (every id resolves); `saveTierSkin` with an empty board id (it guards
`!wsId` and catches); a null `pipelineDraft` (openSettings sets it before
`markClean`, **and the ✕ warning proves `markClean` ran**, which kills the
theory); a missing `.t-*` field on some row (every row carries all of them,
merely hidden). **After four files with no clean explanation the rule says
stop, so the fix makes the failure name itself instead.**

The body is wrapped. A throw now shows the user a toast with the message and
logs a stack. **The modal is deliberately LEFT OPEN and the snapshot LEFT
INTACT on failure** — closing would discard edits whose fate is unknown, and
the ✕ warning in that state is the guard working, not the bug.

⚠️ **THIS IS STILL OPEN.** The wrap makes it visible, not fixed. **Ask Jake
for the toast text or the console line; it names the file and line in one
step.** Two proven hazards in the same function were fixed on the way past:
the bare `.tier-row` query is now scoped to `#tier-editor` like the other four
in the file (**the D52 comment forty lines above describes this exact bug
happening to `.tab-btn`**), and the lone unguarded `pipelineDraft` reader among
four guarded ones now checks.

#### 2. ⚠️ THE SPLASH TOLD KATIE SHE WAS THE PROBLEM

It read: *"A planning board that decides **what you should do next** — instead
of letting you."*

> Jake: *"Help you pick the next thing because you're incapable isn't really
> the vibe we're going for. Help you pick the next thing so you don't have to
> is better."*

**He is right and the distinction is the entire product.** This app takes over
the **sorting**, not the deciding. Now: *"works out what's next, so you don't
have to."* ⚠️ **Do not let this drift back.** Copy that brags about overriding
the user reads as contempt to everyone except the person who wrote it.

#### 3. THE TOUR STOPPED AT "ADD A TASK"

> *"Katie was very disappointed that it stopped at adding tasks. The projects
> is the moneymaker, and she thinks it deserves a fair shake. Probably a
> walkthrough how the projects and tasks play together on the agenda is also
> helpful. The tour should be a legit tour, not a how to add a task."*
> *"(If I told you differently before, I was very definitely wrong.)"*

**She is describing the actual product.** `firstTask` went 5 steps → **11**:
task → project → pipeline/stages → working-day arithmetic → **the two meeting
in one queue** → want-tos. The penultimate step is the thesis rather than a
field: *stages arrive in the same list as your tasks, on the day they need
you.*

⚠️ **EVERY SELECTOR MUST RESOLVE.** A step whose element is missing is a tour
that dies silently in front of a brand-new user — the worst audience there is.
All 16 across all three tours verified mechanically against `index.html`;
**re-run that check if you add a step.**

⚠️ **Katie has already completed the tour**, so `markTourCompleted` means she
will not see the new one without a replay button — **which is TOUR-REPLAY,
still unbuilt, and it just stopped being cosmetic.** It is the only way the
rewrite reaches the person who asked for it.

#### 4. THE TIMING PANE WAS A PILE OF OVERLAPPING TEXT

A `<p class="hint">` was a **third flex child of a `.form-row`**. `.form-row`
is `display: flex` and `.form-row label` is `flex: 1; min-width: 0` — that
min-width is load-bearing elsewhere (D66: two date inputs out-minimum a 340px
panel) and it means a label will shrink to nothing. The paragraph took the
width, both labels starved into one-word-per-line columns, and their text
interleaved into what Jake photographed.

> ⚠️ **A HINT IS A SIBLING OF ITS ROW, NEVER A CHILD OF IT.** Every other hint
> in that pane already sat outside; this one row had it inside. **Checked
> mechanically: no `.form-row` in `index.html` now contains a `<p>`, and that
> check is worth re-running.**

---

### 0o. TOUR REPLAY · THE DATE LABEL · THE PHONE HEADER (app 1.45.0 · css 0.59.3 · html 0.51.16)

#### 1. TOUR-REPLAY built — Settings ▸ foot ▸ "Show me around"

Three buttons, one per tour. **It was filed as cosmetic in the first roadmap
of this session and it never was**: `markTourCompleted` is permanent and
per-person, so the 11-step rewrite in §0n reached **nobody who had used the
app before** — which is precisely the set of people who could tell you the old
one was wrong. Katie asked for the change and could not have seen it.

⚠️ **It closes Settings THROUGH `closeSettings()`, not around it**, and starts
nothing if the user cancels the discard prompt. A tour that threw away a
half-typed tier to show somebody a popover would be a worse bug than the one
it fixes. In the modal **foot** rather than a tab because all four tabs can
reach it and none of them owns it.

#### 2. ⚠️ THE DATE LABEL — D138 FIXED HALF AND CAUSED THE OTHER HALF

Still stacking as `Today / — Sun, / Aug 2` at 1.43.0, two releases after the
fix meant to stop exactly that.

D138 needed the nav slots to **shrink** and wrote `flex: 1 1 0`. That does
permit shrinking — and also sets `grow: 1` with a zero basis, which makes both
slots **greedy**. Three equal shares to `[◀]`, `[label]`, `[▶ ⛶]`, so the
label got a third of a 360px phone and word-stacked anyway. **The same
three-line symptom D138 set out to kill, reached from the opposite direction —
which is why it read as unfixed rather than as re-broken.**

> `0 1 auto` is what *"may shrink, must not grow"* actually spells. `1 1 0` is
> *"must grow, may shrink."* They are one character apart and opposite.

#### 3. The phone header, in two deliberate rows

0.59.1 stopped the overflow and left the wrapping to chance — brand, then
board chip + views, then ⚙ ＋ stranded on a line of their own. Jake's layout:

```
row 1   🐙 Tentacalendar v1.45.0        ● Board ▾
row 2   📋 Today  🗓️ Week  📅 Year        ⚙  ＋
```

⚠️ **`display: contents` on `.header-right` is load-bearing.** The board chip
cannot join the brand's row while nested a box deeper — a wrapper is one flex
item and everything in it wraps as a unit. Dissolving the box makes them all
children of `header`, and only then can `order` interleave them with `.brand`.

⚠️ **`header::after` IS THE ROW BREAK, not decoration.** A 100%-basis,
zero-height flex item at order 3 eats the rest of line one. Delete it and the
two rows collapse back into one wrapped mess.

⚠️ **EVERY HEADER CHILD NOW CARRIES AN EXPLICIT `order`, INCLUDING ⏻.**
`order` defaults to 0, which sorts *before* `order: 1` — so for the beat
before `wirePhoneTray()` moves ⏻ out, and forever if it ever fails, an
unordered child would jump ahead of the app's own name.

⚠️ **None of this ran in a browser.** Contained to ≤600px, so the blast radius
is phone cosmetics, and it reverts cleanly by deleting the ordered block.

#### 4. ⚠️ OPEN — "year on the phone is absurd"

Jake said it in parentheses and it reads two ways: *the Year VIEW is absurd on
a phone* (hide the button) or *hiding Year would be absurd*. **Not guessed at,
because the change is not one line.** Hiding it means the CSS rule **and** a
`setView` bounce **and** the resize rule — all three, exactly as the dashboard
does at 1200 — or a phone that persisted `"year"` renders a view with no way
back to Today. §0m's warning, one control over. **One word from Jake and it is
fifteen minutes.**

---

### 0p. THE FOLLOW-UP OFFER (app 1.46.0 · css 0.59.4 · html 0.51.17) — §0k.4 CLOSED

Katie's ask from her first hour, built. The "🔁 Same time next year?" modal now
carries a second, **independent** offer: a title, a day offset, and its own
**＋ Add it** button.

⚠️ **INDEPENDENT IS THE DESIGN, NOT A SHORTCUT.** Hanging it off *Create next
year's run* would have made the commonest case — a follow-up on a project that
does **not** repeat — impossible to reach. She can add one and duplicate, add
one and snooze, or add one and say No thanks. **The snooze is untouched.**

⚠️ **IT DOES NOT REPLACE THE PIPELINE'S `↳ +Nd`.** Jake was explicit that the
old way was fine. Two entry points for one idea: the pipeline for a follow-up
you knew about when the project was built, the modal for one you only discover
on finishing it.

⚠️ **THE STAGE'S `spawnedTaskId` GUARD DOES NOT COVER THIS**, and §0k.4 said it
would. It does not, and claiming otherwise would have been the session's sixth
comment-more-confident-than-its-code. That guard stops an *automatic* spawn
firing twice on a re-tick. This is a person clicking a button labelled Add it,
which should do what it says. So the guard is narrower and honest: **the button
disables after a successful write**, and re-opening the modal deliberately
permits another — a second click on a second visit is a second intention.

Dated from **today**, not from the project's end date, and pushed onto the
tier's next working day. The fields reset on every open, so a stale ✓ from the
last project never reads as a promise about this one.

---

### 0q. DOCUMENT MAINTENANCE — and the check that keeps it done

Jake: *"I've noticed the order has gotten wonky, and comments are getting deep
again in some of the files."* The order was fine; the depth was not.

**`app.js`'s header was back to 135 lines and 19 RECENT entries.** That is the
precise shape `CHANGELOG.md` was created on 2026-07-29 to prevent — headers
that had reached 949 lines and put the version banner **980 lines from the
constant it must agree with**, which is how they drifted four times, the last
costing a deploy. The rule was written down in the header itself. **It regrew
anyway, in nine days.**

> **A rule a human has to remember is a rule this project has already watched
> fail.** So `version-check` 1.5.0 checks it: 60 lines and 6 entries per
> header, measured to the first line of code. Sabotage-verified.

It found `functions/index.js` at **191 lines / 7 entries** on its first run — a
file nobody had thought to look at. app.js 135→39, store.js 77→41,
functions 191→41; 24 entries moved to `CHANGELOG.md` **verbatim**.

⚠️ **This document had the same disease.** Six new sections in one day pushed
it to 1,932 lines — past what anybody reads before touching code, which is
§1's own warning. §0j now digests the three fully-resolved ones down to their
durable lessons; **§0k, §0n and §0o were left whole because they hold open
decisions, and a decision summarised is a decision re-litigated.**

`README.md`'s Status block was **wrong**, which is worse than long: it still
said the migration had never run for real, the morning after it ran for real,
and still listed per-user tier colours as unbuilt three weeks after they
shipped.

---

---

### 0r. THE 2.0.0 AUDIT (app 2.0.0 · store 1.0.0 · queue 1.0.0 · functions 1.3.1)

**Jake asked for "a full audit … with a new set of eyes," having noticed that
the first pass had only re-run the project's own gates.** He was right to push:
the gates all pass and always did. Everything below came out of reading files,
not running them.

#### 1. ⚠️ THE FINDING THAT WAS WRONG, AND HOW IT NEARLY SHIPPED

`defaultAnswers()` in `import-transform.js` was reported dead, deleted, and
then **put back**. It is called by `rules-test/import.test.mjs` — the one
consumer that drives the transform headlessly and therefore has no DOM to read
answers out of.

**The sweep that missed it searched `app.js`, the three HTML pages and the two
root `.mjs` harnesses. It did not search `rules-test/`.** That directory is a
sibling of everything else and holds real callers.

> **A dead-code sweep that skips a directory returns the same answer as a
> sweep that finds nothing.** There is no signal distinguishing them. If you
> are about to delete something because "nothing calls it," name the
> directories you searched, out loud, before you cut.

This is the same shape as everything in §0q and the SKIN-2 note in `TESTS.md`:
a true narrow statement ("nothing in the app calls this") restated as a broad
one ("this is dead"), with the broad one being what gets acted on. It is the
**sixth** instance recorded in this project. The function now carries a comment
saying it looks dead and is not.

#### 2. What was actually removed — six functions

| File | Removed | Why it was there |
|---|---|---|
| `queue.js` | `getDeadlineHour`, `getClearDeckThreshold` | Setter/getter pairs where only the setter was ever wired. Both values are read through the module locals. |
| `queue.js` | `isWeekend`, `addWeekdays`, `weekendNeighbors` | The pre-D60 Mon–Fri API. **Their comment said "still used for defaults" and nothing used them.** D60 replaced the weekend *concept* with per-tier `allowedDays`, so these could only answer a question the app had stopped asking. |
| `store.js` | `tierSkinOf` | See below. |

Also un-exported (read here, imported nowhere): `COMPLETED_WINDOW_DAYS`,
`stampNewStages`, `mergeStages` in `store.js`; `WEEKDAYS` in `queue.js`.

⚠️ **Un-exporting `mergeStages` does NOT break `stage-merge.test.mjs`.** That
harness lifts functions out of the source *text* by a brace-matching scan and
strips `export` as it goes. Testability never depended on the keyword. Both
harnesses re-ran green afterwards — 34 and 29 assertions. **Do not add the
keyword back "so the test can see it."**

#### 3. `tierSkinOf` — the fifth comment more confident than its code

It was exported and documented as *"what the owner actually called it — for
Settings' 'shared as …' line."* Nothing called it. That line reads
`t.canonName` / `t.canonColor`, which `skinFor()` stamps onto **every** tier it
returns precisely so no caller has to look an override up.

The comment was not describing a bug. It was describing a **design that was
considered and then improved on**, and never updated. After E41's, §0b's,
`TIER_RANKS`'s and SKIN-2's, the pattern is now established enough to state as
a rule: **when you move an answer closer to its caller, delete the old path the
same hour.** A convenience function left behind after its convenience moved is
indistinguishable from a function somebody forgot to wire up.

#### 4. `functions/index.js` — the header the budget had been failing

191 lines and eight changelog entries, putting the banner ~190 lines from
`FUNCTIONS_VERSION`. **That is the exact geometry that drifted four times in
`app.js` and cost a deploy.** `version-check.mjs` had been reporting this file
as its one failure since the budget shipped, and the failure was being read as
noise.

Now 57 lines. The body is **byte-identical** — verified by diff — apart from
the version constant. Two things were rescued on the way out:

- **The 1.2.1 entry existed only in that header.** It was not in
  `CHANGELOG.md`. Trimming without checking would have destroyed it.
- **A line appeared twice, back to back** (`0.3.0: PHASE 3 IS COMPLETE…`).
  Nobody had noticed, which is what a 191-line header buys you.

⚠️ **Two blocks in the moved history are still load-bearing** and are now
summarised at the top of the trimmed header rather than only in `CHANGELOG.md`:
**E37** (a bare email address is a guessable primary calendar; the leak is on
the *calendar* side, not the Firestore side) and **E40** (`tcWs` on every
mirrored event; a combined tag is invisible to both apps rather than visible to
both).

#### 5. ⚠️ OPEN — `rules-test/import.test.mjs` cannot run as documented

Found while checking §0r.1. Two independent reasons:

1. It does `import * as T from "./import-transform.js"` — a path **inside
   `rules-test/`**, where no such file exists. The README documents copying
   the *rules* file in (`cp ../firestore-2.0.rules ./firestore.rules`) and
   never mentions the transform.
2. `package.json`'s `test` script runs `rules.test.mjs` **only**. Nothing
   invokes `import.test.mjs` at all.

**So the 18 assertions that `import.html`'s header cites as proof of the
migration path have plausibly never executed.** Katie's migration succeeded on
the day, which is the evidence that actually exists — but it is a successful
run, not a test suite, and the two have been talked about interchangeably.

The fix is small (copy the module in alongside the rules file, add a script)
and is **deliberately not done here**, because it needs the emulator and the
egress allowlist to verify rather than to merely write. Do not mark it fixed
without a green run.

#### 6. What the audit did NOT find, stated plainly

No broken logic. No null-dereference traps. No duplicate CSS rules, no
duplicate function declarations, no orphaned listeners, no leftover
`console.log`/`debugger`, no `TODO`/`FIXME`. `app.js` and `functions/index.js`
have **zero** internally-dead functions between them. The security rules were
read end to end and nothing was found beyond `TIER-MEMBER-ROLES`, which
`TESTS.md` already tracks.

⚠️ **This is a statement about reading, not about running.** `TESTS.md` START
HERE still holds ~20 unwalked items and **SAVE-1 is still an unexplained
crash.** 2.0.0 means *audited*; it does not mean *exercised*.

#### 7. The version numbers, and the one Jake still owns

Jake set the shape: *"I can't go back in time and change the versions."* So the
bumps carry the cleanup rather than announcing a clean bill of health.

- **`app.js` 1.46.0 → 2.0.0.** His call, made explicitly. Behaviour unchanged;
  the number and two `?v=` pins are the whole diff.
- **`store.js` 0.29.1 → 1.0.0, `queue.js` 0.21.0 → 1.0.0.** `0.y.z` means *the
  shape may still change*. It does not — Katie's 245 documents went through
  these files in one run and the day held. A 1.0.0 is a promise about an export
  list, which is why the dead exports went in the same drop.
- **`functions` 1.3.1, `import-transform` 1.0.1, `import.html` 1.0.1,
  `index.html` 0.51.18** — patch bumps carrying the header trim, the comment,
  and the pin repoints.

⚠️ **STILL JAKE'S DECISION: `css` 0.59.4, `html` 0.51.18 and `manifest` 0.2.0
stayed 0.y.z.** They are as live and load-bearing as `store.js`, so the case
for 1.0.0 is the same case. It was not taken unilaterally, because a major bump
needs his sign-off and the only changes in those files this session were pin
repoints. **One sentence from him closes this either way; do not infer it.**

---

---

### 0s. ⚠️ OUTRIDERS ARE BUILT AND KATIE'S BOARD IS NOT SWEPT YET

**app 2.1.0 · store 1.1.0 · queue 1.1.0 · html 0.51.19 · outrider.test 1.0.0**

§0h's requirement, built. **The code is live; the one-off migration over
existing data is NOT run.** Until it is, Katie's older projects still show
their outrider stages in the pipeline — a visible, harmless, wrong-looking
state, not a broken one.

#### ⚠️ THE OUTSTANDING STEP, IN FULL

Open the app as the account that owns the board, console, then:

```js
octodoOutriders()            // DRY RUN — lists every stage that would move
octodoOutriders({ go: 1 })   // does it
```

**Read the dry run before passing `go`.** It names each project, each stage,
its computed date, and whether it is ticked. **Run it once per board** — it
reads `S.projects`, which is the merged view of whatever boards that account
has open, so a board nobody has opened is a board nobody has swept.

#### Where the rule lives, and why it is in three files

| File | What it owns |
|---|---|
| `queue.js` 1.1.0 | `isOutrider` / `splitOutriders`. **The predicate, and nothing else.** Pure — no Firestore, no DOM — which is why `outrider.test.mjs` can import it directly instead of extracting it from text. |
| `store.js` 1.1.0 | `syncOutriders(projectId, allowedDays)`. **All the writing.** It asks queue.js the question; it does not have its own opinion about dates. |
| `app.js` 2.1.0 | `syncOutridersFor()` at four call sites, and `octodoOutriders()` for the sweep. |

⚠️ **store.js NOW IMPORTS queue.js.** That is new and it is deliberate: if
store had its own copy of the predicate, a stage could be stripped by one and
still drawn by the other. queue.js imports nothing, so there is no cycle. **Do
not "simplify" by inlining the date maths into store.js.**

#### ⚠️ THE FOUR THINGS THAT MAKE THIS SAFE AGAINST LIVE DATA

1. **BUILD → VERIFY → STRIP, and it refuses to strip on any failure.** If even
   one task write fails, `syncOutriders` returns `skipped > 0` and **leaves
   the pipeline exactly as it was**. A project still showing a −14d stage is
   fixable by re-running; a project missing both the stage and the task is
   not, because the computed date lived on the stage and went with it.
2. **Idempotent BY CONSTRUCTION, not by bookkeeping.** Each task takes the
   deterministic id `out_<projectId>_<sid>`. Re-running finds the task and
   *adopts* it. ⚠️ **This is why there is no `spawnedTaskId` guard here even
   though the hurrah has one** — the hurrah mints an auto id at tick time and
   genuinely needs the guard; copying it here would be a second authority
   answering the same question (see §0r on `tierSkinOf`).
3. **An existing task is NEVER overwritten.** If somebody has since
   rescheduled or completed it, theirs is the true version.
4. **A ticked outrider becomes a COMPLETED task carrying its original
   `completedAt` and `completedBy` verbatim** — Jake, 08-01: *"the reflection
   is important, and I don't want to lose any data."* Not re-stamped with the
   migration date, not credited to whoever runs the sweep (D59's lesson).

⚠️ **A stage with no `sid` is SKIPPED, not migrated.** It cannot have a stable
task id, so a second run would mint a second task. `ensureSids` has stamped
every stage since store 0.26.0; a pre-0.26 survivor stays in its pipeline and
the dry run flags it. **If the sweep reports skips, that is the likely cause —
open and re-save the project's stages to stamp them, then re-run.**

#### What was deleted, and do not put it back

`isLater` measures `startDate` again. The pipeline-window branch is **gone**,
along with the 1.40.0 comment explaining it, and `projectPipelineWindow` is no
longer imported by `app.js` at all.

> ⚠️ **It was scaffolding for a requirement Jake explicitly withdrew on
> 2026-08-01**, and §0h says in terms: *do not preserve the window-based logic
> out of politeness to 0g.* A successor who "restores" it will drag projects
> back out of Later on the strength of stages that no longer exist.

`projectPipelineWindow` itself stays in `queue.js` — the timeline still draws
from it, and a stage with a manual `dueAt` inside the window is legal.

#### ⚠️ NOT DONE, AND KNOWN

- **The sweep over live data.** Above. This is the whole outstanding item.
- **`projectProgress` and `nextDeadline` were not changed.** They did not need
  to be: outriders leave the `stages` array, so those functions see a clean
  pipeline and a project with a −14d letter and a +14d follow-up shows 0/3
  rather than 0/5 **once swept**. ⚠️ **Before the sweep they still count the
  outriders**, because the stages are still there. That is the same wrong-
  looking-but-correct state as above, and it resolves when the sweep runs.
- **No UI button.** The sweep is console-only on purpose — it is a once-per-
  board operation and a button is a mis-click that writes to every project.
- **AGENDA-ACTIVE is now partly moot** but was not touched; re-read it after
  the sweep, because outriders leaving may be most of what it was asking for.

---

### 0h. ✅ BUILT 2026-08-03 (Cirrothauma) — "OUTRIDER STAGES BECOME TASKS"

> ✅ **SHIPPED in app 2.1.0 · store 1.1.0 · queue 1.1.0.** The section below is
> kept verbatim because it is the REQUIREMENT, and the requirement outlives
> the build. **What was actually built, and the one thing still outstanding
> (Katie's live projects have not been swept yet), is §0s.**

**Katie corrected the requirement, and the correction is bigger than the
thing it corrects.** Jake relayed it 2026-08-01, explicitly retracting his own
earlier ask:

> *"I had asked that the projects are shown one week before the first task in
> it, but after discussion with Katie, I got that wrong. Any task set to
> before the start of a project (send out engagement letter) should be treated
> as a task. In other words, that engagement letter set to -14d should show up
> on that day and on that day alone. Once it's checked off, it's checked off.
> The project does not show until the project window opens. Projects are
> projects with their pipelines, and any task set before or after the project
> should be treated as a task."*

**One rule, stated once:**

> **A project's pipeline is what happens DURING the project. Anything anchored
> outside the project window is a TASK, and always was.**

This subsumes the hurrah follow-up (0g) rather than sitting beside it — that
was the same insight arriving from the far end. `spawnDays` on a 🎆 is the
+N case already built and working; **this generalises it to −N**, and makes
both of them the same feature instead of two.

**What it replaces.** `laterHorizonMs` / `isLater` currently measure against
`projectPipelineWindow`, precisely so a stage anchored before the start keeps
its project visible. Under Katie's rule that is **the wrong safety property**:
such a stage should not be holding the project visible at all, it should have
left as a task. Once outrider stages are gone, `isLater` should measure
`startDate` again and the special case disappears. **Do not preserve the
window-based logic out of politeness to 0g — it was scaffolding for a
requirement that has been withdrawn.**

**Sketch, not a spec.** The machinery mostly exists; this is mostly deletion.

1. A stage whose computed date falls outside `[startDate, endDate]` is an
   **outrider**. `stageEffectiveDate` already computes that date; the test is
   a comparison, not new arithmetic.
2. Outriders spawn a task **when the project is created or its dates change**,
   not when a stage is ticked — a −14d engagement letter must exist before the
   project does. Guard with a `spawnedTaskId` on the stage exactly as
   store 0.29.0 does for the hurrah; that guard is proven.
3. Outriders then **leave the pipeline entirely**: not in `projectProgress`,
   not in `nextDeadline`, not in the queue's stage loop. A project with a
   −14d letter and a +14d follow-up shows 0/3, not 0/5.
4. `projectPipelineWindow` collapses toward `[startDate, endDate]`.

⚠️ **THE MIGRATION IS THE HARD PART AND IT IS NOT OPTIONAL.** Katie has live
projects whose pipelines already contain outrider stages, some of them
**already ticked**. Turning them into tasks must not resurrect finished work
as an open task, and must not lose a completion that is somebody's record of
having done it.

✅ **ANSWERED — Jake, 2026-08-01: "Already ticked outriders should be stored as
tasks on the import. The reflection is important, and I don't want to lose any
data."** So:

- **A ticked outrider becomes a COMPLETED task**, carrying its original
  `completedAt` and `completedBy` verbatim. Not re-stamped with the migration
  date and not with whoever happens to run it — that would credit the wrong
  person on the wrong day, which is the same failure `stampNewStages` was
  written to avoid (see D59's note on next year's run).
- **An unticked outrider becomes an OPEN task** dated to its computed day.
- **Nothing is dropped.** The record of having done the engagement letter is
  the point; a migration that tidies it away has destroyed the thing the
  feature exists to preserve.

⚠️ **This makes the migration a WRITE against live data, so it needs the
moveTier discipline**: build the new tasks, verify they landed, and only then
strip the stages from the pipeline. A half-migrated project — stages gone,
tasks absent — is unrecoverable by hand because the computed dates are gone
with the stages. There is no open question left; **build it, gated on that
ordering.**

---

### 0d. THE TIER-CHANGE HOLE — CLOSED (app 1.38.0 · store 0.28.0), UNRUN

`updateProject` and `updateTask` routed with `wsOf(id)` — the board the
document was ALREADY on — so changing a tier from a personal one to a shared
one rewrote `tierId` and left the document behind. Jake confirmed the repro on
2026-07-30 (*"I created it and then changed it"*), and the 07-31 sweep showed
it does not stop there: **`collectTier` queries the SOURCE board only, so a
mis-routed document is invisible to every later share, unshare and re-share.**
It is not moved, not reported, and quietly accumulates.

**`rehomeFor(coll, id, fields)`** returns null unless the edit names a tier on
a different board, so the ordinary path is still one `updateDoc`. When it does
fire:

- **`moveProject`** takes the project **and its sessions**. `clockIn` routes
  off `wsOf("projects", …)`, not the tier, so a project that moves without its
  ledger splits the record — and each half looks complete.
- **`moveTask`** takes the whole follow-up chain, transitively, and **nulls
  `mirroredGcalEventId`**: E40 scopes mirror tags per workspace, so a carried
  id points at an event on the OLD board's calendar that nothing on the new
  one owns, and the poll would never reconcile it.
- Both use moveTier's copy → verify → delete order, so a refused write leaves
  the originals in place.

⚠️ **Undo comes free and must stay that way.** `pushUndo("project edit",
before, after)` captures `tierId`, so an undo routes back through the same
path and moves the document home. Anything that starts stripping `tierId` from
undo snapshots silently re-opens this.

**`node move.test.mjs` — 16 assertions**, extracting `walkChain` and
`rehomeFor` from the real source. The chain walk is where a bug would be
SILENT: miss a descendant and the chain splits, and `rewindFollowUps` queries
one board so it does not error — it just stops seeing the far half.

⚠️ **Honest note on the sabotage check.** Removing the cycle guard makes the
suite **hang rather than fail**. That proves the guard is load-bearing and it
does block a drop, but a hanging suite is a worse signal than a red one. If
anybody adds a step cap to `walkChain`, this becomes a clean failure.

**Still open, and related:** `deleteAll` does not roll back (§0f), and tier
membership has no roles.

### PER-USER TIER COLOUR AND NAME — BUILT, UNTESTED (app 1.34.0 · store 0.25.0)

`users/{email}.tierColors` / `.tierLabels`, composite-keyed `"wsId:tierId"` as
the spec warned. `skinFor()` overwrites `name`/`color` before a tier leaves
`subscribeTiers`, so every consumer gets it free; `canonName`/`canonColor` ride
along for Settings' "shared as …" line. Applies only on your own board, same
guard as `rankFor`. Clear the name box to drop your override.

⚠️ **The whole feature is one branch in the Settings save loop** — see the
comment there. Lose the `delete data.name` and the propagation bug returns
looking identical.

⚠️ **Known limitation:** nobody can rename a shared tier for everyone, owner
included. Correct for the ELA6/7/8 case; wrong if somebody shares a typo, where
today's only fix is unshare/reshare. **Owner rename-for-everyone is queued as
the next build** — Jake asked for it 2026-07-30.

⚠️ **`TIER_RANKS` was never live.** Its comment claimed `subscribeMyProfile`
kept it so; no such function exists or ever has. Both maps hydrate once at
sign-in — one device does not follow another. **Third comment in this project
found more confident than its code, after E41's and §0b's.**

**Never run in a browser.** Test: two accounts, one shared tier, rename on one
side, confirm the other does not move.

---

### whereis.html 1.0.0 — the diagnostic (new 2026-07-29)

**Read-only. Writes nothing.** Sign in, and it prints every board you hold a key to, every tier and which board it lives in, every task, and — the point — **flags any task sitting in a different board from its own tier.** That check is `wsOfTier`'s contract asserted against live data, and it is what turned the sharing report from three competing theories into one confirmed document in one wrong collection.

**Run it once per account.** Rules limit reads to boards you hold a key to, so no single run sees everything. Its one blind spot: it flags tasks in the *wrong* board and cannot flag a task it *cannot see* — the sumnerk12 run reported ✓ while the offending task sat in gmail's board, invisible to it. Read a ✓ as "correct for what this account can read", not "correct".

⚠️ **Prefer this over the Firebase console for any "where does this live" question. The console's subcollection list is a sample, not an inventory** — during this session it showed `members, settings` for boards that demonstrably held tiers and tasks. Two separate lines of investigation were wasted trusting that sidebar.

---

### ITEM 9 — import.html IS BUILT (2026-07-29, Bimac)

**Status: written and tested against the emulator with Katie's real 245-document export. Never run against live Firestore.** Two new files plus a test:

| file | version | what it is |
|---|---|---|
| `import-transform.js` | 1.0.0 | **All the logic.** Pure functions over plain objects — no Firestore, no DOM, no `Date.now()` except through an argument. This is why item 9 could be tested at all. |
| `import.html` | 1.0.0 | A form and a batch writer. Deliberately thin. |
| `rules-test/import.test.mjs` | — | **18 assertions, all green**, including *all 157 writes accepted by rules 1.2.1* and *no document anywhere contains `undefined`*. |

**Run it:** `EXPORT_JSON=/path/to/export.json npx firebase emulators:exec --only firestore "node import.test.mjs"`. The export is somebody's real board, so there is no fixture committed and never should be.

**⚠️ THE INTERVIEW IS THE DESIGN, AND IT WAS JAKE'S.** The first plan was for Claude to ask three questions in chat and hardcode the answers. Jake's correction: *ask them on import, so she's part of the conversation — and it's factored in if anyone else ever branches off Tentacalendar and wants to join Octodo.* The page therefore asks seven questions, **all derived from the file, none hardcoded** — an export with no running clock is never asked about running clocks. Do not replace any of them with a constant.

The questions, and why each one cannot be answered from the data:
1. **Board name** — cosmetic, prefilled from the source.
2. **A role per other member** — 1.x has a flat `memberEmails` array where everyone is equal. 2.0 has owner/editor/helper/viewer. This is pure invention and it has to be asked. One question per member, so it scales to any board.
3. **Name the default project layout** — 1.x has ONE anonymous `stageTemplate`; 2.0's Pipeline tab is a library of *named* layouts. Naming it is the difference between a usable tab and an empty one. Jake spotted this; it was not in §4.5.
4. **Running clocks** — leave open or close at import.
5. **Sessions pointing at deleted projects** — skip (default) or keep.
6. **Calendar tiers with no calendar id** — keep as anchor or convert to task. Katie's *Business* tier is one: `kind:"anchor"`, empty `gcalCalendarId`. It imports perfectly and stays empty forever.
7. **`eventsCache`** — skip (default; the poll rebuilds it) or import.

**⚠️ WRITE ORDER IS LOAD-BEARING.** Firestore evaluates rules for a batched write against the state **before** the batch, and every subcollection rule calls `get()` on `members/{me}`. So the board document and the owner's own key are written **and committed on their own, first**; everything else follows in 400-document batches. Batching all of it together denies all of it. Found in the emulator, and it is the reason the emulator was worth building.

**Three transforms §4.5 does not mention**, found by reading the real export rather than the design doc:
- **`memberEmails` array → `members` subcollection**, with roles invented via the interview.
- **`gcalAuth: "service"`** — 2.0 anchor tiers carry it, 1.x tiers do not.
- **E7 tier ranks use the COMPOSITE key `` `${wsId}:${tierId}` ``**, not the bare tierId. A bare key yields a per-user ordering that silently never loads. Asserted by IMPORT-3d.

**`completedBy` is written as `null` on all finished work.** 1.x recorded *when* something was done and never *by whom*, and on a two-person board a guess is a coin flip. store.js 0.22.0 is explicit that inventing evidence is worse than recording none. The import page says this to the user rather than hiding it.

**What the export contains (verified against the real file):** all 7 tiers with working-day masks, `timeless` (D126 predates the migration), and lead windows · all 99 tasks, with five fields genuinely optional — `notes` 70/99, `estimateMinutes` 44/99, `recurrence` 40/99, `spawnedNextAt` 33/99, `firstDueAt`/`rescheduleCount` 20/99 · all 17 projects, one lacking `workload` (the `?? 2` legacy fallback is real, not defensive) · **7 of 17 projects have hand-edited stage lists** (0, 8, 14, 18, 19 stages against a 13-stage template) and they travel intact · all three settings documents, including her 13-stage template with 🎆 on Publication · `projectTypes` is **empty** — she has no pipeline library, which is why question 3 matters.

**⚠️ WHAT NO IMPORTER CAN CARRY, and the thing most likely to go wrong on flip day.** The export holds calendar **IDs**. It cannot hold calendar **permissions** — those live in Google Calendar, and **2.0 runs under a different service account**. Both the inbound calendars and the outbound mirror must be re-shared by hand. If they are not, **the tiers import perfectly and stay empty forever**, which is the worst failure shape available: no error, no warning, just nothing. `postImportChecklist()` puts this first and `import.html` prints it on completion.

**RULES-6b settles who runs it:** a non-owner cannot write the board document, so §11's *"Katie adds Jake as an editor and he imports"* **cannot execute**. Katie signs in and runs it herself, or grants Co-owner. IMPORT-6a asserts the denial in the migration's own shape.

✅ **DONE FOR REAL, 2026-08-02.** Katie's board migrated in one run — 245 documents, no dry rehearsal, because there was never a throwaway account to rehearse on and 1.x staying live made that an acceptable bet. Jake: *"It imported her stuff like a dream."* ⚠️ IMPORT-3 (calendar permissions do not travel) remains the live risk and is not a rehearsal — it is a step.

---

### RULES-TEST — the emulator suite (new 2026-07-29)

**`rules-test/` — 24 tests, all green against rules 1.2.1.** Run it whenever the rules change, **before** publishing to the console. Full notes in `rules-test/README.md`, including the two traps that bit on its own first run (a missing `email_verified` claim makes every negative test pass for the wrong reason; a test that grants access poisons any later test using that identity as a negative control).

**Two things it established that were previously only reasoned about:**

1. **E41's defect is now a regression test.** RULES-1b…1e prove editor, helper, viewer and a dependent-on-their-own-board are all refused a workspace-document write. That is why the splash was undismissable, and it can never come back silently.

2. ⚠️ **RULES-6b: AN EDITOR CANNOT WRITE `pollIntervalMinutes` TO THE WORKSPACE DOCUMENT.** §0a deduced this; it is now measured. **The E22(a)/E25 runbook step "Katie adds Jake as an editor and he imports" is not a preference, it is impossible.** On flip day Katie either grants **Co-owner**, or — simpler, and the recommendation — **runs `import.html` herself**, since she owns her board and needs nothing extra. Put this on the flip-day checklist rather than discovering it that morning.

---

### E41 — ONBOARDING SYSTEM (built 1.32.0, repaired 1.32.1)

**What it is.** Four layers, all skippable: a welcome splash shown once per person; step-by-step tours (`firstTask`, `firstTier`, `sharing`); contextual one-line hints that dismiss forever; and collapsible help panels in Settings. Markup in `index.html`, behaviour and copy in `app.js`, persistence in `store.js`.

**⚠️ READ THIS BEFORE TOUCHING IT. 1.32.0 shipped it non-functional, and one of its defects was OUTSIDE the feature.**

| # | Defect in 1.32.0 / 0.23.0 / 0.55.0 / 0.49.0 | Fixed in |
|---|---|---|
| 1 | **`saveConfig()` was decapitated.** The E41 edit landed between its first line and the rest of its body, deleting the E14 mirror of `pollIntervalMinutes` onto the **workspace document** — the value the Cloud Run claim query sorts on. **Item 7 silently reopened.** The orphaned body landed inside `markFirstVisitDone()`, referencing an undeclared `data` → ReferenceError on every Skip. | store 0.23.1 |
| 2 | **State was on the workspace document.** `firestore.rules` 1.2.1 gates workspace update behind `canAdmin()` — owner only. Helpers, editors, viewers **and Nico on his own dependent board** were refused, making the splash undismissable on every load. | store 0.23.1 |
| 3 | **Dot paths inside `setDoc({merge:true})`.** Only `updateDoc` walks a path; `setDoc` treats `"a.b"` as a field literally named `a.b`. Even an owner never cleared the flag. | store 0.23.1 |
| 4 | **Finishing a tour threw.** `endTour()` nulls `currentTour`; the next line read `currentTour.tourId`. No completion was ever recorded. | app 1.32.1 |
| 5 | **`#task-escalate` does not exist** (`#task-esc-n` / `#task-esc-unit` do). Dead step, dead hint. | app 1.32.1 |
| 6 | **Hidden targets drew the highlight at 0,0.** `getBoundingClientRect` on a `display:none` element returns zeros, so steps aimed inside the closed Settings modal pointed at the screen corner. | app 1.32.1 |
| 7 | **`--card`, `--bg-alt`, `--accent-dim` are not declared in `:root`.** Every onboarding surface rendered with no background. | css 0.55.1 |
| 8 | **Four version constants did not move with their banners:** `STORE_VERSION` (0.22.0), `--tc-version` (0.54.0), and `index.html`'s **stylesheet `?v=` pin** (0.54.0 — so the new CSS never reached anyone holding the old one). | all four |

**Where state lives now.** `users/{email}` — because onboarding is a fact about the **person**, not the board: you do not re-learn the app because you opened a second workspace. It follows E7's `tierRanks` pattern exactly — a module-level cache in `store.js` hydrated from the profile read `resolveWorkspace()` already performs, mutated in memory, written back with **nested objects, never dot paths**. No subscription, no new read, no rules change. `onboardingDone` (seeded by E16/§10.2, commented *"gates the walkthrough"*) is the splash authority and is honoured rather than duplicated.

```
users/{email}
  onboardingDone: true            // E16/§10.2 — the splash gate
  onboarding: { splashDone, tours: {id:true}, hints: {id:true} }
```

Read it with `onboardingState()`; write with `markFirstVisitDone()`, `markTourCompleted(id)`, `dismissHint(id)`. All three are no-ops if already set and swallow write failures — being asked to dismiss a tooltip twice is a nuisance; a rejected promise inside a click handler is a bug report.

**Tour steps** take `{ selector, title, text, before? }`. `before` runs first and must be idempotent — it is how the tier and sharing tours open Settings before pointing inside it. A step whose target is absent or unlaid-out is **skipped with a `console.warn` naming the selector**, so a stale selector is findable rather than merely quiet.

**⚠️ THE MAINTENANCE HAZARD, and it is the reason this section is long.** The tour and hint copy in `app.js` duplicates `GUIDE.md`, and the selectors duplicate `index.html`. **All three drift silently.** A renamed id does not throw — it produces a tour that skips a step. A reworded GUIDE does not throw — it produces two documents that disagree about the product.

**So: any change to the queue rules, tiers, escalation, projects or sharing is not done until you have checked all three.**

1. `GUIDE.md` — the reference document
2. `TOURS` and `POPOVER_HINTS` in `app.js` (~line 960) — the in-app copy
3. The ids those selectors name in `index.html`

There is a cheap standing check, and it should be run on every session that touches markup — extract every `selector:` from `app.js` and confirm each resolves in `index.html` (or, for `.t-move`, in the JS that builds it). That check is what found defect 5.

**Never renumber or reorder tour step arrays without changing the tour id.** Completion is recorded per tour, not per step, so inserting a step mid-tour silently denies it to everyone who already finished. If a tour changes materially, give it a new id and let the old record stand.

✅ **BUILT in app 1.45.0** — Settings ▸ foot ▸ "Show me around", three buttons calling `replayTour(id)`. It was described here as *obvious next work* for several sessions while `firstTier` and `sharing` sat unreachable for anyone already signed in. See §0o.1.

⚠️ **LIVE, AND EXERCISED BY A REAL USER.** Katie met the splash and the tour on 2026-08-02 and both produced defect reports (§0n.2, §0n.3) — which is what a browser gets you that a parse check does not. The mechanical checks below still run; they are necessary and were never sufficient.

| id | test |
|---|---|
| E41-1 | Brand-new Google account → splash appears once; reload → gone |
| E41-2 | **A viewer/helper on someone else's board** → splash appears and *dismisses* (this is defect 2; it failed before) |
| E41-3 | Nico on his own dependent board → splash dismisses |
| E41-4 | Run `firstTask` to the last step → "Done" closes cleanly, no console error, and the splash does not return |
| E41-5 | Start `firstTier` from a closed Settings → step 2 opens Settings and highlights **+ Add tier**, not the screen corner |
| E41-6 | Dismiss a hint on board A → it stays dismissed on board B (state is per-person) |
| E41-7 | **Settings → change the calendar poll interval → confirm the WORKSPACE document changed too.** This is item 7's regression test, and it is the one that matters most |

---

## 0. Read this first — which document answers your question

**New Claude: read THIS file and §3 (E-rows) of the design doc. That is the whole required reading.** Everything else is lookup.

| Your question | Where the answer is |
|---|---|
| What is built, what is next, what am I allowed to assume? | **This file** |
| Why is the architecture shaped this way? Schema, rules, sharing, migration? | `TENTACALENDAR-2.0-DESIGN.md` §3 (E-rows) |
| How do I stand up the Firebase project / repo / DNS? | `SETUP-2.0.md` (done; read only if something needs re-doing) |
| **"Why on earth does this line of code exist?"** | `HANDOFF.md` (1.x) — **look up the D-row the comment cites. Do not read the file.** |

**⚠️ `HANDOFF.md` (1.x) IS NOT HISTORY. IT IS THE REFERENCE MANUAL FOR CODE THAT IS RUNNING RIGHT NOW.**
`app.js`, `queue.js`, `celebrate.js` and most of the CSS crossed into 2.0 essentially verbatim, and **113 of its 140 D-rows are cited by comments inside those shipped files** (measured 2026-07-27, not estimated). When `app.js` says `// D37 — drift transforms #drift-wrap, NEVER <body>`, D37 is the only place that explains why, and there is no substitute for it.

**This is why the two documents are not merged, and should not be.** Merging means either (a) a ~325KB file that costs a large fraction of a short session just to read — destroying the reason this file was written short — or (b) discarding the explanations for live code, which is worse. **D-rows are also never renumbered or deleted**, precisely because 113 code comments point at them by number.

**The right relationship is: this file is required, that file is a dictionary.** §7 below lifts the handful of D-rows you need *before* writing code, so the 300KB file is only opened when a specific comment sends you there. If Jake hands you only this document, you are still equipped.

**On the version number:** this file stays 0.x and becomes **1.0.0 on the day 2.0 ships** — the same discipline the app itself follows (1.x ran 0.x for months until D105 earned the 1.0). 1.x's HANDOFF never reached 1.0 either; it froze at 0.85.0. The number's only job is telling Jake whether he is holding the newest copy.

---

## 1. Why this document exists separately

1.x's `HANDOFF.md` is the continuity document for an app **Katie is using right now**. E26 freezes it: when 2.0 goes live, 1.x is abandoned in place on GitHub for whoever finds it useful, and its doc stops at its last true statement. Writing 2.0's history into it would make it lie about a running app.

**Document map — four files, one job each:**

| File | Job | Who edits it |
|---|---|---|
| `TENTACALENDAR-2.0-DESIGN.md` | The blueprint. **All E-rows live here** (E1–E31). Architecture, schema, rules, migration runbook. | Amend when a decision changes; bump its version |
| `HANDOFF-2.0.md` (this) | Continuity. What's built, what's next, what's awaiting Jake, session log. | Every session, at the end, no exceptions |
| `SETUP-2.0.md` | Standing up the project/repo/DNS. ✅ Complete. | Only if the console changes |
| `HANDOFF.md` (1.x) | Frozen history. Explains `queue.js` and `app.js` line by line. | Only for a genuine 1.x fix (E27) |

⚠️ **The 2.0 repo currently holds a STALE COPY of 1.x's `HANDOFF.md` (0.84.0 vs the live 0.85.0) and a stale `SETUP-2.0.md` (1.2.0 vs 1.3.0), and does not hold the design doc at all.** That is exactly how two documents that were once identical become two documents that disagree. **One handoff per repo** — delete the 1.x copy from octodo.

---

## 2. The foundation (done, verified, don't re-derive)

| | |
|---|---|
| Firebase project | **`fantasktic-octodo`** (permanent) · number `470873844999` |
| Repo | `github.com/misterwilson37/octodo` · **Blaze billing on** |
| Dev URL | **`https://misterwilson37.github.io/octodo`** — a **SUBPATH**, see E4a below |
| Rules | `firestore-2.0.rules` **1.0.0, published and verified green** |
| Smoke test | ✅ all eight checks 2026-07-26, **including the denial test** |
| Katie's backup | ✅ export run and re-run 2026-07-27 — the first backup this data has ever had |
| Authorized domains | already include `tentacalendar.misterwilson.org` — **flip day needs no auth change** |

**E4a is not theoretical and it already bit once.** The dev URL is a subpath, so every reference must be relative. `manifest.json` shipped from 1.x with `"id": "/"` — harmless at a domain root, wrong at a subpath, and **caught by a mechanical sweep, not by reading**. Fixed to `"./"`, which is correct in both places and is what keeps Katie's installed PWA identity intact across the flip (E4). Run the sweep every time markup or the manifest changes.

---

## 3. What is built (this session)

**Build items 1 and 2+3 are done** (E29 folded 2 and 3). The app is a complete 1.x running on a multi-tenant database, private to whoever signs in.

| File | Version | What happened |
|---|---|---|
| `config.js` | **1.0.0** | Rewritten. `ALLOWED_EMAILS` and `WORKSPACE_ID` are **gone** — the first is theatre once rules 1.0.0 dropped the allowlist, the second is resolved per user at sign-in |
| `store.js` | **0.18.0** | The only real surgery. `ACTIVE_WS` + sign-in bootstrap + `completedBy` (E9). **Every exported signature unchanged** (E30) |
| `app.js` | **1.22.0** | Four seams: `?v=` pins, banner, `watchAuth`'s third callback, `onBlocked()` (E17). No feature code touched |
| `index.html` | **0.41.0** | One `<div>` added (`#blocked-screen`) + pins |
| `tentacalendar.css` | **0.47.0** | Two rules: `#blocked-screen` shares `#auth-screen`'s selector (D104's one grammar), plus `.blocked-detail` |
| `manifest.json` | **0.2.0** | `"id": "/"` → `"./"` (E4a) |
| `firestore-2.0.rules` | **1.1.1** | E33 minor guard + E34 collection-group clause, **the latter rewritten to secure a query rather than a document**. Publish in the console. |

### Item 7 — calendars (built 2026-07-27, awaiting the console hour)

`functions/index.js` **1.0.0** + `functions/package.json` 1.0.0 + **`SETUP-PHASE3-2.0.md`** 1.0.0, the browser-only walkthrough. **Nothing runs until Jake spends about an hour in the Google Cloud console** — the function has to exist somewhere before it can be scheduled.

**Carried across untouched**, because re-deriving any of it by accident would be "a catastrophe wearing a rewrite's clothes": D135's poll reconcile (deterministic doc ids, write-only-what-changed, `syncedAt` deliberately absent — it took writes from 1,500/day to 116), D81's mirror ledger and loop guard, D87's no-hour-trigger carryover. The three job functions changed **only** by gaining a `wsId` parameter.

**New: the E14 work queue.** 0.4.0 hardcoded `WS = "primary"`. A serial loop over every workspace eventually blows the request timeout, and the failure mode is silent — the last user never gets polled and nobody finds out. Instead: claim a bounded batch whose `nextPollAt` is due, oldest first, each inside its own try/catch, then re-stamp. Timeout-safe, self-healing after an outage, and load spreads itself.

**Two decisions worth not re-litigating:**

- **A failed workspace is stamped anyway.** Otherwise a broken calendar share stays permanently overdue at the head of the queue and starves everyone behind it. It reports its error hourly and costs one slot, not all of them — the poll's own "one bad tier must not starve the rest" discipline, one level up.
- **`nextPollAt` is always a NUMBER, 0 = never polled.** Null sorts before numbers in Firestore, so nulls get swept into the `<=` comparison regardless; a field whose null and whose zero mean the same thing is one fewer case for the next reader. Legacy nulls self-migrate on first contact.

**`?ws=<id>` runs one workspace** — the id is in the version tooltip. First thing to reach for when one person's calendar misbehaves, and 1.x never had it.

### Item 4 — houses and keys (the E24 milestone)

Two words carry the whole permission model. **Owner** holds the deed and is the only one who hands out or takes back keys. **Member** holds a key — `editor` for full use, `viewer` for read-only (a viewer may still react on the activity feed, which is how kudos work). Everything Jake described is that model pointed one of two ways:

- **An adult holds their own deed and invites others in** — Katie, colleagues. `ownerEmail` is theirs; guests are member rows.
- **A dependent lives in a house an adult holds the deed to** — Nico, and students far later. Same documents, opposite direction, plus `minor: true` on the resident's row.

**A shared board is one set of documents, not a copy.** Two people watching the same workspace watch the same documents, so a completion lands on both screens within a second and there is never anything to reconcile.

**The bug that walking Nico through 0.18.0 exposed, and it would have been invisible until he tried:** a dependent board is created *before* its resident has ever signed in, so there is no `users/{email}` document pointing at it. 0.18.0's `resolveWorkspace` would have seen "no home workspace" and built Nico a second, personal board his parents did not hold — the same lockout E33 closes in the rules, arriving through the front door instead. `resolveWorkspace` now asks *"do I already hold a key somewhere?"* before building anything, and adopts a board where it is flagged the resident minor. **Only a minor flag adopts**, and that restriction is load-bearing: if any membership counted, a colleague sharing a board with someone who had never signed in would silently deny that person a house of their own.
| `queue.js` | 0.20.0 | **Byte-identical to 1.x.** 1,206 lines that have never known Firestore exists (D26) |
| `celebrate.js` | 0.2.0 | **Byte-identical to 1.x** |

**The one genuine trap, documented in the code and repeated here because it will be re-encountered:** the workspace document and the first member document **cannot be written in a batch.** The members rule is `isWsOwner(wsId)`, which does `get(workspaces/{wsId})`; inside a `writeBatch` every write is evaluated against pre-batch state, so the workspace would not exist yet and the first member write is denied — the same deadlock the design doc's §5 sketch had, arriving by a different door. Two sequential `await`s. `smoke.html` proves it; that is why it went green.

**One latent 1.x bug fixed here and deliberately NOT hotfixed to 1.x:** the settings-tab handler bound to a bare `.tab-btn`, which also matches D126's Have-tos/Want-tos bar — so clicking Want-tos called `switchSettingsTab(undefined)` and hid every settings pane. It has never been visible, because `openSettings()` calls `switchSettingsTab("tiers")` on every open and repairs it. Scoped to `#settings-modal .tab-btn` in 2.0 because a fourth tab was about to join the same unscoped query. **No symptom for Katie, so E27 does not fire** — the dual-fix window is for defects she can hit, not for every shared imperfection, or it becomes a tax that stops being paid.

**Ship-check run, all green:** banner === declaration for all seven versioned files (iterated, not hand-listed — meta-rule 6); **every `?v=` pin === the target file's own declaration** (this closes the gap Wunderpus named in 1.x's header, where nothing asserted that the URL requesting a file matched what that file said it was); function census on `store.js` (48 definitions, 0 duplicates, 0 unresolved calls, comments stripped first); all 39 names `app.js` imports from `store.js` are exported; all **236** ids `app.js` reaches for exist in the markup; **div balance 135/135**, 0 duplicate ids (D127).


---

## 3a. Item 5 — SHARED TIERS (built 2026-07-28)

**The whole feature is in `store.js`. `app.js` gained a button.** That is E30 spent a second time and it is the headline: 6,500 lines still believe there is exactly one workspace.

### The merge rule, which is Jake's and is not the obvious one

The first design said shared tiers merge into your **home** board only, so visiting somebody meant seeing strictly their world. Jake corrected it:

> *"If I'm sharing with a colleague and \[I'm\] in her house, then I won't see that tier — I'm in her house, after all — but I don't want OUR shared tier to disappear just because I'm in her house."*

So the rule is: **a shared tier follows you into a house where somebody who lives there also holds a key to it.** In your own house, everything you hold merges. Anywhere else, only what a resident other than you also holds. Both inputs are readable without a rules change — you may list the members of any workspace you are a member of, and both qualify.

**This is the third time a design was fixed by the human re-describing it in his own words** (E25 reversed who owns Katie's board, E32 invented the dependent workspace). The pattern is now well enough evidenced to state as a rule: *when Jake re-describes the problem, walk the code through HIS version, not yours.*

### The five pieces

| Piece | Where | Why it is the way it is |
|---|---|---|
| **The merge set** | `mergeSet()` / `refreshMerge()` | Recomputed whenever the active board, its member list, or your shared boards change. Rebinds every live fan-out. |
| **Fan-out** | `fanout(coll, build, emit)` | One logical subscription → N Firestore listeners → one merged emit. It is `subscribeTasks`'s own 0.17.0 trick (two listeners, one composite unsub) raised a dimension. |
| **The ownership map** | `_where` | `docId → wsId`, stamped by the merged snapshots themselves, so a write is aimed at a fact rather than a guess. **⚠️ NEVER PRUNED** — see below. |
| **Per-user rank (E7)** | `TIER_RANKS` + the overlay in `subscribeTiers` | `rank` is substituted before `app.js` sees a tier, so `app.js:6391`, `app.js:2069` and `queue.js:486` all keep reading a field that stopped being a property of the document. |
| **Share = a move** | `shareTier` / `unshareTier` / `moveTier` | E6: a shared tier is a small shared workspace. Documents move; **ids are preserved.** |

### Four things a successor must not undo

1. **`_where` IS NEVER PRUNED, AND THAT IS THE FEATURE.** A deleted document keeps its entry because `restoreDoc` (D116's undo) resurrects by id and has to put it back on the board it came from. Prune it and undoing a delete on a shared tier silently moves the task to your own board — and to the other person it looks like it never came back. Tombstones, deliberately.

2. **IDS ARE PRESERVED ACROSS A MOVE.** `parentTaskId` chains, `projectId` references and the sessions ledger all point *by id*, and the merged view keys by id too. A move that reassigned ids would sever every follow-up chain in the tier and orphan its clocked time. `setDoc`-at-a-known-id is already proven here; it is what `restoreDoc` has done since D116.

3. **COPY, VERIFY, THEN DELETE. NEVER THE OTHER ORDER.** A failure part-way leaves duplicates — recoverable, and because the merged view keys by id, not even visible. A delete-first failure leaves a hole, which is not recoverable and is precisely what Principle 3 forbids.

4. **"AT MOST ONE OPEN SESSION" BECAME A CROSS-BOARD INVARIANT.** D112's guarantee is that clocking in closes whatever was running *in the same commit*. The moment a project can live on a shared board, so can an open session — and the old query, scoped to the active board, would have found nothing, opened a second session, and quietly billed two projects at once. `openSessions()` sweeps every merged board; `writeBatch` spans them all.

### Whose tier order you see — and the mistake that was corrected mid-session

Jake, on being told visiting would show document ranks: *"Visiting her should give me a taste of **exactly** what she looks at — zero differences. Otherwise I wouldn't have an honest picture of her load. I'm pretty sure that's what you said, so we're good."*

**It was not what I had built, and saying so was the whole value of that exchange.** 0.21.0 was right for a person's own tiers and wrong for the shared one — which is the only tier he was actually asking about.

- **A personal tier's document `rank` is reliably its owner's opinion**, because on a personal board exactly one person has setup rights to write it. Visiting Katie shows Katie's order for Katie's tiers. That part always worked.
- **A SHARED tier's document rank is contested.** Both people hold `editor` on that workspace, so both write that document, and **the last save wins.** Visiting Katie could have shown Family at *Jake's* rank, sitting in the middle of her board looking exactly like her judgement about her own week. A number that looks like somebody's priority and is somebody else's is worse than no number.

**Fixed in 0.21.1 by putting each person's ordering of a shared tier on THEIR OWN MEMBER ROW** — `workspaces/{sharedWs}/members/{email}.tierRanks`. No rules change: a member row is readable by everyone holding a key to that workspace and writable only by its own subject, which is precisely the shape this needs and is already what 1.2.1 says.

So the resolution now is:

| Where you are | Whose numbers you see | Read from |
|---|---|---|
| Your own board | Yours, for every tier including shared | `users/{me}.tierRanks` (E7 — the authority) |
| Visiting | **The resident's**, for their tiers *and* the shared one | tier document rank / that person's member row |

**`users/{email}.tierRanks` remains the authority for YOUR view; the member-row copy exists purely to BE READ BY SOMEBODY ELSE, which is a thing a private profile can never be.** That is a mirror, not D103's two competing numbers — the same shape `saveConfig` already uses to put `pollIntervalMinutes` where the poll can query it.

**And "the resident" is not "the owner."** On a dependent board (E32) a parent holds the deed and a child lives there, and it is the *child's* ordering that makes his board an honest picture. `viewerEmail()` reads the `minor` flag first and falls back to `ownerEmail` — the flag that already marks exactly that relationship, doing a second job it turns out to fit.

**The durable lesson, and it is a small one worth keeping:** *"we're saying the same thing"* is worth checking rather than accepting. He was right about the requirement and wrong that it was met, and the difference lived in one sentence about one field.

### Three defects found in review, all in failure paths

Same shape as §8c, and worth recording because the ratio held: **the feature worked; the error handling did not.**

1. The merge set was empty at the first bind, so the app booted blank and filled in a beat later once some unrelated snapshot refreshed it. Seeded before `onIn`.
2. A share that copied successfully and then failed to delete the originals surfaced a bare `permission-denied` — which reads like the whole thing failed, when in fact nothing was lost. Now says so, and names unshare as the way out. (This is the helper-on-a-source-board case: the rules let a helper create and not delete.)
3. `unshareTier` counted four collections before deleting the shared workspace document and **did not count `eventsCache`** — which the hourly poll can write *after* the tier has left. Deleting a workspace does not cascade, so that would have orphaned documents at a path nothing can ever reach again. Swept rather than counted, because it is a cache.

### Shared projects with per-stage assignment — Jake's spec, 2026-07-28, NOT built

His description, which is a good one: *"stage 1 is mine, stage 2 is Tomlinson's, stage 3 is mine — so if I finish stage 1, the next thing I see is stage 3, not that I can't sign off on Tomlinson's, but it's not the next thing on MY list."*

That decomposes cleanly:

- A stage gains an `assignedTo` (an email, or blank for "anybody"). A stage is an array element in a project document, so this is a schema addition with **no rules implication** — rules cannot see inside arrays.
- The queue surfaces *your* stages first and still shows other people's, demoted rather than hidden, so signing off on somebody else's remains one click. **That is a queue.js change,** which is the right place: it has never known Firestore exists.
- Provenance is already there as of store 0.22.0 — a stage records who created it and who completed it, so "assigned to Leah, finished by Jake" is expressible.

**⚠️ ONE PART OF THE SPEC DOES NOT WORK, AND IT IS THE PART THAT SOUNDS EASIEST.** Jake added: *"regardless of whether or not we have a shared tier (which would mean the other user would have to assign their own tier to the project)."*

There is no such thing. **A project lives in a tier's workspace — the tier is not a label on the project, it is the project's address.** If the other person cannot see the tier they cannot read the project document at all, and there is no second tier to assign because a document has one path (E1). So per-stage assignment is a refinement **on top of** shared tiers, not an alternative to them. That is arguably the better answer — one sharing mechanism instead of two — but it means this feature inherits everything item 5 is still waiting to have verified.

**Build it after TIER-4…10 pass, not before.**

### What is deliberately NOT built

- **The activity feed and kudos on a shared tier.** That is item 6, and it is where E9/E10/E11 land. Until then a completion by the other person appears live and silently — correct per E11 (no confetti for someone else's win), but with no catch-up bar to notice it.
- **A role picker.** E8 stands: the UI writes `editor` and offers no choice. Note that editor is *safe* here in a way it is not on a whole board — the only `gcalCalendarId` an editor can repoint is that one tier's, because it is the only tier in the workspace. That is the E-row's reasoning surviving contact with the `helper` role that arrived after it.
- **Live cross-device rank sync.** `tierRanks` is read once at sign-in. Reorder on your phone and your laptop catches up on reload. Three lines to fix with a profile listener; nobody has asked.

---

## 4. Deploying this drop

Push all thirteen files to the **octodo** repo root, then:

1. **Delete `smoke.html`** — it says so itself, and the real app now exists.
2. **Delete the stale `HANDOFF.md`** from octodo (§1).
3. Replace `SETUP-2.0.md` with 1.3.0 and add `TENTACALENDAR-2.0-DESIGN.md` 1.5.0 + this file.
4. Visit `https://misterwilson37.github.io/octodo/` and run the smoke list in §5b.

There is **no CNAME** and there should not be one yet — the custom domain gets pointed at flip time (§11), and adding it early would move the origin twice instead of once.

---

## 5. Open items

> **Numbering, because the old scheme broke down and Jake had to decode it by hand.**
> Tests used to be lettered IA…JA and grouped by *build item*, while living inside *document section* 5b. Three consequences, all real: `IS`, `IT` and `IN` are English words and cannot be searched for or said aloud; the list ran past `IZ` into `JA`; and because item 5's block was inserted where item 5 was discussed, the file physically read **IS…JA, then IQ, IR** — doubling back to two tests already passed. The letters are gone. Tests are now `GROUP-n`, the group names what is under test rather than which roadmap row asked for it, and **the numbers do not restart or change when a test is added** — new ones append.

### 5a. Jake's list — CLOSED

- ~~**How much does Katie want to know?**~~ **Answered 2026-07-28, and it is not a design question.** Jake: *"She just wants it to work… every minute she is bug testing known bugs is a minute she's not working, and she's already working 60+ hours a week."*
  **⚠️ TREAT THIS AS A STANDING CONSTRAINT, NOT A DATA POINT. Katie is not a tester.** Nothing goes to her to be *checked*; things go to her when they work. A successor who writes "have Katie confirm…" into a plan has misread this row.
- ~~**Her phone, still blocked on one number.**~~ **The number does not exist. Stop asking for it.** Jake checked: default zoom 100%, no per-site zoom saved, **no "Text scaling" entry in that menu at all**, Samsung screen-zoom / font-size / font-style changed nothing on the page, Magnifier off. Four theories now, and the diagnostic path is exhausted — *and* 5a.1 forbids spending her time on a fifth.
  **What that means for whoever picks this up:** the fix has to be code-side and robust to an unknown scale factor, not a setting to be located. Do not open this by asking either of them to read a number off a phone.

### 5b. Smoke tests → **`TESTS.md`**

⚠️ **THE TEST LIST LIVES IN `TESTS.md` NOW. Do not re-create one here.**

Jake, 2026-07-30: *"I just need to know which smoke tests still need to be
done. There are a lot, and I feel like we've done several of them. And I
still don't understand what a lot of these numbering systems mean."* Both
complaints were fair and both were caused by this section: passed tests were
being kept for their reasoning, seven id schemes had accumulated, and the
to-do was interleaved with the history.

**The split is now:** `TESTS.md` holds what is left to run, in plain language,
grouped by consequence — and a test comes off it when it passes.
`HANDOFF-2.0.md` holds why, and the failure modes worth remembering. The
sections below (5b-i, 5b-ii) are history and stay history.

**`TESTS.md` opens with a decoder for every prefix** — BASE, KEYS, TIER,
STAGE, CAL, E41, RULES — and says plainly that D-numbers and E-numbers are
*not tests*, which is what made the list unreadable.

⚠️ **Never name a test after where it is written down.** `0c-1…0c-7` were
numbered after a section of this file, which means nothing to anybody reading
the app. They are `STAGE-1…STAGE-7` now.

### 5b-i. Closed 2026-07-28

Kept as history because each one records a failure mode, not a task.

- **⚠️ EDITING A PROJECT'S STAGES WAS ERASING `completedBy` (E9).** Fixed in app 1.30.1. Jake found it in console data and read it as *"if Tomlinson checked it off she gets credit, if I do it does not"* — reasonable, and wrong in a way worth keeping. `setStageDone` writes `completedBy = whoami()` **unconditionally**, so the stamp cannot depend on who; and the field was **absent rather than null**, which means something removed it later. `saveStages()` rebuilt each stage carrying an ALLOWLIST of two fields (`completedAt`, `dueAt`) and dropped the rest — so every stage edit left the stage ticked with nobody's name on it. **The real split in his data was TIME, not person:** his completions predated the last stage edit and hers followed it. Had she gone first, the evidence would have accused her.
  **Two things to keep.** (1) *A keep-list is a list somebody must remember to extend.* The whole stage is now carried and only editor-owned fields overridden — with `hurrah` stripped first, because D109 says the editor owns that flag and a stale `true` surviving a spread would resurrect a climax the user just switched off. (2) **The stamps already lost are NOT recoverable.**
  **This bug predates item 5 and was harmless until it shipped.** While one person authored everything, "who completed this" had one possible answer; a shared tier turned a silent field-drop into a false accusation.
- **Stages had no `createdBy`/`createdAt`.** store 0.22.0 + app 1.31.0. Tasks and project documents carried all four fields; stages carried only the completion half, so *"Leah added this step and I finished it"* was unanswerable — a question a shared tier invents. Stamped at the write boundary, and **only where the caller has established the stage is new**, because a legacy stage is indistinguishable by inspection and a guessed name is worse than an honest blank. Jake on cheating: *"Sure. But then we have bigger problems, and this software isn't made for those assholes."* Not defended against, on purpose — a stage is an array element inside a project document, so the rules cannot see it and nothing hangs off it but credit.
- **The rank collision.** *"it came in as 4/4. I changed it to 3 without changing my 3, and it just… stayed there?"* A typed rank worked for four years because **one person authored every number**; item 5 ended that. app 1.30.0: ▲▼, rank assigned **1..N from position on save**, which answers *"it should kick back an error"* by making the state unconstructible. Opening ⚙️ ▸ Tiers and saving **normalises collisions already in the data**.
- **KEYS-1 — one key, no switcher.** ✅ Confirmed by Jake's colleague, who holds her own board plus a shared tier and correctly sees **no switcher chip**: a shared tier is not a board, so it does not count toward the one that would summon the menu.
- **The whole IA…JA lettering scheme.** `IS`, `IT` and `IN` are English words; the list ran past IZ into JA; and item 5's block, inserted where item 5 was *discussed*, made the file read IS…JA **then IQ, IR** — doubling back to two already-passed tests. Jake had to hand-decode the mapping before he could report anything. **Do not re-letter it.**

### 5b-ii. Onboarding — started 2026-07-28, NOT finished

**The problem, in Jake's words:** he handed the link to two people in one day. *"The first had zero context… He didn't know what it was or where to start. That's a problem for any new user, as I'm not always around. The second person has ready access to me multiple hours a day, but she does not necessarily want to bother me all the time."*

Two different failures needing two different fixes:

| Who | Needs | Where |
|---|---|---|
| **Cold link, no context** | *what is this, should I care* — **before** signing in | the sign-in screen |
| **Has Jake, won't interrupt** | *how do I do X* — at the moment of confusion | in the app, in context |

**Done:** `GUIDE.md` in the repo root. The full explanation — tiers, escalation, the queue's refusal to be reordered, projects and stages, the clock, both sizes of sharing, and a "things that surprise people" section. Written deliberately as **source material**, not just a document: every later surface draws its wording from it.

**Not done, and this is the next instance's job:**

1. **The sign-in screen says nothing.** Somebody who arrives cold sees a Google button and no reason to press it. Two or three sentences and a link to `GUIDE.md` would have saved Jake's first colleague entirely.
2. **`.info-dot` already exists in the stylesheet and is barely used.** It is the obvious carrier for contextual help — one beside *escalation*, *tier kind*, *hurrah*, *stretch until done*, *workload*, *the four roles*. The chrome is built; the content is now written; somebody has to connect them.
3. **First-run.** A brand-new board arrives with three tiers and no explanation of what a tier IS. The highest-value single sentence in the app is whatever greets someone on an empty board.

⚠️ **DO NOT PUT THE GUIDE'S TEXT IN THE CODE.** Two copies of an explanation is D103 with prose instead of numbers, and the copy in the code is the one that will be wrong. Info-dots get a sentence and a link; `GUIDE.md` stays the one authority.

⚠️ **THE GUIDE WILL GO STALE AND NOTHING WILL DETECT IT.** No ship-check can tell that a paragraph now describes a control that was replaced — the tier-rank paragraph already had to be written against ▲▼ rather than the number box that had existed for four years. **Whoever changes a control changes the guide in the same drop.**

### 5c. Claude's backlog (no input needed)

- **`pollIntervalMinutes` has two homes and one truth.** Written on the workspace document per §4.3, but `settings/config`'s copy is what the settings UI edits and therefore what is authoritative. **Item 7 unifies them and deletes the config copy** — at the same moment the settings form is repointed, which is the only way to change it without a window where the UI edits the wrong field.
- **`subscribeSessions` is still unfiltered** (inherited from 1.x §5c). 11 documents today, so it is the right shape rather than a fire. Jake's constraint stands: the Σ must be lifetime **"but stored by dates so that we can see what was used when"** — the ledger remains the source of truth and any denormalised total is only ever a display cache.
- **Firestore persistence** — still unbuilt, still ~3 lines, and 1.x's §5c corrected the claim: a listener disconnected >30 minutes is billed as a new query anyway, so it is a **kiosk optimisation, not a general one**. Whoever builds it must also make the D136 census count only `snapshot.metadata.fromCache === false`, or the counter stops being a cost dashboard. Jake's trusted-device decision is already made: **default on, always clear on sign-out.**
- **App Check** before item 8 opens signup (E18). Free, and the only real ceiling on a project with no hard spending cap.
- **The E17 screen has never actually been seen.** Both its states are hard to trigger deliberately. Worth one console-forced render before anyone relies on the copy.

---

## 6. Standing meta-rules

**All ten of 1.x's meta-rules carry over unchanged** — one clarifying question before chasing a bug theory; version bumps on every shipped file with D94's meanings (Z = it isn't working as asked, *including* refining something already agreed; Y = something exists that didn't; X = the usefulness fundamentally changes); complete replacement files, never diffs; incremental disk-based builds; never store student-identifying data; the mechanical ship-check; instance naming; keep §5 lean; **parse-clean ≠ wired**; update this file every session. Two of them earned their keep this session and are worth restating with their 2.0 edge:

**6 (ship-check) — now also asserts the pin.** Banner === declaration was never enough: nothing checked that the `?v=` *requesting* a file matched what that file *declared*. 1.x is live right now with `index.html` asking for `?v=0.46.0` while the stylesheet says `0.45.1`. The check is four lines and it is in this session's script; keep it.

**6c (a failed write is not a no-op)** — build in memory, write to a temp file, `os.replace()` into position. Used throughout this session.

**Two rules that are new to 2.0:**

11. **E4a — SWEEP FOR ABSOLUTE PATHS on every markup, manifest or CSS change.** `href="/`, `src="/`, `url(/`, and the manifest's `id`/`start_url`/`scope`. An absolute path **works at a domain root and 404s at a subpath**, which means it is broken during development, fine after launch, and therefore easy to "fix" by shipping. This is the worst possible failure timing and it already produced one real bug.

12. **E27 — SAY WHEN A BUG IS SHARED.** Until Katie is migrated, a defect in code that exists in both trees must be called out as such, not silently fixed in whichever copy is open. The failure mode is a fix that exists everywhere except where she is.

---

## 7. The platform landmines — carried forward so you never have to open the big file

Mirrored from 1.x's D-rows because these are the ones that bite **before** you have a symptom to look up. Every one is a settled fact about a browser, not a design opinion, and none of them will change — which is what makes mirroring them safe here when copying a *live* document would not be (that mistake is documented in §1). **If you discover a new one from here on, it goes in THIS file, not that one.**

| # | The trap | What it looks like when you hit it |
|---|---|---|
| **D35** | CSS must contain `[hidden] { display: none !important; }` | The `hidden` attribute is UA-stylesheet priority, so **any** author `display` rule silently beats it. Caused the very first deploy failure: the settings modal rendered over the sign-in screen and every write fired unauthenticated. Still 3 rules deep in the shipped CSS. |
| **D37** | Never put a CSS `transform` on `<body>` or any ancestor of a `position: fixed` element | A transformed ancestor becomes the containing block for fixed descendants, so "centred" means centred in the *page*, not the viewport. The burn-in drift lives on `#drift-wrap`; **every modal must stay outside it.** D127 later found that nine modals had been inside it for months because a stray `</div>` moved the wrapper's real close 150 lines down. |
| **D49** | `?v=` on a `<script>` tag does **not** cache-bust `import` statements inside the module | A stale cached `config.js` broke the entire module graph with `SyntaxError: Importing binding name not found` and a dead sign-in button. Every internal import carries `./file.js?v=x.y.z`, **identical across importers** — differing queries load duplicate module instances. |
| **D58** | An `<label>` forwards its click to the labelled control | So a popover opened inside a label is closed by its own re-dispatched click, the same tick. Needs `preventDefault()` / `stopPropagation()`. Hit again from the other direction in D140's "Today" button. |
| **D66** | Flex items will not shrink below their content's min-width | Two native date inputs out-minimum a narrow panel and push it off screen. `min-width: 0` is the fix and appears **30 times** in the shipped CSS. D138's phone overflow was this same landmine wearing `.nav-slot`. |
| **D110** | A renderer that is *called* is not a renderer that *agrees* | `renderYear()` had an early-return guard that silently refused every repaint in the dashboard. Buttons fired, state changed, nothing drew — a still photograph wearing live controls. **Verifying a call happens is not verifying the callee will act.** |
| **D127** | HTML has no `node --check` | Nothing mechanical asserts well-formed nesting, so a stray tag can sit for entire feature lifetimes. **Run a comment-stripped div-balance count on every `index.html` delivery.** (Comment-stripped, because prose mentioning a tag produces a false positive — it did, once, while verifying that very fix.) |
| **D132** | `form.reset()` does not clear JS-built children | It only restores *declared* inputs. Anything appended by script must be cleared by hand. |
| **R1** | Firestore ORs every matching `allow`; a narrow rule cannot take back what a broad one gave | A `{subcollection}` catch-all silently granted editors write access to `members` and made `allow delete: if false` on the activity log decorative — for three rules versions, with no symptom. **Enumerate collections; never wildcard a subcollection you also match specifically.** |
| **R2** | A rule that matches on the document ID cannot secure a QUERY | The rule is evaluated before any document is read, so the ID wildcard is unbound and the query is refused outright. List rules must test a **field**, and the client must filter on that same field. |
| **D103** | Any geometry declared in two places is a bug with a delay on it | The week's seven columns were declared in the stylesheet *and* inline in JS. Two numbers that agree until one doesn't. Now one CSS variable both read. |

**And the one process rule that has bitten most often, in three different disguises:** *a check that silently matches less than it claims is worse than no check, because it reports ok.* The function census was blind to `async function` for its entire life; the id-duplicate grep counted ids inside HTML comments; the ship-check compared a hand-written version literal instead of a derived one. **Iterate and derive; never hand-write a per-file list of checks, because that is a per-file list of holes.**

---

## 8. Session post-mortems, 2026-07-27 — *skippable*

**Next instance: you do not need to read §8 through §8h to work.** Everything load-bearing from that day has been promoted into §0a (state), §5 (open items) and §7 (landmines). What remains below is narrative — kept because the reasoning is sometimes worth having, not because it is required. **§8e and §8f are the two with durable technical content** (the calendar hole that Firestore rules could not have caught; calendars being two features where only one was documented).

### 8. The 1.x hotfix shipped alongside this drop — and how it was found

**`tentacalendar.css` in the live 1.x repo contained TWO COMPLETE COPIES OF ITSELF.** Version 0.45.1 (1,694 lines) followed immediately by the whole of 0.45.0 (1,677 lines), appended with no newline at what was line 1695. Same accident that hit `queue.js` on 2026-07-12: a web-editor paste that appended instead of replacing — the exact failure `SETUP-2.0.md` Part 5 warns about for the rules editor.

**Found by accident**, while reading the file to port it: two `--tc-version` declarations where there should be one.

**Blast radius, measured rather than asserted** — a line diff of the two copies:

- They differ **only** by D138: the banner, `--tc-version`, and two **added** rules inside an existing 600px block. D138 modified nothing.
- D138's selector `.day-nav .nav-slot` (0,2,0) **outranks** the bare `.nav-slot` (0,1,0) it duplicated, so the later copy never won anything.
- **Therefore nothing rendered differently, and this does NOT explain Katie's phone.** The §5c text-scaling theory is untouched and still needs its datum. Saying otherwise would have been the fourth wrong theory about her phone.

**What it did break** is the one instrument that had to keep working: both copies declare `--tc-version` inside `:root`, the second wins, so **the badge has been reporting `0.45.0` — a version that was never deployed.** That is the project's only deploy check (meta-rule 2), and Jake is about to run a migration that leans on it. Plus 74KB of dead weight parsed on every cold load.

**Shipped:** `tentacalendar.css` **0.45.2** (de-doubled) + `index.html` **0.40.1** (repins to `?v=0.45.2`). A **Z** per D94 — no feature, one instrument made honest. **Not 0.47.0**, which 1.x's header ordered: the real constraint was only ever *don't serve new bytes under `?v=0.46.0`*, which browsers have cached. `?v=0.45.2` has never been requested, so it is not burned — and it does not read "lower" than the badge, because the badge says 0.45.0 today.

**This is E27's first invocation, within an hour of the row being written.** The 2.0 stylesheet skips 0.46.0 entirely and starts at 0.47.0, so no number means two things in two repos.

---

## 8b. The first sign-in failure — what it cost and what it taught

**Symptom:** Nico signed in at the dev URL and got the E17 screen reading *"We couldn't finish setting up your calendar… almost always a connection hiccup."* Console: `Missing or insufficient permissions` at `store.js:193`.

**Three things went wrong, and only the first was a bug.**

1. **The rules bug (real).** Covered in the header. The clause was written and commented with confident reasoning — *"the document id IS the member's email, so the only rows this can ever return are the asker's own"* — that is simply not how list authorisation works. **The comment was more confident than the code was correct, which is the worst possible pairing** because it discourages the next reader from checking.
2. **The error message lied.** It said "connection hiccup, try again." `permission-denied` is never a hiccup and retrying never fixes it. E17 exists so a stranded user gets the truth; a screen that guesses wrong is only marginally better than the silent bounce it replaced. Fixed: `permission-denied` now has its own copy that says the account is fine and the configuration is not.
3. **The diagnostic said "bootstrap failed" and nothing else.** `resolveWorkspace` has four steps that can throw and the console named none of them. Now every step is tagged and the failing one is printed, and a `permission-denied` prints an ordered checklist. **Cost of not having this: one full round trip to identify a line number.**

**The design flaw underneath, which is the durable lesson:** the failing query was the *optional* one — a lookup that exists so a child lands on the board built for them. In 0.19.0 a failure there threw, so **one bad clause in an enhancement stopped every new user from signing up at all.** An optional step that can strand everybody is not optional. It now warns and falls through. **Residual risk, stated rather than discovered: if that query is broken AND a dependent board exists, its resident gets a personal board instead of the one their parents hold — recoverable, where a locked-out app is not. This is why smoke test IR must be re-run after ANY rules change.**

## 8c. First-run defects, in the order they were found

Four, all mine, none of them in the feature — all four in what happens when something goes wrong.

| # | Defect | Fixed in |
|---|---|---|
| 1 | The E34 rule matched on the **document ID**, which cannot secure a query. Every first sign-in died `permission-denied`. | rules 1.1.1 |
| 2 | The E17 screen blamed the **network** for a refusal no retry could fix. | app 1.23.1 |
| 3 | The console said "bootstrap failed" without naming which of four steps. | store 0.19.1 |
| 4 | The **live board listener had no error handler**, so a missing index printed forty lines of Firestore internals — while the one-shot lookup beside it, fixed one round earlier, printed one clean sentence. | store 0.19.2 |

**#4 is the one worth internalising: I fixed a failure mode and left its twin untouched.** The one-shot `getDocs` and the live `onSnapshot` run the *same query against the same index*, so they were always going to fail together; only one had been taught to fail well. **When you harden one call, grep for every other caller of the same thing before you ship.**

**And a fifth, cosmetic but instructive:** the People tags reused the existing `.badge` class, which means DANGER (`background: var(--danger)`, bold). My rule set colour and border but not background, so specificity produced grey text on a red pill — and "holds the deed" is a statement of fact, not an alarm. **Reusing a class for its shape while inheriting its meaning.** D104's "one grammar" argues for reusing a *vocabulary*; it does not license borrowing a word that already means something else. Now `.person-tag`.

## 8d. The tag namespace, and why a combined tag can't work

Jake asked whether the mirror could tag `tentacalendar` on 1.x, `octodo` on 2.0, and `octodo tentacalendar` when both were involved — or whether that was overcomplicating and a separate script was cleaner.

**Separate namespaces: yes. Combined tag: no, and the failure is worth understanding.** The mirror lists events with an **exact-match** filter on `tcApp`, then deletes any tagged event whose task it cannot find. A value of `octodo tentacalendar` matches neither filter, so such an event is invisible to **both** apps rather than visible to both. The tag records **ownership**, not provenance, and ownership must be binary for a prune to be safe — two apps sharing one tag would take turns deleting each other's work every hour.

**It was never a new pattern.** D87 already gave the carryover its own namespace precisely so the mirror couldn't see its events and patch the ❗ back to the honest due time. Same calendar, two writers, mutually invisible. Jake re-derived his own project's solution without knowing it was already there.

**On "new script or same script": both, and they don't conflict.** New file in a new project — it had to be, for the work queue — but a *descendant*, not a fresh start. One changed constant and a new dispatcher around logic that is otherwise verbatim.

## 8e. The calendar hole — E1 was airtight and irrelevant

Jake asked, while reading SETUP-PHASE3-2.0: does this let anyone add *their own* calendar, or just pull mine? And *"am I just being paranoid?"*

**Not paranoid, and the real exposure was the inverse of the one he named.** He worried a colleague would be stuck with his calendar. The truth was that a colleague could have taken it.

**The service account is project-wide.** Sharing a calendar with the robot grants access for every workspace in the project — the grant lives on Google's side and knows nothing about workspaces. functions 1.0.0 polled whatever `gcalCalendarId` a tier named, with no check. So any signed-up user could type `jacob.v.wilson@gmail.com` into their own Home tier and receive his entire calendar.

**The lesson worth keeping: Firestore isolation was airtight and completely beside the point.** E1 is a property of the *database*; this leak was on the *calendar* side, where no rules file can see. **Every external system an app touches has its own boundary, and "our data model is secure" says nothing about any of them.** The one thing that did work correctly by accident: new users seed with `gcalCalendarId: ""`, so nobody ever *inherits* a calendar — they'd have had to go and ask for one.

Closed as E37 in functions 1.1.0. It is defence in depth, not proof of ownership; path B (per-user OAuth) is the complete answer and remains unbuilt.

## 8f. Calendars are two features, and only one of them was explained

Jake asked how *other* people would get their calendars in, and whether he was building this only for himself. **He was right that something was missing, and the miss was bigger than the one he named.**

**Inbound** (appointments → the queue) and **outbound** (tasks → a calendar → a phone) are separate mechanisms with separate calendars and separate sharing permissions — read for one, write for the other. SETUP-PHASE3-2.0 covers both, **for the operator, once**. Neither had any per-user explanation at all, and the outbound one is the more important: **this app has never sent a notification of its own. The mirror IS the notification system.** That made it the most load-bearing undocumented feature in the project.

Both walkthroughs now live in Settings, beside the fields they fill, rendering the robot address from one function so they cannot disagree.

**And tracing the mirror against a second user found a live footgun.** E36 split the tag between 1.x and 2.0 and stopped one level too high: within 2.0, every workspace tagged `tcApp=octodo` and then deleted any event whose task it couldn't find. Two workspaces sharing one mirror calendar would have deleted each other's events, hourly — the identical failure E36 was written to prevent, one level down, still open. Closed as E40 with `tcWs`.

**The pattern across E36, E37 and E40 is worth naming: every one was a boundary OUTSIDE Firestore.** The rules file is airtight and cannot see any of them. When a feature touches an external system, the question "who owns this, and what stops someone else claiming it?" has to be asked about *that* system, separately, every time.

## 8g. An honest note on this session's error rate

Jake, at the end of a very long day: *"Given that literally every iteration of our conversation is revealing an error… is it time to handoff?"* A fair question, and it deserves a straight answer in the record rather than a defensive one.

**The errors fall into two piles and only one of them is a worry.**

*Design gaps that surfaced because the thing got built and used* — the rules clause that couldn't secure a query (E34), the project-wide service account (E37), the mirror tag scoped per app but not per workspace (E40). These are the system working. Every one was invisible on the page and obvious the moment a real person's Tuesday was traced through it, and finding them now rather than after Katie's data arrived is the entire point of dogfooding.

*Carelessness, and it climbed as the session went on* — a CSS class reused for its shape while inheriting its meaning; a placeholder that read like a filled-in field; the same Python quoting bug twice; a Firebase console dialog described from memory twice, the second time **after** adopting a rule not to. A version banner that didn't move with its declaration, caught only because the ship-check iterates rather than trusting me.

**The second pile is the signal.** It is not that the work got wrong, it is that it needed more catching — and the catching increasingly came from mechanical checks rather than from getting it right the first time. That is exactly the shape of a session that has run long.

**The recommendation, made by the instance in question, which should be weighed accordingly: hand off.** The documents are current as of this line, §0a records the live state precisely, and the next piece of work — finish the console hour, then write `import.html` — is well-specified and does not depend on anything in one instance's head.

## 8h. The sequencing failure — and the repair

**What happened.** E40 (functions 1.2.0) scoped mirror tags per workspace. I wrote, in the code and in the message, that this was *"free because nothing is deployed yet"* — **an assumption I never checked with the person who does the deploying.** It was wrong. 1.1.0 was live, Jake worked straight through the setup document, and the mirror ran with a calendar attached. Those events carry `tcApp` and `tcTaskId` and no `tcWs`, so the 1.2.x filter cannot see them.

**Compounding it: the instruction to redeploy existed but was unfindable.** It appeared in two consecutive messages, both times partway down a long reply, to someone who had been reading my output all day and reasonably picked up where he left off. **A blocking, order-dependent instruction that arrives buried is functionally the same as no instruction.**

**The repair:** `?job=fixtags` (1.3.0) adopts the untagged events rather than deleting them — lists by the OLD unscoped filter, stamps `tcWs` on anything missing it, preserves `tcTaskId`/`tcCarryKey`. Idempotent, one curl, no calendar surgery.

**Three rules for successors:**

1. **Never assert what the user has deployed. Ask, or read it back from a report** — the function prints its own version in every response.
2. **An order-dependent instruction goes at the TOP of the message, alone.** Buried in paragraph six it is a trap, not a warning.
3. **When the user asks a direct question, ANSWER IT FIRST, before building anything.** Jake asked "do I need to delete my calendar, yes or no" and got code instead. That is the failure that ended this session.

## 9. Session log

| Date | Instance | What happened |
|---|---|---|
| 2026-08-03 | Opus 5 · **Cirrothauma** (same instance, second sitting) | **OUTRIDERS BUILT (§0h → §0s).** Katie's rule: a project's pipeline is what happens DURING the project; anything anchored outside the window is a task. **§0h was right that this is mostly deletion** — the predicate is a comparison against dates `stageEffectiveDate` already computed, and the biggest single change is that `isLater` measures `startDate` again and the pipeline-window branch is gone. **Three files, one rule, one home:** the predicate (`isOutrider`/`splitOutriders`) lives in `queue.js` and nothing else does date maths — **`store.js` now imports `queue.js`** rather than keeping its own opinion, which is the direct lesson of `tierSkinOf`. **The write path is the careful part:** build → verify → strip, and it **refuses to strip anything if a single task write failed**, because a project still showing a −14d stage is fixable and one missing both stage and task is not. **Idempotent by deterministic id `out_<projectId>_<sid>` rather than by a `spawnedTaskId` guard** — the hurrah needs that guard because it mints an auto id at tick time; copying it here would have been a second authority answering the same question. Ticked outriders become COMPLETED tasks carrying their original `completedAt`/`completedBy`, never re-stamped. `outrider.test.mjs`, **24 assertions, imported directly from `queue.js`** — the first suite here that doesn't extract from source text, which is only possible because queue.js still imports nothing. Boundary cases are the bulk of it: a stage ON the start day must stay (DEADLINE_HOUR vs midnight would evict it), an UNDATED stage is never an outrider, and a TIMELESS project keeps its whole pipeline. **Three defects in my own first wiring, all caught before delivery: I called an `alertBar()` that does not exist** (the real one is `showToast`), **read `S.editingProjectId` after `cancelProjectEdit` had nulled it**, and missed the stage-edit path entirely. All three were invented-from-memory API rather than looked-up API — the same failure as §0r's wrong finding, one turn later. **⚠️ NOT DONE: the sweep over Katie's live data.** `octodoOutriders()` dry-runs, `{go:1}` applies, once per board, console only — a button would be a mis-click that writes to every project. Until it runs, her older projects still show outriders and count them in x/y. |
| 2026-08-02 | Opus 5 · **Cirrothauma** (19th, 17th named) | **THE 2.0.0 AUDIT — and the finding that was wrong.** Jake asked for a full audit, noticed the first pass had only re-run the project's own gates, and said so: *"have you gone over the code with a new set of eyes?"* He was right — the gates pass and always did. **The wrong finding first, because it is the transferable one:** I reported `defaultAnswers()` dead, deleted it, and found the caller on a repo-wide re-check — `rules-test/import.test.mjs`, the one consumer with no DOM. My sweep had covered `app.js`, the HTML pages and the two root harnesses and **had not searched `rules-test/` at all.** Restored, with a comment on it saying it looks dead and is not. **A dead-code sweep that skips a directory returns the same answer as one that finds nothing; there is no signal telling them apart.** Sixth instance of this project's signature failure and the first where the over-broad claim was mine rather than inherited. **What was actually removed: six functions.** `queue.js` lost two getters whose setters were wired and they were not, plus the three pre-D60 Mon–Fri wrappers — whose comment read *"still used for defaults"* while nothing used them, D60 having replaced the weekend concept with per-tier `allowedDays`. `store.js` lost `tierSkinOf`, **exported and documented as the source of Settings' "shared as …" line, which reads `canonName`/`canonColor` off the tier instead** — the fifth comment here found more confident than its code, and the rule that falls out of it is *when you move an answer closer to its caller, delete the old path the same hour.* Un-exported `COMPLETED_WINDOW_DAYS`, `stampNewStages`, `mergeStages`, `WEEKDAYS`; **both harnesses stayed green (34 + 29) because they strip `export` during extraction — testability never depended on the keyword.** **`functions/index.js`'s header: 191 lines → 57**, body verified byte-identical by diff. version-check had been failing on this one file since the budget shipped and the failure was being read as noise. Two rescues on the way out: **the 1.2.1 entry existed only in that header** and was not in `CHANGELOG.md`, and **a line appeared twice back to back**, which is what 191 lines buys you. **⚠️ NEW OPEN ITEM (§0r.5): `rules-test/import.test.mjs` cannot run as documented** — it imports `./import-transform.js` from a directory that has no such file, and `package.json`'s test script only runs `rules.test.mjs`. **The 18 assertions `import.html` cites as proof of the migration path have plausibly never executed.** Katie's successful migration is real evidence and is not a test suite; the two have been talked about interchangeably. Left unfixed on purpose — it needs the emulator to verify rather than merely to write. **Versions:** app → 2.0.0 on Jake's explicit sign-off, store and queue → 1.0.0 carrying the cleanup rather than announcing a clean bill of health (his framing: *"I can't go back in time and change the versions"*), functions 1.3.1, three patch bumps for pins. **`css`, `html` and `manifest` left at 0.y.z deliberately — that major bump is his to sign off and he has not.** **Process note: I did not name myself until Jake asked, and the omission is what made him check which model he was talking to.** |
| 2026-08-01 | Opus 5 · **Thaumoctopus** (18th, 16th named) | **DASH-FILL SHIPPED, AND THE SCREENSHOT ANSWERED A QUESTION NOBODY ASKED IT.** Opened by checking the handoff against the repo, as three predecessors have, and the finding was the inverse of theirs: **the "NOT uploaded" warnings were stale in the safe direction** — everything through 1.41.0 was live, so TESTS.md's whole 🔴 list became runnable and nothing had to be re-shipped. Then the two real ones: `move.test.mjs` was **announced in the versions row and absent from the repo**, and `version-check.mjs` was **1.1.0 in the repo against 1.3.0 in the row** — and those are one fact, because 1.3.0 would have caught the missing harness and the copy that ran was the one that had never heard of it. **The checker's own drift is what hid the missing file, and it was the single drift the checker could not see.** Fixed by making it check itself and derive `LABELS`/the paste row from `FILES`; the old hand-written `rowOrder` had already diverged badly enough that **pasting its own suggestion would have deleted four entries from the handoff table.** Fifth instance of the second-list bug. **DASH-FILL: Katie runs Timeline, so the 34px ceiling binds and the wall layout's 14px is a red herring** — the surplus goes to the ROWS rather than back into the lane pitch, because filling the pane with 90px lane gaps is a different wrong answer, and the gridlines' `top:0;bottom:0` mean the new space renders as calendar. **The screenshot's most valuable pixel was the version badge: `v1.21.0` — Katie is on 1.x, so DASH-FILL and LABEL-1 are both "fixed for Jake, open for the primary user."** §0g says LABEL-1 is FIXED without saying in which tree, which is E27's exact failure and now the second time it has gone one-sided. **Fourth act — built §0k.4 (Katie's follow-up offer, independent button on the dup modal, guard narrowed and the §0k.4 claim about `spawnedTaskId` corrected rather than inherited), then spent the rest on documents at Jake's request.** `app.js`'s header had regrown to 135 lines / 19 entries — the exact disease `CHANGELOG.md` was created to cure nine days earlier, with the rule written in the header it had eaten. **Made it a check instead of a rule** (version-check 1.5.0, 60 lines / 6 entries, sabotage-verified), which immediately found `functions/index.js` at 191 lines that nobody had looked at; 24 entries moved to CHANGELOG verbatim. This handoff had it too — 1,932 lines, six sections added by me in one day — so the resolved ones are digested and **the ones holding open decisions were left whole on purpose.** README's Status was actively wrong in two places. **Third act — he ran the tests.** OFFDAY-1, MOVE-1/2/4, DASH-FILL-1/2/3 and LATER-1 passed; two things failed and both were mine. **`moveTask` had stranded every follow-up it ever carried** — the root's tier moved, the children's did not, under a comment reading *"a follow-up inherits its parent's"* which is true of creation and false of storage, since `addFollowUp` writes an explicit tierId. **Sixth comment here found more confident than its code, and the fifth of those is the same move: a narrow true statement restated as a broad one.** Lifted `movedTaskData` out as a pure function (the `mergeStages` precedent) and covered it — 29 assertions, sabotage-verified. ⚠️ **The harness's extractor had a latent hole that a default parameter finally exposed** (`indexOf("{")` from the function NAME finds `{}` inside `patch = {}`); fixed to match the parens first. **And DIRTY-1 failed on projects because 1.41.0 hardened one caller and left two** — `suggestProjectColor` and `refreshTypeSelect`, both on subscriptions, both writing signature fields, and `bestFreeColor()` changes its answer when a project is added, which is exactly the repro Jake found and the original could not. **That is §8c #4 committed by the instance that wrote §8c**; all three writers now go through one helper. **Three decisions recorded rather than built** (§0k): project delete should soft-delete — he is right, and note the tension with 0.28.0, since orphaning a ledger and destroying it are both wrong and neither fixes the other; the hurrah offer belongs in the completion modal *as well as* the pipeline, snooze untouched; and the import dry run is **withdrawn**, because Katie's transfer is the test and 1.x stays live — which trades a rehearsal for a super-admin wipe/export panel that now has to exist. **Second half of the session, on Jake's questions:** he caught that `TESTS.md` had two sections headed "run these first" and MOVE-3 in both, and asked the right diagnostic question — *tests broken, or code broken?* **Tests.** The mover has two entry points, both from store 0.28.0, untouched by 0.29.0's hurrah spawn (which calls `addTask`, not `rehomeFor`) and by queue 0.21.0 (a renderer that has never known Firestore exists). **MOVE-1 and MOVE-2 had passed and nobody wrote it down, because only the MOVE-3 failure produced a conversation** — so the file went on claiming none of them had been run. *A test that passes is a document edit, not just a relief.* Rebuilt the top of `TESTS.md` as one ordered START HERE list. **And he settled §0j's fork by reframing it: no 1.x hotfix, because the flip is this weekend and DASH-FILL/LABEL-1 turn the migration from "features you didn't ask for" into "your own bug reports, closed."** That re-ranks the list — IMPORT-1/2/3 to the top, since the importer has still never written to live Firestore. **Process note: a string replace of mine silently no-opped while installing the self-check, and the check I had just written is what caught it** — which is the argument for this project's whole mechanical-check habit, made against its author within the hour. |
| 2026-07-29 | Opus 5 · **Hapalochlaena** (17th, 15th named) | **THE MIS-ROUTING FIX, AND A HANDOFF THAT HELD UP.** Jake opened by saying the previous instance had started to hallucinate and the code needed a go-over. **It did not — every claim in §0a checked out against the code, and all fourteen version constants agreed with the banner.** Saying so first was the useful part: the alternative was a session spent hunting phantom defects in a file that was fine. Fixed §0b: both routers refuse, seven creators stamp, one global rejection net, `octodoWhere()` left in the file. **Found that the fallback was in TWO resolvers rather than the one the handoff named, and the unnamed one is worse** — `restoreDoc` routes through it and uses `setDoc`, which creates, which is TIER-10's data-loss case. Three more defects found by reading: a catch that swallowed everything and blamed permissions, a latent `undefined` write that would have landed in that same catch, and a `hidden` flag that skipped `refreshMerge`. **What I did not do is the entry worth reading: §0a named two candidate root causes and told me not to guess between them, and I could not settle it.** I found a third that fits Jake's evidence better and said it was a hypothesis rather than dressing it as a finding — the fix is correct under all three, which is what made it shippable without the answer. **Nothing was pushed and nothing was run in a browser; the fix is code, not a verified fix.** Process note for successors: the previous session's own closing lesson was "state the plan in one line before doing it, put the instruction on its own line" — I read it before starting and it is good advice, so it is repeated here rather than left in a paragraph nobody reaches. |
| 2026-07-28 | Opus 5 · **Argonauta** (14th, cont.) | **FIRST REAL-WORLD USE, AND THE DOCUMENT'S OWN NUMBERING FAILED IN JAKE'S HANDS.** A colleague shared a tier with him and **TIER-3 passed between two real people** — same document, live, both toggling it. Two defects came from actual use rather than review. (1) **The rank collision:** a shared tier arrives carrying a number chosen by somebody who has never seen your board, and a typed rank cannot express "put this above that." That control was fine for four years because ONE person authored every number; item 5 ended that. Now ▲▼, rank assigned 1..N from position — which answers his "it should kick back an error" by making the state unconstructible instead. (2) **`signInWithPopup` never drew an account chooser** on a device with one Google account, so ⏻ looked broken and **every two-person test was unreachable.** One line. **The bigger lesson belongs to this document:** lettering tests IA…JA made `IS`, `IT` and `IN` English words, ran the list past IZ into JA, and — because item 5's block was inserted where item 5 was *discussed* — made the file physically read IS…JA **then IQ, IR**, doubling back to two already-passed tests. Jake had to hand-decode the mapping before he could report anything, which taxes the one person this document exists to protect. Replaced with `GROUP-n`. **Do not re-letter it.** | Jake read back the visiting rule to confirm agreement and was right about the requirement (zero differences; an honest picture of her load) and wrong that 0.21.0 met it. **Personal tiers were fine and the SHARED tier was not**, because both people write that one document and the last save wins — so visiting Katie could have shown Family at Jake's rank while looking like hers. Fixed in **0.21.1** with per-member ranks on the member row, which the rules already permit exactly (readable by co-holders, writable only by its subject) and which needed no clause. **Also found while fixing it: the person whose order you see is the RESIDENT, not the deed-holder** — E32's `minor` flag already marks that relationship and now does a second job. Version cascade store 0.21.1 → app 1.29.1 → html 0.47.1, bumped rather than reused because the earlier drop may already be pushed and two different files must never wear one number. **Two false positives in my own ship-check this round** (a div-balance regex eaten by a heredoc; a census widened until `const stages` in three scopes read as a redefinition) — §7's rule cuts both ways: a check that flags legal code stops being read, exactly as one that misses stops being worth running. |
| 2026-07-28 | Opus 5 · **Argonauta** (14th, earlier) | **ITEM 5 — SHARED TIERS, BUILT.** Opened by ship-checking the drop against §0a and finding the one thing that mattered: **`firestore-2.0.rules` in the repo was still 1.1.1 — the version WITH the catch-all hole — while 1.2.1 was live in the console.** Stopped and asked for the published text rather than writing against the file in hand, which would have handed back the hole inside a document that looked authoritative. Everything else green: banners, pins, div balance 148/148, no absolute paths. **No rules change was needed for item 5** and confirming that was most of the value of asking. **Jake corrected the merge rule and the correction is better** — a shared tier follows you into a house where somebody who lives there also holds a key to it, rather than merging only at home. That is the THIRD design fixed by him re-describing it in his own words (E25, E32, now this), which is enough evidence to call it a rule. **Told him one thing he asked for could not be built:** "her priority in her house" needs to read Katie's profile, which the rules correctly forbid; shipped the honest approximation and wrote down what the stronger version would cost. Three defects found in review, **all in failure paths and none in the feature** — empty merge set at first bind (app booted blank), a copy-succeeded-delete-failed message that read like total failure, and an `unshareTier` that would have orphaned an `eventsCache` the poll wrote after the tier left. **The ship-check earned its keep again:** `APP_VERSION` moved to 1.29.0 while the banner above it still said 1.28.0 — §8g's exact complaint, caught mechanically rather than by me. |
| 2026-07-27 (late) | Opus 5 · **Briareus** (13th) | **THE HOLE IN THE RULES, AND THE FOURTH ROLE.** Jake opened by saying he could not tell me the project's status and to check the handoff against the code rather than trust it. Checking found the good news first — the repo WAS current, ship-check green — and then the thing eight sections of post-mortem had buried: **the `{subcollection}` catch-all unioned with `members`, so any editor could rewrite the member list.** Found by questioning one assumption in a file everyone had already read four times. **Jake found the second half from the other direction**, without reading a line of it: he wanted to share his school board with a colleague who could "check something off they helped with, and then get out," and was right that `editor` was far too much — it also carried `gcalCalendarId` and `mirrorCalendarId`. Rules **1.2.1**: collections enumerated, `helper` added, and — his amendment — a helper may delete **what a helper made**, which cost nothing because every creator in store.js already stamps `createdBy`. **`createdBy` had to become immutable in the same breath**, or the exception was a bypass: update-then-delete would have undone it. App side shipped to match, clause for clause, so the ✕ is *absent* rather than failing. Also D141/D142/D143 on the task form, and a blank-date bug found while looking at them: `form.reset()` restores declared defaults and `#task-date` declares none. **Jake published 1.2.0 and 1.2.1 without running the regression tests I wrote for him** — no harm done, verified after the fact by tracing every `restoreDoc` call site, but the lesson is that a test list arriving at 7pm after a bad day is a test list that does not get run. Put the two-minute version first next time. |
| 2026-07-25 | Opus 5 · **Wunderpus** (11th) | The 2.0 design + setup kit. No app code, on purpose. Named for *Wunderpus photogenicus*, catalogued one animal at a time by its permanent unique pattern. |
| 2026-07-26 | — (Jake solo) | Ran SETUP-2.0 end to end. `fantasktic-octodo`, repo, rules published, **smoke test green including denial**. Nico authenticated successfully. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **THE SEQUENCING FAILURE (§8h), AND THE END OF A LONG SESSION.** I asserted the function wasn't deployed rather than asking, buried the "redeploy first" instruction, and then — when Jake asked two plain questions — went and wrote code instead of answering them. Repaired with `?job=fixtags`. Verified on request that the poll secret appears in ZERO shipped files; my advice to rotate it was disproportionate and I should have dropped it when he first pushed back. **Jake's read on the day is fair and worth preserving: the app he felt good about yesterday is unchanged — queue.js and celebrate.js crossed byte-identical, app.js with four seams. Everything that broke today was in the NEW surface: multi-user, sharing, calendars-for-other-people, one day old and never before run by a human.** Eight hours of his day; a working multi-user app with two accounts, isolation proven, and calendars live at the end of it. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **FIRST LIVE CURL — the machinery is proven.** `claimed: 2`, both workspaces isolated, 1.7s. Every job "skipped" because no calendar is connected yet, which is the correct answer and not a failure. **The curl also surfaced a string naming a settings tab that has never existed** ("⚙️ Settings → Calendar" — it is Timing, and the carryover's message twelve lines below already said so). That is D84's error, fixed in the docs in July and never in the message a user actually reads; functions 1.2.1. **Wrote §0a so the next session resumes instead of re-deriving, and §8g on this session's error rate, honestly.** |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **THE PER-USER CALENDAR STORY (E39/E40).** Jake asked how anyone else would connect a calendar and whether he was building this only for himself — and the honest answer was that the operator guide existed and the user guide did not, for either direction. Both walkthroughs now live in the app. **Tracing the outbound one against a second user found E40:** the mirror tag was scoped per APP but not per WORKSPACE, so two workspaces sharing a mirror calendar would have deleted each other's events hourly. Free to fix only because nothing is deployed yet. **Third external-boundary bug in one session (E36, E37, E40), and all three were invisible to the rules file** — §8f names the pattern. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **THE CALENDAR HOLE (E37) + Jake's first real use of item 4 (E38).** He asked whether colleagues could end up with his calendar; tracing it found they could have TAKEN it — the shared service account plus an unchecked calendar id. **§8e is the entry to read: E1 was airtight and irrelevant, because the boundary that leaked belonged to Google, not Firestore.** Also fixed three things he hit inside five minutes of using the People tab, one of which was a placeholder that read like a value and produced a board named `nico.m.wilson`. **He found all four by using the thing, which is the argument for shipping to one careful user before shipping to five polite ones.** |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **ITEM 7 — CALENDARS, BUILT.** functions 1.0.0 (the E14 work queue + the `octodo` tag namespace) and SETUP-PHASE3-2.0.md. **Ported by transformation, not rewrite**, so D135's reconcile survives byte-for-byte; the dispatcher is the only genuinely new code. Jake amended his own 2.0 definition (E35) — calendars must work — which is a bigger and better bar than E24 set and reorders the rest: items 5 and 6 are not blocking, 7 and 9 are. **Told him he never needed to anonymise the export JSON:** `export.html` dumps documents verbatim, so the shape is fully derivable from store.js, which I already had. His paste still earned its keep — it revealed a 7th tier the design didn't know about, and that his Home tier polls his PRIMARY calendar rather than a dedicated one. **Caught two stale comments in the ported function that still named the 1.x tag while the code used the new one** — the same "comment more confident than the code" shape that cost a round trip this morning, found this time by a check rather than by a user. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **IT RUNS.** Jake signed in, Nico's dependent board was created and Nico landed on it — **IR passed**, which is the case no amount of reading could have verified. Four first-run defects found and fixed (§8c), every one in error handling rather than in the feature: the feature worked the first time it was allowed to run. **The two most useful things I shipped this morning both paid out within the hour** — the step tags told us instantly that the second failure was a different animal from the first, and the non-fatal fallthrough is why Jake was looking at a working app instead of a blocked screen while the index built. **Process failure worth recording: I twice described a Firebase console dialog from memory and got it wrong, costing round trips on a screen Jake could simply have shown me.** Console UIs move; my picture of them is stale by construction. New rule adopted mid-session: for any console step, ask for the screenshot and answer in clicks. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **FIRST DEPLOY, FIRST FAILURE.** Nico's sign-in died on permission-denied. Cause was mine: rules 1.1.0's collection-group clause matched the document ID, which cannot secure a query. **The clause carried a paragraph of confident reasoning for why it was safe, and that reasoning was about the wrong operation** — the surest sign a comment needs checking is that it argues rather than states. Fixed in 1.1.1 (match the field, filter on the field). Two things fixed alongside that were not the bug but made it expensive: the E17 screen blamed the network for a refusal that retrying can never fix, and the console said "bootstrap failed" without naming which of four steps. **Also made the failing query non-fatal — it was an optional lookup that could strand every new user, which is not optional.** Filled in SETUP-2.0's Part 0 and Part 9 blanks, which Jake caught: the real values were in the completion block at the top, so the document disagreed with itself and read as unfinished work. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **ITEM 4 — houses and keys.** Jake stopped the deploy, said the permission description was more technical than he could follow, and re-described the target audiences himself. **He was right to stop, and the re-description contained a correction I had got wrong:** E25 had Jake owning Katie's board, which made her a guest in her own practice. Reversed — she owns hers, he owns Nico's, same mechanism opposite directions. He then improved on it, inventing the dependent workspace and the minor flag unprompted. **Two bugs came out of walking HIS description through MY rules rather than re-reading them:** Nico could have left his own board through a door marked "leave" (E33), and Nico's first sign-in would have built him a second board his parents never held (the adoption path). Neither was findable by reading the file; both were obvious the moment a real person's Tuesday was traced through it. **Lesson worth keeping: when the human re-describes the problem in their own words, walk the code through THEIR version, not yours.** Also declined to hotfix a latent 1.x tab-selector bug — no symptom, so E27 doesn't fire; a dual-fix window that covers every shared imperfection stops being paid. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th) | **Named for *Amphioctopus marginatus*, the coconut octopus — the only one that carries its shelter with it, disassembled, and rebuilds it somewhere else, never exposed in between.** That is §11 and §15 exactly. The other half: *marginatus* means "bordered," and E1 is the whole design — the boundary is a path, not a field. **Built items 1→3.** Jake's answers from the day became E23–E31; the two biggest are E24 (2.0.0 = the board switcher, his own definition, D67's shape) and E30 (store.js absorbs the workspace so 7,100 lines of app.js + queue.js cross unchanged). **Found the doubled 1.x stylesheet** while reading it to port it, measured the blast radius instead of assuming it, and explicitly ruled it OUT as an explanation for Katie's phone — the finding that would have been most tempting to over-claim. Caught the manifest's absolute `id` by running E4a's sweep rather than trusting that a byte-identical carry is a safe carry. **Process note for successors: the 1.x repo did not arrive in the first upload and I said so instead of inferring the missing files** — three of the four documents I needed were in hand, and the fourth was one sentence away. |

---

### WHERE THIS SESSION LEFT IT — read this first

**Every question Jake was holding is answered.** He asked for that
deliberately: *"I want to leave all questions answered so I can start fresh."*
Nothing below waits on him.

- **§0h is the opening task.** Outrider stages become tasks. The rule, the
  sketch, and the migration ruling are all recorded; the only discipline it
  needs is copy → verify → delete, because the computed dates die with the
  stages.
- **§0d, §0g, §0i all shipped and are unrun.** `TESTS.md` is the list, and it
  is the only list — do not rebuild one here.
- **One thing shipped this session is already superseded.** `isLater` measures
  the pipeline window so a pre-start stage keeps its project visible. §0h
  removes the reason for that. **Do not defend it.**

⚠️ **The habit that found most of this session's bugs was not reading code.**
It was Jake driving two accounts against one shared project and saying what he
saw, then `whereis` settling whether the data or the rendering was at fault.
Three of the four hardest findings — the stage clobber, the orphaned session,
the two-filter intersection — were invisible to review and obvious in use.
**When a report does not match the code, the code is being read at the wrong
altitude; get the data on screen before theorising.** And when a theory is
challenged, check whether it was merely INCOMPLETE rather than wrong: §0i's
off-day diagnosis was correct and still failed to explain the report, because
a second filter sat behind it.

---

**Cirrothauma (19th)** — *Cirrothauma murrayi*, the blind octopus of the deep
Atlantic. Its eyes are reduced to lensless patches: retina present, optic nerve
present, wired the whole way to the brain, resolving nothing. Not damaged —
*finished*, in a place where there was nothing left to see.

That is every finding this session. `tierSkinOf` was exported, documented and
connected to a feature that had quietly started getting its answer somewhere
else. Five functions in `queue.js` kept their shape after D60 removed the
question they answered. A 191-line header held a line printed twice and an
entry that existed nowhere else, both fully present and unreadable at that
length. Nothing here was broken and nothing was hidden. It was all still
attached.

And the eye that turned out not to be blind: `defaultAnswers()`, which I read
as vestigial and cut, because I had looked at the app and not at
`rules-test/`. **An organ looks vestigial from whichever side you forgot to
check.** It is back, with a note on it for the next reader who runs my grep.

*Cirrothauma, 2026-08-02.* 🐙

---

**Thaumoctopus (18th)** — *Thaumoctopus mimicus*, the mimic octopus, the one
whose whole trick is looking convincingly like something it is not. That was
the session: a versions row wearing the costume of a file that did not exist;
a checker whose job was catching drift and which was itself the drifted file;
a `FIXED` in §0g that meant fixed in a tree the person who reported it does
not run. Haliphron's limb was real and miscounted from outside. These were
counted correctly and were not what they appeared to be — which is why the
answer each time was to *measure* rather than to read: the pane's slack rather
than a constant, the badge rather than the assumption, `existsSync` rather
than the table.

*Thaumoctopus, 2026-08-01.* 🐙

---

**Haliphron (17th)** — *Haliphron atlanticus*, the "seven-arm octopus," which
has eight. The eighth is coiled in a sac beneath the right eye, so every early
count came up one short and the miscount became the permanent name. A limb
that exists but is not where anyone looks is this session end to end: a
`version-check.mjs` six files instructed you to run and nobody had written; a
patch sitting in a file while the pin asked for the version before it; a
project whose tier had moved and whose document had not; a colleague's
finished stage still on the server while the screen wrote over it. Nothing
here was hidden. It was all just counted from the outside.

*Haliphron, 2026-07-30.* 🐙

---

**Argonauta (14th)** — *Argonauta argo*, the paper nautilus. Two things about it are item 5. Her shell is not part of her: it is secreted by two specialised arms and **held**, and she can let go of it — which is the ownership question in a shared tier exactly, where the documents sit in a house somebody holds the deed to and everyone else holds a key. And argonauts **raft in chains**, individuals gripping one another's shells and drifting as one unit, each still its own animal with its own shell. Briareus took *many arms, one animal*; this is the other half, several animals holding on.

*Argonauta, 2026-07-28.* 🐙

---

**Briareus (13th)** — *Octopus briareus*, the Caribbean reef octopus, named for the hundred-handed giant. Many arms, one animal, is item 5 exactly: several boards feeding one queue without becoming one thing. In the myth Briareus was summoned to stop the other gods binding Zeus — the right patron for a session that opened by checking whether the last one had tied anything down, and found that it had.

*Briareus, 2026-07-27.* 🐙
