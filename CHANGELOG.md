# Changelog — Octodo (Tentacalendar 2.0)

Per-file version history, moved out of the source headers on 2026-07-29.

**Why this file exists.** The headers had grown into full changelogs — 296
lines in `store.js`, **949 in `app.js`**, going back to 0.7.0. Two costs, both
paid: you scrolled past a book to reach the first line of code, and the version
banner ended up **980 lines away from the constant it must agree with**, which
is how they drifted apart four separate times. The last drift cost a deploy —
Jake opened `store.js`, saw the version he already had, and reasonably
concluded nothing had been sent.

Each source file now carries a short header with the current version, the last
couple of entries, and its constant **on the very next line**. Everything older
lives here.

⚠️ **Run `node version-check.mjs` before handing over any file.** It checks
every banner against its constant and every `?v=` pin against its target.

Nothing has been deleted. The entries below are verbatim, including the
reasoning essays folded into them — several are cited by `// D…` and `// E…`
references in the code, so treat this as a dictionary rather than a history.

---

## 🆕 Outriders — app 2.1.0 · store 1.1.0 · queue 1.1.0 (2026-08-03, Cirrothauma)

Handoff §0h's requirement, built; full notes in §0s. In one sentence: **a stage
anchored outside `[startDate, endDate]` leaves the pipeline and becomes a
task**, which is the −N twin of the hurrah's +N `spawnDays`.

- `queue.js` gains `isOutrider` / `splitOutriders` — **the predicate and
  nothing else**, pure enough that `outrider.test.mjs` imports it directly
  rather than extracting it from source text (24 assertions).
- `store.js` gains `syncOutriders`, which does all the writing: **build →
  verify → strip, refusing to strip anything if a single task write failed.**
  Idempotent by deterministic task id `out_<projectId>_<sid>`; an existing
  task is adopted, never overwritten; a ticked stage becomes a COMPLETED task
  carrying its original `completedAt`/`completedBy` verbatim.
- `store.js` **now imports `queue.js`** so the predicate has exactly one home.
- `app.js` calls it after create, edit, bar drag and stage edit, and exposes
  `octodoOutriders()` for the one-off sweep (dry run by default).
- `app.js`'s `isLater` **measures `startDate` again**; the pipeline-window
  branch and its 1.40.0 rationale are deleted, per §0h's explicit instruction
  not to preserve them. `projectPipelineWindow` is no longer imported there.

⚠️ **The sweep over Katie's existing data has not been run.** Until it is, her
older projects still show outrider stages and count them in `x/y`.

---

## 🗑 Code removed in the 2.0.0 audit (2026-08-02, Cirrothauma)

**Kept verbatim, because "nothing has been deleted" has to stay true of code
as well as of prose.** Six functions were removed as dead. Each was checked
against every `.js`, `.html` and `.mjs` in the repo — **including
`rules-test/`, which the first sweep missed** — before it was cut.

### `queue.js` 1.0.0 — five functions

```js
export function getDeadlineHour() { return DEADLINE_HOUR; }

export function getClearDeckThreshold() { return CLEAR_DECK_THRESHOLD; }

// Mon–Fri wrappers (pre-D60 API, still used for defaults).

export function isWeekend(ts) {
  const dow = new Date(ts).getDay();
  return dow === 0 || dow === 6;
}

/** Move n WEEKDAYS from ts (n<0 = backward). Weekends don't count. */
export function addWeekdays(ts, n) {
  return addAllowedDays(ts, n, WEEKDAYS);
}

/** Nearest Friday before / Monday after a weekend date. */
export function weekendNeighbors(ts) {
  const { prev, next } = allowedNeighbors(ts, WEEKDAYS);
  return { fri: prev, mon: next };
}
```

The two getters: their setters were wired and they never were. The three
wrappers: the comment called them "still used for defaults" and they were used
by nothing. D60 replaced the weekend CONCEPT with per-tier `allowedDays`, so a
wrapper hard-coding Mon–Fri could only answer a question the app had stopped
asking. `WEEKDAYS` survives as a module-local default inside `allowedSet`.

### `store.js` 1.0.0 — one function

```js
/** What the owner actually called it — for Settings' "shared as …" line. */
export function tierSkinOf(wsId, tierId) {
  const key = `${wsId}:${tierId}`;
  return { label: TIER_SKINS.labels[key] || null, color: TIER_SKINS.colors[key] || null };
}
```

⚠️ **Its comment named a caller that did not exist.** Settings' "shared as …"
line reads `t.canonName` / `t.canonColor`, which `skinFor()` stamps onto every
tier it returns precisely so nobody has to look an override up. This is the
**fifth** comment in this project found more confident than its code, after
E41's, §0b's, `TIER_RANKS`'s and SKIN-2's. Same shape every time: a true narrow
statement ("these maps hold the overrides") restated as a broad one ("and this
is how the UI reads them"), and the broad one is what the next reader believes.

Also un-exported, same version, all three read here and imported nowhere:
`COMPLETED_WINDOW_DAYS`, `stampNewStages`, `mergeStages`.

### ⚠️ `import-transform.js` — `defaultAnswers()` was NOT removed

It was cut and then **put back**. It looks dead from the app files and is not:
`rules-test/import.test.mjs` calls it, being the one consumer with no DOM to
read answers out of. The first sweep searched `app.js`, the HTML pages and the
two root test harnesses, and did not search `rules-test/`. **A dead-code sweep
that skips a directory reports the same thing as a sweep that finds nothing.**
The function now carries a comment saying so, because the next reader will run
the same grep.



---

## `store.js`

<!-- Moved out of the source header 2026-08-02 (Thaumoctopus). The header
     had regrown to 19 entries / 135 lines — the exact shape this file was
     created to prevent. version-check 1.5.0 now fails when it happens. -->

### 0.28.0

<!-- Retired from the header 2026-08-02 (Cirrothauma) to make room for the
     1.0.0 entry inside the 60-line budget. Verbatim. -->

```
0.28.0 — §0d CLOSED: A TIER CHANGE ACROSS BOARDS NOW MOVES THE DOCUMENT.
         updateProject/updateTask routed with wsOf(id) — the board the
         document was ALREADY on — so changing tierId rewrote the field
         and left the document behind, where collectTier (source board
         only) could never see it again. moveProject takes the project AND
         its sessions; moveTask takes the whole follow-up chain and drops
         mirroredGcalEventId so the poll re-mirrors on the new board.
         Same copy → verify → delete order as moveTier.
         Also: deleteProject now takes its sessions with it. It deleted one
         document, and every surface reaches a session THROUGH its project,
         so the ledger of a deleted project became unreachable rows nothing
         could render and nothing would clean up. Found by whereis's
         session audit on 2026-07-31, in Jake's live data.
```

### 0.27.0

```
0.27.0 — UNSHARE IS OWNER-ONLY, AND deleteAll STOPS LYING.
         (1) unshareTier refused nothing, so a guest's "bring it back"
         COPIED the entire tier onto their own board and only THEN hit the
         rules on the delete — reporting failure after a successful
         duplication. Now refused up front with the name of the owner.
         (2) deleteAll commits in BATCHES; each is atomic, the sequence is
         not. moveTier promised "Nothing was lost" on any delete failure,
         which is true for one batch and false for two. It now carries the
         count that DID commit and says which of the two states it is in.
```

### 0.26.1

```
0.26.1 — mergeStages() lifted out of setProjectStages as a pure function.
         BEHAVIOUR IS UNCHANGED — the seam moved so the rule that decides
         whether somebody's finished work survives can be tested without
         Firebase. `node stage-merge.test.mjs` reads it out of this file.
```

### 0.26.0

```
0.26.0 — SHARED PROJECTS STOP EATING EACH OTHER. Three defects, all of
         them item 5 meeting code that assumed a board was one person:
         (1) setProjectStages wrote the stage editor's stale copy of
         completedAt, so reordering un-ticked whatever your colleague had
         ticked while the modal was open. It now merges completion from
         the SERVER — the editor owns shape, the server owns completion.
         (2) Stages had no stable identity, so every write addressed them
         by POSITION; `sid` fixes that and rides through reorders free.
         (3) openSessions() closed EVERYBODY's running clock, because
         "at most one open session" was written when a board was one
         person. Now scoped to createdBy == me.
```

### 0.25.1

```
0.25.1 — Jake's marker bump after a predecessor shortened this header.
         NO CODE CHANGE.
```

### 0.25.0

```
0.25.0 — Per-user tier colour and name (tierColors/tierLabels on the
         profile, composite-keyed). skinFor() applies them; canonName
         and canonColor ride along for Settings' "shared as" line.
```

### 0.24.0

```
0.24.0 — THE BOARD ROUTERS REFUSE INSTEAD OF GUESSING. wsOf() and
         wsOfTier() both used to fall back to the ACTIVE board, so a
         task typed into a shared tier landed on the author's own and
         was invisible to everyone else. Both now throw. Every creator
         stamps the id it mints, which is what makes refusing safe.
```

```
// Version 0.26.1 — mergeStages() lifted out of setProjectStages as a pure
//   function. BEHAVIOUR IS BYTE-IDENTICAL; the seam moved so the rule that
//   decides whether somebody's finished work survives could be tested at all.
//   It was born un-runnable — three awaits deep inside a network call — and
//   `node stage-merge.test.mjs` now reads it straight out of this file by a
//   brace-matching scan, so the test cannot drift from what ships.
//   Verified by sabotage: re-introducing the 0.25.x behaviour turns the suite
//   from 34/0 to 28/6. A suite never seen to fail is decoration.
//
// Version 0.26.0 — SHARED PROJECTS STOP EATING EACH OTHER.
//   Three defects, one shape: item 5 made a board hold more than one person,
//   and code written when a board WAS one person kept running.
//
//   1. setProjectStages WROTE THE EDITOR'S STALE COMPLETION STATE. app.js
//      builds each stage row from a snapshot taken when the modal OPENED, so
//      every stage a colleague ticked while it was open came back un-ticked.
//      Observed live between two accounts: both read 4/8, different four.
//      The split is now: THE EDITOR OWNS SHAPE, THE SERVER OWNS COMPLETION —
//      unambiguous, because the editor has no completion control on it and
//      therefore never has a legitimate opinion about completedAt. Re-reads
//      at write time; server wins for stages it still has, caller wins for
//      stages it does not (new, or restored by undo after a delete).
//      Returns `reconciled` so the save can explain itself.
//   2. STAGES HAD NO IDENTITY. Every write addressed a stage by POSITION —
//      a bet that nothing reordered between the render and the click. `sid`
//      is minted by stampNewStages, backfilled by ensureSids, and rides
//      through renames and reorders free because the editor spreads the
//      ORIGINAL stage object. resolveStage REFUSES on a missing sid rather
//      than falling back to the index: hitting the neighbouring stage is
//      worse than hitting none. isStageGone exported alongside isRouteError.
//   3. openSessions() CLOSED EVERYBODY'S CLOCK. No createdBy filter, so
//      clocking in stopped a colleague's running timer across the boundary.
//      D112's "at most one open session" was always one per PERSON; it only
//      looked like one per board because a board used to be one person.
//      ⚠️ The filter is CLIENT-SIDE deliberately: a second equality clause
//      wants a composite index, an index is a deploy step, and a deploy step
//      nobody runs is a bug that ships. The set is a handful of documents.
//
// Version 0.25.1 — Jake's marker bump after a predecessor shortened every
//   header to the short form. Raised on each file touched so that if
//   removing half the comment lines broke something, the version would say
//   where to look. NO CODE CHANGE.
//
// Version 0.25.0 — PER-USER TIER COLOUR AND NAME.
//   users/{email}.tierColors + .tierLabels, composite-keyed "wsId:tierId"
//   exactly as tierRanks is. skinFor() overwrites name/color before a tier
//   leaves subscribeTiers, so every consumer shows your version for free;
//   canonName/canonColor ride along for Settings' "shared as …" line. Skins
//   apply ONLY on your own board, same guard as rankFor.
//   Also: corrected a comment claiming TIER_RANKS is "kept live by
//   subscribeMyProfile". NO SUCH FUNCTION EXISTS OR EVER HAS. Both maps
//   hydrate once at sign-in; one device does not follow another.
//
// Version 0.24.0 — THE BOARD ROUTERS REFUSE INSTEAD OF GUESSING.
//   wsOf() and wsOfTier() both ended `|| ws()`, so an unresolved destination
//   wrote to the ACTIVE board — a task typed into a shared tier landed on the
//   author's own board, resolved cleanly, and was invisible to the person it
//   was for. Both now throw octodo/unrouted. THE FALLBACK WAS IN TWO PLACES,
//   NOT THE ONE THE HANDOFF NAMED: restoreDoc routes through wsOf and uses
//   setDoc, which CREATES — that was TIER-10's data-loss case.
//   Every creator now stamps the id it mints (addTask, addFollowUp, the
//   recurrence spawn, both project creators, clockIn, logSession), which is
//   what makes refusing safe; a guess had been standing in for a stamp.
//   Also: saveTier's catch swallowed everything and blamed permissions;
//   a latent `rank: undefined` write that would have landed in that catch;
//   trackShared updated `hidden` without recomputing the merge.
//   routingSnapshot() exported — window.octodoWhere() in the console.
//
// ⚠️ VERSION 0.25.0 AND 0.24.0 WERE FIRST DELIVERED WITH THIS BANNER STILL
//   READING 0.23.1 WHILE STORE_VERSION READ 0.25.0 — the inverse of defect 3
//   below, and worse for the one job the banner has: Jake opened the file,
//   saw an unchanged header, concluded nothing had been sent, and did not
//   deploy a fix he was waiting on. THE HEADER IS THE DIFF. Anyone reading a
//   file top-down sees this before they see a constant 276 lines down.
//   Check both, every time, and see the automated check in HANDOFF §7.
//
// Version 0.23.1 — E41 REPAIR. 0.23.0 shipped four defects, two of them in
// code that had nothing to do with onboarding. Fixed here:
//
//   1. saveConfig() WAS DECAPITATED. 0.23.0's edit landed between its first
//      line and the rest of its body, so the E14 mirror of
//      pollIntervalMinutes onto the WORKSPACE DOCUMENT silently disappeared.
//      That is the value the Cloud Run claim query sorts on, so the hourly
//      calendar poll stopped following the setting the moment 0.23.0 shipped.
//      Item 7 was closed on 2026-07-27; this reopened it without saying so.
//   2. THAT ORPHANED BODY LANDED INSIDE markFirstVisitDone(), where it
//      referenced an undeclared `data` — a ReferenceError on every Skip.
//   3. STORE_VERSION still read "0.22.0" while this banner read 0.23.0.
//      The badge is how Jake knows what he is running; a banner that moves
//      without the constant is worse than no bump at all, because it makes
//      the badge lie confidently.
//   4. ONBOARDING STATE WAS ON THE WRONG DOCUMENT. It was written to the
//      workspace, and firestore.rules 1.2.1 gates workspace-document update
//      behind canAdmin() — OWNER ONLY. So a helper, an editor, a viewer, and
//      Nico on his own dependent board all got permission-denied, which made
//      their welcome splash undismissable on every single load. Worse, the
//      writes used dot-path keys inside setDoc({merge:true}), and dot paths
//      are only honoured by updateDoc — setDoc treats them as LITERAL field
//      names, so even an owner never actually cleared the flag.
//
// Onboarding belongs to the PERSON, not the board — you do not re-learn the
// app because you opened a second workspace. It now lives on users/{email},
// following E7's tierRanks pattern exactly: a module-level cache hydrated
// from the profile read that sign-in ALREADY performs, mutated in memory,
// written back with nested objects rather than dot paths. No new read path,
// no new subscription, no new rules clause — users/{email} is a document
// this user is already allowed to write.
//
// It also HONOURS the field E16/§10.2 already put there for this exact job:
// `onboardingDone` gates the splash. 0.23.0 invented a parallel mechanism
// and ignored the one that was seeded and commented for it.
//
// (prev) Version 0.23.0 — E41: onboarding state. Superseded above.
//
// (prev) Version 0.22.0 — A STAGE NOW RECORDS WHO MADE IT, NOT JUST WHO FINISHED
// IT. Jake: "Each person should get credit for what each person checks off,
// and it should track both when the task/piece of the project was created,
// as well as when it was completed (alongside who created that piece).
// Every time."
//
// Tasks and project DOCUMENTS already carried all four (createdBy/createdAt/
// completedBy/completedAt). Project STAGES carried only the completion half —
// so "Leah added this step and I finished it" was unanswerable, which is
// exactly the question a shared tier invents.
//
// stampNewStages() is applied at the WRITE BOUNDARY. Every stage array in the
// app reaches Firestore through addProject, addProjectWithStages or
// setProjectStages, so stamping here catches every caller including ones
// nobody has written yet.
//
// ⚠️ IT ONLY STAMPS STAGES THAT HAVE NO createdBy, AND ONLY WHERE THE CALLER
// HAS ESTABLISHED THEY ARE NEW. A legacy stage also has no createdBy, and
// attributing it to whoever next edits the project would be inventing
// evidence — worse than the blank it replaces, because a blank is honestly
// unknown and a name is a claim. app.js decides newness (its editor rows know
// whether they map to an original); addProject/addProjectWithStages do not
// have to ask, because at creation every stage is new.
//
// On Jake's "is it possible to cheat?": yes, and deliberately not defended
// against. createdBy is immutable in the rules (1.2.1) for TASKS and
// PROJECTS because it gates deletion; a stage is an array element inside a
// project document, so rules cannot see it and nothing hangs off it but
// credit. His call, quoted so nobody re-litigates it: "then we have bigger
// problems, and this software isn't made for those assholes."
//
// (prev) Version 0.21.2 — SIGN IN AS SOMEBODY ELSE. Jake, testing with Nico:
// "Signs out, but can't sign in as anyone else in Safari. It just remembers
// what google account is logged into Google."
//
// Not Safari remembering, and not a bug in signOut: signInWithPopup with a
// bare provider asks Google for "the signed-in user", and where that is
// unambiguous Google answers instantly WITHOUT drawing a chooser. One
// account on the device therefore means one account in this app, forever,
// with no visible way to say otherwise. `prompt: "select_account"` makes it
// ask every time.
//
// ⚠️ THIS IS A TESTING BLOCKER AS MUCH AS A FEATURE. Every second-person
// smoke test (IU, IX-b, IZ, JA) needs two accounts in one browser, so
// without this the shared-tier work cannot be checked by one person at one
// desk — which is the only way it CAN be checked right now.
//
// (prev) Version 0.21.1 — WHOSE ORDER YOU SEE WHEN VISITING. Jake: "Visiting her
// should give me a taste of EXACTLY what she looks at — zero differences.
// Otherwise I wouldn't have an honest picture of her load."
//
// 0.21.0 got that right for a person's OWN tiers and wrong for the SHARED
// one, and the shared one is the case he was asking about. A tier document's
// `rank` is written by whoever has setup rights, so on a personal board it is
// reliably the owner's opinion — but BOTH people write a shared tier's
// document, and the last save wins. Visiting Katie could therefore have shown
// Family at Jake's rank, sitting in the middle of her board looking like her
// judgement about her own week.
//
// FIXED by putting each person's ordering of a shared tier on THEIR OWN
// MEMBER ROW in that shared workspace. No rules change: a member row is
// readable by everyone holding a key to the same workspace and writable only
// by its own subject, which is exactly the shape this needs and is already
// what the rules say. users/{email}.tierRanks stays the authority for YOUR
// view (E7); the member row exists purely to be read by somebody else, which
// is a thing a private profile can never be.
//
// And the person whose order you see when visiting is the RESIDENT, not the
// deed-holder — on a dependent board (E32) those differ, and it is the
// child's day that makes his board honest. See viewerEmail() and rankFor().
//
// (prev) Version 0.21.0 — ITEM 5: SHARED TIERS. This file now reads from SEVERAL
// workspaces at once and writes to whichever one a document actually lives
// on, and app.js's 6,500 lines still believe there is exactly one board.
// That is E30 being spent a second time, and it is the whole point.
//
// FOUR NEW IDEAS, in the order you need them:
//
//   1. THE MERGE SET. Every subscription below fans out across a LIST of
//      workspaces instead of one. The list is the active board plus every
//      `kind:"shared"` workspace that belongs in this view — see mergeSet()
//      for the rule, which is Jake's and not the one originally designed.
//
//   2. THE OWNERSHIP MAP (`_where`). Merged snapshots record which board
//      each document came from, so a later write can be aimed at it.
//      ⚠️ IT IS NEVER PRUNED. A deleted document keeps its entry, because
//      restoreDoc resurrects by id and would otherwise put it back on the
//      wrong board. Tombstones are the feature; a few thousand string pairs
//      is not a memory problem.
//
//   3. PER-USER TIER RANK (E7). users/{me}.tierRanks maps "wsId:tierId" to
//      a number, and subscribeTiers overlays it onto `rank` before app.js
//      sees it. So app.js:6391 and queue.js:486 keep reading `.rank` and
//      never learn it stopped being a property of the document.
//
//   4. SHARE / UNSHARE = A MOVE, AT THE SAME DOCUMENT IDS. shareTier lifts
//      a tier and everything pointing at it into a new shared workspace;
//      unshareTier brings it home. Ids are PRESERVED, which is what keeps
//      parentTaskId chains, projectId references and the merged view's
//      uniqueness intact. COPY, VERIFY, THEN DELETE — a failure anywhere
//      leaves duplicates, which are visible and recoverable, and never
//      leaves a hole, which is not (Principle 3).
//
// (prev) Version 0.20.1 — repin to config 1.2.0 (it now carries CALENDAR_ROBOT).
// (prev) Version 0.20.0 — item 7 support. nextPollAt is now a NUMBER (0 = never
// polled, poll now) rather than null: the work queue claims on
// `nextPollAt <= now`, and null sorts before numbers in Firestore so it
// would be swept in regardless — a field whose null and whose zero mean the
// same thing is one fewer case for the next reader. And saveConfig now also
// writes pollIntervalMinutes onto the WORKSPACE document, which E14 made
// authoritative because the claim query has to read it. Both copies are
// written so the settings UI can never be editing a field nobody reads.
// (prev) Version 0.19.2 — the twin of 0.19.1's bug. 0.19.1 made the one-shot board
// lookup degrade gracefully and left the LIVE LISTENER beside it with no
// error handler at all — so a missing index printed one clean sentence from
// one and forty lines of Firestore internals from the other. onSnapshot takes
// an error callback and every listener that can fail on an index needs one.
// (prev) Version 0.19.1 — bootstrap diagnostics + a query that can no longer strand
// anybody. Nico's first sign-in died on "Missing or insufficient permissions"
// and the console could only say the bootstrap failed, not WHERE — so this
// adds a step tag to every stage of resolveWorkspace, and makes the one
// optional step optional in fact as well as in intent. The rules bug itself
// is fixed in firestore-2.0.rules 1.1.1.
// (prev) Version 0.19.0 — E32/E33/E34: HOUSES AND KEYS, and the bug that walking
// Nico's first sign-in through 0.18.0 exposed.
//   · THE BUG: a dependent workspace is built for a child BEFORE that child
//     has ever signed in, so there is no users/{email} document to point at
//     it — and 0.18.0's resolveWorkspace saw "no home workspace" and would
//     have cheerfully built Nico a SECOND, personal one that his parents had
//     never heard of. resolveWorkspace now asks "do I already hold a key
//     somewhere?" before it builds anything, and adopts a board where it is
//     flagged as the resident minor. Deliberately ONLY a minor flag adopts:
//     a colleague sharing a board with a stranger must not rob that stranger
//     of a house of their own.
//   · createDependentWorkspace: the same two words (owner / member) aimed
//     the other way. An adult holds the deed, the child holds a key, and the
//     child's member row carries minor:true so the rules refuse to let them
//     hand it back (E33).
//   · subscribeMyWorkspaces: a collectionGroup query over members where the
//     document id is your own email — "which houses do I hold keys to."
//     This is what the board switcher runs on.
//   · setActiveWorkspace / setPreferredWorkspace: switching boards is a
//     variable assignment plus a re-subscribe, exactly as E1 promised.
// (prev) Version 0.18.0 — E1/E5/E30: THE WORKSPACE BECOMES A RUNTIME VALUE.
// This file is the ENTIRE surface on which 2.0's multi-tenancy lands, and
// it keeps every exported signature it had at 0.17.0 (E30) — which is why
// app.js's 5,922 lines and queue.js's 1,206 move across verbatim.
//   · No allowlist. rules 1.0.0 removed it; isolation is by PATH (E1), so a
//     client-side email list would now be theatre, not security.
//   · WORKSPACE_ID (D12's one true workspace) is gone. ACTIVE_WS is resolved
//     at sign-in from users/{email}.homeWorkspaceId, and created if absent.
//   · Sign-in bootstraps: users/{email} -> workspaces/{new} -> members/{email}
//     -> seed tiers + settings. The order is load-bearing; see the comment on
//     createPersonalWorkspace, which is the one genuine trap in this file.
//   · completedBy lands on tasks, stages and projects now (E9). The activity
//     FEED is build item 6; the field is here early because §7.2 is right that
//     Reflection silently mis-attributes the day a tier is shared, and a
//     nullable field costs nothing to carry through the migration.
//   · E16: a new workspace's stage template is BLANK. Katie's thirteen
//     actuarial stages travel with HER workspace and are never a stranger's
//     factory default.
// (prev) Version 0.17.0 — D139: BOUNDED TASK WINDOW (Option A). subscribeTasks no
// longer streams the whole archive: two merged listeners carry active
// (completedAt == null) + last-30-days-completed (completedAt >= floor), and
// fetchCompletedTasks() one-shots a deep-past week on demand. Nothing is
// deleted; history costs a read only when the week view pages back to it.
// (prev) Version 0.16.0 — D124: the project-type library. subscribeProjectTypes /
// saveProjectTypes read/write a settings/projectTypes doc ({types:[{id,name,
// stages}]}); the existing stageTemplate stays the implicit Default, so live
// projects are untouched. addProjectWithStages already snapshots explicit
// stages, so no creation-path change was needed. Rules wildcard covers it.
// (prev) Version 0.15.0 — D116: writes become undo-informative. clockIn/clockOut/
// logSession return the ids and bodies they touched; setSessionEnd and
// restoreDoc (same-id resurrection) join the toolbox.
// (prev) Version 0.14.0
// deleteSession + subscribeSessions). One open session max, enforced by
// the clockIn batch. The rules wildcard already covers the collection.
// (prev) Version 0.13.0
// Task schema gains recurrence {every, unit, anchor} + spawnedNextAt;
// setTaskDone materializes the next occurrence once, spawn-guarded;
// addInterval does the calendar-correct stepping.
// (prev) Version 0.12.0
// climax). setStageDone now reports hurrah + projectHasHurrah so the UI can
// aim the big celebration at the stage Katie says it belongs to.
// (prev) Version 0.11.1
// 0.11.1 (D102): the sign-in allowlist compares LOWERCASE, matching
// firestore.rules 0.2.0's .lower(). This list is NOT security — the rules
// are — but if the two disagree the app breaks in a way that looks like a
// login bug: client stricter = "bounced back to the sign-in screen", rules
// stricter = "Missing or insufficient permissions". Keep them symmetrical.
// 0.11.0
// 0.11.0 (D100): tasks carry estimateMinutes. D93 promoted "estimated time to
// complete" from nice-to-have to load-bearing: a task time is a DUE date, so
// with an estimate a task is a real block [due − estimate, due] with a real
// LENGTH, and that length is the whole answer to "can I fit dinner on
// Tuesday?". addTask destructures explicitly, so a new field would have been
// silently DROPPED — which is exactly the kind of nothing that looks like it
// works. null = unestimated; the clock grid draws those at a default and says
// so. updateTask already passes arbitrary fields through (D95 only special-
// cases dueAt), so editing an estimate needed no change there.
// 0.10.0
// 0.10.0 (D95): tasks remember being moved — firstDueAt (the original
// commitment) + rescheduleCount. Counted inside updateTask so EVERY path
// that changes a due date is caught, including ones not written yet.
// No migration: firstDueAt ?? dueAt at read time IS the backfill.
// Only a date that EXISTED can be moved: null → date is scheduling, not
// rescheduling, and doesn't count.
// 0.9.0 (D85): seed config gains clearDeckThreshold (0.6) — the point
// where the queue flips a project from "keep abreast" to "clear the
// deck." Additive; live DBs never reseed, so readers fall back to 0.6.
// 0.8.0 (D63): tasks carry an optional `notes` string (title stays
// short, details expand under the row). Additive — missing = none.
// 0.7.0: rewindFollowUps (D53 un-complete rewind), addProjectWithStages
// (D59 duplicate-for-next-year), per-tier allowedDays in seed (D60,
// Personal seeds 7-day), config seeds deadlineHour 16 + 
// decisionThresholdDays 2 (D51/D52). Live DBs never reseed — missing
// fields fall back in readers.
// 0.6.2: seed template uses dated/undated mix per D50.
// All Firebase interaction lives here: auth, seeding, live
// subscriptions, CRUD. Nothing in here touches the DOM.
// Schema per HANDOFF.md §3.
// ============================================================

```


---

## `app.js`

<!-- Moved out of the source header 2026-08-02 (Thaumoctopus). The header
     had regrown to 19 entries / 135 lines — the exact shape this file was
     created to prevent. version-check 1.5.0 now fails when it happens. -->

### 1.43.0

<!-- Retired from the header 2026-08-02 (Cirrothauma) to make room for the
     2.0.0 entry inside the 60-line budget. Verbatim. -->

```
1.43.0 — wirePhoneTray(). On a phone ⏻ moves out of the header and down
         to #phone-tray at the bottom of the page, as 1.x did. It MOVES
         the node rather than cloning it — a second button means a dead
         listener on one of them. 600px, matching the CSS block.
```

### 1.42.0

```
1.42.0 — fitLine(). "Her screen starts too large every time" had no
         instrument but a photograph of a phone. The version tooltip and
         the Settings versions line now say whether the document is wider
         than the viewport, by how much, and which element is furthest
         right. Free when nothing is wrong; the DOM walk only runs once
         the page is already overflowing.
```

### 1.41.2

```
1.41.2 — DIRTY-1 ON PROJECTS. 1.41.0 fixed the manufactured-dirt bug in
         refreshTierSelects and left its two twins untouched — both on
         Firestore subscriptions, both writing fields in the project form
         signature. Adding a project changed bestFreeColor()'s answer,
         which is why the failing repro needed one. §8c #4, again, by the
         instance that wrote §8c. All three now go through
         preservingProjectFormState().
```

### 1.41.1

```
1.41.1 — DASH-FILL. The timeline year grid left a black band under
         itself on a tall dashboard pane. The lane fit is clamped to
         34px, and on a 4K pane with few concurrent projects the
         surplus was simply discarded. settleYearRows() measures what
         is actually left below the view and hands it to the rows —
         D106's idiom, not a new constant. See the function comment.
```

### 1.41.0

```
1.41.0 — TWO BUGS FOUND BY JAKE RUNNING THE TESTS.
         (1) The first ✎ click after a hard refresh warned about unsaved
         changes on an untouched form: D131 baselines the project form at
         boot, when #project-tier is still EMPTY, and refreshTierSelects
         then fills it — a change the user never made. The clean/dirty
         state now carries ACROSS a programmatic refill.
         (2) Waiting rows assumed every entry was a follow-up. queue
         0.21.0 routes off-day dated tasks there, so they get a checkbox
         and the real reason instead of a "+Nd after:" with no parent.
```

### 1.40.0

```
1.40.0 — The 🎆 hurrah carries an optional "↳ +N d" in the stage editor:
         ticking it finishes the project AND spawns a dated task. Shown
         only on the hurrah row, because on any other row it is the
         pipeline step it exists to replace. Later now measures against
         the PIPELINE WINDOW rather than the start date, so a stage
         anchored before the start keeps its project visible.
```

### 1.39.0

```
1.39.0 — A "LATER" GROUP, so finishing a project actually clears the
         plate. Duplicate-for-next-year works exactly as designed and
         handed the reward straight back: the copy appears immediately in
         the projects panel. Anything starting past a configurable horizon
         (default 90 days) now folds into a collapsed group beside
         Finished — same idiom on purpose; a second way to say "present
         but out of the way" would be one to learn for nothing.
         Undated projects are NEVER folded: undated means someday, which
         is the Want-tos tab's job.
```

### 1.38.0

```
1.38.0 — Deleting a project now warns that its clocked time goes too
         (store 0.28.0 stopped orphaning it), with the hours in the
         confirm. Time somebody spent is the thing worth warning about.
```

### 1.37.0

```
1.37.0 — THE SHARE PANEL KNOWS WHO OWNS THE TIER. A guest was shown
         "Bring it back to my board" and the ✕ that takes somebody's key
         away. Jake pressed the first one, got a permission error AFTER the
         copy had run, and said the obvious thing: "if a user doesn't have
         the ability to steal a tier, they probably shouldn't think they
         have an option." Both controls are now owner-only, and a guest
         gets the one decision that IS theirs — Leave this tier.
```

### 1.36.0

```
1.36.0 — THE BADGE TELLS YOU WHEN YOU ARE RUNNING OLD CODE. D130 watched
         ONE stamp (index.html's) and so could not see a stale ?v= pin —
         the file uploads, index loads fresh, and it then asks for a URL
         the browser already has. checkDeployedVersions() reads every
         module's banner FROM THE SERVER, cache bypassed, first chunk only,
         and compares it to the constant this tab is running. Stale rows go
         in the tooltip and turn the badge amber. Jake: "Isn't the whole
         point of the hover the version check? Why would I want to open a
         new page?" — so it is in the hover, not a new page.
```

### 1.35.1

```
1.35.1 — A REFUSED TICK NOW REPAINTS. The checkbox flips itself — that is
         the browser's default, not ours — so when store.js refuses a
         stage write, nothing is written, no snapshot arrives, render() is
         never called, and the tick sits there looking saved. The one
         screen whose job is to say what is done cannot show a state that
         never reached the server. Found by reviewing 1.35.0, not by
         running it.
```

### 1.35.0

```
1.35.0 — YOUR CLOCK IS YOURS. openSessionNow() returned the first open
         session in the MERGED view, so a colleague's running timer drew
         as yours with a ⏹ that would have stopped it from your screen.
         projectClockedMs now returns {mine, team} and the badge reads
         "Σ 1h / 31h" when somebody else has logged time — Jake: those
         are different questions. Stage writes address by sid (store
         0.26.0) instead of by position, and a save that had to keep
         somebody else's ticks says so instead of doing it quietly.
```

### 1.34.2

```
1.34.2 — Repoint only: ./store.js?v= and ./queue.js?v= were still asking
         for 0.25.0 / 0.20.0 while those files were 0.25.1 / 0.20.1, so
         the browser kept serving what it already had and the upload
         looked like a deploy without being one.
```

### 1.34.1

```
1.34.1 — Jake's marker bump. A predecessor stripped this header down to
         the short form; the patch was raised on every file it touched so
         that if removing half the comment lines broke something, the
         version would say which files to suspect. NO CODE CHANGE.
```

### 1.34.0

```
1.34.0 — Per-user tier colour and name, UI half. ⚠️ THE WHOLE FEATURE
         IS ONE BRANCH IN THE SETTINGS SAVE LOOP: on a shared row,
         name and color are deleted from the payload before saveTier
         and sent to saveTierSkin instead. Lose that delete and the
         propagation bug returns looking identical.
```

### 1.33.0

```
1.33.0 — Global unhandledrejection listener, so store 0.24.0's routing
         refusals reach a person instead of the console. tierChip()
         picks its own foreground (was black on black). Role dropdown
         ascending. window.octodoWhere() for live routing diagnosis.
```

```
// Version 1.36.0 — THE BADGE TELLS YOU WHEN YOU ARE RUNNING OLD CODE.
//   D130 watched ONE stamp (index.html's data-html-version), which catches an
//   ordinary deploy and is blind to a stale ?v= pin — index.html is never
//   cached, so it loads fresh and then asks for a URL the browser already
//   holds. The fix is live and the tab runs the old code, silently. That cost
//   an evening on 2026-07-30.
//   checkDeployedVersions() fetches EVERY module's banner from the server
//   with the cache bypassed, reads only the first chunk (not 300KB of app.js
//   hourly to look at line 3), and compares against the constant this tab is
//   running. Stale rows land in the tooltip; the badge turns amber.
//   ⚠️ Nearly built as a separate checkup.html. Jake: "Isn't the whole point
//   of the hover the version check? Why would I want to open a new page?"
//   A check you have to remember to open is a check that does not get run.
//
// Version 1.35.1 — A REFUSED TICK NOW REPAINTS. The checkbox flips itself
//   (browser default), so when store.js refuses a stage write nothing is
//   written, no snapshot arrives, render() is never called, and the tick sits
//   there looking saved. The one screen whose job is to say what is done
//   could show a state that never reached the server. Fixed in onStageToggle
//   and in the global unhandledrejection backstop. Found by REVIEWING 1.35.0
//   while it sat unuploaded, not by running it.
//
// Version 1.35.0 — YOUR CLOCK IS YOURS, AND YOUR TICKS SURVIVE.
//   openSessionNow() returned the first open session in the MERGED view, so
//   a colleague's running timer drew as yours — with a ⏹ that would have
//   stopped their clock from your screen. Scoped to currentEmail().
//   projectClockedMs returns {mine, team}; the badge reads "Σ 1h / 31h" only
//   when somebody else has logged time, so a solo project is unchanged.
//   Jake set the rule: "if I spend 30 hours on a project and my colleague
//   spends 1, that's a very different thing than both of us spending 31."
//   The time report still rolls up EVERYONE — that is the billable surface,
//   and sessionsToCSV already emitted createdBy.
//   stageRef() turns a positional index into {sid, index} at CLICK time
//   (fresher than the render that drew the control) for every setStageDone
//   and setStageDue call. A stages save that had to keep somebody else's
//   ticks now says so rather than doing it quietly. isStageGone joins
//   isRouteError in the global unhandledrejection handler.
//
// Version 1.34.2 — Repoint only: ./store.js?v= and ./queue.js?v= were still
//   asking for 0.25.0 / 0.20.0 while those files were 0.25.1 / 0.20.1, so the
//   browser kept serving what it already had and an upload looked like a
//   deploy without being one. Found by version-check.mjs, which until this
//   day did not exist despite six files instructing the reader to run it.
//
// Version 1.34.1 — Jake's marker bump after the headers were shortened.
//   NO CODE CHANGE.
//
// Version 1.34.0 — PER-USER TIER COLOUR AND NAME (UI half).
//   Settings ▸ Tiers: on a SHARED row the name and colour you type are YOURS.
//   ⚠️ THE WHOLE FEATURE IS ONE BRANCH IN THE SETTINGS SAVE LOOP — name and
//   color are deleted from the payload before saveTier and sent to
//   saveTierSkin instead. Lose that delete in a refactor and the propagation
//   bug returns looking identical. Everything else (kind, days, carryover,
//   calendar id, rank) is a property of the tier and still goes to the doc.
//   "shared as «name»" + the owner's colour dot renders under every shared
//   row. Empty the name box to clear your override and get theirs back.
//
// Version 1.33.0 — ROUTING REFUSALS BECOME VISIBLE; TWO OLD DEFECTS.
//   A global unhandledrejection listener: nearly every store call here is a
//   bare .then() with no .catch(), so store 0.24.0's refusals would have been
//   console lines nobody reads — the same silent-failure shape as the bug
//   being fixed, one layer up. One net, so no call site can forget.
//   tierChip() now picks its own foreground (Rec. 709 luma, 0.55 threshold):
//   .chip hardcodes near-black text and this set only background, so a black
//   tier was black on black. Prerequisite for 1.34.0, not a follow-up.
//   Role dropdown runs ascending — least power first, destructive end last.
//   window.octodoWhere() exposed for live routing diagnosis.
//
// ⚠️ 1.34.0 AND 1.33.0 WERE FIRST DELIVERED WITH THIS BANNER STILL READING
//   1.32.1 WHILE APP_VERSION READ 1.34.0. See store.js's banner for what that
//   cost. THE HEADER IS THE DIFF.
//
// Version 1.32.1 — E41 REPAIR. 1.32.0 shipped the onboarding system in a
// state where no part of it could complete. Fixed here:
//
//   1. FINISHING A TOUR THREW. The Next handler called endTour(), which nulls
//      currentTour, and then read currentTour.tourId on the following line.
//      TypeError every time, so markTourCompleted() was never reached and no
//      tour could ever be recorded as done. Split into finishTour(): record
//      first, tear down second.
//   2. #task-escalate DOES NOT EXIST. The escalation tour step and its hint
//      both pointed at it; the real ids are #task-esc-n / #task-esc-unit.
//      The step highlighted nothing and the hint was unreachable code.
//   3. A MISSING OR HIDDEN TARGET DREW THE BOX AT 0,0. getBoundingClientRect
//      on a display:none element returns zeros, so any step aimed inside a
//      closed modal pointed confidently at the top-left corner of the screen.
//      Such a step is now skipped with a console warning that names the
//      selector — a broken tour should be findable, not merely quiet.
//   4. NO SCROLL. The highlight is position:fixed and read from the viewport,
//      so a target below the fold got a highlight below the fold.
//   5. LISTENERS ACCUMULATED. The backdrop gained a click handler on every
//      step, and the splash buttons were bound inside a function called from
//      a Firestore snapshot — which re-fires on every workspace change. Both
//      are now bound exactly once, in wireOnboarding().
//   6. THE POPOVER GUESSED ITS OWN SIZE (380x200) and could sit half off the
//      bottom. It is measured now, and clamped to the viewport on both axes.
//   7. STATE MOVED TO THE PERSON. See store.js 0.23.1: it was on the
//      workspace document, which the rules let only an owner write, so the
//      splash was undismissable for every helper, editor, viewer and
//      dependent. It reads through onboardingState() now.
//
// (prev) Version 1.32.0 — E41: onboarding. Superseded above.
//
// (prev) Version 1.31.0 — A STAGE RECORDS WHO ADDED IT. Jake: "Each person should
// get credit for what each person checks off, and it should track both when
// the task/piece of the project was created, as well as when it was
// completed (alongside who created that piece). Every time."
//
// The stage editor is the ONLY place a stage can be added to a project that
// already exists, and it is the only place that can tell a NEW stage from an
// old one — `row.dataset.orig` is -1 for a row with no original behind it.
// store.js cannot make that distinction and must not guess: a legacy stage
// also has no createdBy, and stamping it with whoever edits next would
// invent evidence rather than record it (see store.js 0.22.0).
//
// Existing rows need nothing: 1.30.1 already carries the whole stage
// forward, so a createdBy written today survives every later edit. Those two
// changes are the same fix seen from both ends.
// (prev) Version 1.30.1 — EDITING A PROJECT'S STAGES WAS ERASING WHO COMPLETED
// THEM. Found by Jake from console data, and his read of it was reasonable
// and wrong in an instructive way: Tomlinson's stage completions carried
// completedBy and his did not, so it looked like the stamp depended on WHO.
// setStageDone writes `completedBy = whoami()` unconditionally, so that could
// not be it — and the field was ABSENT rather than null, which means
// something removed it afterwards.
//
// saveStages() rebuilt each stage from the form and carried forward an
// ALLOWLIST of two fields, `completedAt` and `dueAt`. Everything else on the
// stage was dropped, completedBy included. So every stage edit silently
// rewrote history: the stage stayed ticked and the credit vanished. The real
// split in his data was TIME, not person — his completions happened before
// the last stage edit and hers after it. Had she gone first the evidence
// would have pointed at her.
//
// FIXED by carrying the whole stage and overriding only what the editor
// owns. An allowlist of preserved fields is a list that goes stale the next
// time a stage gains one — this is the second thing E9 put on a stage and
// the first one it lost.
//
// ⚠️ `hurrah` MUST STILL BE STRIPPED BEFORE THE SPREAD. D109 says the editor
// OWNS that flag (it is button state, not carried), so a stale `hurrah: true`
// surviving the spread would resurrect a climax the user had just turned off.
//
// ⚠️ ALREADY-LOST STAMPS ARE NOT RECOVERABLE. The value is gone from the
// document; nothing knows what it was. This stops the bleeding only.
// (prev) Version 1.30.0 — TIER ORDER IS A POSITION, NOT A NUMBER YOU TYPE. Jake,
// after a colleague shared a tier with him: "it came in as 4/4. I changed it
// to 3 without changing my 3, and it just... stayed there? I think the arrows
// should move it up and down in the queue rather than change the number."
//
// He is right, and the reason is worth writing down because the old control
// was fine for four years and stopped being fine the moment item 5 shipped.
// A typed rank only works while ONE person authors every number. A shared
// tier arrives carrying a rank chosen by somebody who has never seen your
// board, so the first thing it does is collide — and a text box has no way
// to express "put this above that" except by asking you to renumber your own
// tiers around a guest.
//
// ▲▼ instead, and rank is assigned 1..N FROM DOM POSITION on save. Ties stop
// being an error to report and become a state that cannot be constructed,
// which is the better answer to his "it should kick back an error": the best
// error message is the one that can never fire. Opening ⚙️ ▸ Tiers and
// saving now also NORMALISES any collision already in the data.
//
// The arrows match .st-up/.st-down on stage rows exactly (D104: one grammar).
// (prev) Version 1.29.1 — Z: repin to store 0.21.1 (whose tier order you see when
// visiting somebody's board). No app-side change; the pin has to move or D49
// bites — a ?v= on a <script> tag does not cache-bust the imports inside it.
// (prev) Version 1.29.0 — ITEM 5, THE UI HALF. Almost nothing here changed, which
// is the report: store.js 0.21.0 merges N boards and routes every write to
// whichever one a document lives on, and the 6,500 lines below still believe
// there is exactly one workspace. That is E30 spent a second time.
//   · tierEditorRow gains a 🤝 and toggleSharePanel — an inline strip under
//     one tier row. Built in JS rather than in index.html because tier rows
//     are themselves JS-built and there may be any number of them; a single
//     markup panel would have to be MOVED around the DOM, and D37 has
//     already taught this project what moving a container costs.
//   · Everything in that panel writes IMMEDIATELY, not on Settings ▸ Save.
//     Sharing moves documents between boards. Letting it look undoable by
//     closing a modal would be a lie about what just happened.
//   · The version badge names every merged board, because "which workspaces
//     am I actually reading?" is the first question when a shared tier
//     misbehaves — and ?ws= takes an id straight off that line.
// (prev) Version 1.28.0 — D143: the default due time is the next hour, not 09:00,
// and cancelTaskEdit() stops blanking the due date. Jake asked whether the
// Today button should also move the time; it shouldn't — a date button that
// changes a neighbouring field is a button you stop trusting — but the
// complaint underneath it was about the DEFAULT, and that was worth fixing.
// The blank-date bug was found while looking: form.reset() restores declared
// defaults, #task-date declares none, and the field is required.
// (prev) Version 1.27.0 — THE HELPER ROLE REACHES THE UI, plus D141/D142 on the task
// form. firestore.rules 1.2.1 added a fourth role and this is the half that
// makes it usable: "Can help" in the People dropdown, and the Tiers/Pipeline/
// Timing panes dimmed for anyone who cannot write them. myRole/canWorkList/
// canSetUp/canDeleteDoc mirror the rules clause for clause — the ✕ on a task
// is now ABSENT rather than failing when a helper looks at somebody else's
// task, because a button that errors after the click reads as a bug.
// D141: a "Now" button beside Time, the twin of D140's "Today" beside Due
// date — Chrome's native picker has neither. D142: Est. min moved off the
// three-across row onto its own line with the input beside the label; two
// native date/time inputs and a number field could not share 340px, which is
// why the first two looked squeezed.
// (prev) Version 1.26.0 — E40: the OUTBOUND calendar walkthrough. 1.25.0 explained
// how to see your appointments; nothing explained how to get your tasks onto
// a calendar, which is the half that actually makes a phone buzz — this app
// sends no notifications of its own and never has (§5, "Expectation set with
// Katie"). Both walkthroughs now render from one function.
// (prev) Version 1.25.0 — E39: the connect-a-calendar walkthrough, in the app.
// SETUP-PHASE3-2.0.md is the OPERATOR's one-time guide — Jake, once, in a
// console nobody else can reach. There was nothing at all for the other
// twenty people, and he spotted it: "it sure looks like something that's not
// going to work for anyone else." The six clicks now live beside the field
// they fill, and the service-account address is shown with a copy button
// instead of being something he has to paste into a chat window per person.
// (prev) Version 1.24.0 — E38, three fixes from Jake's first real use of item 4.
//   1. DEPENDENTS DON'T GET DEPENDENTS. A minor could see and use the
//      create-a-board form. Jake: "that's just asking kids to mess with one
//      another and lock them out of things." He's right, and the form is now
//      hidden from anyone flagged minor on any board they hold. HONESTY: this
//      is a UI gate, not a rules one — see the comment on the check.
//   2. A BOARD CAN BE RENAMED. There was no way to fix a board's name in the
//      app at all; the only route was the Firebase console.
//   3. THE PLACEHOLDER LIED. "Board name" showed a grey "Nico", which reads
//      as filled-in — so Jake submitted an empty field and got a board named
//      after the email's local part. Placeholders now read as instructions,
//      the name auto-fills from the address as you type, and the fallback
//      derives "Nico" from "nico.m.wilson" instead of using it whole.
//   Plus: a dependent board you own says "you hold the deed" in the switcher
//   rather than "yours", which was true and misleading at once.
// (prev) Version 1.23.3 — a Z: repin to store 0.20.0 (item 7 made the workspace
// document authoritative for pollIntervalMinutes, so saveConfig now writes
// both copies). No app-layer behaviour change.
// (prev) Version 1.23.2 — a Z. Two fixes in the People list: the tags reused the
// existing .badge class, which means DANGER, so "holds the deed" rendered as
// grey-on-red; and a member who is not an owner could see WHO held keys but
// not WHAT those keys opened, because the role only appeared inside the
// owner-only <select>. A dependent should be able to read his own board's
// access list — that is the whole point of showing it to him.
// (prev) Version 1.23.1 — a Z: the E17 screen told Nico "connection hiccup" when the
// truth was a rules bug. A blocked screen that guesses wrong about WHY is
// only marginally better than the silent bounce it replaced, so
// permission-denied now gets its own honest sentence.
// (prev) Version 1.23.0 — E32/E34: THE BOARD SWITCHER, which by Jake's own
// definition (E24) is what makes this 2.0. Houses and keys, on screen:
//   · a header chip naming the board you are standing in, marked "visiting"
//     when you hold a key to a house you do not own;
//   · a menu of every board you hold a key to (subscribeMyWorkspaces);
//   · a People tab: hand out keys, take them back, change what they open,
//     and create a dependent board for someone who does not own it.
// THE STRUCTURAL CHANGE is subscribeBoard(): the eight per-board listeners
// left onSignedIn and became a function that can be torn down and re-run, so
// switching boards is teardown + reassign + resubscribe. The board LIST is
// deliberately NOT in it — it belongs to the user, not to any one board, so
// it subscribes once and survives every switch.
// Also scoped the settings-tab selector to #settings-modal. It was a bare
// `.tab-btn`, which also matches D126's Have-tos/Want-tos bar, so clicking
// Want-tos called switchSettingsTab(undefined) and hid every settings pane.
// LATENT, never visible, because openSettings() calls switchSettingsTab
// ("tiers") on every open and repaired it — but a fourth tab was about to be
// added to the same unscoped query.
// (prev) Version 1.22.0 — E30: the port. This file is 1.21.0 with FOUR seams moved
// and not one line of feature code touched, which is the entire point:
// store.js absorbed the workspace (E30), so app.js and queue.js cross to a
// multi-tenant database unchanged. The seams are the import ?v= pins, the
// version banner, watchAuth's new third callback, and onBlocked() below.
// A Y per D94 — the E17 screen is something that exists that didn't before.
// NOT 2.0.0: per Jake's own definition that is the day he and Katie sign in
// separately and he can toggle to her board. Same shape as D67 defining
// 1.0.0 as the dashboard; the app ran 0.x for months before earning it.
// (prev) Version 1.21.0 — D140: a "Today" shortcut beside the task due-date field.
// The native date picker is the browser's, not ours — no button can be added
// inside it — so the shortcut lives next to the input instead.
// (prev) Version 1.20.0 — D139: BOUNDED TASK WINDOW (Option A). The task
// subscription no longer streams the whole archive on every boot — store.js
// carries active + last-30-days-completed live, and the week view fetches a
// deep-past week's completed tasks on demand (tasksForWeek + a per-week
// cache), so nothing is deleted and old reflections still render, but you
// only pay a read when you actually page back to them. Confirmed reason,
// not cost panic: writes had already dropped 92% (D135) — this is the
// bounded-subscription SHAPE we want multi-user to inherit. The D136 census
// now reports the live window, so it ticks down as intended.
// (prev) Version 1.19.0 — D137: THE ALERTER. Jake, on the escalation glow: "it
// getting redder every hour does nothing." D3 built a real escalation
// engine and then whispered its results in colour. This makes the SAME
// engine audible: a task speaks on ITS OWN per-task escalation cadence,
// so no new schedule was invented and no new setting can be wrong.
// Three channels, one master switch, ALL PER-DEVICE (D107's rule): an
// in-page toast (the load-bearing one — a fullscreen kiosk may never
// paint an OS notification, but it always paints its own page), a
// synthesized Web Audio chime (no asset to host or 404), and the OS
// notification. Reads through buildQueue for TODAY — never S.viewDay,
// never raw S.tasks — so hidden tiers (D47), off-days (D61), timeless
// want-tos (D126) and pipeline windows (D48) are all honoured for free
// instead of by a second copy of the rules (D98). Announcements are
// keyed per MOMENT and persisted, so D130's auto-refresh cannot make a
// deadline speak twice; the first pass after load is always silent, so
// opening the app on a bad day does not detonate.
// (prev) Version 1.18.0 — D136: THE DOCUMENT CENSUS. Every figure in the cost
// conversation was modelled; the app knows the truth, because it already
// subscribes to all eight collections and can just count what arrived.
// The version tooltip and the ⚙️ Settings footer now read e.g.
// "412 docs/load (tasks 189 · sessions 44 · events 90 · projects 21 ·
// tiers 6)" — that total IS the per-page-load billed read cost, per
// device. It exists because subscribeTasks/subscribeSessions are
// UNFILTERED (every boot re-reads all completed history, forever), and
// watching this number climb is what will tell Jake WHEN windowing stops
// being optional, instead of me estimating it from writes-per-day.
// Read-only, counts documents already received, costs nothing extra.
// reportVersions() is re-run from the config callback so the tooltip
// isn't frozen at the zeros it held before any snapshot landed.
// ------------------------------------------------------------
// (prev) Version 1.17.0 — D134: ESCAPE CLOSES THE TOPMOST MODAL. Jake, wanting
// to scroll through the un-dating sweep faster: "the equivalent of
// clicking the x — no save," and if something changed, confirm. The
// confirm half cost nothing: the handler never closes anything itself,
// it CLICKS THE MODAL'S OWN CANCEL BUTTON, so every D129/D131 guard,
// every bit of state cleanup (fuTarget/clockMode/S.dupTarget) and every
// special case (stages returning you to the dup form) is reused rather
// than re-implemented — a second copy of "close" is precisely the D98
// drift trap. Decision modals map to their NO-OP answer, not a raw hide
// (uncheck → "oops", weekend → "back"), so nothing is left hidden-but-
// unresolved with S.uncheckTarget stranded. Topmost = LAST OPEN IN DOM
// ORDER, because every shell shares z-index 50 and paint order is
// document order; that's self-maintaining, and the ship-check now
// asserts every .modal-shell has an Escape entry so modal #12 can't
// arrive without one. With no modal open, Escape presses the update
// banner's "Later" (same rule: it answers the thing in your way, via
// that button, so the don't-re-nag bookkeeping still runs). 25
// behavioral assertions. Version is a Y, not the .1 Jake offered:
// D94 says Y = something exists that didn't before, and this is his own
// rule outranking an offhand number.
// ------------------------------------------------------------
// (prev) Version 1.16.0 — D132 + D133, the two halves of "things that keep
// going." D132: CHAINED FOLLOW-UPS authored at task creation. The New
// Task form grows a builder ("And then…") of task-plus-N rows, each with
// a title, an offset, and — from row 2 on — an anchor: after the previous
// step, or after this task. NO SCHEMA CHANGE and no store.js change: D4
// already models a follow-up as dueAt:null + parentTaskId, and setTaskDone
// already materializes every waiting child of whatever just completed, so
// "previous step" (parent the row above) yields a sequential chain and
// "after this task" (parent the root) yields D4's fan-out, both for free.
// Writes must be SEQUENTIAL — a prev-anchored row can't exist before its
// parent's id does. Create-only: the builder hides during ✎ edit, since ↳
// already owns adding follow-ups to a task that exists. 16 behavioral
// assertions on the parenting math, including the case that bites — a
// prev-anchored row after a root-anchored one hangs off the ROW ABOVE,
// not the last sequential link. D133: ✋ END THE SERIES on any recurring
// task. §5c filed this as a chain feature; it isn't — D111's cactus
// already repeats forever, the only missing verb was stop, and it has to
// live on the task (she discovers "that was the last one") rather than as
// a count at creation. recurrence:null is the whole mechanism; the task
// survives and still wants checking off. Undoable (D116).
// ------------------------------------------------------------
// (prev) Version 1.15.0 — D131: the D129 unsaved-changes guard now covers the
// PROJECT FORM too (Jake asked for it, and it doubles as the live test of
// D130's update check — deploy this, and the NEXT deploy is what an open
// tab will detect). The form is a persistent inline PANEL, not a modal, so
// D129 had left it out pending a UX call; the call is: guard the two real
// abandon paths — the Cancel button (on an edit) and startProjectEdit
// replacing the form when you click ✎ on a project while unsaved content
// sits there — plus the year-view modal's ✕. markClean re-baselines after
// every open / reset / save, so an untouched form or a freshly-launched one
// never nags, and the auto-suggested color on reset isn't counted dirty
// (the baseline captures it post-reset). cancelProjectEdit gained an
// {saved:true} opt so its post-save internal calls skip the prompt. 5
// behavioral assertions incl. the half-typed-new-project switch-away and
// the auto-color edge. app.js-only; no markup/CSS/schema change.
// ------------------------------------------------------------
// Version 1.14.0 — D130: UPDATE CHECK (a Y). Katie hit the tub bug on a
// stale cache — a running tab had no way to know a newer version shipped.
// Now: 1min after boot, then hourly, checkForUpdate() re-fetches index.html
// cache-BUSTED (?_v=Date.now() + no-store; without it the browser hands back
// the same stale file and the check is theater) and reads its
// data-html-version — the one stamp Jake bumps on EVERY deploy, so there's
// no second source of truth to drift (the deciding reason over a separate
// version.json, and Jake's own instinct: "don't you compare the index to
// something?" — yes, and it already carries its version). If the server's
// html version differs from BOOT_HTML_VERSION (captured once at load, not
// re-read from the DOM), a bottom banner shows with a 30s countdown that
// auto-refreshes; Refresh-now reloads immediately, Later dismisses until the
// NEXT real deploy (a different version passes the guard again). Silent when
// offline, when boot version is unknown, or when already counting down. The
// banner lives OUTSIDE #drift-wrap (D127) so it can't mysteriously float.
// ------------------------------------------------------------
// Version 1.13.0 — D128 (blank project type) + D129 (unsaved-changes
// guard), both a Y. D128: a built-in "Blank (no stages)" option in the
// project-type picker, via a __blank__ sentinel routed through
// addProjectWithStages with []. For the projects that match no template
// (Jake's tub — a bathtub has no "engagement letter") and the natural
// home for someday/want-to projects, which shouldn't inherit Katie's
// actuarial stages. No stages = nothing to compute deadlines from, which
// also sidesteps the whole relative-date-on-null class of nonsense. The
// sentinel isn't a stored type, so it can't be renamed/deleted and always
// sits in the list; the Settings ▸ Pipeline editor is untouched (nothing
// to edit in "blank"). D129: an unsaved-changes guard on editing modals.
// Jake edited a want-to's stages, hit ✕ to discard (what he wanted), and
// noticed the app never checked — got lucky discard was the intent.
// Snapshot-on-open / compare-on-close dirty check (his call: warn ONLY on
// real edits, so edit-then-revert reads clean); one signature fn per
// editor, guardedClose() does the compare + confirm. Wired for the stage
// editor (✎⋮), Settings, and the follow-up modal — each marks clean on
// open, guards every close path, clears on save. The project form is
// deliberately NOT wired yet: it's a persistent inline PANEL, not a
// modal, so "close" isn't a single clear action — its signature fn is
// written and ready, pending a UX call from Jake. Every field selector
// checked against real markup before wiring (several first-guess
// selectors were wrong — .t-dow not .t-day, cfg-* ids, fu-n/fu-unit).
// ------------------------------------------------------------
// Version 1.12.0 — D120: THE TIME REPORT (a Y). Katie's question — "can it
// roll up by day/week/month/quarter/year" — answered without ever asking
// the fiscal-vs-calendar question that was parked for her: the report's
// date range is arbitrary (Starts/Ends fields), and month/quarter/year
// buckets step FORWARD from wherever Starts is set (queue.js's
// reportPeriods, built on the existing calendar-correct addMonths). Start
// Jan 1 for calendar periods, Jul 1 for fiscal ones, or any custom window
// for a specific engagement — same code, no setting to get wrong. Opens
// from a new 📊 button in the Projects panel header (all projects) or by
// clicking any project's Σ total (pre-filtered to that one, with a "show
// all projects" escape hatch in the modal itself). Two CSV exports: the
// rollup (spreadsheet-ready decimal hours, project × period) and the raw
// session ledger (UN-split — an actuary gets her own intervals, not our
// bucketing decisions). All the bucketing/splitting/CSV logic lives in
// queue.js 0.20.0 as pure functions, verified with 19 verbatim assertions
// against the real module (calendar AND fiscal-style ranges, midnight-
// crossing session splits, open-session handling, CSV comma-escaping)
// before this file ever touched it. No store.js or schema change — reads
// the existing sessions ledger (D112) exactly as it already is.
// ------------------------------------------------------------
// Version 1.11.1 — D126 FIX (a Z): the Projects sidebar wasn't filtering
// by have-tos/want-tos mode — Jake, from a screenshot, found a someday
// project sitting in the sidebar on the Have-tos tab too. renderProjects
// now reads through the same projectsForMode() choke point wantTosShuffle
// and renderWantTos already used (three separate tier-lookups collapsed
// into one — timelessTier()). The NOW bar's project lookup stays
// deliberately UNFILTERED: a running timer is "what you're doing right
// now" and shouldn't vanish because you flipped tabs to browse.
// ------------------------------------------------------------
// Version 1.11.0 — HAVE-TOS / WANT-TOS (D126, a Y). Katie's parking lot for
// dateless someday-projects. A tier can be marked ⏳ timeless in Settings ▸
// Tiers (radio-exclusive, same shape as D109's 🎆 — checking one unchecks
// the rest); the project form reads that flag live off #project-tier
// (syncProjectDateRequirement) and hides/un-requires the date fields, or
// drops them to null on save. A new .tab-bar atop #queue-panel (reusing the
// settings tabs' own class) swaps the whole panel body between the existing
// date-driven agenda (#havetos-panel, untouched in substance) and the new
// #wanttos-panel — the timeless tier's projects rendered with the same
// projectCard() the sidebar uses, "cards with their checklists" per the
// design. projWhen() replaces every direct fmtDay(p.startDate) with a
// null-safe "Someday" fallback (projectCard, the color-collision hint).
// 🔁 duplicate-for-next-year hides on a timeless project (no year to bump).
// CONTAINMENT lives mostly in queue.js 0.19.0 now (buildQueue/buildWeek skip
// timeless-tier projects outright; stageScheduledAt refuses to compute a
// date from null project dates regardless of a stage's own direction) — the
// one app.js-side choke point is the year view's single `projs` filter,
// which now excludes timeless-tier projects explicitly rather than trusting
// the epoch-math coincidence that happened to already keep them off-screen.
// S.todoMode is session-only by design (never localStorage) — Jake's own
// containment lever: it always boots to have-tos, so landing on the real
// work is never one stale toggle away. No store.js change: saveTier and
// addProject already pass whatever object they're handed straight through.
// ------------------------------------------------------------
// Version 1.10.0 — PROJECT-TYPE LIBRARY (D124, a Y). The single stage
// template becomes a LIBRARY: a "Project type" picker on the new-project
// form snapshots the CHOSEN pipeline (Default = the old stageTemplate, or
// any named type) via the existing addProjectWithStages — zero creation-path
// risk. Settings ▸ Pipeline gains a #pipeline-target selector + New/Rename/
// Delete; the one stage editor now edits whichever pipeline is selected,
// held in an in-memory draft that switch-syncs so unsaved edits survive a
// hop, and Save persists Default → saveStageTemplate and the rest →
// saveProjectTypes. Existing projects keep their own snapshot; nothing
// migrates. The holiday-card pipeline Jake wanted is now just a type he
// builds once and picks — the bridge toward types beyond Katie's default.
// ------------------------------------------------------------
// Version 1.9.0 — HOLIDAYS ON THE WALL AND THE WEEK (D123, a Y). A per-device
// "★ Holidays" toggle (new Overlay group in BOTH the year and week .view-ctls,
// the D104 grammar) overlays US federal holidays, computed client-side in
// queue.js (holidaysForRange). Three surfaces, one shared preference
// (tc-holidays, default OFF): the year GRID/wall marks the day cell (accent
// dot + the holiday name in its title); the year TIMELINE drops an accent tick
// in the day-texture loop (title on hover); the week DAY-HEADS gain a small
// labelled line (abbr) with the full name in the head's title. holidayMapFor()
// caches per render window so the same Map serves every surface. No new data,
// no calendar sharing, works offline — D75's "gated behind integration" is moot.
// ------------------------------------------------------------
// Version 1.8.0 — THE NOW BAR (D122, the Y) + THE PARADE GETS A NAME
// (D121). D122, Katie's ask: the top of the Projects list carries a bar
// showing the CURRENT project and how long she's been on it — project
// color on the edge, name, "since 2:14 PM", and a live H:MM:SS second
// hand (a 1-second interval that touches ONE text node, never render()).
// Tap it → the clock-out dialog. It only exists while a timer runs, and
// it rides the 🗂 pane reparenting to the wall for free. ALSO the D119
// finish: the 🕰 was still a full-size .icon-btn wrapping onto its own
// row ("the same size it was before the move" — Jake); it now wears
// .clock-btn like its siblings, and all three clock controls live in one
// .clock-cluster that right-aligns and wraps as a UNIT, never the 🕰
// alone. D121: onStageToggle hands the project's NAME to celebrate(3)
// for the ticker-tape banner (celebrate.js 0.2.0 — the parade itself
// lives there).
// ------------------------------------------------------------
// Version 1.7.0 — THE YEAR EXPANDS ON CLICK (D117, a Y) + the clock slims
// down (D119) + three modals escape drift-wrap (D118). D117: Jake's actual
// ask, decoded — the hover title was always fine; he wanted the WEEK
// strip's answer in the year: click a tight bar → it opens to readable
// height WITH its name (several at once, unlike hover), click again →
// back. Same session-only Set discipline as weekExpanded, cleared on size
// change; D115's click-popover AND its ±5px hitbox are retired at Jake's
// call ("I can see how those overlapping fields would complicate things").
// D118: clock/followup/yv-project modals lived INSIDE #drift-wrap, whose
// transform re-roots position:fixed to the PAGE box — scrolled down, a
// "centered" modal floated above the viewport (Jake's clock-out bug).
// They join the other six outside, where D37's rule always said overlays
// live. D119: the clock controls ride the dates/weight line now — ⏱ in /
// ⏹ elapsed, Σ, 🕰 — a whole row of vertical space returned to the cards.
// ------------------------------------------------------------
// Version 1.6.0 — UNDO EVERYWHERE IT'S WELL-DEFINED, PLUS REDO (D116) — a Y.
// Jake: "undo is always good, as is redo." Two stacks now; every entry
// carries both directions, captured at commit time; Ctrl/Cmd-Z undoes,
// Ctrl/Cmd-Shift-Z or Ctrl-Y redoes; a new action kills the redo stack
// (the old future is gone). Covered: task edits, task deletes (SAME-ID
// resurrection via restoreDoc so parentTaskId chains survive), due-date
// saves AND clears (task + stage), stage-editor saves (whole-array swap),
// project edits, year-bar drags, estimate drags, and all three clock ops
// (in / out / manual log — store returns what it touched). EXCLUDED on
// principle, argued and accepted: completion toggles — celebrations,
// follow-up materialization, and cactus spawns hang off them, and the
// D53 uncheck modal is already the better undo. Multi-user honesty: undo
// restores YOUR before-state; a mid-flight edit by the other person loses.
// ------------------------------------------------------------
// Version 1.5.0 — UNDO + the all-nighter + the tap toggle (D113/D114/D115).
// D114 (the Y): Ctrl/Cmd-Z undoes drag commits — year-bar moves/stretches
// and clock-estimate grips capture their before-state and restore through
// normal store writes (both screens see it); native undo in text fields
// untouched; stack of 30. D113: the clock dialogs ask WHEN with a full
// datetime-local — Katie's all-nighters and multi-day forgets are one
// honest field; the yesterday-guessing helper is deleted. D115: tapping a
// year bar a second time closes its popover, and every bar carries an
// invisible ±5px vertical hitbox — a 2px hairline is a statement, not a
// tap target; "tap for details" is now true at every size.
// ------------------------------------------------------------
// Version 1.4.0 — THE CLOCK (D112) — a Y. Katie's billable-hours paper,
// replaced. Fixed-price projects billed on assumed hours; the ledger's job
// is next year's ask. Every project card (Today view AND the dashboard's
// 🗂 pane — same reparented DOM, zero extra work) wears a clock row that
// survives collapse: ⏱ Clock in / ⏹ elapsed, a lifetime Σ, and 🕰 manual
// log. Jake's three sentences, implemented as written: clock-in on B while
// A runs is a SILENT switch (one batched commit closes A and opens B at
// the same instant — one open session max, by construction); clock-out
// opens a dialog with an editable end time (the "actually I stopped at
// 2:30" guesstimate) and Cancel (the misclick eraser); 🕰 logs a backdated
// session and truncates an overlapping running timer where it starts.
// Cross-midnight times mean yesterday; ends clamp to now and to their own
// starts. The rules wildcard already covers the sessions collection — no
// console re-paste.
// ------------------------------------------------------------
// Version 1.3.0 — THE CHRISTMAS CACTUS (D111) — a Y. Recurring, checkable
// tasks, exactly as specced in §5c with every decision already captured:
// a task may carry recurrence {every, unit, anchor}; checking it off lands
// it in Done-today AND materializes the next occurrence (a full new task,
// recurrence included — the cactus keeps needing water). Anchor default =
// completion ("you just watered it → 3 weeks from now"), per-task toggle
// for schedule-anchored. spawnedNextAt guards against double-planting on
// re-checks; un-checking leaves the spawn (simplest honest, follow-ups'
// own words). Escalation still nags the CURRENT instance only. The unit
// ladder is harmonized everywhere per Jake's aside ("a century-later
// follow-up feels amusing"): recurrence + escalation get calendar-correct
// months/years/decades/centuries; follow-up offsets get day-average
// equivalents. Queue rows wear ↻. Amends D20 narrowly — this is a task
// that re-plants itself, not a GCal-style engine.
// ------------------------------------------------------------
// Version 1.2.1 — TWO D105 WOUNDS (D110) — a Z. (1) Boot with "dash"
// persisted skipped enterDash(): S.view already read "dash" from
// localStorage, so the flag-based wasDash was true and the panes never
// assembled — flags flipped, week-view showed under a lit 🐙. setView now
// derives assembly from the DOM (dashHomes.length): boot-safe, idempotent,
// self-healing. (2) renderYear()'s pre-dashboard guard (S.view !== "year")
// silently refused every repaint of the year PANE — buttons fired, state
// changed, nothing drew; the pane was a frozen snapshot of the last solo
// render. Guard now admits "dash". Lesson for the ship-check: verifying
// the fan-out CALLS renderYear is not verifying the callee AGREES —
// called ≠ willing. Plus: a divider pointerdown mid-drag no longer
// double-increments the gesture lock.
// ------------------------------------------------------------
// Version 1.2.0 — THE BIG HURRAH GOES WHERE IT BELONGS (D109) — a Y. Katie
// finished the REAL climax of a project today (publishing) and the app
// saved the fireworks for the follow-up stage, because "last stage = the
// end" was a wrong model of what a project's end IS. Stages can now carry
// 🎆 (one per project, set in either stage editor; radio behavior; carried
// into next-year duplicates with checkmarks reset — the honor persists).
// A 🎆 stage completing = full level 3, fireworks + the wave, even with
// follow-ups open; the actual last stage then gets an ordinary level 2.
// No 🎆 marked = the old last-stage rule, unchanged. The Duplicate-next-
// year offer still waits for the WHOLE pipeline (that part really is
// about being done). Firestore never sees hurrah:false — true or absent.
// ------------------------------------------------------------
// Version 1.1.1 — the dashboard's ⛶ (D108) — a Z. Every view carried its
// own fullscreen button except the one that lives on a TV. The dashboard
// has no nav row, so the header IS its chrome: #hdr-fullscreen sits by ⚙️,
// dash-only, wired to the shared D96 toggle. (The pane ⛶ buttons always
// fullscreened the whole wall — but that shouldn't be a thing you have to
// know.)
// ------------------------------------------------------------
// Version 1.1.0 — BURN-IN CARE (D107, a Y) + the strip-overflow fix (D106,
// riding along). D107, three per-device layers for a wall that runs 15h/day:
// screen REST during the sleep hours the app already knows (near-black +
// wandering clock, dashboard only, tap to peek 5 min); idle CHROME DIM
// (header + dividers fade to 35% after 5 quiet minutes); and a second,
// wider, ~26-minute drift orbit on top of D37's fast ±2px. D106: BAR_PX
// modeled bars as fixed pixels, but real height is rem padding + vw-clamped
// fonts, and vw measures the GLASS, not the pane — on the 4K dashboard the
// model undershot ~50% and Auto hid two bars behind a scrollbar at every
// split position. D103 made the budget measured; settleWeekBars() finishes
// the cost side: the model proposes a size, the layout disposes — overflow
// steps down a rung until it fits (pins stay honest clipping).
// ------------------------------------------------------------
// Version 1.0.0 — THE DASHBOARD (D105, Phase 4) — the X. D67 defined it two
// months ago: "1.0 ships when the big-screen dashboard layout exists." It
// exists: a fourth view (🐙, ≥1200px glass only — Jake: "a 4K beast of a
// screen") that shows year LEFT, week TOP-RIGHT, agenda BOTTOM-RIGHT, all
// live at once, with draggable pane dividers (persisted per device,
// dbl-click resets) and a 🗂 toggle that splits the agenda pane two-up with
// the project pipeline. Architecture: the D68 reparenting trick at kiosk
// scale — the panes are EMPTY SHELLS and entering the dashboard MOVES the
// real #year-view/#week-view/#queue-panel into them (comment markers hold
// their seats at home). Nothing is cloned, so nothing can drift (D98). One
// new helper, fitAvail(), teaches all three height fits to answer against
// the pane when inside one and the window otherwise — the solo views are
// untouched by construction. Divider drags take the D101 gesture lock.
// Per Jake: from here, fixes are 1.0.z; only a new idea makes 1.1.
// ------------------------------------------------------------
// Version 0.38.1 — one grammar, and a splitter that answers (D104) — a Z.
// The week and year controls said the same three things in two dialects
// (labels/order/attributes all drifted); both now speak Layout · Window ·
// Bars with data-layout / data-window / data-size, ahead of the dashboard
// where the two headers must live side by side. localStorage keys are
// UNCHANGED on purpose — renaming them would silently reset Jake's and
// Katie's device choices, which reads as a bug. And the wv-split drag-DOWN
// deadness is fixed: Auto re-picks the bar size DURING the drag, so the
// boundary follows the pointer instead of teleporting on release.
// ------------------------------------------------------------
// Version 0.38.0 — the tracks fix (D103) — a Z. Two bugs, one wound: the
// week's SEVEN columns were only ever declared in the stylesheet, so any JS
// that set grid-template-columns on #wv-grid alone silently divorced the
// day heads (.wv-strip) from the days. Tidal's past-column compression did
// exactly that. Tracks are now ONE CSS variable that #wv-grid and every
// strip read together — they cannot disagree, because there's one number.
// Also: Auto's budget was fiction. It modelled the strip box as 34% of the
// board, but my own #tidal-horizon (flex: 0 0 auto — it will NOT shrink)
// squeezes #wv-strips (flex: 0 1 auto — it will), and the banner rows share
// that box and were never counted. Auto now measures what's actually left.
// 0.37.0 — the gesture lock (D101) — a Y: deferred rendering is a
// thing that didn't exist before. render() is a SNAPSHOT handler, so a drag
// must DEFER renders, never drop them: skipping would silently discard
// Katie's live updates. Defer + flush on release, with a 30s safety valve
// that fails OPEN, because a stuck lock would freeze live sync while looking
// perfectly healthy — the worst failure this app can have.
// 0.36.0 — THE CLOCK GRID (D100), layout #3 under Week. Built on D93,
// NOT D91: a task time is a DUE date, so a task is the block
// [due - estimate, due] — the runway ENDS at the promise and trails BACKWARD.
// Only overdue runs forward. Events own [start, end] outright.
// Dragging a task's TOP edge IS estimating (D93), and that gesture is the
// point of the layout: "can I fit dinner on Tuesday?" is a question about
// LENGTH, and until now a task could only ever be a line at a deadline.
// 0.35.1 — dead-space fix (D99). A past column whose items are all
// done/moved has an EMPTY .wv-list, and .wv-list is flex:1 — so the empty box
// claimed the whole column and stranded the cards at the bottom under a field
// of nothing. The bug only showed on exactly the columns reflection exists
// for. Now: no items + cards → the cards ARE the column.
// 0.35.0 — GANTESQUE IS DONE (D98). The 5a-bis victories/put-offs
// cards now render in GANTESQUE, which is where they were always owed —
// D97 built them and scoped them to Tidal, leaving the 12-turn-old Gantesque
// debt still open AND making the two layouts un-comparable, which is the one
// thing Tidal exists for. The cards are layout-agnostic: reflectionCards()
// is shared, the engine is dayReflection() in queue.js, and each layout only
// decides WHERE to hang them. Gantesque keeps its day list and gains the
// cards beneath it; Tidal REPLACES the list with a Wake. That difference is
// now the actual thing being compared.
// 0.34.0 — the Tidal Grid + Reflection (D97) — a Y: two things
// exist that didn't before. (1) THE CARDS 5a-bis promised and D95 built the
// data for, which nobody had actually rendered: what a day got DONE and what
// it put off. (2) TIDAL, layout #2 under Week (D90: Gantesque is the LAYOUT,
// the view stays "Week") — anchor shelf (events: fixed time, not ours) over
// the flow (tasks + stages: ours to arrange), and past days become a Wake.
// The two are one engine: the Wake IS the put-offs card.
// Gantesque is untouched — renderWeekColumns() is the 0.33.0 code verbatim,
// and it hands the grid tracks back to the stylesheet so Tidal's computed
// column widths can't leak into it.
// COST ON THE RECORD: the anchor/flow split breaks D43's chronological
// interleave (a 9 AM task sits below a noon meeting). That's the thesis —
// events own time, tasks own a deadline (D93) — and why it's a sibling.
// 0.33.0 — "on the wall" (D96) — a Y: Today had no ⛶ at all.
// 0.33.0: one shared toggleFullscreen() for all three views (week and
// year each had their own copy — which is how Today got forgotten), with
// webkit* fallbacks because the target is an OLD Android tablet: year's
// copy would have THROWN there, week's would have failed silently.
// Pairs with manifest.json (html 0.25.0): Add to Home Screen kills the
// address bar, ⛶ kills the rest, and Android screen-pinning locks it
// down needing nothing from us.
// Version 0.32.0 — "it remembers being moved" (D95) — a Y: this is new.
// 0.32.0: tasks carry firstDueAt + rescheduleCount (store 0.10.0). The
// hover shows "↻ moved 4× · first due Jul 10"; anything moved 3+ times
// wears a quiet mark, because a task that keeps sliding is the question
// worth asking. No migration — firstDueAt ?? dueAt IS the backfill.
// Version 0.31.1 — "spend the glass" (D94) — a Z, not a Y (D94 rule):
// old ideas finally behaving, not new ones. Draggable projects/days
// split (double-click resets); Auto now refits the bars into whatever
// share you chose instead of assuming a third. Row time+title finally
// share a centre line.
// Version 0.31.0 — "click to read, click to fold" (D92)
// 0.31.0: D91 expanded a bar on click and left no way back (Jake). Now
// one rule, no timing: at compact sizes a click TOGGLES expand/collapse
// and the expanded bar grows a ✎ to act; at readable sizes a click acts
// directly. "If you can read it, clicking acts; if you can't, clicking
// makes it readable." The hover says which one you'll get.
// Version 0.30.0 — "the board actually makes room" (D91)
// 0.30.0: D90's density edit NEVER LANDED — my patch script built a list
// of replacements, applied three by hand and never iterated the list, so
// weekBarSize/setWeekSize were called but never defined and dataset.size
// was never set. node --check parses; it does not notice a call to a
// function nobody wrote. Jake found it in one click. Now: the functions
// exist, Auto is HEIGHT-aware (measure the board, give the columns ~60%),
// and #week-view is pinned to the space under the header — height:100%
// against a parent with no height resolved to auto, which is why the
// columns walked off the bottom. First click on a too-small bar expands
// it; the second acts.
// Version 0.29.0 — "the board makes room" (D90)
// 0.29.0: HEIGHT. Eleven project bars pushed the day columns off the
// screen — #wv-sizes (Auto/▮/▪/▁/🧵) thins them, Auto stepping down as
// the list grows so the columns always get room. Banners pack DENSE (a
// 2-event Friday was taking a 3rd row because CSS grid's sparse cursor
// never walks backward — Jake and Katie both spotted the wasted row).
// Rows are clickable → reschedule; the deadline block finally hovers
// (I had written its tooltip and then killed it with pointer-events:
// none). NAV-SLOTS in all three views: "back to now" sits on the side
// matching its direction of travel and the arrows NEVER move — three
// clicks forward is three clicks forward (Jake, app-wide design flag).
// Version 0.28.0 — "Gantesque" (D89) — Jake's five, from real data
// 0.28.0: (1) project bars sort by PRIORITY, not the alphabet. (2) dates
// get a header row ABOVE the strips, where a date is expected. (3) the
// load bar is GONE: it showed "this day has 40% as many items as the
// busiest day" while looking exactly like a progress bar — two items,
// none done, 40% red, and Jake rightly asked what it meant. Words now.
// (4) the view toggle is a labeled 3-way switch (a glyph that needs a
// hover to explain itself is a failed control). (5) week-start modes:
// Today+6 / Sun–Sat / Mon–Sun, remembered per device — the past columns
// are for reflection, not waste (Jake corrected me). Also: an EXPIRED
// project whose window has passed no longer vanishes from the board.
// Version 0.27.0 — "the week" (D88)
// 0.27.0: THIRD VIEW. day → week → year cycles on one button. The week is
// seven QUEUE columns, not a clock: a task due at 4 PM is a deadline, not
// an appointment, and every computed stage deadline lands at deadlineHour,
// so a time grid would paint a wall of 4 PM collisions that don't exist.
// Spans (projects w/ stage pips, all-day events) ride the top strips;
// dated things live in columns. Per-day LOAD BAR — the one thing a week
// says that a day can't: "Thursday is going to hurt, and it's Monday."
// Rolling today+6 by default (a kiosk shouldn't spend four columns on
// history every Friday); ◀ ▶ page, "back to now" returns to rolling.
// Read-only v1 — drag lands once the layout is proven. queue ?v= → 0.13.0.
// Version 0.26.0 — "clear the deck, grouped" (D86)
// 0.26.0: queue ?v= → 0.12.0. D85's blended weight made a U (a 30%-done
// project outranked a 65%-done one); D86 replaces it with two piles —
// past-threshold beats catch-up, always. No UI change: same ⚙️ Pipeline
// setting, same fraction, better sort.
// Version 0.25.0 — "clear the deck" (D85)
// 0.25.0: new ⚙️ Pipeline setting — "Clear-the-deck at N% complete"
// (#cfg-cleardeck, stored as clearDeckThreshold fraction). Below it the
// queue favors your least-finished projects; at/above it a project flips
// to "just finish it." Wired to queue.js via setClearDeckThreshold on the
// config subscription (same pattern as deadlineHour). Tiebreaker only.
// Version 0.24.0 — "kick it down the road" (D84)
// 0.24.0: Jake's revised decision — the decision modal now offers BOTH
// reschedules: 🕐 stays the one-tap next-working-day-9AM, and a new 📅
// opens the due dialog for "way down the road" (any date + time). The
// due dialog is generalized: S.dueTarget is now {kind:"stage"|"task",…}
// and dueSave/dueClear branch — clearing a task's due shelves it to
// Waiting (a legit third option: 'not now, maybe ever').
// Version 0.23.1 — "the clock says where" (D83)
// 0.23.1: decision-modal rows now SAY the 🕐 plan in the sub line
// ("🕐 → Mon, Jul 13 9 AM") instead of hiding it in a hover tooltip —
// phones have no hover, and Jake read the silent auto-reschedule as
// "the modal just closes." Behavior unchanged: 🕐 IS the reschedule.
// Version 0.23.0 — "time passes, follow-ups flex" (D82, Otto's finale)
// 0.23.0:
//  · Passed timed events sink into an EARLIER TODAY box (dimmed,
//    struck time) instead of loitering in the live queue — today's
//    view only; past/future days show everything in place.
//  · Follow-ups get a real dialog (two prompt()s retired) with an
//    amount + minutes/hours/days/weeks unit. Storage stays offsetDays
//    (fractional — store.js's materialization already multiplies), so
//    store.js is untouched. Waiting rows display "+45m/+2h/+3d/+1w".
// Version 0.22.0 — "the mirror has a home" (D81)
// 0.22.0: ⚙️ Settings → Calendar gains "Mirror tasks to calendar ID"
// (config.mirrorCalendarId), consumed by functions 0.2.0's hourly
// reconcile. Blank = off. The function refuses polled calendars
// (loop guard); the hint says so too.
// Version 0.21.0 — "things that are happening" (D80)
// 0.21.0:
//  · All-day events render as an ambient BANNER STRIP above the queue
//    (tier-tinted pills, "Zoo Camp · day 3/5"), not as 12:00 AM rows —
//    the shape Jake described: not tasks, not appointments, just truth
//    to glance at. No checkbox, no pin, no expiry; multi-days show
//    their span; hover shows the full date range. Timed events remain
//    queue anchors exactly as designed since D3.
// Version 0.20.0 — "phone chrome" (D78)
// 0.20.0:
//  · ＋ in the header (phone widths only) scrolls straight to the
//    Add-a-task form and focuses the title (keyboard up, ready to
//    type). If you're in the year view it swaps to Today first — the
//    form lives there. No modal, per Jake: just the shortcut.
//  · "Log out", in words, at the very bottom (phone only); the ⏻
//    mystery-square hides at those widths.
// Version 0.19.2 — "the ghost is the preview" (D77)
// 0.19.2 (Jake: "it ends up where it's supposed to, but it strays
// into May first"):
//  · The pointer-following chip RETIRES. During a drag the original
//    bar dims in place; the ghosts — now TINTED in the project's own
//    color — are the entire moving preview. Nothing strays anywhere;
//    the transform/width preview code (source of two rounds of visual
//    bugs) is deleted outright.
// Version 0.19.1 — "the resolver learns left from right" (D76)
// 0.19.1 (BUGFIX, Jake's mid-drag screenshot):
//  · D73's date resolver measured only VERTICAL distance to rows — but
//    D72 put three months side-by-side, so April's week row "won" for
//    pointers inside June (same y-band, DOM order), x clamped to
//    April's edge, and EVERY horizontal position resolved to the same
//    date → horizontal drags dead, vertical ±7s fine. Now true 2D
//    distance; inside a rect is distance zero for that rect alone.
//  · Ghosts clipped to weeks but not MONTHS, so a shared spillover
//    week (May 31–Jun 6 lives in both May's and June's blocks) lit up
//    twice. Lanes now carry data-clip-s/e; ghosts draw only where the
//    bar will actually render.
// Version 0.19.0 — "the ghost knows where it lands" (D74)
// 0.19.0:
//  · DROP GHOSTS: while dragging, dashed accent slots render at body
//    level in EVERY row the new dates cross — the landing zone is
//    visible truth, matching the nav label. The lifted chip still
//    follows the pointer; the ghost is where it lands. Ghosts survive
//    mid-drag re-renders (they're body-level fixed, and the rowMap
//    rects remain valid).
// Version 0.18.0 — "carry it anywhere" (D73)
// 0.18.0:
//  · CROSS-ROW DRAGGING: drags hit-test against every week/row
//    rectangle (captured at grab time), so "what date is under the
//    pointer" replaces horizontal pixel math. Move a bar from the 12th
//    up a row to the 5th, across months, or between Gantt quarters —
//    the bar lifts and follows the pointer; the nav label reads live
//    dates; release commits with the usual working-day snapping.
//    Edge-drags use the same date math (width preview stays in-row;
//    the label guides).
// Version 0.17.0 — "Katie's quarters" (D72)
// 0.17.0:
//  · The Annual is QUARTERS: 4 rows × 3 months (Katie caught the 3×4
//    orientation error). Wider months serve the future kiosk column.
//  · PER-QUARTER uniform week heights (Jake's idea): each row of
//    months sizes to ITS OWN max weekly concurrency — July's 9-project
//    pileup only taxes Q3; empty quarters collapse. Fit math solves GL
//    across the actual quarter mix, so today's load lands ~6px bars in
//    a NORMAL window (fullscreen no longer required).
// Version 0.16.0 — "nickel and dime" (D71)
// 0.16.0:
//  · Annual reclaims its pixels: dow row dropped (weekend shading +
//    day numbers carry the structure), month chrome estimate honest
//    (26px), lane padding trimmed, auto floor now GL 3 → 2px hairline
//    bars. Jake's real numbers (≈1070px, 10 lanes, 6-week Aug) now
//    land at GL 3 with ~145px slack; ⛶ fullscreen buys GL 4.
//  · FIT-MATH BUG: measurements were viewport-space, so rendering
//    while scrolled inflated avail and bars GREW after you scrolled.
//    Now document-space (rect.top + scrollY) in Annual AND timeline.
//  · 🧵 hairline pin (LANE 3 / BAR 2, borderless): see the whole year
//    as color threads; tap for details; edit at bigger sizes.
//  · ⛶ fullscreen toggle in the year nav; fullscreenchange re-fits.
// Version 0.15.0 — "the year that fits" (D70)
// 0.15.0:
//  · Annual view (né Year wall) auto-density is now WINDOW-FIT, like
//    the timeline: month rows share the real screen height, GL clamps
//    5–14; the floor is 3px borderless hairline bars, so a fully
//    loaded Katie-year still fits one screen before it ever scrolls.
//    (Column count mirrors the CSS breakpoints — change together.)
//  · Annual week heights are UNIFORM (global max concurrency), so the
//    12 calendars line up like a real wall instead of July towering
//    over an empty August (Jake). Stacked Months keeps per-week fit.
//  · Bar labels appear on ANY bar tall enough to hold them (≥16px and
//    ≥3 days) — the Annual view included, e.g. with ▮ pinned.
//  · NOT a bug, recorded for posterity: progress fill is positional in
//    time (D30a) — a May–July project at 25% shows its saturation in
//    MAY; a July-onward window shows only ghost. Jan–Dec reveals it.
// Version 0.14.0 — "the whole year on the wall" (D69)
// 0.14.0:
//  · YEAR WALL layout (the view Jake was picturing all along): 12 mini
//    month calendars in a 4×3 grid — the wall of calendars. New
//    default; ▦▦/▦/▬ toggle. Zooming a wall month renders it big
//    (stacked-month styling). Wall bars never carry inline labels —
//    hover/tap/legend speak. Wall auto-density runs one notch thinner.
//  · BAR SIZE control (Jake): Auto (per-layout judgment, incl. the
//    timeline's window fit) or pinned ▮ 20px / ▪ 10px / ▁ 5px bars —
//    persisted per device (tc-year-barsize).
// Version 0.13.0 — "the wall calendar" (D68)
// 0.13.0:
//  · MONTH-GRID layout (Jake's "traditional view"): months stacked,
//    Sun–Sat columns, weeks as rows; bars clip per week ∩ month with
//    per-week lane packing (gcal-style), same drag/stretch/tap/fill.
//    Toggle (▦ Month grid ⇄ ▬ Timeline) left of the mode buttons;
//    grid is the default, choice persists (tc-year-layout). The
//    days-in-a-row layout now has its name in the UI: a Gantt chart.
//  · Timeline bars size to the WINDOW: total lanes share the real
//    vertical space (clamped 9–34px lanes), re-flowing on resize —
//    2K gets thick bars, phones get readable slivers.
//  · ＋ New project FAB (bottom-right of the year view) reparents the
//    REAL project form into a modal — listeners, color assistant, and
//    working-day interception ride along — and returns it on close.
// Version 0.12.0 — "days are key" (D66)
// 0.12.0:
//  · Day texture in BOTH year rows and month zoom: weekend shading
//    blocks, faint day gridlines, stronger Monday week lines (month
//    boundaries remain strongest). Compact grids shed day lines first.
//  · Adaptive bar density for Katie's real concurrency: ≤4 lanes =
//    full 20px bars with inline labels; ≤9 = half-height 10px; beyond
//    = quarter-height 5px. Thin bars drop inline labels — hover titles,
//    tap popovers, and the legend carry the names (Jake's suggestion).
//  · Rows now size to the lanes they actually use (a quiet quarter is
//    a short quarter) while every project keeps its one global lane.
// Version 0.11.0 — "PHASE 2: the year view" (D65)
// 0.11.0:
//  · Header 📅 toggles between Today and a quarter-aligned year view:
//    4 rows × 3 months, three anchor modes (Jan–Dec / quarter-first /
//    month-first, D31), ◀▶ pages 12 months, "back to now" resets.
//  · Project bars (D30a): pale ghost of the project color saturating
//    left-to-right by pipeline %, continuous across quarter rows via
//    per-segment gradient clipping; global lane packing keeps each
//    project on ONE lane all year; today line; legend + tap-for-details
//    popover (D27); labels hide on narrow grids (container query).
//  · Drag to move, edge-drag to stretch (D32): document-level pointer
//    listeners survive re-renders; live date readout in the nav label;
//    release snaps to the tier's working days (start fwd / end back,
//    order-guarded — same rules as the form and 🔁 duplicate).
//  · Tap a month name to zoom it full-width with day ticks (D18);
//    ◀▶ then steps one month; "◱ whole year" returns.
//  · View + anchor mode persist per device (tc-view / tc-year-mode).
// Version 0.10.0 — "the encore" (Katie's notes field, D63)
// 0.10.0:
//  · Tasks get an optional NOTES field: short title in the row, details
//    behind a ▸ toggle underneath (tap the title or the chevron).
//  · Row layout v2 (the phone smoking-gun screenshot): queue/waiting/
//    done rows are now two lines — [checkbox + title] over [tier chip +
//    actions] — so long titles wrap as prose instead of one-word
//    columns squeezed beside four buttons. Shared rowScaffold builder.
// Version 0.9.0 — "the goodbye release" (Inky's last)
// 0.9.0:
//  · D62 rev: dup modal gains "✎⋮ Review the pipeline first…" — edits
//    next year's stage list BEFORE anything is created (stages editor
//    borrowed via the "@dup" target; dup modal hides and returns).
//  · Snooze row: remind me in 1 day / 1 week / 1 month (30d alone was
//    too blunt).
//  · Un-dater broadened: remnants come in TWO flavors — after/end/0
//    (Katie's window experiments) AND after/start/0 (the 0.6.0/0.6.1
//    editors' default, per the D50 caveat). v0.8.0 only caught "end";
//    Jake's screenshot showed the other half untouched. Now any
//    After + 0wd row converts, either anchor.
// Version 0.8.0 — "the smoke-test release"
// 0.8.0:
//  · D61: queue hides a tier's items on days outside its allowedDays
//    (Katie's weekend queue is clear of Work; cards still show all).
//  · D62: duplicate-for-next-year is a REVIEW FORM — name (with the
//    year token auto-bumped, e.g. resv2606 → resv2706), dates, color,
//    tier, workload all editable before creation; "Remind me in a
//    month" snoozes it into a real task instead.
//  · Date/time fields: task due defaults to today; clicking any
//    date/time input opens the native picker (showPicker) where the
//    browser supports it, instead of demanding the tiny icon.
//  · Stage-editor rows: undated stages now GHOST their anchor/offset
//    controls (visibility, not display) so columns stay aligned — the
//    "name field ate the row" report was the layout collapsing into
//    the vacancy left by display:none.
// Version 0.7.0 — "the exit-checklist release"
// 0.7.0:
//  · DECISION MODAL v2 (D57): rows are LIVE (re-derived from real
//    state every render), ✓ completes the ACTIVE stage (the old code
//    completed the deadline stage — Jake's "still on the first phase"
//    bug), 🕐 replaces ↷ and reschedules the overdue DEADLINE to the
//    tier's next allowed day 9 AM, modal auto-closes when emptied.
//  · Collapsible project cards + pinned header buttons + finished
//    projects folded into their own section (D56).
//  · Un-complete-parent rewind modal, 3 options (D53).
//  · Duplicate-for-next-year: completion prompt + 🔁 card button (D59).
//  · Settings split into tabs; deadline hour (D51) + decision
//    threshold (D52) settable; per-tier allowed-day toggles (D60);
//    tier color conflict assistant (D55).
//  · ⓘ popover fix (D58): a tap inside a <label> re-dispatches a
//    click to the label's control, and THAT second click closed the
//    popover in the same instant it opened. preventDefault() stops
//    the forwarding. (Jake: "the i doesn't show anything.")
// 0.6.x: D50 undated stages, D49 versioned module imports, D43–D48
// priority engine v2 + modals + filters.
// ============================================================

```


---

## `functions/index.js`

<!-- Moved out of the source header 2026-08-02 (Thaumoctopus), verbatim.
     The header was 191 lines; version-check 1.5.0 now enforces the budget. -->

<!-- 2026-08-02 (Cirrothauma): the budget was still being FAILED — the trim
     above had recorded the intent and left the header at 191 lines. Finished
     it: 191 -> 57 lines, and 1.3.1 is the bump that carries it. The 1.2.1
     block below existed ONLY in that header and was nearly lost with it;
     everything else was already here. Also removed a line that appeared
     twice in a row ("0.3.0: PHASE 3 IS COMPLETE..."), which is what a header
     nobody can see in one screen produces. -->

### 1.2.1

```
(prev) Version 1.2.1 (E14 queue · E37 guard · E40 ws tags)

1.2.1 — the mirror's "not configured" message pointed at "⚙️ Settings →
Calendar". THERE IS NO CALENDAR TAB; it is Timing, and the carryover's
message twelve lines below already said so. This is D84's error, which was
corrected in the docs in July and never in the string a user actually sees.
Caught in Jake's first live curl. Both messages now name the tab that
exists AND the walkthrough that explains it.
```

### 1.2.0

```
1.1.0 tagged every mirrored event `tcApp=octodo` and nothing else, then
listed by that tag and DELETED any event whose task it could not find. One
app, many workspaces — so if two workspaces ever pointed at the SAME mirror
calendar, each run would see the other's events as orphans and delete them.
Every hour. This is the identical failure the 1.x/2.0 tag split was written
to prevent (E36), one level further down, and it was still open.

Fixed by adding `tcWs: <workspaceId>` to every written event and to the
list filter (privateExtendedProperty repeats and ANDs). Each workspace now
sees and prunes only its own events, which turns "two people share one
mirror calendar" from a mutual-deletion machine into something that simply
works — a household might well want exactly that.

⚠️ FREE ONLY BECAUSE NOTHING IS DEPLOYED YET. An event written by 1.0.0 or
1.1.0 carries no tcWs, so it would fall outside the new filter, become
invisible, and never be pruned. There are no such events today. If this
ever changes after a real deploy, the migration is a one-off pass that
lists by tcApp alone and stamps tcWs onto anything missing it.

(prev) Version 1.1.0 (E14 work queue + E37 calendar guard)

1.1.0 — ⚠️ CLOSES A REAL HOLE THAT 1.0.0 SHIPPED WITH, found by Jake
asking whether a colleague could end up with HIS calendar. He could have
ended up with worse: a colleague could have TAKEN it.

  THE HOLE. The service account is PROJECT-WIDE. When Jake shares his
  calendar with the robot so his own poll works, he grants that robot
  access for EVERY workspace in the project — the grant lives on Google's
  side and knows nothing about workspaces. 1.0.0 then read whatever
  calendar id a tier happened to name, with no check that the workspace
  was entitled to it. So any signed-up user could type
  jacob.v.wilson@gmail.com into their own Home tier and pull his entire
  calendar into their queue. Firestore isolation (E1) is airtight and
  completely beside the point here: the leak is on the CALENDAR side.

  THE GUARD (E37). A bare email address is somebody's primary calendar,
  and it is guessable — so it may only be polled by a workspace that
  person is a MEMBER of. Everything else (…@group.calendar.google.com and
  friends) is an opaque random id nobody can guess, so it passes; those
  are secondary calendars whose id is itself the secret.

  WHAT THIS IS AND IS NOT. It is a real fix for the guessable case, which
  is the one that matters, and it is defence in depth rather than a proof
  of ownership — path A cannot prove ownership, because sharing a calendar
  with a robot leaves no record of WHO shared it. **The complete answer is
  path B (E13): per-user OAuth, where each person authorises their own
  calendar and no shared robot exists.** Until then this guard plus a
  trusted user base is the honest position, and it is written down here so
  nobody has to rediscover it.

(prev) Version 1.0.0 (E14, the multi-tenant work queue)

1.0.0 — WHAT CHANGED FROM 1.x's 0.4.0, AND WHAT DELIBERATELY DID NOT.

DID NOT CHANGE, and re-deriving any of it by accident would be, in the
design doc's own words, "a catastrophe wearing a rewrite's clothes":
  · D135's poll reconcile — deterministic {tierId}_{gcalEventId} doc ids,
    write-only-what-changed, syncedAt deliberately absent. This took
    writes from 1,500/day to 116/day. It is carried across verbatim.
  · D81's mirror ledger — the CALENDAR is the ledger, keyed by tcTaskId;
    no task-doc writes, honest dueAt only, and the loop guard that refuses
    to mirror into a calendar some tier polls.
  · D87's carryover — no hour trigger, because "due before today began" is
    true whenever it runs, so no cron hiccup can silently skip a morning.
  · The separate tag namespace between mirror and carryover, so two jobs
    can write to ONE calendar and stay mutually invisible.

CHANGED:
  1. THE WORK QUEUE (E14). 0.4.0 hardcoded `WS = "primary"`. A serial loop
     over every workspace would eventually exceed the request timeout, and
     its failure mode is silent — the last user in the loop never gets
     polled and nobody finds out. Instead: claim a bounded batch of
     workspaces whose nextPollAt is due, oldest first, process each with
     its own try/catch, and re-stamp. Timeout-safe by construction,
     self-healing after an outage (the overdue are simply the oldest), and
     load spreads itself because stamps land at staggered times.
  2. THE TAG NAMESPACE IS `octodo`, NOT `tentacalendar`. This is the whole
     answer to "can both apps share a calendar during the migration."
     The mirror LISTS by exact-match on tcApp, then DELETES any tagged
     event whose task it cannot find — so two apps sharing one tag would
     take turns deleting each other's work, every hour. Distinct tags make
     them mutually invisible, exactly as D87 already made the carryover
     invisible to the mirror. 1.x keeps its tag and is not touched.
     ⚠️ A COMBINED TAG ("octodo tentacalendar") CANNOT WORK: the list
     filter is exact-match, so such an event is invisible to BOTH apps
     rather than visible to both. The tag records OWNERSHIP, and ownership
     has to be binary for the prune step to be safe.
  3. pollIntervalMinutes is read from the WORKSPACE document (E14 needs it
     queryable), falling back to settings/config and then 60.
  4. ?ws=<id> runs one workspace only — the testing door 0.4.0 never
     needed, and the first thing anyone will want when a poll misbehaves.

Deploy: Google Cloud Console inline editor (no CLI). See SETUP-PHASE3-2.0.md.

(prev) Version 0.4.0 (D135, the poll reconcile)
0.4.0: pollCalendars RECONCILES instead of replacing. It used to delete
every cached event and re-write all of them under new auto-ids every
hour regardless of change — ~180 document changes pushed to every open
tab per run, ~2,900 billed reads per tab per day, scaling with users.
Now: docs are keyed {tierId}_{gcalEventId} (what HANDOFF §3 always
specified; the code had drifted to auto-ids, which is WHY nothing could
be compared), only genuinely-changed events are written, and only
vanished ones deleted. syncedAt was REMOVED from the payload — it was
never read anywhere, and being Date.now() it would have made every doc
differ every run and defeated the whole fix. Legacy auto-id docs delete
themselves on the first run (they're not in the wanted set). Same
discipline mirrorTasks has used since 0.2.0. No client change needed:
nothing keys off an event's doc id, and eventsCache is read-only display.
0.3.0: PHASE 3 IS COMPLETE. Third job, ?job=carryover (and in "all"):
0.3.0: PHASE 3 IS COMPLETE. Third job, ?job=carryover (and in "all"):
a task in a ❗ midnightCarryover tier that was due before today began
and still isn't checked gets "❗ <task>" on today's calendar at
config.carryoverWriteHour (default 9), tomato colorId 11 — D14, the
"nothing silently disappears" promise. Deliberately NOT hour-triggered:
"due before today started" is true whenever it runs, so the first
waking tick (~06:07, past the 22–6 sleep gate) writes the 9 AM landing
and no cron hiccup can skip a morning. Its own tag namespace
(tcApp=octodo-carryover) so the mirror — same calendar, keyed by
tcTaskId — can't see these and patch the ❗ back to the due time.
Reconciles TODAY only: create / re-time / delete-when-done; history stands.
0.2.0: one service, two jobs, routed by ?job= — "poll" (default),
"mirror", or "all" (what the Scheduler should call). The mirror
reconciles dated, incomplete tasks onto a DEDICATED write-shared
calendar (cfg.mirrorCalendarId): create missing, patch drifted
(title/time), delete completed/deleted/undated. Events are tagged
with extendedProperties.private.tcTaskId, so the CALENDAR is the
sync ledger — no task-doc writes, no schema changes. Honest due
times only (escalation theater stays in the app). 30-min blocks.
LOOP GUARD: refuses to mirror into any calendar attached to a tier.
Scope widened readonly → calendar (rw).
0.1.1: an UNSET POLL_SECRET now refuses everything with a distinct
message (previously undefined === undefined let header-less requests
through an unset lock — Jake's "did I miss the variables?" question
exposed it). The JSON report now includes tz + localHour, so one
curl verifies BOTH env vars.

pollCalendars: reads Google Calendar events for every anchor tier
with a gcalCalendarId and mirrors them into eventsCache. The web
client has subscribed to eventsCache since v0.1.0 — no client
changes needed; events appear in the queue the moment this runs.

Deploy: Google Cloud Console inline editor (no CLI — Jake's school
Mac has no admin rights). See SETUP-PHASE3.md. Plain
functions-framework style on purpose: it's what the console's
Cloud Run functions editor expects.

Env vars (set in the console):
  POLL_SECRET  — shared secret; requests must send x-poll-secret
  TZ           — America/Chicago (makes all Date math Nashville-local,
                 including all-day event midnights and sleep hours)

Auth to Calendar: the function's runtime service account, using
Application Default Credentials. Jake & Katie SHARE their calendars
with that service account's email ("See all event details") — no
OAuth dance, no token storage.
```

## `queue.js`

```
// Version 0.20.0 — D120: THE TIME REPORT engine. reportPeriods() steps
// day/week/month/quarter/year buckets FORWARD from an arbitrary range's
// own start (via addMonths — now exported — for calendar-correct month
// math), not from a calendar epoch: start a range Jan 1 and quarters/
// years land calendar-aligned, start it Jul 1 and they land fiscal-
// aligned, same code either way. This is the actual answer to the
// fiscal-vs-calendar question parked for Katie back at D120 — don't
// pick one, let the range be arbitrary and both fall out for free.
// rollupSessions() buckets the sessions ledger into those periods,
// SPLITTING any session that crosses a boundary (a 10pm-2am session
// gives 2h to each side of midnight — decide once, split at boundaries,
// never guess which side "owns" it); open sessions count to `now`.
// rollupToCSV/sessionsToCSV round out the "CSV export of BOTH the
// rollup AND the raw sessions" the spec asked for — raw stays UN-split,
// the respectful export for an actuary building her own models. 19
// verbatim assertions against this exact module (not reimplemented)
// before wiring into app.js — a 20th line in the same script was
// self-contradictory (asserted a string both did and didn't appear),
// caught as a script bug rather than chased as a product one.
// (prev) Version 0.19.0 — D126: TIMELESS CONTAINMENT. Katie's want-tos projects
// carry null startDate/endDate on purpose (D126, app.js/store.js) — this
// file is the deadline spine, so it's the one place that MUST refuse to
// turn "no dates" into an accidental date. Two structural guards, not one:
// (1) stageScheduledAt returns null outright when project.startDate or
// .endDate is null, REGARDLESS of a stage's own direction/offset — a
// timeless project's stages read as undated weight no matter what a
// pipeline template says, so a mis-set directional stage can't silently
// compute an epoch-anchored (1970) deadline. (2) buildQueue AND buildWeek's
// project loops both additionally skip any project on a timeless tier
// outright — belt and suspenders, and load-bearing in buildWeek's case:
// its own "nothing silently disappears" rescue (a project whose window
// is entirely in the past still gets a bar stretched to today, D89) would
// otherwise read a timeless project's epoch-zero window as "deeply
// overdue" and paint a bar from 1970 to today. dayReflection needed no
// extra guard — guard (1) alone makes its put-off path see `null` and
// skip; its victory path is left open on purpose, since finishing a
// someday-project stage today is a real, dated accomplishment worth
// showing in the daily reflection even though the project itself isn't.
// (prev) Version 0.18.0 — D123: US federal holidays, client-computed. usFederalHolidays(year)
// is a pure per-year function (fixed dates + floating rules — MLK 3rd Mon Jan,
// Memorial last Mon May, Thanksgiving 4th Thu Nov, …), Juneteenth from 2021;
// holidaysForRange(a,b) → a day-keyed Map for a render window. Local Date math
// throughout so a holiday lands on the day the wall draws. Observed on the true
// date (no Sat/Sun→Monday shift — a planning wall should SHOW that July 4 is a
// Saturday, not hide it). No new dependencies; no infrastructure (D75 moot).
// (prev) Version 0.17.0 — D111: nextNag speaks the harmonized unit ladder
// (months/years/decades/centuries step calendar-correct via addMonths).
// (prev) Version 0.16.0
// 0.16.0 (D100): THE CLOCK GRID's geometry — clockBlocks() + weekClockWindow().
// Built on D93, NOT on D91's diagram, and the difference is the whole point:
// a task time is a DUE date, so a task's block ENDS at its deadline and its
// runway trails BACKWARD — [due − estimate, due]. D91 drew it forward to
// midnight, which says "start this at 6 PM" when the truth is "have this done
// by 6 PM". Only the OVERDUE state extends forward, from the deadline to now,
// because that's the one thing that really is growing. Events are the other
// animal entirely: they own [start, end] outright (D93/D80) — nothing to
// estimate, nothing to infer.
// 0.15.0 (D97): REFLECTION — dayReflection() answers the two questions a
// past day is actually for: what got DONE (victories) and what got PUT OFF.
// Both were promised by 5a-bis and neither was derivable from buildWeek's
// columns, because (a) `expired` is gated on viewingToday by design, so a
// past column's items are ALL expired:false — a Wake filtering on it renders
// nothing, forever; (b) a task moved off Tuesday is not IN Tuesday's items
// at all (buildQueue filters on the CURRENT dueAt), so the evidence of the
// put-off lives only in firstDueAt; and (c) doneToday was computed per-day
// by buildQueue all along and then thrown away. Reflection scans the raw
// task/project arrays against the day instead. Cols gain victories/putOffs;
// buildWeek returns `waiting` so a layout can show pending inventory.
// 0.14.1 (D90): spans carry activeStageIndex — the clickable bar needs
// it to open the due dialog on the right stage.
// 0.14.0 (D89): projectSpans now sort by PRIORITY, not the alphabet —
// expired first, then next deadline, then the D86 piles (Jake: "projects
// should be in priority order"; ten bars sorted A–Z said nothing about
// what matters). Spans carry deadlineAt/expired/nextStageName. Also
// weekAnchorFor(): Sun–Sat / Mon–Sun / rolling today+6, because
// reflecting on the week just gone IS how you plan the next one — the
// past columns aren't dead space (Jake corrected me on this).
// 0.13.0 (D88): buildWeek() — N honest days (one buildQueue per column,
// so expiry/off-days/the D86 piles all come free) + the two spanning
// strips: projectSpans (bars with stage pips) and bannerSpans (one bar
// per all-day event). Projects DON'T repeat down the columns: D48 rides
// them through their whole window, which would render a 3-month project
// seven times — a stage row lands only on its deadline day (plus today
// if expired), and the SPAN goes up top where a span belongs. Also
// addDaysLocal(): calendar day-stepping, because ts+DAY_MS repeats a
// date across DST fall-back and would drop a day from the week.
// 0.12.0 (D86): the clear-deck tiebreaker is now GROUPED, not blended.
// D85 multiplied workload by pct-or-1-pct, which made a U: urgency rose
// at both ends and SAGGED in the middle, so a 30%-done project outranked
// a 65%-done one (Jake: "too confusing"). Now two piles split at
// CLEAR_DECK_THRESHOLD, pile first: past-threshold (MOST done first),
// then catch-up (LEAST done first), then tasks/events. Workload only
// breaks an exact-pct tie — heavier first. Four equal projects at T=60%
// sort 95 → 65 → 30 → 40. Still tiebreaker ONLY (Jake's option A).
// 0.11.0 (D85): CLEAR-THE-DECK priority — first cut, the blended weight
// superseded by D86 above. setClearDeckThreshold/the config rail land here.
// 0.10.0 (D82): timed events whose window has PASSED (end — or start
// +1h grace when endless — is behind now) leave the live list for a
// passedEvents array, TODAY only; viewing other days shows everything
// in place (a past day is all "passed"; a future day, none).
// 0.9.0 (D80): ALL-DAY events split out of the chronological queue
// into a BANNERS list — "things that are happening" (Zoo Camp week,
// parents in town) vs "things to go to at a time." Banners carry
// day-N-of-M span math (all-day ends are EXCLUSIVE, per Google), sort
// tier-rank-then-start, respect hidden tiers, never pin, never expire,
// and never demand a checkbox. Timed events are unchanged: queue rows
// at their slot, pinned in their lead window, aging off at midnight.
// 0.8.0 (D61): the queue respects tier working days — when the VIEWED
// day isn't in a tier's allowedDays, that tier's tasks and project
// stages don't appear (Katie's Saturday is clear of Work items; the
// project cards still show everything, and Monday brings it all back,
// including the decision modal). Events/anchors are unaffected, as
// are Done-today and Waiting.
// 0.7.0 (D51/D60): configurable deadline hour (default 16 = 4 PM,
// set from settings via setDeadlineHour) + per-tier ALLOWED DAYS.
// "Weekday math" is now "working-day math": every tier declares
// which days of the week count (default Mon–Fri). Stage offsets,
// pipeline windows, date interception, and reschedule targets all
// count only the owning tier's allowed days. isWeekend/addWeekdays/
// weekendNeighbors remain as Mon–Fri wrappers for compatibility.
// 0.6.0 (D50): UNDATED stages are first-class — direction:"none".
// ============================================================

```


---

## `tentacalendar.css`

```
/* Version 0.57.0 — #version.stale: the amber "this tab is running code older
   than the server has" state for app 1.36.0. Amber not red — nothing is
   broken, but nothing you are looking at can be trusted either. */
```


```
/* ============================================================
   Tentacalendar — tentacalendar.css
   Version 0.55.1  (banner and --tc-version move together, ALWAYS —
   0.22.0 shipped with this banner still reading 0.21.1. Jake caught it.
   AND THEN 0.55.0 DID IT AGAIN: banner 0.55.0, --tc-version still 0.54.0.
   The warning was two lines above the mistake. If you are bumping this
   file, the bump is TWO edits, and the second one is at :root.)
   0.55.1 (E41 repair): the block below was written against --card,
   --bg-alt and --accent-dim, which do not exist. Remapped to --panel,
   --panel-2 and --accent, and --tc-version corrected.
   (prev) 0.55.0 (E41 — onboarding): .onboarding-overlay, .welcome-splash-card,
   .tour-highlight, .tour-popover, .popover-hint, .help-panel and related.
   Complete visual system for welcome splash, step-by-step tours with overlays,
   contextual popovers, and expandable help panels.
   (prev) 0.54.0 (tier order by position): .t-move / .t-pos replace the .t-rank
   number box. Reuses .st-move's exact geometry because it IS that control
   — stacked ▲▼ moving a row in a list — and D104 says one grammar. .t-rank
   is gone from the stylesheet as well as the markup; a rule for an element
   that no longer exists is the kind of thing a later reader treats as a
   clue.
   (prev) 0.53.0 (item 5, shared tiers): .t-share is the handshake on every tier
   row and .tier-share is the strip that opens under it. Deliberately built
   from the SAME vocabulary as .person-row / .person-tag — this is the same
   idea (who holds a key) at tier size rather than board size, and D104 says
   one grammar. NOT reusing .person-row itself: that block is a flex row
   inside a list, and this is a panel. Borrowing a class for its shape while
   inheriting its meaning is exactly what cost 0.48.1 a round trip.
   (prev) 0.52.0 (helper role + D142): .pane-locked / .locked-note dim a pane the
   current role cannot write while leaving it legible, .role-matrix styles
   the four-role table in People, and .est-label puts Est. min on one line
   with its field beside it instead of stacked under a squeezed column.
   (prev) 0.51.0 (E40): #mirror-connect shares #cal-connect's rules rather than
   growing a second dialect for the same object (D104).
   (prev) Version 0.50.0  (banner and --tc-version move together, ALWAYS —
   0.22.0 shipped with this banner still reading 0.21.1. Jake caught it.)
   0.50.0 (E39): #cal-connect, the collapsed calendar walkthrough, and
   .robot-row which has to hold a very long service-account address next
   to a button without pushing the settings modal wide (D66 again).
   (prev) Version 0.49.0  (banner and --tc-version move together, ALWAYS —
   0.22.0 shipped with this banner still reading 0.21.1. Jake caught it.)
   0.49.0 (E38): #ws-rename-row aligns its button with the input instead of
   with the label above it. Nothing else.
   (prev) Version 0.48.1  (banner and --tc-version move together, ALWAYS —
   0.22.0 shipped with this banner still reading 0.21.1. Jake caught it.)
   0.48.1: .person-tag replaces .person-row .badge. `.badge` ALREADY EXISTED
   and means DANGER — background: var(--danger), bold, near-black text. My
   rule set colour and border but not background, so specificity handed the
   People rows grey text on a red pill: unreadable, and semantically wrong,
   since "holds the deed" is a fact and not a warning. Reusing a class for
   its SHAPE while inheriting its MEANING is the trap here; D104's "one
   grammar" argues for reusing a vocabulary, not for borrowing a word that
   already means something else.
   (prev) Version 0.48.0  (banner and --tc-version move together, ALWAYS —
   0.22.0 shipped with this banner still reading 0.21.1. Jake caught it.)
   0.48.0 (E34): the board switcher — .board-chip in the header (colour dot,
   board name, caret) and .board-menu beneath it. .board-chip.visiting marks
   a board you hold a key to but do not own, which is the "identifier in the
   corner" that tells you whose house you are standing in. The menu is
   position:absolute inside a position:relative wrapper rather than fixed,
   so it rides the header and needs nothing from D37's drift rules.
   (prev) Version 0.47.0  (banner and --tc-version move together, ALWAYS —
   0.22.0 shipped with this banner still reading 0.21.1. Jake caught it.)
   0.47.0 (E17, OCTODO LINE): #blocked-screen joins #auth-screen on the one
   selector they share, so "signed in with nowhere to go" inherits the exact
   centering and card the sign-in screen already had — D104's one-grammar
   lesson applied to a new surface instead of inventing a second dialect.
   Plus .blocked-detail, a quiet monospace line for the technical reason.
   Two rules; everything else is 1.x's 0.45.1 byte for byte.
   ⚠️ 0.46.0 IS SKIPPED DELIBERATELY AND FOREVER. At the 1.x origin that URL
   has doubled bytes cached against it (see the 1.x 0.45.2 note); it was
   never a version any file declared, only a ?v= that index.html requested
   by mistake. Octodo is a different origin with a clean cache, so 0.46.0
   would be technically safe here — and would still be a number meaning two
   different things in two repos during the dual-fix window (E27). Not worth
   the saved digit.
   0.45.1 (D138): phone overflow fix. On <=600px the two .nav-slots may
   shrink (min-width:0; flex:1 1 0) instead of holding 7.5rem each — that
   fixed floor was forcing the whole queue panel wider than a 360px
   viewport, clipping every row and word-stacking the date. Patch, not
   minor: no feature, one broken layout made correct. CSS only.
   0.45.0 (D137): the alerter. #alert-toast (top-centre, z-index 141 so a
   deploy banner at 140 can never bury an alert) + three level tints
   (--alert-due/-nag/-soon) and a width for the volume slider. The
   kiosk-idle override is load-bearing: D107 fades the wall's chrome
   after 5 idle minutes, and an alarm that fades is not an alarm.
   0.44.0 (D132): the follow-up chain builder in the New Task form —
   .fu-chain-head, .fu-chain-row and its fuc-* children. Rows carry a
   left border and panel-2 fill so the "and then, and then" indent is
   visible as shape, not just implied by a dropdown. No new tokens.
   0.43.0 (D130): #update-banner — a fixed bottom bar (z-index 140, above
   modals so it's reachable even with Settings open), shown when the hourly
   version check finds a newer deploy. Reuses --panel-2/--accent; no new
   tokens. Outside #drift-wrap in the markup (D127).
   0.42.0 (D120): the Time Report. .report-card widens the modal for a
   table (920px vs the usual 640px); .report-controls, #report-table
   (header/footer weight via border, right-aligned number columns, first
   column left-aligned and allowed to wrap), .report-swatch (the project-
   color dot). .clock-total.clickable adds the pointer cursor + hover —
   the base .clock-total keeps cursor:default for the (now rarer) case
   where a project has no logged time and the span isn't rendered at all.
   0.41.0 (D126): have-tos/want-tos. .t-timeless-label mirrors .t-carry-label
   for the tier editor's new ⏳ checkbox. Everything else — the .tab-bar
   toggle atop #queue-panel, the want-tos header, the want-tos project
   cards — reuses existing classes (.tab-bar/.tab-btn, .day-nav, .hint,
   .project-card) on purpose: D104's "one control grammar" lesson applied
   to a whole new surface instead of inventing a parallel one.
   0.40.0 (D125): phone fit + dash scroll. text-size-adjust:100% stops
   mobile Chrome font-boosting (was ballooning the day header ~2x and
   breaking "Today — Sat, Jul 18" one-word-per-line); .day-nav h2 gains
   min-width:0 and phones get slimmer panel padding. And #dash-bottom >
   section now align-self:stretch — #projects-panel's base align-self:start
   was collapsing it to content height in the dash row, defeating its own
   overflow-y (the agenda scrolled, the pipeline didn't).
   0.39.0 (D124): project-type library controls — #pipeline-picker-row
   alignment, .mini:disabled (Default can't be renamed/deleted), and the
   #project-type-label picker on the new-project form.
   0.38.0 (D123): the US-federal-holiday overlay — --holiday amber, the
   .yvg-day.yvg-holiday dot on month/wall calendars, .yv-holiday-mark tick
   on the timeline, .wv-holname ★ label on the week day heads, and the
   #wv-overlays/#yv-overlays control groups sharing the .ctl-group family.
   0.37.0 (D121/D122): #parade-banner/.parade-text (the ticker-tape
   parade's gold name card — z 99: above the night face, UNDER the
   confetti so the paper falls in front of the words), .now-bar family
   (Katie's current-project bar with the live second hand), and
   .clock-cluster — the D119 finish: the three clock controls right-align
   and wrap as one unit; the 🕰 finally matches its siblings' size.
   0.36.0 (D117/D119): .yv-bar.forced-full (click-to-expand, outranks the
   size rules; D115 hitbox reverted), .project-dates goes flex with the
   inline clock controls (.clock-row retired).
   0.35.1 (D115): .yv-bar::after — the invisible ±5px tap hitbox.
   0.35.0 (D112): .clock-row/.clock-btn(.running)/.clock-total — the
   billable clock on project cards.
   0.34.1 (D111): .rec-badge — the quiet ↻ on recurring queue rows.
   0.34.0 (D109): .st-hurrah — the 🎆 stage toggle, ember/gold.
   0.33.0 (D107): burn-in care — #screen-rest night face (wandering clock,
   near-black not pure #000), body.kiosk-idle chrome dim (opacity-only, no
   layout shift).
   0.32.0 (D105, PHASE 4): THE DASHBOARD — pane geometry (#dashboard-view
   flex shells, --dash-cols/--dash-rows shares), .dash-split dividers
   (wv-split's two-axis siblings), 🗂 corner toggle, the ≥1200px gate on
   the 🐙 button, and in-pane overrides (#year-view sheds its 1500px solo
   cap; the FAB hides — adding projects lives on the other screens).
   0.31.1 (D104): ONE control grammar — shared .view-nav/.view-ctls/
   .ctl-group/.ctl-label family replaces the parallel .wv-modes/.wv-sizes
   and .yv-layouts/.yv-modes/.yv-sizes sets. Two families doing one job
   is the D98 parity-drift trap in CSS form; the dashboard is why now.
   0.27.0 (D95): .well-travelled — a quiet mark on a task that's been
   moved 3+ times. Not a scolding; a question.
   0.26.1 (D94): .wv-split (drag the projects/days boundary) + .wv-row
   time and title finally share a centre line. Z, not Y — old ideas
   behaving, not new ones (Jake's versioning rule, D94).
   0.26.0 (D92): .wv-edit — the ✎ on an expanded bar, so click can mean
   expand/collapse without stranding the edit path.
   0.25.0 (D91): #week-view height is pinned from JS (100% against a
   parent with no height resolved to auto — that's why the day columns
   walked off the bottom); .forced-full for a bar clicked open at compact
   sizes; #wv-projects[data-size="full"] is now explicit.
   0.24.0 (D90): .nav-slot (fixed-width, so ◀ ▶ never move when "back to
   now" appears — all three views); #wv-projects[data-size] bar heights;
   .wv-strip packs DENSE (grid's sparse cursor never backtracks, so a
   2-event Friday claimed a 3rd row); .wv-dl hovers again (pointer-events
   none had killed its own tooltip); .clickable affordance.
   0.23.0 (D89): .wv-dayhead row (dates at the TOP), .view-switch labeled
   3-way, .wv-modes week-start buttons, .wv-dl deadline blocks. The
   .wv-load meter is GONE — it looked like progress and wasn't.
   0.22.1 (D89): week type re-scaled for the real screen — a 55" 4K
   WHITEBOARD at 4 feet, not a wall at 8. Caps raised so full-width
   (~548px columns) uses the room instead of stranding tiny text in it.
   0.22.0 (D88): #week-view — two spanning strips over seven queue
   columns; clamp() type, min-width:0 on every text-bearing flex child.
   0.21.1 (D84): #cfg-mirror-cal sizes to its row (flex:1, min 12rem).
   0.21.0 (D82): .past-event rows (dimmed, struck time) in the
   #earlier box; #earlier heading matches waiting/done.
   0.20.0 (D80): #allday-strip + .banner pills — tier-tinted, ambient,
   above the queue; "things that are happening" get a shelf of their
   own instead of impersonating midnight appointments.
   0.19.0 (D78): phone chrome — #jump-add and #signout-bottom exist
   only inside the 1000px stacked-layout query (where the scroll pain
   lives); there the header's ⏻ square hides and "Log out" appears in
   words at the very bottom.
   0.18.1 (D77): .yv-bar.dragging dims in place (the ghost IS the
   preview now — no more chip straying over neighboring months).
   0.18.0 (D74): .yv-ghost — the drag drop-preview: dashed accent
   slots at body level (position:fixed) showing exactly where the
   dragged dates land, in every row they cross.
   0.17.0 (D72, Katie's catch): the Annual is QUARTERS — 4 rows × 3
   months (was 3×4). Breakpoints now 850/520 → 3/2/1 columns,
   MIRRORED in renderYearGrid (change together).
   0.16.0 (D71): Annual compaction — dow row is skipped by JS in wall
   mode, month padding/lane clearance tightened (.yvg-lanes margin 13px
   in wall), so the fit math's 26px/month chrome estimate is honest.
   0.15.0 (D70): .yv-bar.thin (borderless — a 1px border is most of a
   3px hairline bar) for the Annual view's window-fit density floor.
   NOTE: the Annual column breakpoints below (1150/850/520) are
   MIRRORED in renderYearGrid's window-fit math — change both together.
   0.14.0 (D69): YEAR WALL — #yv-grid.yv-wall lays the 12 .yvg-month
   blocks in a 4-column grid (3 rows of 4, Jake's wall of calendars),
   with compact head/dow/day typography; container queries step the
   wall to 3/2/1 columns as it narrows (1 column ≈ the stacked Months
   layout, a graceful phone fallback). .yv-sizes control beside the
   other toggles.
   0.13.0 (D68): month-grid layout (.yvg-*: month blocks, Sun–Sat dow
   header, week rows with a day-cell backdrop + bar lanes on top,
   weekend/out-of-month/today cell states), .yv-layouts toggle beside
   the mode buttons, ＋ New project FAB (fixed bottom-right), and the
   project-form modal card. Timeline bar heights moved to JS
   window-height sizing (inline), so no fixed .yv-bar height here.
   0.12.0 (D66 + form-overflow fix): THE ENDS BOX, finally — .form-row
   labels are flex:1 with min-width:auto, and a flex item won't shrink
   below its content's min width; two native date inputs exceed the
   340px panel, so Ends hung off the right edge (a SECOND bug behind
   the same screenshot as the 0.8.0 stagger). min-width:0 on the label
   and its controls ends the saga. Year view: .yv-month gets
   flex-basis:0 so header widths are truly day-proportional (labels
   were drifting off the gridlines); day texture everywhere — faint
   day lines, stronger Monday week lines, weekend shading blocks;
   adaptive bar density (full 20px ≤4 lanes / half 10px ≤9 / quarter
   5px beyond, labels only at full height — hover/tap carry names);
   compact query sheds day lines first, week lines on very narrow.
   0.11.0 (D65, PHASE 2): year view — .yv-nav/.yv-modes, quarter rows
   (.yv-row: month headers flex-grown by day count, .yv-lanes with
   absolutely positioned .yv-bar segments), D30a ghost/fill via inline
   gradients, today marker, month gridlines, continuation clipping,
   drag handles (.yv-handle, touch-action:none), legend, and the D27
   compact container query (labels hide when the grid is narrow).
   #popover gains pre-line whitespace for multi-line bar details.
   0.10.0 (D64): responsive rows — queue/waiting/done lists are size
   containers; when a list is ≥540px wide the two-line row collapses
   to ONE line (checkbox · title+time · ▸ · chip · buttons), notes
   still expanding full-width below. Narrow lists keep the D63
   two-line layout. Pure CSS (container queries); unsupported
   browsers just keep the two-line layout.
   0.9.0 (D63): two-line row layout (.row-2l/.row-top/.row-actions/
   .row-notes) — long titles wrap as prose instead of one-word phone
   columns; notes toggle; #task-notes textarea matches inputs.
   0.8.0: #project-form labels get the SAME column-flex treatment as
   #task-form (they never had a display rule, so each label's height
   depended on how its inline contents wrapped — Jake's staggered
   Starts/Ends screenshot); .snooze-row; .label-line.
   0.7.0: .st-ghost (undated stages keep their columns via visibility —
   the "name field ate the row" fix), dup review-form styles.
   0.6.0 (D56/D52/D60/D58): collapsible project cards — header row
   never wraps ([chevron][name wraps internally][pinned buttons]),
   dates on their own .project-dates line, finished-projects toggle;
   settings tab bar; per-tier day toggles (.t-days); stage-editor row
   hardening (name field can no longer shove flags/✕ out of view:
   min-width guards + wrap fallback — Jake's new-stage layout bug).
   0.5.2: re-release of the project-card header fix + ship-check rule.
   0.5.x: filter chips, modal-shell system, popover, decision rows.
   ============================================================ */
```


---

## `whereis.html`

```
     Version 1.4.0 — RETIRES FIVE CONSOLE-DIVING TESTS. TIER-6, TIER-7,
     SKIN-1, SKIN-2 and BASE-7 all asked for a Firestore console session,
     some from two accounts. Three new sections read the same facts from one
     sign-in: per-user tier order and colours beside the canonical values and
     everybody else's published ranks; every key on every visible board with
     roles; and a provenance audit that COUNTS the four E9 stamps across every
     task, project and stage rather than sampling one document.
     ⚠️ Boards-table header now derived from SUBS. It was a hand-written list
     beside a SUBS.map() loop, so adding "members" shifted every count one
     column left, silently. Third instance of this shape in the project after
     the completedBy keep-list and the ?v= pins.
     Version 1.3.1 — the version is on the page (Jake: "you didn't put the
     version anywhere on that page"). version-check.mjs reads the on-page
     badge as this file's constant so banner and badge cannot drift.
     Version 1.3.0 — per-stage detail and per-person time.
     Version 1.2.0 — projects and sessions audited alongside tasks.
```

## `index.html`

```
     Version 0.51.3 — no markup change; pin moves to app.js 1.35.0.
     Version 0.51.2 — no markup change; pins repointed to app.js 1.34.2 and
     css 0.56.1. The css pin had been left at 0.56.0 against a 0.56.1 file,
     which is the fault the E41 repair already paid for once (defect 8).
     Version 0.51.1 — Jake's marker bump after the headers were shortened.
     NO CHANGE.
<!-- ============================================================
     Tentacalendar — index.html
     Version 0.51.0 (banner and data-html-version move together, always)
     0.51.0 — NO MARKUP CHANGE. Pins move: app.js 1.34.0, css 0.56.0,
     store 0.25.0 via app's import. Per-user tier colour and name.
     (prev) Version 0.50.0 (banner and data-html-version move together, always)
     0.50.0 — NO MARKUP CHANGE. app.js ?v= -> 1.33.0 and store.js -> 0.24.0
     (via app's import): the board routers now REFUSE an unresolved
     destination instead of writing to the active board, the tier chip picks
     a readable foreground, and the People role dropdown runs ascending.
     Bumped because data-html-version is the update signal D130 polls, and a
     ?v= on one tag does not bust another file (D49).
     (prev) Version 0.49.1 (banner and data-html-version move together, always)
     0.49.1 — E41 repair pins. 0.49.0 bumped app.js's ?v= but left the
     STYLESHEET pinned at 0.54.0, so every browser that already held
     0.54.0 kept serving it and the entire onboarding stylesheet never
     arrived (D49: a ?v= on one tag does not bust another file). Now
     css -> 0.55.1, app -> 1.32.1. ⚠️ THREE THINGS MOVE IN THIS FILE ON
     EVERY DEPLOY: the banner, data-html-version, and any ?v= whose file
     changed. 0.49.0 moved one of the three.
     (prev) 0.49.0 — E41: ONBOARDING MARKUP. Welcome splash screen, tour overlay system,
     contextual popovers, and help panel structure. App.js builds tours and manages
     state; this file carries markup only. ?v= bumps to 1.32.0 (app.js).
     0.48.2 (banner and data-html-version move together, always)
     0.48.0 — repin app.js 1.30.0 / css 0.54.0. Markup still unchanged:
     the tier reorder arrows are built by app.js, like the rows they sit in.
     0.47.0 — item 5 (shared tiers). NO MARKUP CHANGE: the share strip is
     built by app.js under whichever tier row asked for it, because tier
     rows are themselves JS-built and a single markup panel would have to be
     moved around the DOM (D37 has already taught this project what moving a
     container costs). Pins only.
     0.46.1: app.js ?v= -> 1.28.0 (D143). No markup change; the pin and the
     banner move anyway, because a stale pin serves a stale file.
     0.46.0 (helper role + D141/D142): "Can help" joins the invite dropdown,
     and the four roles are now a TABLE in the People tab rather than a
     sentence — four of them is one more than prose carries, and every row
     of that table is a clause in firestore.rules 1.2.1. Four .locked-note
     paragraphs added (Tiers, Pipeline, Timing, #form-panel); each shows
     only when app.js puts .pane-locked on its container, so the pane reads
     as deliberately closed rather than mysteriously broken. D141: a "Now"
     button beside Time, twin to D140's "Today". D142: the three-across row
     becomes two-across and Est. min moves to its own line, label left and
     field right — two native pickers plus a number box could not share a
     340px panel, which is what made the first two look squeezed.
     0.45.0 (E40): #mirror-connect — the OUTBOUND half of the calendar
     story finally explained in the app. The inbound walkthrough (0.44.0)
     covers "show me my appointments"; this covers "put my tasks on my
     calendar so my PHONE tells me", which is the half that actually
     notifies anyone. app -> 1.26.0, css -> 0.51.0, config -> 1.2.0.
     0.44.0 (E39): #cal-connect — the connect-a-calendar walkthrough, in
     the app, beside the field it fills. SETUP-PHASE3-2.0 is the OPERATOR's
     one-time guide; there was nothing at all for the other twenty people,
     which is what Jake spotted. app -> 1.25.0, css -> 0.50.0,
     config -> 1.1.0 (it now carries the service-account address).
     0.43.0 (E38): #ws-rename — a board can be renamed by an owner. There
     was no way to fix a board's name in the app at all; the only route
     was the Firebase console. Also: the dependent-board placeholders read
     like filled-in values (grey "Nico" in an empty field), so they now
     read as examples and the name auto-fills from the email as you type.
     app -> 1.24.0, css -> 0.49.0.
     0.42.3: app -> 1.23.3 (store -> 0.20.0 rides in: the poll interval now
     also lands on the workspace doc, which the work queue reads). Calendars
     arrive via functions/index.js 1.0.0 + SETUP-PHASE3-2.0.md — no markup.
     0.42.2: app -> 1.23.2, css -> 0.48.1 (People tags stop borrowing the
     danger badge; store -> 0.19.2 rides in). No markup change.
     0.42.1: app -> 1.23.1 (E17 copy now tells the truth about a rules
     refusal instead of blaming the network). No markup change.
     0.42.0 (E32/E34): the BOARD SWITCHER (#board-switch) in the header and a
     People tab in Settings — invite, revoke, change access, and create a
     dependent workspace for a child. Pins: app -> 1.23.0, css -> 0.48.0,
     store -> 0.19.0 via app's import.
     ---- OCTODO LINE (Tentacalendar 2.0) ----
     0.41.0 (E17): #blocked-screen — "signed in with nowhere to go" is a real
     screen now. Nico signed into 1.x, got bounced to the login page, and the
     only explanation was in a console he'd never open. Reuses .auth-card so
     it cannot drift from the sign-in screen it stands beside (D104).
     Pins: app -> 1.22.0, css -> 0.47.0, config -> 1.0.0, manifest -> 0.2.0
     (store -> 0.18.0 rides in via app's import). No other markup changed:
     this file is 1.x's 0.40.0 plus one <div>, which is what E30 was for.
     MANIFEST 0.2.0 is an E4a fix, not a feature: 1.x shipped "id": "/",
     which is an ABSOLUTE reference. At a domain root that is harmless — it
     is why nobody ever noticed — but octodo currently serves from the
     SUBPATH misterwilson37.github.io/octodo, where "/" resolves to the
     whole github.io host and the PWA identity collides with every other
     project site there. "./" is correct in BOTH places: it gives /octodo/
     today and exactly "/" after the flip, which is the same id Katie's
     installed 1.x PWA already has — so E4's promise that her install
     survives the switch depends on this one character.
     0.40.0 (D140): #task-date-today inside the Due date label — a "Today"
     shortcut, because the native date picker is Chrome's and admits no
     buttons of ours. app -> 1.21.0, css -> 0.46.0.
     0.39.2 (D139): no markup change — app ?v= -> 1.20.0 (bounded task
     window; store.js -> 0.17.0 via app's import) and data-html-version
     bumped so D130 pushes it to installed PWAs. No new ids, no CSS.
     0.39.1 (D138): no markup change — css ?v= -> 0.45.1 (the phone
     overflow fix) and data-html-version bumped so D130's hourly check
     pushes the new stylesheet to installed PWAs, which have no
     hard-refresh gesture (D77). This is the delivery vehicle for Katie's
     fix: her phone should self-heal within the hour of deploy.
     0.39.0 (D137): THE ALERTER. #alert-toast (outside #drift-wrap, D37/
     D127 — the wall is often fullscreen, where an OS notification may
     never paint but our own banner always does) + five per-device
     controls in Settings > Timing (#cfg-alerts, #cfg-alert-sound,
     #cfg-alert-notify, #cfg-alert-vol, #alert-test) and #alert-status.
     They are #cfg-* on purpose: D129's dirty guard captures that prefix
     generically, so the unsaved-changes check covers them for free.
     0.38.0 (D136): no markup change — app ?v= → 1.18.0 for the document
     census in the version tooltip / Settings footer.
     0.37.0 (D134): no markup change — app ?v= → 1.17.0 for the Escape
     handler. Bumped because data-html-version is the update signal
     (D130) and app.js changed; the ?v= is what busts the cache.
     0.36.0 (D132): the New Task form gains #fu-chain-block — the
     chained-follow-up builder ("And then…"). Rows are JS-built so
     add/remove preserves typed values; form.reset() does NOT clear
     them, which is why cancelTaskEdit clears them by hand. css ?v= →
     0.44.0, app ?v= → 1.16.0 (D133 rides along in app.js).
     0.35.1 (D131): app.js ?v= → 1.15.0 only — the unsaved-changes guard now
     covers the project form. No markup change (the form and its buttons
     already existed). A Z carrying the bump (D94). AND — this is the first
     deploy that will exercise D130 end-to-end: any tab already running
     1.14.0 (D130) will see THIS html version (0.35.1) differ from its boot
     value and offer the refresh banner. That's the live test Jake wanted.
     0.35.0 (D130): #update-banner added — a fixed bottom bar (outside
     #drift-wrap, D127) the hourly version check shows when a newer deploy
     is live. ⚠️ NOTE: this data-html-version value is ITSELF what the
     check compares — bumping it is what makes every OTHER running tab
     notice this deploy. That's the whole mechanism; the version discipline
     now does double duty. ?v= bumps app.js → 1.14.0, css → 0.43.0.
     0.34.1 (D128/D129): app.js ?v= → 1.13.0 only. Blank project type is
     injected by refreshTypeSelect() into the existing #project-type
     picker (no static markup change), and the unsaved-changes guard uses
     confirm() (no new modal). So this file only carries the version bump —
     a Z, the D94 pattern (html moves so the cache busts app.js). No CSS
     change either.
     0.34.0 (D120): THE TIME REPORT. A new #report-modal (safely outside
     #drift-wrap — D127 was a hard-earned lesson, verified with the same
     div-balance count after adding this). A 📊 button in the Projects
     panel header opens it for every project; each project's Σ total is
     now clickable too, pre-filtered to just that one. Minor bump, not a
     patch — a whole new modal surface, same weight as D111's cactus row
     or D112's clock modal. ?v= bumps app.js → 1.12.0, css → 0.42.0.
     0.33.2 (D127): THE REAL D37 FIX. A stray extra closing div, left over
     from D118's modal-relocation edit, was accidentally acting as
     #drift-wrap's true closing tag 150 lines later than intended — every
     modal from #screen-rest through #yv-project-modal (incl. #settings-
     modal) was structurally still INSIDE #drift-wrap this whole time,
     D118's own comments notwithstanding. Moved the closing div to where
     #drift-wrap's own header comment always said it belonged. Found by
     Jake's screenshot (Settings needing a scroll to reach) plus a ruled-
     out extensions theory (reproduced in a clean Edge profile) plus a
     programmatic div-nesting count — not a guess. Full document verified
     balanced before and after. No CSS or JS change needed; the CSS was
     already correct, it just never had the DOM structure it assumed.
     0.33.1 (D126 fix): app.js ?v= → 1.11.1 only — the sidebar mode-filter
     bug (Jake's screenshot). No markup change; a Z for THIS file, carrying
     the bump (D94).
     0.33.0 (D126): HAVE-TOS / WANT-TOS — a new .tab-bar toggle atop
     #queue-panel (reusing the settings tabs' own class, not a new idiom)
     switches between #havetos-panel (the existing date-driven agenda,
     now wrapped as one unit) and the new #wanttos-panel (timeless-tier
     projects as cards, no day-nav — there's no day to nav). #project-tier
     gains a change listener; the Starts/Ends row gets id="project-dates-row"
     so JS can hide it live when the selected tier is marked ⏳ timeless.
     A Y: a whole new panel + tab strip didn't exist before. ?v= bumps
     app.js → 1.11.0, css → 0.41.0. No store.js change — saveTier/addProject
     already pass arbitrary fields through untyped.
     0.32.7 (D125): css ?v= → 0.40.0 only (phone font-boost fix + dash
     projects scroll). No markup change.
     0.32.6 (D124): the project-type LIBRARY — #project-type picker on the
     new-project form, and the Pipeline tab's #pipeline-target selector +
     New/Rename/Delete manager (the single stage editor now edits whichever
     pipeline is selected). ?v= bumps app.js → 1.10.0, css → 0.39.0;
     store.js → 0.16.0 (subscribeProjectTypes/saveProjectTypes) rides app's import.
     0.32.5 (D123): the Overlay control group (★ Holidays) added to BOTH the
     week and year .view-ctls (D104 grammar); ?v= bumps app.js → 1.9.0 and
     queue.js → 0.18.0 (holidaysForRange). css → 0.38.0.
     0.32.4 (D121/D122): ?v= bumps only — app.js → 1.8.0 (NOW bar + the
     parade's name), css → 0.37.0, celebrate → 0.2.0 (rides inside app.js's
     import). No markup changes: the NOW bar and parade banner are built
     by JS.
     0.32.3 (D118): clock/followup/yv-project modals relocated OUTSIDE
     #drift-wrap — its transform re-rooted their fixed centering to the
     page, so scrolled-down users got off-screen modals.
     app ?v= → 1.7.0, css ?v= → 0.36.0.
     0.32.2 (D116): ?v= bumps only — app → 1.6.0 (store → 0.15.0 rides
     inside app.js's import).
     0.32.1 (D113): the clock dialog inputs become datetime-local — the
     dialog asks WHEN including the day (all-nighter support).
     app ?v= → 1.5.0, css ?v= → 0.35.1.
     0.32.0 (D112): the clock — #clock-modal (shared by clock-out and 🕰
     manual log). The card clock rows are JS-built. app ?v= → 1.4.0,
     css ?v= → 0.35.0.
     0.31.0 (D111): the Christmas cactus — ↻ recurrence row in the task
     form (blank = off), harmonized unit ladders in the escalation and
     follow-up selects (…years, decades, centuries). app ?v= → 1.3.0.
     0.30.3 (D110): ?v= bump only — app → 1.2.1.
     0.30.2 (D109): ?v= bumps only — app → 1.2.0, css → 0.34.0. The 🎆
     rows are JS-built; no markup here changed.
     0.30.1 (D108): #hdr-fullscreen — the dashboard's ⛶, in the header,
     dash-only. app ?v= → 1.1.1.
     0.30.0 (D107): burn-in care — #screen-rest overlay (outside drift-wrap,
     D37's rule) + two per-device Timing-tab toggles (🌙 rest / 🕯️ idle dim).
     app ?v= → 1.1.0, css ?v= → 0.33.0.
     0.29.0 (D105, PHASE 4): THE DASHBOARD — 🐙 fourth view-switch button
     + the #dashboard-view pane shells (year left, week top-right, agenda
     bottom-right, draggable dividers, 🗂 projects toggle). A Y for this
     file: markup that didn't exist. The APP hits 1.0.0 with it (D67).
     app ?v= → 1.0.0, css ?v= → 0.32.0.
     0.28.3 (D104): ONE control grammar — week's two control rows fold
     into its .view-nav; year's groups reorder to Layout · Window · Bars;
     both use .view-ctls/.ctl-group/.ctl-label and data-layout /
     data-window / data-size. Same controls, one dialect, ahead of the
     dashboard. app ?v= → 0.38.1, css ?v= → 0.31.1.
     0.25.0 (D96): INSTALLABLE — manifest.json + real PNG icons + the
     mobile-web-app meta tags, so Add to Home Screen drops the address
     bar on the old tablet. ⛶ fullscreen added to the AGENDA nav (week
     and year had it; Today didn't). A Y: these didn't exist before.
     app ?v= → 0.33.0.
     0.24.2 (D95): app ?v= → 0.32.0, css ?v= → 0.27.0. A Z for THIS file —
     nothing new lives in index.html, it's only carrying the bumps (D94).
     0.24.1 (D94): #wv-split — drag the projects/days boundary. Z not Y:
     this is an old idea finally working right (Jake's versioning rule,
     D94). app ?v= → 0.31.1, css ?v= → 0.26.1.
     0.24.0 (D92): app ?v= → 0.31.0, css ?v= → 0.26.0. No markup change.
     0.23.0 (D91): app ?v= → 0.30.0, css ?v= → 0.25.0. No markup change —
     the Bars buttons were always here; their handler never existed.
     0.22.0 (D90): nav-slots in ALL THREE views — "back to now" no longer
     shoves ▶ sideways; it sits on the side matching its direction of
     travel and the arrows never move (Jake: three clicks forward should
     be three clicks forward). #wv-sizes bar-height control. app → 0.29.0,
     css → 0.24.0.
     0.21.0 (D89): dates move to a header row ABOVE the strips (Jake:
     "duplicate the date at the top — it's expected there"); week-start
     mode buttons (Today+6 / Sun–Sat / Mon–Sun); the view toggle becomes
     a LABELED 3-way switch (a cycling glyph needed a hover to explain
     itself, which is a failed control). app ?v= → 0.28.0, css → 0.23.0.
     0.20.0 (D88): #week-view — the third view. Two spanning strips
     (all-day banners, project bars w/ stage pips) over seven queue
     columns. app ?v= → 0.27.0, css ?v= → 0.22.0 (queue 0.13.0 inside).
     0.19.0 (D86): clear-deck hint rewritten for the GROUPED model.
     app ?v= → 0.26.0 (queue 0.12.0 rides inside app). css unchanged.
     0.18.0 (D85): ⚙️ Pipeline tab gains "Clear-the-deck at N% complete"
     (#cfg-cleardeck) — the point where the queue flips a project from
     keep-abreast to just-finish-it. app ?v= → 0.25.0 (queue 0.11.0 +
     store 0.9.0 ride inside app). css unchanged.
     0.17.2 (D84): the Mirror field escapes cfg-poll's flex .form-row
     (three children crammed into one row crushed the poll label into
     a word-stack — Jake's screenshot). Own block now. app ?v= →
     0.24.0, css → 0.21.1.
     0.17.1 (D83): app ?v= → 0.23.1. Reference bump only.
     0.17.0 (D82): #earlier box (passed events sink here, today only)
     + #followup-modal (title, amount, minutes/hours/days/weeks unit —
     retires two prompt()s). css ?v= → 0.21.0, app → 0.23.0, queue →
     0.10.0.
     0.16.0 (D81): ⚙️ Settings gains the Mirror calendar ID field
     (cfg-mirror-cal). app ?v= → 0.22.0; css unchanged.
     0.15.0 (D80): #allday-strip above the queue — all-day events land
     here as ambient banners, not 12:00 AM queue rows. css ?v= →
     0.20.0, app → 0.21.0.
     0.14.1 (D79): lang="en" → "en-US". Native time pickers take their
     12/24-hour cycle from the DEVICE setting in Chromium, but engines
     that consult page language (Firefox family, some webviews) treat
     bare "en" as ambiguous — en-US pins them to AM/PM. The primary
     fix for Katie's military-time picker is her phone's "Use 24-hour
     format" setting (see SETUP.md quick hits).
     0.14.0 (D78): phone chrome — #jump-add ＋ in the header (scrolls
     to the task form; swaps to Today view first if needed) and
     #signout-bottom ("Log out", in words, at the very bottom). Both
     phone-only via the 1000px stacked-layout query; the ⏻ square
     hides there. css ?v= → 0.19.0, app → 0.20.0.
     0.13.5 (D77): css ?v= → 0.18.1, app → 0.19.2. Reference bump only.
     0.13.4 (D76): app ?v= → 0.19.1. Reference bump only.
     0.13.3 (D74): css ?v= → 0.18.0, app → 0.19.0. Reference bump only.
     0.13.2 (D73): hint mentions cross-row drags. app ?v= → 0.18.0.
     0.13.1 (D72): css ?v= → 0.17.0, app → 0.17.0. Reference bump only.
     0.13.0 (D71): ⛶ fullscreen button, 🧵 hairline bar pin. css ?v= →
     0.16.0, app → 0.16.0.
     0.12.1 (D70): "Year wall" → "Annual" (Jake's rename). css ?v= →
     0.15.0, app → 0.15.0.
     0.12.0 (D69): ▦▦ Year wall layout button (new default) + Bars
     size control (Auto/▮/▪/▁). css ?v= → 0.14.0, app → 0.14.0.
     0.11.0 (D68): year-view layout toggle (Month grid ⇄ Timeline),
     ＋ New project FAB, #yv-project-modal shell (the REAL form gets
     reparented in, listeners intact). css ?v= → 0.13.0, app → 0.13.0.
     0.10.1: css ?v= → 0.12.0, app ?v= → 0.12.0 (D66 day texture +
     density; form-overflow fix). Reference bump only.
     0.10.0 (D65, PHASE 2): year view — header 📅 toggle, #year-view
     section (nav, mode buttons, grid, legend, empty state, drag hint).
     css ?v= → 0.11.0, app ?v= → 0.11.0.
     0.9.1 (D64): css ?v= → 0.10.0 (responsive one-line rows). No markup
     change — reference bump only.
     0.9.0 (D63): #task-notes textarea. css ?v= → 0.9.0, app ?v= → 0.10.0.
     0.8.0 (D62 rev): dup modal gains pipeline-review button + 1d/7d/30d
     snooze row; project-form labels get task-form column treatment
     (the staggered Starts/Ends); un-dater covers both remnant flavors.
     css ?v= → 0.8.0, app.js ?v= → 0.9.0.
     0.7.0 (D62): duplicate modal is a review FORM (name/dates/color/
     tier/workload + snooze button). css ?v= → 0.7.0, app.js ?v= → 0.8.0.
     0.6.0: settings modal split into tabs (Tiers / Pipeline / Timing)
     with deadline-hour (D51) + decision-threshold (D52) fields and
     #tier-color-hint (D55); new #uncheck-modal (D53) and #dup-modal
     (D59); decision-modal hint rewritten for ✓/🕐 (D57); Workload ⓘ
     gains a hover title (D58). css ?v= → 0.6.0, app.js ?v= → 0.7.0.
     0.5.x: filter chips, workload, due/stages/weekend/decision modals
     + shared popover (all OUTSIDE #drift-wrap, D37), D49 ?v= ritual.
     ============================================================ -->
```
