// ============================================================
// Tentacalendar — app.js  (2.0 / OCTODO LINE)
// Version 1.23.0 — E32/E34: THE BOARD SWITCHER, which by Jake's own
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

import { CONFIG_VERSION } from "./config.js?v=1.0.0";
import {
  watchAuth, signIn, signOutUser, STORE_VERSION,
  subscribeTiers, subscribeTasks, subscribeEvents, subscribeConfig,
  subscribeProjects, subscribeStageTemplate,
  addTask, addFollowUp, setTaskDone, deleteTask, updateTask, rewindFollowUps, taskFirstDue,
  addProject, addProjectWithStages, deleteProject, updateProject,
  setStageDone, setStageDue, setProjectStages,
  saveTier, deleteTier, saveConfig, saveStageTemplate,
  subscribeProjectTypes, saveProjectTypes,
  subscribeSessions, clockIn, clockOut, logSession, deleteSession,
  setSessionEnd, restoreDoc,
  fetchCompletedTasks, liveCompletedCutoff,  // D139
  activeWorkspaceId, setActiveWorkspace, setPreferredWorkspace,   // E1/E34
  subscribeMyWorkspaces, subscribeWorkspaceDoc, subscribeMembers, // E34
  addMember, removeMember, setMemberRole, createDependentWorkspace // E5/E32
} from "./store.js?v=0.19.0";
import {
  buildQueue, projectProgress, remainingWork, normalizeStage, nextDeadline,
  isDayAllowed, addAllowedDays, allowedNeighbors, setDeadlineHour,
  setClearDeckThreshold, buildWeek, addDaysLocal, weekAnchorFor, fmtTime, fmtDay, QUEUE_VERSION,
  clockBlocks, weekClockWindow, taskEstimate, holidaysForRange,
  DEFAULT_ESTIMATE_MINUTES, MIN_ESTIMATE_MINUTES, MAX_ESTIMATE_MINUTES,
  rollupSessions, rollupToCSV, sessionsToCSV
} from "./queue.js?v=0.20.0";
import { celebrate, CELEBRATE_VERSION } from "./celebrate.js?v=0.2.0";

export const APP_VERSION = "1.23.0";
const $ = sel => document.querySelector(sel);
const DAY_MS = 86400000;

// ---------- State ----------
const S = {
  user: null,
  tiers: [], tasks: [], events: [], projects: [], stageTemplate: [], projectTypes: [],
  boards: [], wsDoc: null, members: [], boardUnsub: null,   // E34
  config: null,
  viewDay: Date.now(),
  editingTaskId: null,
  editingProjectId: null,
  dueTarget: null,          // {projectId, stageIndex}
  stagesTarget: null,       // projectId
  weekendPending: null,     // {payload, field} mid-validation project save
  decisionIds: null,        // Set of item keys while decision modal is open (D57)
  dupTarget: null,          // {projectId, stages} pending duplicate (D59/D62)
  stagesFromDup: false,     // stages editor opened FROM the dup modal (D62 rev)
  expandedNotes: new Set(), // task ids with details open (D63; ephemeral by design)
  uncheckTarget: null,      // task pending the un-complete rewind choice (D53)
  expandedProjects: new Set(JSON.parse(localStorage.getItem("tc-expanded-projects") || "[]")), // D56
  showFinished: localStorage.getItem("tc-show-finished") === "1",  // D56
  hiddenTierIds: new Set(JSON.parse(localStorage.getItem("tc-hidden-tiers") || "[]")),
  view: ["year", "week", "day", "dash"].includes(localStorage.getItem("tc-view")) ? localStorage.getItem("tc-view") : "day", // D65/D88/D105 (persists per device; setView bounces "dash" to "day" on small glass)
  dashCols: Math.min(80, Math.max(20, parseFloat(localStorage.getItem("tc-dash-cols")) || 50)),  // D105: year pane's share of the wall
  dashRows: Math.min(80, Math.max(20, parseFloat(localStorage.getItem("tc-dash-rows")) || 55)),  // D105: week pane's share of the right column
  dashProjects: localStorage.getItem("tc-dash-projects") === "1",  // D105: 🗂 split the agenda pane two-up
  weekMode: ["rolling", "sunday", "monday"].includes(localStorage.getItem("tc-wmode")) ? localStorage.getItem("tc-wmode") : "rolling", // D89
  weekOffset: 0,      // D89: whole weeks from the anchor; 0 = the live week
  weekSize: ["auto", "full", "half", "quarter", "hair"].includes(localStorage.getItem("tc-wsize")) ? localStorage.getItem("tc-wsize") : "auto", // D90
  weekLayout: ["columns", "tidal", "clock"].includes(localStorage.getItem("tc-week-layout")) ? localStorage.getItem("tc-week-layout") : "tidal", // D97 — sibling layouts under Week (D90: Gantesque is the LAYOUT, the view stays "Week")
  weekCards: localStorage.getItem("tc-wcards") !== "0", // D97 — reflection cards on past days
  showHolidays: localStorage.getItem("tc-holidays") === "1", // D123 — US federal holiday overlay (default OFF; opt-in)
  weekExpanded: new Set(),   // D91: bars clicked open for a read at compact sizes
  yearExpanded: new Set(),   // D117: the same answer for the year — session-only, cleared on size change
  weekStripPct: Math.min(75, Math.max(10, parseFloat(localStorage.getItem("tc-wstrip")) || 34)), // D94
  yearMode: localStorage.getItem("tc-year-mode") || "calendar",        // D31 anchor mode
  yearOffset: 0,           // months shifted from the mode's anchor (±12 per arrow)
  yearZoom: null,          // D18 month zoom: month-start ts, or null for the 12-month grid
  yearLayout: localStorage.getItem("tc-year-layout") || "wall",  // D68/D69: "wall" | "grid" | "timeline"
  yearBarSize: localStorage.getItem("tc-year-barsize") || "auto", // D69: "auto" | "full" | "half" | "quarter"
  lastSuggestedColor: "#4dabf7",
  sessions: [],            // D112 — billable sessions ledger
  todoMode: "have",        // D126 — "have" | "want"; session-only by design, NEVER localStorage (always boots to have-tos)
  unsubs: []
};

// ---------- Boot ----------
document.addEventListener("DOMContentLoaded", () => {
  reportVersions();
  $("#signin-btn").addEventListener("click", () => signIn().catch(err => alert(err.message)));
  $("#signout-btn").addEventListener("click", () => signOutUser());
  $("#signout-bottom").addEventListener("click", () => signOutUser());  // D78
  $("#blocked-signout").addEventListener("click", () => signOutUser());  // E17

  $("#fu-save").addEventListener("click", saveFollowUpModal);            // D82
  $("#fu-cancel").addEventListener("click", () => { if (!guardedClose("followup", followupSignature)) return; $("#followup-modal").hidden = true; fuTarget = null; });
  $("#jump-add").addEventListener("click", () => {                      // D78
    if (S.view !== "day") setView("day"); // the form lives in Today
    $("#task-form").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("#task-title").focus({ preventScroll: true }), 350);
  });
  $("#settings-btn").addEventListener("click", openSettings);
  $("#hdr-fullscreen").addEventListener("click", toggleFullscreen);   // D108
  $("#settings-close").addEventListener("click", closeSettings);
  $("#day-prev").addEventListener("click", () => shiftDay(-1));
  $("#day-next").addEventListener("click", () => shiftDay(1));
  $("#day-today").addEventListener("click", () => { S.viewDay = Date.now(); render(); });
  $("#mode-have").addEventListener("click", () => setTodoMode("have"));   // D126
  $("#mode-want").addEventListener("click", () => setTodoMode("want"));
  $("#wanttos-shuffle").addEventListener("click", wantTosShuffle);
  $("#wanttos-fullscreen").addEventListener("click", toggleFullscreen);

  // D65 year view
  $("#view-switch").addEventListener("click", e => {   // D89: labeled, no guessing
    const b = e.target.closest("button[data-view]");
    if (b) setView(b.dataset.view);
  });
  $("#yv-prev").addEventListener("click", () => shiftYear(-1));
  $("#yv-next").addEventListener("click", () => shiftYear(1));
  // D88 week nav
  $("#wv-prev").addEventListener("click", () => weekPage(-1));
  $("#wv-next").addEventListener("click", () => weekPage(1));
  $("#wv-today").addEventListener("click", () => { S.weekOffset = 0; renderWeek(); });
  $("#wv-modes").addEventListener("click", e => {
    const b = e.target.closest("button[data-window]");   // D104: one grammar — data-window in BOTH views
    if (b) setWeekMode(b.dataset.window);
  });
  window.addEventListener("resize", () => { if (S.view === "week") renderWeek(); }); // D91
  $("#wv-layouts").addEventListener("click", e => {
    const b = e.target.closest("button[data-layout]");   // D104: matches the year's attribute
    if (b) setWeekLayout(b.dataset.layout);
  });
  $("#wv-cards-toggle").addEventListener("click", () => {
    S.weekCards = !S.weekCards;
    localStorage.setItem("tc-wcards", S.weekCards ? "1" : "0");
    renderWeek();
  });
  $("#wv-sizes").addEventListener("click", e => {
    const b = e.target.closest("button[data-size]");
    if (b) setWeekSize(b.dataset.size);
  });
  $("#wv-fullscreen").addEventListener("click", toggleFullscreen);   // D96
  $("#day-fullscreen").addEventListener("click", toggleFullscreen);  // D96 — Today had none
  // D123 — one preference, a button in each view's Overlay group. render()
  // updates the current solo view AND both dashboard panes.
  const toggleHolidays = () => {
    S.showHolidays = !S.showHolidays;
    localStorage.setItem("tc-holidays", S.showHolidays ? "1" : "0");
    render();
  };
  $("#wv-holidays").addEventListener("click", toggleHolidays);
  $("#yv-holidays").addEventListener("click", toggleHolidays);

  $("#yv-today").addEventListener("click", () => { S.yearOffset = 0; S.yearZoom = null; renderYear(); });
  $("#yv-unzoom").addEventListener("click", () => { S.yearZoom = null; renderYear(); });
  $("#yv-modes").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => {
      S.yearMode = b.dataset.window;   // D104: the window group is data-window in BOTH views
      localStorage.setItem("tc-year-mode", S.yearMode);
      S.yearOffset = 0; S.yearZoom = null;
      renderYear();
    }));
  $("#yv-layouts").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => {
      S.yearLayout = b.dataset.layout;
      localStorage.setItem("tc-year-layout", S.yearLayout);
      renderYear();
    }));
  $("#yv-sizes").querySelectorAll("button").forEach(b =>
    b.addEventListener("click", () => {
      S.yearBarSize = b.dataset.size;
      S.yearExpanded.clear();   // D117: a size change re-answers the question the expand asked (week's own words)
      localStorage.setItem("tc-year-barsize", S.yearBarSize);
      renderYear();
    }));
  $("#yv-fullscreen").addEventListener("click", toggleFullscreen);  // D71/D96
  document.addEventListener("fullscreenchange", () => { if (S.view === "year") renderYear(); else if (S.view === "dash") render(); });   // D105: panes refit the new glass
  $("#yv-add-project").addEventListener("click", openYvProjectModal);
  wireDashboard();   // D105 — static chrome, wired once
  wireBurnInCare();  // D107 — ditto
  $("#clock-save").addEventListener("click", saveClockDialog);            // D112
  $("#clock-cancel").addEventListener("click", () => { $("#clock-modal").hidden = true; clockMode = null; });
  // D120 — the Time Report
  $("#report-btn").addEventListener("click", () => openTimeReport(null));
  $("#report-close").addEventListener("click", closeTimeReport);
  $("#report-start").addEventListener("change", renderTimeReport);
  $("#report-end").addEventListener("change", renderTimeReport);
  $("#report-granularity").addEventListener("change", renderTimeReport);
  $("#report-export-rollup").addEventListener("click", exportReportRollupCSV);
  $("#report-export-raw").addEventListener("click", exportReportRawCSV);
  $("#yv-project-close").addEventListener("click", () => {
    // D131 — the ✕ on the year-view project modal abandons the form. Guard
    // it. (closeYvProjectModal itself stays unguarded — it's also called
    // internally right after a save, where prompting would be wrong.)
    if (!guardedClose("projectForm", projectFormSignature)) return;
    cancelProjectEdit({ saved: true }); // reset the form back to New-project state
    closeYvProjectModal();
  });
  window.addEventListener("resize", () => {           // D68: timeline resizes with the window
    clearTimeout(yvResizeT);
    yvResizeT = setTimeout(() => { if (S.view === "year") renderYear(); }, 150);
  });
  $("#task-form").addEventListener("submit", onTaskFormSubmit);
  $("#task-cancel").addEventListener("click", cancelTaskEdit);
  $("#fu-chain-add").addEventListener("click", addChainRow);   // D132
  $("#project-form").addEventListener("submit", onProjectFormSubmit);
  $("#project-cancel").addEventListener("click", () => cancelProjectEdit());   // D131 — bare call; don't pass the click event as opts
  $("#project-color").addEventListener("input", checkProjectColor);
  $("#project-tier").addEventListener("change", syncProjectDateRequirement);   // D126
  markClean("projectForm", projectFormSignature);   // D131 — initial empty-form baseline at boot
  $("#tier-add").addEventListener("click", () => tierEditorRow({}, true));
  $("#stage-add").addEventListener("click", () => stageTemplateRow({ name: "", direction: "none", anchor: "start", offsetDays: 0 }, true));
  wirePipelineManager();   // D124 — the project-type library controls (once)
  $("#settings-save").addEventListener("click", onSaveSettings);  $("#cfg-poll").addEventListener("input", updatePollCostHint);
  $("#task-date-today").addEventListener("click", onDateToday);       // D140
  $("#alert-test").addEventListener("click", testAlert);              // D137 — a click is also the audio unlock
  $("#cfg-alert-notify").addEventListener("change", onNotifyToggle);  // D137 — permission must be asked from a gesture
  $("#due-save").addEventListener("click", dueSave);
  $("#due-clear").addEventListener("click", dueClear);
  $("#due-cancel").addEventListener("click", () => { $("#due-modal").hidden = true; });
  $("#stages-save").addEventListener("click", stagesSave);
  $("#stages-cancel").addEventListener("click", () => {
    if (!guardedClose("stages", stagesSignature)) return;   // D129
    $("#stages-modal").hidden = true;
    if (S.stagesFromDup) { S.stagesFromDup = false; $("#dup-modal").hidden = false; } // back to the dup form, unsaved
  });
  $("#stage-proj-add").addEventListener("click", () =>
    projStageRow({ name: "", direction: "none", anchor: "start", offsetDays: 0, completedAt: null, dueAt: null }, -1, true));
  // Cleanup for pre-D50 experiments: rows saved as after/end/0 were
  // "dated at project end" by accident — flip them to No date IN THE
  // EDITOR (nothing writes until Save, so it's reviewable).
  $("#stage-proj-undate").addEventListener("click", () => {
    // BOTH remnant flavors (Jake's screenshot): after/end/0 (window
    // experiments) and after/start/0 (0.6.0/0.6.1 editor default).
    for (const row of document.querySelectorAll("#stage-proj-editor .stage-tmpl-row")) {
      if (row.querySelector(".st-dir").value === "after" &&
          (parseInt(row.querySelector(".st-off").value, 10) || 0) === 0) {
        row.querySelector(".st-dir").value = "none";
        syncTimingRow(row);
      }
    }
  });
  $("#decision-close").addEventListener("click", closeDecision);

  // Settings tabs (D52). SCOPED to the modal on purpose: a bare ".tab-btn"
  // also matches D126's Have-tos/Want-tos bar, whose buttons carry data-mode
  // and no data-tab — so clicking Want-tos ran switchSettingsTab(undefined)
  // and hid every settings pane. Harmless only because openSettings() resets
  // the tab on every open.
  document.querySelectorAll("#settings-modal .tab-btn").forEach(btn =>
    btn.addEventListener("click", () => switchSettingsTab(btn.dataset.tab)));

  // E34 — the board switcher
  $("#board-current").addEventListener("click", ev => {
    ev.stopPropagation();
    const m = $("#board-menu");
    m.hidden = !m.hidden;
  });
  document.addEventListener("click", ev => {
    if (!ev.target.closest("#board-switch")) $("#board-menu").hidden = true;
  });
  $("#people-add").addEventListener("click", inviteMember);
  $("#dep-create").addEventListener("click", createDependentBoard);

  // Tier color conflict assistant (D55) — delegated, rows are dynamic
  $("#tier-editor").addEventListener("input", ev => {
    if (ev.target.classList.contains("t-color") || ev.target.classList.contains("t-name")) checkTierColors();
  });

  // Un-complete rewind modal (D53)
  $("#uncheck-oops").addEventListener("click", () => resolveUncheck("oops"));
  $("#uncheck-rewind").addEventListener("click", () => resolveUncheck("rewind"));
  $("#uncheck-keep").addEventListener("click", () => resolveUncheck("keep"));

  // Duplicate-for-next-year modal (D59)
  $("#dup-yes").addEventListener("click", dupConfirm);
  $("#dup-stages").addEventListener("click", openDupStages);
  $("#dup-snooze-1").addEventListener("click", () => dupSnooze(1));
  $("#dup-snooze-7").addEventListener("click", () => dupSnooze(7));
  $("#dup-snooze-30").addEventListener("click", () => dupSnooze(30));
  $("#dup-no").addEventListener("click", () => { S.dupTarget = null; $("#dup-modal").hidden = true; });

  // Any date/time field opens its native picker on click/focus where
  // supported (Chromium). Safari ignores showPicker — typing still works.
  document.addEventListener("click", ev => {
    const inp = ev.target;
    if (inp instanceof HTMLInputElement && (inp.type === "date" || inp.type === "time") && inp.showPicker) {
      try { inp.showPicker(); } catch (_) { /* needs gesture / unsupported */ }
    }
  });

  $("#task-date").value = toDateInput(new Date()); // due date defaults to today

  // Tap-to-reveal ⓘ popovers (phones can't hover).
  // D58: preventDefault() is load-bearing — when the ⓘ lives inside a
  // <label>, the label re-dispatches the click to its form control, and
  // that second click's target isn't the dot OR the popover, so the
  // handler's else-branch hid the popover in the same tick it appeared.
  document.addEventListener("click", ev => {
    const dot = ev.target.closest(".info-dot");
    const pop = $("#popover");
    if (dot && dot.dataset.info) {
      ev.preventDefault();
      pop.textContent = dot.dataset.info;
      pop.hidden = false;
      const r = dot.getBoundingClientRect();
      pop.style.top = `${r.bottom + 6}px`;
      pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8))}px`;
      ev.stopPropagation();
    } else if (!ev.target.closest("#popover")) {
      pop.hidden = true;
    }
  });

  // E34 — open on the board this device was last left on. Handed to store.js
  // BEFORE watchAuth so the first subscription already points at the right
  // house; doing it afterwards would boot the home board and immediately
  // re-read a second one. store.js verifies the key by trying to open it.
  setPreferredWorkspace(localStorage.getItem("tc-board"));
  watchAuth(onSignedIn, onSignedOut, onBlocked);   // E17
  setInterval(tick, 60 * 1000);
  setInterval(drift, 5 * 1000);
  // D130 — update check: once a minute after boot (let the app settle
  // first), then hourly. Cache-busted fetch of index.html; see checkForUpdate.
  setTimeout(checkForUpdate, 60 * 1000);
  setInterval(checkForUpdate, 60 * 60 * 1000);
  wireAlerts();                              // D137
  setTimeout(() => alertTick(true), 4000);   // D137 — silent seeding once data has landed
  // D122 — the NOW bar's second hand. Touches exactly ONE text node when
  // the bar exists, and does nothing at all when it doesn't; render()
  // stays a minute-tick affair.
  setInterval(() => {
    const el = document.getElementById("now-elapsed");
    if (!el) return;
    const os = openSessionNow();
    if (os) el.textContent = fmtClockLive(Date.now() - os.start);
  }, 1000);
});

// ---------- D136: the document census ----------
//
// Every number in the cost conversation so far was MODELLED. The app knows
// the truth — it subscribes to all eight collections, so it can simply
// count what arrived. This is that count, surfaced in the version tooltip
// and the ⚙️ Settings footer line.
//
// Why it matters: `subscribeTasks` and `subscribeSessions` are unfiltered,
// so every boot re-reads all completed history forever. That's ~1 billed
// read per document here, per page load, per device. Watching this number
// grow is what tells us WHEN windowing stops being optional — instead of
// me estimating it from a writes-per-day figure.
//
// Read-only. Counts documents already received; costs nothing extra.

const docCensus = { tiers: 0, tasks: 0, events: 0, projects: 0, sessions: 0, singles: 4 };

/** Total docs pulled on a cold boot — the per-page-load read cost.
 *  The 4 singles are config, stageTemplate, projectTypes, and the
 *  workspace doc; they're constant, but they're honest to include. */
function censusTotal() {
  return docCensus.tiers + docCensus.tasks + docCensus.events +
         docCensus.projects + docCensus.sessions + docCensus.singles;
}

function censusLine() {
  const t = censusTotal();
  return `${t} docs/load (tasks ${docCensus.tasks} · sessions ${docCensus.sessions} · ` +
         `events ${docCensus.events} · projects ${docCensus.projects} · tiers ${docCensus.tiers})`;
}

function reportVersions() {
  const cssVersion = getComputedStyle(document.documentElement)
    .getPropertyValue("--tc-version").trim().replace(/"/g, "") || "?";
  const htmlVersion = document.body.dataset.htmlVersion || "?";
  const report =
    `app.js ${APP_VERSION} · store.js ${STORE_VERSION} · queue.js ${QUEUE_VERSION} · ` +
    `celebrate.js ${CELEBRATE_VERSION} · config.js ${CONFIG_VERSION} · css ${cssVersion} · html ${htmlVersion}`;
  $("#version").textContent = "v" + APP_VERSION;
  $("#version").title = report +
    "\n\nworkspace " + (activeWorkspaceId() || "—") +   // E1 — which board am I on?
    "\n" + censusLine();   // D136
  const line = $("#versions-line");
  if (line) line.textContent = report + " — " + censusLine();   // D136
}

// ---------- D130: update check ----------
// Katie was running a stale cache when the tub bug hit her (an old queue.js
// that did epoch math on a want-to's null dates). A running tab has no way
// to know a newer version shipped — its APP_VERSION is baked into the JS it
// already loaded. So: hourly, re-fetch index.html itself (cache-BUSTED, or
// the browser hands back the same stale file and defeats the point) and read
// its data-html-version — the ONE stamp Jake bumps on every single deploy,
// so there's no second source of truth to drift (that was the deciding
// reason over a separate version.json: the index already carries its
// version, compare against that). If the server's html version differs from
// this tab's, show a banner and auto-refresh after a countdown. Compares
// against the tab's OWN loaded value (captured at boot, not re-read from the
// DOM), so it fires exactly once per real deploy.
const BOOT_HTML_VERSION = document.body.dataset.htmlVersion || "";
let updateCountdownTimer = null;
let dismissedUpdateVersion = "";

async function checkForUpdate() {
  if (updateCountdownTimer) return; // already counting down; don't stack
  try {
    const res = await fetch(`index.html?_v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const text = await res.text();
    const m = text.match(/data-html-version="([^"]+)"/);
    if (!m) return;
    const serverVersion = m[1];
    if (serverVersion &&
        BOOT_HTML_VERSION &&
        serverVersion !== BOOT_HTML_VERSION &&
        serverVersion !== dismissedUpdateVersion) {   // don't re-nag a version she dismissed this session
      showUpdateBanner(serverVersion);
    }
  } catch { /* offline or blocked — try again next hour, no noise */ }
}

function showUpdateBanner(serverVersion) {
  const banner = $("#update-banner");
  if (!banner || !banner.hidden) return; // missing, or already showing
  let secs = 30;
  const msg = $("#update-msg");
  const reloadNow = () => location.reload();
  const tickDown = () => {
    if (secs <= 0) { reloadNow(); return; }
    msg.textContent = `A new version (${serverVersion}) is ready. Refreshing in ${secs}s…`;
    secs--;
  };
  banner.hidden = false;
  tickDown();
  updateCountdownTimer = setInterval(tickDown, 1000);
  $("#update-now").onclick = reloadNow;
  $("#update-later").onclick = () => {
    clearInterval(updateCountdownTimer);
    updateCountdownTimer = null;
    banner.hidden = true;
    dismissedUpdateVersion = serverVersion; // quiet until the NEXT real deploy
  };
}

function onSignedIn(user) {
  S.user = user;
  $("#auth-screen").hidden = true;
  $("#blocked-screen").hidden = true;   // E17
  $("#app-screen").hidden = false;
  $("#user-label").textContent = user.email;
  setView(S.view); // D65: restore this device's last view

  // E34 — WHICH BOARDS YOU HOLD KEYS TO IS NOT A PROPERTY OF ANY BOARD.
  // It belongs to you, so it subscribes once here and survives every switch.
  // Putting it inside subscribeBoard() would tear down and re-establish the
  // switcher every time you used the switcher.
  if (S.boardUnsub) S.boardUnsub();
  S.boardUnsub = subscribeMyWorkspaces(bs => { S.boards = bs; renderBoards(); });

  subscribeBoard();
}

/**
 * E34 — everything scoped to ONE board. Torn down and re-run on a switch,
 * which is the whole mechanism: store.js repoints ACTIVE_WS, this repoints
 * the listeners, and nothing else in 5,900 lines has to know it happened.
 */
function subscribeBoard() {
  S.unsubs.forEach(u => u());
  S.unsubs = [];

  // Clear the OLD board's data before the new snapshots land. Without this
  // there is a beat where the header names Katie's board while the queue is
  // still showing Jake's tasks — which, in an app about accountability, is
  // the single most alarming thing it could briefly display.
  S.tiers = []; S.tasks = []; S.events = []; S.projects = [];
  S.sessions = []; S.stageTemplate = []; S.projectTypes = [];
  S.members = []; S.wsDoc = null; S.config = null;
  Object.keys(docCensus).forEach(k => { docCensus[k] = 0; });

  S.unsubs.push(subscribeWorkspaceDoc(w => { S.wsDoc = w; renderBoards(); }));   // E34
  S.unsubs.push(subscribeMembers(m => { S.members = m; renderPeople(); }));      // E5
  S.unsubs.push(subscribeTiers(t => { S.tiers = t; docCensus.tiers = t.length; refreshTierSelects(); renderFilters(); render(); }));
  S.unsubs.push(subscribeTasks(t => { S.tasks = t; docCensus.tasks = t.length; render(); maybeDecisionTime(); }));
  S.unsubs.push(subscribeEvents(e => { S.events = e; docCensus.events = e.length; render(); }));
  S.unsubs.push(subscribeProjects(p => { S.projects = p; docCensus.projects = p.length; suggestProjectColor(); render(); maybeDecisionTime(); }));
  S.unsubs.push(subscribeSessions(s => { S.sessions = s; docCensus.sessions = s.length; render(); }));   // D112
  S.unsubs.push(subscribeStageTemplate(t => { S.stageTemplate = t; }));
  S.unsubs.push(subscribeProjectTypes(t => { S.projectTypes = t; refreshTypeSelect(); }));  // D124
  S.unsubs.push(subscribeConfig(c => {
    S.config = c;
    setDeadlineHour(c?.deadlineHour ?? 16); // D51 — queue math follows settings
    setClearDeckThreshold(c?.clearDeckThreshold ?? 0.6); // D85
    reportVersions();   // D136 — refresh the census once the counts have landed
    render();
  }));
}


// ---------- E34: the board switcher ----------

function myEmail() { return (S.user?.email || "").toLowerCase(); }
function ownsBoard(b) { return b && (b.ownerEmail || "") === myEmail(); }

/** Am I an owner of the board I'm looking at? Gates the People controls. */
function iOwnThisBoard() {
  if (ownsBoard(S.wsDoc)) return true;
  const me = S.members.find(m => m.id === myEmail());
  return me?.role === "owner";
}

function renderBoards() {
  const active = activeWorkspaceId();
  const visible = S.boards.filter(b => !b.hidden);
  const cur = S.boards.find(b => b.id === active) || S.wsDoc;

  // One key is not a choice. The chip appears the moment a second one does.
  $("#board-switch").hidden = visible.length < 2;

  if (cur) {
    $("#board-name").textContent = cur.name || "Board";
    $("#board-dot").style.background = cur.color || "var(--accent)";
    $("#board-current").classList.toggle("visiting", !ownsBoard(cur));
    $("#board-current").title = ownsBoard(cur)
      ? "Your own board. Click to switch."
      : `You hold a key to ${cur.name || "this board"} — owned by ${cur.ownerEmail || "someone else"}. Click to switch.`;
  }

  const menu = $("#board-menu");
  menu.innerHTML = "";
  visible.forEach(b => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "board-item" + (b.id === active ? " current" : "");
    btn.innerHTML =
      `<span class="board-dot" style="background:${esc(b.color || "#4dabf7")}"></span>` +
      `<span>${esc(b.name || "Board")}</span>` +
      `<span class="who">${ownsBoard(b) ? "yours" : esc(b.ownerEmail || "")}</span>`;
    btn.addEventListener("click", () => switchBoard(b.id));
    menu.appendChild(btn);
  });
}

function switchBoard(wsId) {
  $("#board-menu").hidden = true;
  if (!setActiveWorkspace(wsId)) return;   // already there
  localStorage.setItem("tc-board", wsId);  // per-device, like every tc-* key
  subscribeBoard();
  renderBoards();
  render();
}

// ---------- E5/E32: People ----------

function renderPeople() {
  const list = $("#people-list");
  if (!list) return;
  const owner = iOwnThisBoard();
  const me = myEmail();
  list.innerHTML = "";
  [...S.members]
    .sort((a, b) => (a.role === "owner" ? 0 : 1) - (b.role === "owner" ? 0 : 1) ||
                    String(a.id).localeCompare(String(b.id)))
    .forEach(m => {
      const row = document.createElement("div");
      row.className = "person-row";
      const isDeed = (S.wsDoc?.ownerEmail || "") === m.id;
      row.innerHTML =
        `<span class="email">${esc(m.displayName || m.id)}${m.id === me ? " (you)" : ""}</span>` +
        (isDeed ? `<span class="badge" title="Created this board. Cannot be removed.">holds the deed</span>` : "") +
        (m.minor ? `<span class="badge" title="Cannot leave this board or hand back their own key.">dependent</span>` : "");

      // The deed-holder's row is never editable — the rules lock ownerEmail,
      // so offering the control would be a button that always fails.
      if (owner && !isDeed) {
        const sel = document.createElement("select");
        sel.className = "mini";
        [["owner", "Co-owner"], ["editor", "Can edit"], ["viewer", "Can view"]]
          .forEach(([v, label]) => {
            const o = document.createElement("option");
            o.value = v; o.textContent = label; o.selected = (m.role === v);
            sel.appendChild(o);
          });
        // You cannot change your OWN role — the rules refuse it, which is
        // what stops an editor quietly promoting themselves.
        sel.disabled = (m.id === me);
        sel.addEventListener("change", () =>
          setMemberRole(activeWorkspaceId(), m.id, sel.value).catch(showPeopleError));
        row.appendChild(sel);

        const del = document.createElement("button");
        del.className = "mini";
        del.textContent = "✕";
        del.title = m.id === me ? "Leave this board" : "Take this key back";
        del.addEventListener("click", () => {
          const what = m.id === me
            ? "Leave this board? You'll need a new invitation to get back in."
            : `Take ${m.id}'s key back? They lose access immediately.`;
          if (confirm(what)) removeMember(activeWorkspaceId(), m.id).catch(showPeopleError);
        });
        row.appendChild(del);
      }
      list.appendChild(row);
    });

  ["people-email", "people-role", "people-add"].forEach(id => {
    const el = $("#" + id); if (el) el.disabled = !owner;
  });
  if (!owner && !list.querySelector(".hint")) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Only an owner of this board can hand out or take back keys.";
    list.appendChild(p);
  }
}

function showPeopleError(err) {
  $("#people-msg").textContent = "That didn't work: " + (err?.message || err);
}

async function inviteMember() {
  const email = $("#people-email").value.trim().toLowerCase();
  const role = $("#people-role").value;
  $("#people-msg").textContent = "";
  if (!email.includes("@")) return showPeopleError(new Error("that doesn't look like an email address"));
  try {
    await addMember(activeWorkspaceId(), email, role);
    $("#people-email").value = "";
    // There is no accept/decline step by design — the board simply shows up
    // in their switcher next time they load. Say so, so nobody waits.
    $("#people-msg").textContent =
      `${email} now has a key. It appears on their board list next time they open the app — there's nothing for them to accept.`;
  } catch (err) { showPeopleError(err); }
}

async function createDependentBoard() {
  const name = $("#dep-name").value.trim();
  const email = $("#dep-email").value.trim().toLowerCase();
  const co = $("#dep-coowner").value.trim().toLowerCase();
  $("#people-msg").textContent = "";
  if (!email.includes("@")) return showPeopleError(new Error("their email address is required"));
  if (co && !co.includes("@")) return showPeopleError(new Error("that co-owner address doesn't look right"));
  try {
    await createDependentWorkspace({ name: name || email.split("@")[0], minorEmail: email, coOwnerEmail: co || null });
    $("#dep-name").value = ""; $("#dep-email").value = ""; $("#dep-coowner").value = "";
    $("#people-msg").textContent =
      `Board created. You hold the deed${co ? `, ${co} is a co-owner` : ""}, and ${email} can use it but cannot remove either of you. ` +
      `It'll show up in your switcher, and in theirs when they sign in.`;
  } catch (err) { showPeopleError(err); }
}

function onSignedOut() {
  S.unsubs.forEach(u => u());
  S.unsubs = [];
  if (S.boardUnsub) { S.boardUnsub(); S.boardUnsub = null; }   // E34
  S.boards = []; S.wsDoc = null; S.members = [];
  $("#board-switch").hidden = true;
  S.user = null;
  $("#auth-screen").hidden = false;
  $("#blocked-screen").hidden = true;   // E17
  $("#app-screen").hidden = true;
}

// ---------- E17: signed in with nowhere to go ----------
// Nico signed into 1.x on 2026-07-25, was bounced straight back to the login
// screen, and the only evidence of WHY was a line in a browser console he had
// no reason to open. Self-serve signup means "not on the allowlist" can no
// longer happen — but an unverified account, a bootstrap that failed, a
// revoked share and a removed member all still strand a signed-in user, and
// every one of them deserves a sentence instead of a silent bounce.
//
// The copy names what happened and what to do, in that order, and never
// blames the user for a state they did not choose. The technical detail is
// present but subordinate: it is there for Jake, not for Katie's sister.
const BLOCKED_COPY = {
  unverified: {
    title: "Your Google account isn't verified yet",
    body: "Tentacalendar can't store anything for you until Google has " +
          "confirmed this email address. Verify it with Google, then sign in again."
  },
  error: {
    title: "We couldn't finish setting up your calendar",
    body: "You're signed in, but building your workspace didn't complete. " +
          "That's almost always a connection hiccup — wait a moment and try again."
  }
};

function onBlocked(reason, user, err) {
  S.unsubs.forEach(u => u());
  S.unsubs = [];
  if (S.boardUnsub) { S.boardUnsub(); S.boardUnsub = null; }   // E34
  S.boards = []; S.wsDoc = null; S.members = [];
  $("#board-switch").hidden = true;
  S.user = null;
  const copy = BLOCKED_COPY[reason] || BLOCKED_COPY.error;
  $("#auth-screen").hidden = true;
  $("#app-screen").hidden = true;
  $("#blocked-screen").hidden = false;
  $("#blocked-title").textContent = copy.title;
  $("#blocked-body").textContent = copy.body;
  $("#blocked-who").textContent = user?.email || "";
  const detail = $("#blocked-detail");
  detail.textContent = err ? String(err.message || err) : "";
  detail.hidden = !err;
}

// ---------- Tick / rollover / drift ----------
let lastTickDay = new Date().getDate();

function tick() {
  if (unstickGesture()) return;   // D101 — a lock that outlives a minute is a bug
  const d = new Date();
  if (d.getDate() !== lastTickDay) {
    lastTickDay = d.getDate();
    S.viewDay = Date.now();
    maybeDecisionTime();
  }
  render();
  updateScreenRest();   // D107 — sleep hours are checked on the minute
  alertTick();          // D137 — and so is everything that just came due
}

// D37: drift transforms #drift-wrap, NEVER <body>.
// D107: in the dashboard a second, wider, much slower orbit rides on top
// (±6px over ~26 min) — the wall shows the same pixels 15 hours a day,
// and the fast ±2px alone parks bright edges in nearly the same place.
let driftT = 0;
function drift() {
  driftT += 0.03;
  const wrap = $("#drift-wrap");
  if (!wrap) return;
  let x = Math.sin(driftT) * 2, y = Math.cos(driftT * 0.7) * 2;
  if (S.view === "dash") {
    x += Math.sin(driftT * 0.02) * 6;
    y += Math.cos(driftT * 0.016) * 6;
  }
  wrap.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
}

// ---------- D107: BURN-IN CARE (the wall runs 15h/day) ----------
// Three layers, all per-device (the TV is a device, the phone is not):
//  · Screen rest: during the sleep hours the app ALREADY knows (the same
//    setting that gates the Cloud Function), the dashboard goes near-black
//    with a wandering dim clock. ~9 h/day of almost nothing on the panel
//    is the single biggest burn-in win available. Tap to peek for 5 min.
//  · Idle chrome dim: after 5 idle minutes the header and dividers — the
//    most static bright pixels on the wall — fade to 35%.
//  · The wider drift orbit above.
// Rest and dim are dashboard-only: a phone open at 11 PM must NOT black out.
function inSleepHours() {
  const c = S.config || {};
  const s = c.sleepStart ?? 22, e = c.sleepEnd ?? 6;
  if (s === e) return false;
  const h = new Date().getHours();
  return s < e ? (h >= s && h < e) : (h >= s || h < e);
}
let restSnoozeUntil = 0;
function updateScreenRest() {
  const el = $("#screen-rest");
  if (!el) return;
  const want = S.view === "dash"
    && localStorage.getItem("tc-rest") !== "0"
    && inSleepHours()
    && Date.now() >= restSnoozeUntil;
  if (want) {
    const now = new Date();
    $("#rest-clock").textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("#rest-date").textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    // wander a little every minute; CSS glides it over ~40s
    el.style.setProperty("--rest-x", (12 + Math.random() * 56) + "%");
    el.style.setProperty("--rest-y", (18 + Math.random() * 50) + "%");
  }
  el.hidden = !want;
}
let idleT = null;
function pokeIdle() {
  document.body.classList.remove("kiosk-idle");
  clearTimeout(idleT);
  if (S.view === "dash" && localStorage.getItem("tc-idle-dim") !== "0") {
    idleT = setTimeout(() => document.body.classList.add("kiosk-idle"), 5 * 60 * 1000);
  }
}
function wireBurnInCare() {
  const rest = $("#screen-rest");
  if (!rest || rest.dataset.wired) return;
  rest.dataset.wired = "1";
  rest.addEventListener("pointerdown", () => {   // peek: 5 minutes of normal wall
    restSnoozeUntil = Date.now() + 5 * 60 * 1000;
    updateScreenRest();
  });
  for (const ev of ["pointermove", "pointerdown", "keydown"]) {
    window.addEventListener(ev, pokeIdle, { passive: true });
  }
}

// ---------- D137: THE ALERTER (Katie: the red glow does nothing) ----------
// Jake, on the escalation glow: "it getting redder every hour does nothing."
// He's right — D3 built a real escalation engine and then whispered its
// results in colour, on a screen nobody is staring at. This makes the SAME
// engine audible. It invents no new schedule: a task nags on ITS OWN D3
// escalation cadence (already per-task, already configurable), so the
// feature Katie has been ignoring is the feature that now speaks.
//
// THREE CHANNELS, one master switch, all PER-DEVICE (D107's rule — the TV
// is a device, the phone is not; a beeping phone in a client meeting is
// exactly the thing she's already ignoring):
//   · toast   — an in-page banner. THE LOAD-BEARING ONE ON THE WALL: a
//               system notification is drawn by the OS and a fullscreen
//               kiosk may never show it. This one is ours, so it always
//               appears. Outside #drift-wrap (D37/D127).
//   · sound   — Web Audio, SYNTHESIZED. No asset to host, no file to 404,
//               works offline, and three distinguishable shapes mean you
//               can tell what happened without looking up.
//   · notify  — the OS notification, for a windowed tab.
//
// READS THROUGH buildQueue, NEVER through S.tasks. That is the whole
// safety of it: hidden tiers (D47), off-days (D61), timeless want-tos
// (D126), pipeline windows (D48) and expiry all already live in there.
// Re-deriving "what is overdue" from raw tasks would be a second truth,
// and D98 is this file's standing warning about what those cost. It is
// also evaluated for TODAY explicitly — not S.viewDay — because paging
// the queue to next Thursday must not silence the alarm.

const ALERT_LEVELS = {
  due:  { tones: [[880, 0, 0.20], [1174.7, 0.17, 0.26]], vol: 0.9, label: "Due now" },
  nag:  { tones: [[622.3, 0, 0.22], [622.3, 0.26, 0.30]], vol: 0.8, label: "Still waiting" },
  soon: { tones: [[1318.5, 0, 0.07], [1318.5, 0.11, 0.07], [1318.5, 0.22, 0.10]], vol: 0.55, label: "Starting soon" }
};
const ANNOUNCED_KEY = "tc-announced";
const ANNOUNCE_TTL = 36 * 60 * 60 * 1000;   // long enough to survive a night, short enough not to grow

function alertsOn()  { return localStorage.getItem("tc-alerts") === "1"; }        // master, default OFF
function alertSound(){ return localStorage.getItem("tc-alert-sound") !== "0"; }   // on when alerts are
function alertNotify(){ return localStorage.getItem("tc-alert-notify") === "1"; } // needs OS permission
function alertVol()  { return Math.min(1, Math.max(0, (parseInt(localStorage.getItem("tc-alert-vol"), 10) || 70) / 100)); }

// --- audio ---
// The AudioContext starts SUSPENDED until a user gesture. On a wall that
// auto-refreshed at 3 AM (D130) nobody has touched the glass since, so the
// first alert of the morning would be silent — and a silent alarm is worse
// than no alarm, because you believe it works. So: resume on any gesture,
// and if it is still suspended when we want to speak, SAY SO in settings
// and on the toast rather than failing quietly (D96's lesson, verbatim).
let audioCtx = null;
let audioBlocked = false;
function ensureAudio() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    audioBlocked = audioCtx.state === "suspended";
    return audioCtx;
  } catch (err) {
    console.warn("[alerts] no audio:", err);
    return null;
  }
}
function playLevel(level) {
  const spec = ALERT_LEVELS[level] || ALERT_LEVELS.due;
  const ctx = ensureAudio();
  if (!ctx) return;
  const master = alertVol() * spec.vol;
  if (master <= 0) return;
  const t0 = ctx.currentTime + 0.02;
  for (const [freq, at, dur] of spec.tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + at);
    // exponential ramps only — a linear attack on a sine clicks audibly
    gain.gain.setValueAtTime(0.0001, t0 + at);
    gain.gain.exponentialRampToValueAtTime(master, t0 + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + at);
    osc.stop(t0 + at + dur + 0.05);
  }
}

// --- the in-page toast ---
let toastT = null;
function showToast(level, title, body) {
  const el = $("#alert-toast");
  if (!el) return;
  $("#alert-toast-level").textContent = (ALERT_LEVELS[level] || ALERT_LEVELS.due).label;
  $("#alert-toast-title").textContent = title;
  $("#alert-toast-body").textContent = audioBlocked && alertSound()
    ? (body ? body + " · (tap anywhere to enable sound)" : "Tap anywhere to enable sound")
    : (body || "");
  el.dataset.level = level;
  el.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(hideToast, 25000);
}
function hideToast() {
  const el = $("#alert-toast");
  if (el) el.hidden = true;
  clearTimeout(toastT);
}

function osNotify(title, body, tag) {
  if (!alertNotify()) return;
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    // tag collapses a repeat nag onto the same notification instead of
    // stacking twelve of them down the corner of the screen
    new Notification(title, { body, tag, icon: "icon-192.png", renotify: true });
  } catch (err) {
    console.warn("[alerts] notification refused:", err);
  }
}

// --- the announced ledger ---
// Keyed per MOMENT, not per item, and persisted: a page reload (D130
// auto-refreshes this app on every deploy) must not re-announce a
// deadline that already spoke an hour ago.
function loadAnnounced() {
  try {
    const raw = JSON.parse(localStorage.getItem(ANNOUNCED_KEY) || "{}");
    return (raw && typeof raw === "object") ? raw : {};
  } catch { return {}; }
}
function saveAnnounced(map) {
  const cut = Date.now() - ANNOUNCE_TTL;
  const out = {};
  for (const k in map) if (map[k] > cut) out[k] = map[k];
  try { localStorage.setItem(ANNOUNCED_KEY, JSON.stringify(out)); } catch { /* full/private mode */ }
}

/** The moments worth a noise, derived from today's real queue.
 *  Returns [{level, key, title, body, tag}] — pure, so it is testable
 *  without a DOM and without making a sound. */
function pendingAlerts(q, seen) {
  const out = [];
  for (const it of q.items) {
    if (it.kind === "event") continue;          // events speak via `soon`, not expiry
    if (!it.expired) continue;
    const name = it.kind === "stage" ? `${it.projectName}: ${it.title}` : it.title;
    const dueKey = `due:${it.id}`;
    if (!(dueKey in seen)) {
      // Claim the CURRENT nag slot at the same time, or the very next tick
      // fires a nag one minute after the due alert — two noises, one event.
      const also = it.kind === "task" ? [`nag:${it.id}:${it.time}`] : [];
      out.push({ level: "due", key: dueKey, also, title: name, body: it.tier?.name || "", tag: `tc-${it.id}` });
      continue;
    }
    // Only TASKS re-nag, and only on their own D3 escalation step (it.time
    // is effectiveDue — the next slot — so it changes exactly once per
    // period). Stages carry no escalation field; inventing a cadence for
    // them would be this file's oldest mistake (D50), so they speak once
    // and the D46 decision modal remains their escalation.
    if (it.kind !== "task") continue;
    const nagKey = `nag:${it.id}:${it.time}`;
    if (!(nagKey in seen)) {
      out.push({ level: "nag", key: nagKey, also: [], title: name, body: "still not done", tag: `tc-${it.id}` });
    }
  }
  // D7/D80: an anchor entering its lead window IS the app's notification.
  for (const e of q.pinned) {
    const key = `soon:${e.id}:${e.time}`;
    if (key in seen) continue;
    out.push({ level: "soon", key, also: [], title: e.title, body: `starts ${fmtTime(e.time)}`, tag: `tc-${e.id}` });
  }
  return out;
}

/** Runs on the minute tick. `silent` marks everything as already-said
 *  without making a sound — used at boot, so opening the app on a day
 *  with nine overdue things does not detonate. */
let alertsSeeded = false;
function alertTick(silent = false) {
  if (!S.tiers.length) return;                 // pre-subscription: nothing is knowable yet
  // The FIRST pass is always silent, and it runs even with alerts OFF —
  // so flipping the switch on at 2 PM does not immediately detonate every
  // deadline the day already missed. You get told about what happens NEXT.
  if (!alertsSeeded) { silent = true; alertsSeeded = true; }
  if (!silent && !alertsOn()) return;
  const now = Date.now();
  let q;
  try {
    q = buildQueue({
      tasks: S.tasks, events: S.events, tiers: S.tiers, projects: S.projects,
      now, viewDay: now,                       // TODAY, never S.viewDay
      hiddenTierIds: S.hiddenTierIds
    });
  } catch (err) {
    console.warn("[alerts] queue unavailable:", err);
    return;
  }
  const seen = loadAnnounced();
  const fresh = pendingAlerts(q, seen);
  if (!fresh.length) return;

  // Sleep hours are silent, and they SWALLOW rather than defer — the
  // alternative is a 6 AM avalanche of everything the night accumulated,
  // which teaches you to ignore the alarm on its second morning.
  const mute = silent || inSleepHours();
  let spoke = 0;
  for (const a of fresh) {
    seen[a.key] = now;
    for (const k of a.also || []) seen[k] = now;
    if (mute) continue;
    // Cap the NOISE, not the ledger: three sounds is a signal, nine is an
    // alarm clock you unplug. Everything is still marked, so nothing
    // repeats later.
    if (spoke < 3) {
      if (alertSound()) playLevel(a.level);
      osNotify(a.title, a.body, a.tag);
      spoke++;
    }
  }
  if (!mute && fresh.length) {
    const first = fresh[0];
    showToast(first.level, first.title,
      fresh.length > 1 ? `${first.body ? first.body + " · " : ""}+${fresh.length - 1} more` : first.body);
  }
  saveAnnounced(seen);
}

function wireAlerts() {
  const toast = $("#alert-toast");
  if (toast && !toast.dataset.wired) {
    toast.dataset.wired = "1";
    toast.addEventListener("click", hideToast);
  }
  // One-time audio unlock: the first gesture of the session resumes the
  // context so the first REAL alert is not the one that discovers it was
  // suspended. Passive + once — this must never cost anything on the wall.
  for (const ev of ["pointerdown", "keydown"]) {
    window.addEventListener(ev, () => { if (alertsOn() && alertSound()) ensureAudio(); }, { passive: true, once: true });
  }
}

/** Settings: the ▶ Test button. Also the honest audio unlock, since a
 *  click IS the user gesture the browser wants. */
function testAlert() {
  ensureAudio();
  playLevel("due");
  showToast("due", "Test alert", "If you heard a chime, you're set.");
  osNotify("Tentacalendar", "Test alert — notifications are working.", "tc-test");
  refreshAlertStatus();
}

function refreshAlertStatus() {
  const el = $("#alert-status");
  if (!el) return;
  const bits = [];
  if (typeof Notification === "undefined") bits.push("this browser has no notifications");
  else if (Notification.permission === "denied") bits.push("notifications blocked in browser settings");
  else if (Notification.permission === "default" && alertNotify()) bits.push("notifications not yet allowed");
  if (audioBlocked) bits.push("sound waiting for a tap on the page");
  el.textContent = bits.length ? "⚠ " + bits.join(" · ") : (alertsOn() ? "✓ alerts on for this device" : "");
}

/** Checking the notify box is a user gesture, which is the only moment a
 *  browser will honour a permission request — so ask HERE rather than on
 *  boot, where it is both refused and rude. */
async function onNotifyToggle() {
  const box = $("#cfg-alert-notify");
  if (box && box.checked && typeof Notification !== "undefined" && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch { /* user dismissed */ }
  }
  refreshAlertStatus();
}

function shiftDay(n) { S.viewDay += n * DAY_MS; render(); }

// ---------- Tier filters (D47) ----------

function persistHidden() {
  localStorage.setItem("tc-hidden-tiers", JSON.stringify([...S.hiddenTierIds]));
}

function renderFilters() {
  const box = $("#tier-filters");
  if (!box) return;
  box.innerHTML = "";
  for (const t of S.tiers) {
    const chip = document.createElement("button");
    const hidden = S.hiddenTierIds.has(t.id);
    chip.className = "filter-chip" + (hidden ? " chip-off" : "");
    chip.textContent = (hidden ? "○ " : "● ") + t.name;
    chip.style.borderColor = t.color;
    if (!hidden) chip.style.background = hexToRgba(t.color, 0.18);
    chip.title = hidden ? `Show ${t.name} in the queue` : `Hide ${t.name} from the queue (this device only)`;
    chip.addEventListener("click", () => {
      if (!hidden && (t.rank ?? 99) <= 4) {
        if (!confirm(`"${t.name}" is a top-priority tier (rank ${t.rank}). Hide it from this device's queue anyway?\n\nHidden tiers are also excluded from overdue check-ins until you show them again.`)) return;
      }
      if (hidden) S.hiddenTierIds.delete(t.id); else S.hiddenTierIds.add(t.id);
      persistHidden();
      renderFilters();
      render();
    });
    box.append(chip);
  }
}

// ---------- Rendering ----------

// ============================================================
// D101 — THE GESTURE LOCK.
//
// render() is a Firestore SNAPSHOT HANDLER (subscribeTasks/Projects/... all
// call it), not just a timer target. So a drag CANNOT simply skip renders:
// "if (dragging) return" would DISCARD a live update from Katie's phone, not
// postpone it, and silent-loss in a live-sync accountability app is a worse
// bug than the one being fixed. It defers and flushes instead.
//
// Scope check first: the drags already SURVIVE a mid-drag re-render by
// design — listeners are on document (D73) and the ghosts are body-level
// fixed precisely so the minute tick can't hide them (D74). What actually
// breaks is cosmetic: the .dragging dim resets and the preview snaps. So
// this is a polish fix with a correctness trap inside it, which is exactly
// why it gets a real mechanism instead of a one-liner.
//
// THE SAFETY VALVE: if a pointerup is ever lost (browser quirk, a tab
// backgrounded mid-drag, a pointercancel that never lands), a stuck lock
// would silently freeze live sync FOREVER — the app would look fine and
// quietly stop being true. That is unacceptable in this app specifically, so
// tick() force-clears any gesture older than 30s. No real drag lasts 30
// seconds; a lock that does is a bug, and it fails OPEN.
// ============================================================
let gestureDepth = 0, gestureStartedAt = 0, renderPending = false;

function beginGesture() {
  if (gestureDepth === 0) gestureStartedAt = Date.now();
  gestureDepth++;
}

function endGesture() {
  gestureDepth = Math.max(0, gestureDepth - 1);
  if (gestureDepth > 0) return;
  if (renderPending) { renderPending = false; render(); }
}

/** Called by tick(). Fails OPEN: a stuck lock must never outlive a minute. */
function unstickGesture() {
  if (gestureDepth && Date.now() - gestureStartedAt > 30000) {
    console.warn("[tentacalendar] gesture lock held >30s — releasing. A pointerup was probably lost.");
    gestureDepth = 0;
    renderPending = false;
    render();
    return true;
  }
  return false;
}

function render() {
  if (!S.user) return;
  // D101 — defer, never drop. A snapshot that lands mid-drag is real data.
  if (gestureDepth) { renderPending = true; return; }
  const now = Date.now();

  // D126 — have-tos / want-tos. The tab bar itself is always visible;
  // which panel underneath it is live follows S.todoMode.
  const wantMode = S.todoMode === "want";
  $("#mode-have").classList.toggle("active", !wantMode);
  $("#mode-want").classList.toggle("active", wantMode);
  $("#havetos-panel").hidden = wantMode;
  $("#wanttos-panel").hidden = !wantMode;

  if (wantMode) {
    renderWantTos();
  } else {
    const q = buildQueue({
      tasks: S.tasks, events: S.events, tiers: S.tiers, projects: S.projects,
      now, viewDay: S.viewDay, hiddenTierIds: S.hiddenTierIds
    });

    // D80: the all-day shelf — ambient, checkbox-free, above the fold.
    const strip = $("#allday-strip");
    if (strip) {
      strip.innerHTML = "";
      strip.hidden = !(q.banners && q.banners.length);
      (q.banners || []).forEach(b => {
        const pill = document.createElement("span");
        pill.className = "banner";
        const c = b.tier?.color || "#4dd0c4";
        pill.style.borderLeftColor = c;
        pill.style.background = hexToRgba(c, 0.14);
        pill.textContent = b.title;
        if (b.dayTotal > 1) {
          const sp = document.createElement("span");
          sp.className = "banner-span";
          sp.textContent = ` · day ${b.dayN}/${b.dayTotal}`;
          pill.append(sp);
        }
        pill.title = b.dayTotal > 1
          ? `${b.title} — ${fmtDay(b.start)} → ${fmtDay((b.end || b.start) - 1)}`
          : `${b.title} — ${fmtDay(b.start)}`;
        strip.append(pill);
      });
    }

    // D82: passed events sink here (today only), dimmed with struck time.
    const earlier = $("#earlier"), earlierList = $("#earlier-list");
    if (earlier) {
      earlierList.innerHTML = "";
      earlier.hidden = !(q.passedEvents && q.passedEvents.length);
      (q.passedEvents || []).forEach(pe => {
        const row = document.createElement("div");
        row.className = "row past-event";
        const c = pe.tier?.color || "#4dd0c4";
        const when = pe.end
          ? `${fmtTime(pe.start)}–${fmtTime(pe.end)}`
          : fmtTime(pe.start);
        row.innerHTML = `<div class="row-main"><strong>${esc(pe.title)}</strong><span class="sub">${when}</span></div>`;
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = pe.tier?.name || "";
        chip.style.background = hexToRgba(c, 0.18);
        row.append(chip);
        earlierList.append(row);
      });
    }

    const sameDay = new Date(S.viewDay).toDateString() === new Date(now).toDateString();
    $("#day-label").textContent = sameDay ? `Today — ${fmtDay(S.viewDay)}` : fmtDay(S.viewDay);
    placeNowButton("day", sameDay ? 0 : (startOfDayTs(S.viewDay) > startOfDayTs(now) ? 1 : -1)); // D90

    renderPinned(q.pinned, now);
    renderQueue(q.items, now);
    renderWaiting(q.waiting);
    renderDone(q.doneToday);
  }

  renderProjects(now);  // D126 fix — the sidebar now filters by mode too (was showing every project regardless of tab)
  renderDecision(); // D57: modal rows track live state while open
  if (S.view === "dash") fitDashHeight();                    // D105: the frame first, then the panes fill it
  if (S.view === "year" || S.view === "dash") renderYear(); // D65: live updates flow into the grid
  if (S.view === "week" || S.view === "dash") renderWeek(); // D88: same deal for the week (D105: the dashboard is all views at once)
}

function setTodoMode(mode) {
  if (S.todoMode === mode) return;
  S.todoMode = mode;
  render();
}

/** D126 — which tier (if any) is marked timeless. One choke point, so
 *  the sidebar, the want-tos card list, and the shuffle can't drift into
 *  three different ideas of "which tier that is." */
function timelessTier() {
  return S.tiers.find(t => t.timeless) || null;
}

/** D126 — Jake, from a screenshot: a someday project showing in the
 *  Have-tos sidebar was surprising, not helpful — the tab is meant to
 *  change the WHOLE workspace's character, not just the center panel.
 *  Both #projects-list (the sidebar) and #wanttos-list read through here
 *  now, so they can't disagree about what belongs on screen right now. */
function projectsForMode() {
  const tt = timelessTier();
  return S.projects.filter(p => S.todoMode === "want" ? p.tierId === tt?.id : p.tierId !== tt?.id);
}

/** D126 — want-tos: the timeless tier's projects, browsed as cards
 *  (reusing projectCard wholesale — "cards with their checklists" per
 *  the spec, and it already handles null dates via projWhen()). */
function renderWantTos() {
  const list = $("#wanttos-list");
  const hint = $("#wanttos-hint");
  list.innerHTML = "";
  const tier = timelessTier();
  if (!tier) {
    hint.hidden = false;
    hint.textContent = "No timeless tier set yet — mark one ⏳ in ⚙️ Settings ▸ Tiers, then create a project on it.";
    return;
  }
  const projs = projectsForMode();
  if (!projs.length) {
    hint.hidden = false;
    hint.textContent = `No someday projects yet — add one on the right, on the ${tier.name} tier.`;
    return;
  }
  hint.hidden = true;
  const open = projs.filter(p => !p.completedAt);
  const finished = projs.filter(p => p.completedAt);
  for (const p of open) list.append(projectCard(p));
  if (finished.length) {
    const toggle = document.createElement("button");
    toggle.className = "mini finished-toggle";
    toggle.textContent = `${S.showFinished ? "▾" : "▸"} Finished ✓ (${finished.length})`;
    toggle.title = "Completed someday projects, kept for the record";
    toggle.addEventListener("click", () => {
      S.showFinished = !S.showFinished;
      localStorage.setItem("tc-show-finished", S.showFinished ? "1" : "0");
      render();
    });
    list.append(toggle);
    if (S.showFinished) for (const p of finished) list.append(projectCard(p));
  }
}

/** D126 — "give me an idea": jump to a random open someday project,
 *  expanded so its checklist is right there. Browsing-for-fun affordance
 *  the spec suggested; picks uniformly rather than trying to be clever
 *  about neglect — simplest honest thing that still surprises. */
function wantTosShuffle() {
  const tier = timelessTier();
  if (!tier) return;
  const open = projectsForMode().filter(p => !p.completedAt);
  if (!open.length) return;
  const pick = open[Math.floor(Math.random() * open.length)];
  S.expandedProjects.add(pick.id);
  persistExpanded();
  render();
  requestAnimationFrame(() => {
    const card = document.querySelector(`#wanttos-list .project-card[data-project-id="${pick.id}"]`);
    if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function tierChip(tier) {
  const span = document.createElement("span");
  span.className = "chip";
  span.textContent = tier ? tier.name : "?";
  span.style.background = tier ? tier.color : "#666";
  return span;
}

function renderPinned(pinned, now) {
  const box = $("#pinned");
  box.innerHTML = "";
  box.hidden = pinned.length === 0;
  for (const e of pinned) {
    const row = document.createElement("div");
    row.className = "row pinned-row";
    row.append(tierChip(e.tier));
    const label = document.createElement("div");
    label.className = "row-main";
    const mins = Math.round((e.time - now) / 60000);
    label.innerHTML = `<strong>${esc(e.title)}</strong><span class="sub">${
      mins > 0 ? `in ${mins} min — ${fmtTime(e.time)}` : `NOW — ${fmtTime(e.time)}`
    }</span>`;
    row.append(label);
    box.append(row);
  }
}

function staleGlow(row, deadline, now) {
  const days = (now - deadline) / DAY_MS;
  if (days <= 0) return;
  const blur = Math.min(3 + days * 3.5, 16);
  const alpha = Math.min(0.25 + days * 0.12, 0.7);
  row.style.boxShadow = `0 0 ${blur.toFixed(0)}px rgba(255,107,107,${alpha.toFixed(2)})`;
}

/** Time + date, date omitted only when it's the viewed day (the Bonnie fix). */
function whenLabel(ts) {
  return sameDayAsView(ts) ? fmtTime(ts) : `${fmtTime(ts)} ${fmtDay(ts)}`;
}

/** D63 row layout: line 1 = lead (checkbox/dot) + title (+ ▸ when the
 *  task has notes), line 2 = tier chip + actions pinned right, details
 *  expanding underneath. One builder so queue/waiting/done stay twins. */
function rowScaffold(row, { lead, tier, mainHTML, buttons = [], notes = "", noteKey = null }) {
  row.classList.add("row-2l");
  const top = document.createElement("div");
  top.className = "row-top";
  if (lead) top.append(lead);
  const main = document.createElement("div");
  main.className = "row-main";
  main.innerHTML = mainHTML;
  top.append(main);
  const hasNotes = !!(notes && String(notes).trim()) && noteKey != null;
  if (hasNotes) {
    const open = S.expandedNotes.has(noteKey);
    const chev = document.createElement("button");
    chev.type = "button";
    chev.className = "icon-btn note-chev";
    chev.textContent = open ? "▾" : "▸";
    chev.title = open ? "Hide details" : "Show details";
    const toggle = () => {
      if (S.expandedNotes.has(noteKey)) S.expandedNotes.delete(noteKey);
      else S.expandedNotes.add(noteKey);
      render();
    };
    chev.addEventListener("click", toggle);
    main.classList.add("has-notes");
    main.title = open ? "Hide details" : "Show details";
    main.addEventListener("click", toggle);
    top.append(chev);
  }
  row.append(top);
  const actions = document.createElement("div");
  actions.className = "row-actions";
  if (tier !== undefined) actions.append(tierChip(tier));
  const spacer = document.createElement("span");
  spacer.className = "row-spacer";
  actions.append(spacer, ...buttons);
  row.append(actions);
  if (hasNotes && S.expandedNotes.has(noteKey)) {
    const n = document.createElement("div");
    n.className = "row-notes";
    n.textContent = String(notes);
    row.append(n);
  }
}

function renderQueue(items, now) {
  const list = $("#queue");
  list.innerHTML = "";
  if (items.length === 0) {
    list.innerHTML = `<div class="empty">Nothing in the queue. The octopus rests. 🐙</div>`;
    return;
  }
  for (const it of items) {
    const row = document.createElement("div");
    row.className = "row" + (it.expired ? " overdue" : "") + (it.kind === "event" ? " event-row" : "");
    if (it.kind === "stage") {
      row.style.borderLeft = `4px solid ${it.projectColor || "#4dd0c4"}`;
      const pct = Math.round((it.progressPct || 0) * 100);
      row.style.background =
        `linear-gradient(90deg, ${hexToRgba(it.projectColor || "#4dd0c4", 0.16)} ${pct}%, transparent ${pct}%)`;
    }
    if (it.expired) staleGlow(row, it.kind === "stage" ? it.deadline : it.originalDue, now);

    let lead;
    if (it.kind === "task") {
      lead = document.createElement("input");
      lead.type = "checkbox";
      lead.addEventListener("change", ev => {
        setTaskDone(it.id, lead.checked);
        if (lead.checked) celebrate(1, clickPoint(ev));
      });
    } else if (it.kind === "stage") {
      lead = document.createElement("input");
      lead.type = "checkbox";
      lead.title = `Mark "${it.title}" done`;
      lead.addEventListener("change", ev => onStageToggle(it.projectId, it.stageIndex, lead.checked, ev));
    } else {
      lead = document.createElement("span");
      lead.className = "event-dot";
      lead.textContent = "📌";
    }

    let sub;
    if (it.kind === "event") {
      sub = fmtTime(it.time) + (it.end ? "–" + fmtTime(it.end) : "");
    } else if (it.kind === "stage") {
      const dl = `${esc(it.deadlineStageName)} — ${fmtDay(it.deadline)}${it.deadlineManual ? " " + fmtTime(it.deadline) : ""}`;
      sub = it.expired
        ? `<s>${dl}</s> <span class="badge">❗ missed</span>`
        : `next: ${dl}` + (it.workload !== 2 ? ` · ${it.workload === 3 ? "heavy" : "light"}` : "");
    } else if (it.expired) {
      sub = `<s>${whenLabel(it.originalDue)}</s> → ${fmtTime(it.time)} <span class="badge">❗ overdue</span>`;
    } else {
      sub = whenLabel(it.originalDue);
    }
    const stagePrefix = it.kind === "stage"
      ? `<span class="stage-proj" style="color:${it.projectColor}">${esc(it.projectName)}</span> · ` : "";
    const buttons = it.kind === "task" ? [
      iconBtn("✎", "Edit this task", () => startTaskEdit(it.raw)),
      iconBtn("↳", "Add follow-up", () => followUpPrompt(it)),
      // D133 — only a repeating task can stop repeating. The button is
      // absent otherwise rather than disabled: a control that can't do
      // anything is clutter, and the ↻ badge already says which is which.
      ...(it.raw?.recurrence ? [iconBtn("✋", "Last one — finish this, don't plant the next", () => endRecurrence(it))] : []),
      iconBtn("✕", "Delete", () => {
        if (!confirm(`Delete "${it.title}"?`)) return;
        const { id, ...data } = structuredClone(it.raw);   // D116: full body, id stripped
        pushUndo("task delete", () => restoreDoc("tasks", it.id, data), () => deleteTask(it.id));
        deleteTask(it.id);
      })
    ] : it.kind === "stage" ? [
      iconBtn("⏰", "Set/change this stage's hard due date", () =>
        openDueDialog({ kind: "stage", projectId: it.projectId, stageIndex: it.stageIndex }, `Hard due date — ${it.title}`, it.dueAt))
    ] : [];
    rowScaffold(row, {
      lead, tier: it.tier,
      mainHTML: `<strong>${stagePrefix}${esc(it.title)}</strong>${it.kind === "task" && it.raw?.recurrence ? ` <span class="rec-badge" title="Repeats every ${it.raw.recurrence.every} ${it.raw.recurrence.unit} (${it.raw.recurrence.anchor === "due" ? "from the scheduled due" : "from completion"})">↻</span>` : ""}<span class="sub">${sub}</span>`,
      buttons,
      notes: it.kind === "task" ? (it.raw?.notes || "") : "",
      noteKey: it.kind === "task" ? it.id : null
    });
    list.append(row);
  }
}

function sameDayAsView(ts) {
  return new Date(ts).toDateString() === new Date(S.viewDay).toDateString();
}

function renderWaiting(waiting) {
  const box = $("#waiting");
  const list = $("#waiting-list");
  list.innerHTML = "";
  box.hidden = waiting.length === 0;
  for (const t of waiting) {
    const parent = S.tasks.find(p => p.id === t.parentTaskId);
    const tier = S.tiers.find(x => x.id === t.tierId);
    const row = document.createElement("div");
    row.className = "row waiting-row";
    rowScaffold(row, {
      lead: null, tier,
      mainHTML: `<strong>${esc(t.title)}</strong><span class="sub">+${fmtOffset(t.offsetDays)} after: ${esc(parent ? parent.title : "(deleted task)")}</span>`,
      buttons: [
        iconBtn("✎", "Edit title / offset", () => openFollowUpModal({ mode: "edit", task: t })),
        iconBtn("✕", "Delete", () => deleteTask(t.id))
      ],
      notes: t.notes || "",
      noteKey: t.id
    });
    list.append(row);
  }
}

function renderDone(done) {
  const box = $("#done");
  const list = $("#done-list");
  list.innerHTML = "";
  box.hidden = done.length === 0;
  $("#done-count").textContent = done.length;
  for (const t of done) {
    const tier = S.tiers.find(x => x.id === t.tierId);
    const row = document.createElement("div");
    row.className = "row done-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = true;
    cb.addEventListener("change", () => onTaskUncheck(t));
    rowScaffold(row, {
      lead: cb, tier,
      mainHTML: `<strong>✓ ${esc(t.title)}</strong><span class="sub">done ${fmtTime(t.completedAt)}</span>`,
      notes: t.notes || "",
      noteKey: t.id
    });
    list.append(row);
  }
}

// ---------- Project panel ----------

function persistExpanded() {
  localStorage.setItem("tc-expanded-projects", JSON.stringify([...S.expandedProjects]));
}

// ---------- D114: UNDO (Ctrl/Cmd-Z) for drags ----------
// Jake, demoing on the wall: "I move dates around and stress out that my
// memory is not perfect." Every drag COMMIT captures its before-state onto
// a stack; Ctrl/Cmd-Z pops and restores through the normal store writes,
// so both screens see the undo like any other change. Scope: the drags —
// year-bar moves/stretches and clock-estimate grips. Native undo inside
// text fields is untouched (the handler steps aside for inputs).
// D116 — two stacks, full redo. Every entry carries BOTH directions,
// captured at commit time when before and after are both in hand. A new
// action forks history: the redo stack dies (the old future is gone).
// EXCLUDED on principle, argued to Jake and accepted: completion toggles —
// checking a task fires celebrations, materializes follow-ups, spawns
// cacti, and UN-checking already owns a richer undo (the D53 oops/rewind/
// keep modal). A silent Ctrl-Z bypassing those semantics would be worse.
// Multi-user honesty: undo restores YOUR captured before-state — if the
// other person edited the same thing in between, your undo wins over
// their edit. Acceptable for a two-person app; said out loud here.
const undoStack = [], redoStack = [];
function pushUndo(label, undo, redo) {
  undoStack.push({ label, undo, redo });
  if (undoStack.length > 30) undoStack.shift();
  redoStack.length = 0;
}
/** One step of history. redoing=false → undo, true → redo. Returns
 *  whether a step happened (pure-ish core, unit-tested). */
function historyStep(redoing) {
  const from = redoing ? redoStack : undoStack;
  const to = redoing ? undoStack : redoStack;
  const u = from.pop();
  if (!u) return false;
  (redoing ? u.redo : u.undo)();
  to.push(u);
  return true;
}
window.addEventListener("keydown", ev => {
  const z = ev.key === "z" || ev.key === "Z", y = ev.key === "y" || ev.key === "Y";
  if (!(ev.ctrlKey || ev.metaKey) || (!z && !y)) return;
  const t = ev.target;
  if (t && (t.matches?.("input, textarea, select") || t.isContentEditable)) return;
  if (historyStep(y || ev.shiftKey)) ev.preventDefault();
});

// ---------- D134: Escape closes the topmost modal ----------
//
// Jake: "the equivalent of clicking the ✕ — no save," and if something
// changed, it should confirm. That last part costs NOTHING here, because
// this handler does not close anything itself: it CLICKS THE MODAL'S OWN
// cancel button. Every guard (D129/D131), every bit of state cleanup
// (fuTarget, clockMode, S.dupTarget), and every special case (stages
// returning you to the dup form) already lives in those handlers, so
// reimplementing "close" here would be a second copy destined to drift
// out of sync with the first — exactly the D98 failure. One source of
// truth for closing; Escape is just another way to press the button.
//
// The mapped button is each modal's NEVER-MIND, not a raw hide: the
// decision modals get their no-op answer (uncheck → "oops", it stays
// done; weekend → "back"), because leaving one hidden-but-unresolved
// would strand S.uncheckTarget / S.weekendPending.
//
// TOPMOST = LAST OPEN IN DOM ORDER. Every shell shares z-index 50, so
// paint order IS document order; querySelectorAll returns document order,
// so the last un-hidden shell is the one on top and the one Escape should
// answer. That's self-maintaining — a new modal joins the ordering for
// free — and the ship-check asserts every shell has an entry here, so a
// future modal can't silently arrive without an Escape.
//
// NOTE for whoever adds modal #12: because they all share z-index 50 and
// #dup-modal is LAST in the markup, dup would paint over anything it ever
// coexisted with. Today nothing does (each explicitly hides the other),
// but if you ever want two on screen at once, that's the trap.

const MODAL_ESCAPES = {
  "settings-modal":   "#settings-close",
  "clock-modal":      "#clock-cancel",
  "report-modal":     "#report-close",
  "followup-modal":   "#fu-cancel",
  "yv-project-modal": "#yv-project-close",
  "due-modal":        "#due-cancel",
  "stages-modal":     "#stages-cancel",
  "weekend-modal":    "#weekend-back",
  "decision-modal":   "#decision-close",
  "uncheck-modal":    "#uncheck-oops",
  "dup-modal":        "#dup-no"
};

/** The open modal painted on top, or null. Exported shape for testing. */
function topOpenModalId() {
  const shells = [...document.querySelectorAll("#settings-modal, .modal-shell")];
  const open = shells.filter(el => !el.hidden && MODAL_ESCAPES[el.id]);
  return open.length ? open[open.length - 1].id : null;
}

function escapeTopModal() {
  const id = topOpenModalId();
  if (!id) return false;
  const btn = $(MODAL_ESCAPES[id]);
  if (!btn) return false;
  btn.click();          // the button owns the guard AND the cleanup
  return true;
}

document.addEventListener("keydown", ev => {
  if (ev.key !== "Escape" || ev.repeat || ev.isComposing) return;
  // Deliberately does NOT step aside for inputs the way the undo handler
  // does: Escape while typing in a modal field should still close it —
  // that's the whole point of the shortcut (scrolling through quickly).
  if (escapeTopModal()) { ev.preventDefault(); return; }
  // Nothing modal open: let Escape dismiss the update banner's countdown,
  // which is the only other thing on screen demanding an answer. Same rule
  // ("Escape answers the thing in your way"), same delegation to the
  // existing button, so "Later"'s don't-re-nag bookkeeping still runs.
  const later = $("#update-later");
  if (later && !$("#update-banner")?.hidden) { later.click(); ev.preventDefault(); }
});

// ---------- D112: the clock (Katie's paper replacement) ----------
// Fixed-price projects, billed on assumed hours; the ledger answers next
// year's "do I ask for more?" — so the card shows a running timer and a
// lifetime Σ, and everything is correctable after the fact.
function openSessionNow() { return S.sessions.find(s => s.end == null) || null; }
function projName(id) { return S.projects.find(x => x.id === id)?.name || "another project"; }

/** D126 — a project's date range as text, or "Someday" for a timeless
 *  (null-dated) want-to. Every place that used to write fmtDay(p.startDate)
 *  directly needs this now, or a want-to renders "Thu, Jan 1" (epoch). */
function projWhen(p) {
  return (p.startDate != null && p.endDate != null)
    ? `${fmtDay(p.startDate)} – ${fmtDay(p.endDate)}`
    : "Someday";
}
function projectClockedMs(pid, now) {
  let t = 0;
  for (const s of S.sessions) if (s.projectId === pid) t += (s.end ?? now) - s.start;
  return Math.max(0, t);
}
function fmtHoursTotal(ms) {
  const h = ms / 3600000;
  return h >= 10 ? Math.round(h) + "h" : h >= 1 ? h.toFixed(1) + "h" : Math.round(ms / 60000) + "m";
}
function fmtElapsed(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}
/** D122 — the NOW bar's live readout: H:MM:SS. A working timer with a
 *  visible second hand feels alive; one that jumps by minutes feels
 *  stopped. Negative clamps to zero (clock skew is not Katie's problem). */
function fmtClockLive(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
// D113 — Jake, on the midnight-honesty guess: "the next day, it should
// probably ask when the session ended. Katie pulls the occasional
// all-nighter." He's right: a time-only field can only reach back 24h and
// GUESSES the day. These dialogs now ASK — datetime-local carries the date
// explicitly, so an all-nighter, a forgot-for-two-days session, anything,
// is one honest field. Explicit beats clever; the yesterday-guessing
// helper is gone.
function toDTLocal(ts) {
  const d = new Date(ts), p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromDTLocal(v, fallback) {
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : fallback;
}
let clockMode = null;   // {kind:"out", session} | {kind:"log", project}
function openClockOutDialog(os) {
  clockMode = { kind: "out", session: os };
  $("#clock-heading").textContent = `⏹ Clock out — ${projName(os.projectId)}`;
  $("#clock-sub").textContent = `Running since ${fmtTime(os.start)} (${fmtElapsed(Date.now() - os.start)}). Adjust the time — and the DATE, all-nighters welcome — if you actually stopped earlier. Cancel if this was a misclick.`;
  $("#clock-start-row").hidden = true;
  $("#clock-end").value = toDTLocal(Date.now());
  $("#clock-modal").hidden = false;
  $("#clock-end").focus();
}
function openLogDialog(p) {
  clockMode = { kind: "log", project: p };
  $("#clock-heading").textContent = `🕰 Log time — ${p.name}`;
  $("#clock-sub").textContent = "The forgot-to-clock-in eraser. If the running timer overlaps this window, it ends where this starts — honest boundaries.";
  $("#clock-start-row").hidden = false;
  $("#clock-start").value = toDTLocal(Date.now() - 3600000);
  $("#clock-end").value = toDTLocal(Date.now());
  $("#clock-modal").hidden = false;
  $("#clock-start").focus();
}
function saveClockDialog() {
  const now = Date.now();
  if (clockMode?.kind === "out") {
    const os = clockMode.session;
    const end = Math.min(now, Math.max(os.start, fromDTLocal($("#clock-end").value, now)));
    clockOut(end).then(closed => {   // D116
      if (!closed.length) return;
      pushUndo("clock out",
        async () => { for (const c of closed) await setSessionEnd(c.id, null); },
        async () => { for (const c of closed) await setSessionEnd(c.id, c.end); });
    });
  } else if (clockMode?.kind === "log") {
    const start = fromDTLocal($("#clock-start").value, now - 3600000);
    const end = Math.min(now + 60000, fromDTLocal($("#clock-end").value, now));
    if (end > start) logSession(clockMode.project.id, start, end).then(info => {   // D116
      pushUndo("log time",
        async () => { await deleteSession(info.newId); for (const id of info.truncatedIds) await setSessionEnd(id, null); },
        async () => { for (const id of info.truncatedIds) await setSessionEnd(id, info.start); await restoreDoc("sessions", info.newId, info.body); });
    });
  }
  $("#clock-modal").hidden = true;
  clockMode = null;
}

// ---------- D120: THE TIME REPORT ----------
// Module-scoped, not S — same pattern as clockMode: modal-lifetime state
// that has no business surviving a render() or persisting anywhere.
let reportProjectId = null;   // null = every project; a string = one, by name
let reportRollup = null;      // cached from the last render, for the export buttons

/** Opens the report. projectId set = pre-filtered (the per-project 🕰
 *  shortcut); null = the all-projects view (the panel-header button).
 *  Default range is "this calendar year so far" — a harmless starting
 *  point, not an assumption: change the Starts field once and every
 *  month/quarter/year bucket downstream re-aligns to THAT date instead
 *  (D120's actual answer to fiscal-vs-calendar — an arbitrary range,
 *  not a setting). */
function openTimeReport(projectId = null) {
  reportProjectId = projectId;
  const now = Date.now();
  const yearStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
  $("#report-start").value = toDateInput(new Date(yearStart));
  $("#report-end").value = toDateInput(new Date(now));
  if (!$("#report-granularity").value) $("#report-granularity").value = "month";
  renderReportFilterHint();
  $("#report-modal").hidden = false;
  renderTimeReport();
}

function renderReportFilterHint() {
  const hint = $("#report-project-filter");
  if (!reportProjectId) { hint.hidden = true; hint.innerHTML = ""; return; }
  const name = S.projects.find(p => p.id === reportProjectId)?.name || "this project";
  hint.hidden = false;
  hint.innerHTML = `Showing <strong>${esc(name)}</strong> only. `;
  const clear = document.createElement("button");
  clear.className = "mini";
  clear.textContent = "Show all projects";
  clear.addEventListener("click", () => { reportProjectId = null; renderReportFilterHint(); renderTimeReport(); });
  hint.append(clear);
}

function closeTimeReport() {
  $("#report-modal").hidden = true;
  reportProjectId = null;
  reportRollup = null;
}

/** Re-derives the rollup from the current form fields and repaints the
 *  table. Called on open and on every date/granularity change — cheap
 *  enough (session count is small) to just recompute rather than diff. */
function renderTimeReport() {
  const startVal = $("#report-start").value, endVal = $("#report-end").value;
  const warn = $("#report-warn");
  if (!startVal || !endVal) { warn.hidden = false; warn.textContent = "Pick both a start and an end date."; return; }
  const rangeStart = new Date(`${startVal}T00:00`).getTime();
  const rangeEnd = new Date(`${endVal}T00:00`).getTime() + DAY_MS; // the end date is inclusive
  if (rangeEnd <= rangeStart) { warn.hidden = false; warn.textContent = "End date must be after the start date."; return; }
  warn.hidden = true;

  const granularity = $("#report-granularity").value || "month";
  const rollup = rollupSessions({
    sessions: S.sessions, projects: S.projects,
    rangeStart, rangeEnd, granularity,
    projectId: reportProjectId, now: Date.now()
  });
  reportRollup = rollup;

  const table = $("#report-table");
  table.innerHTML = "";
  $("#report-empty").hidden = rollup.rows.length !== 0;
  if (!rollup.rows.length) return;

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = `<th>Project</th>` +
    rollup.periods.map(p => `<th>${esc(p.label)}</th>`).join("") +
    `<th>Total</th>`;
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  for (const row of rollup.rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><span class="report-swatch" style="background:${row.color || "#888"}"></span>${esc(row.projectName)}</td>` +
      row.byPeriod.map(ms => `<td>${ms > 0 ? fmtHoursTotal(ms) : "—"}</td>`).join("") +
      `<td><strong>${fmtHoursTotal(row.totalMs)}</strong></td>`;
    tbody.append(tr);
  }
  table.append(tbody);

  const tfoot = document.createElement("tfoot");
  const footRow = document.createElement("tr");
  footRow.innerHTML = `<td>Total</td>` +
    rollup.periodTotals.map(ms => `<td>${ms > 0 ? fmtHoursTotal(ms) : "—"}</td>`).join("") +
    `<td><strong>${fmtHoursTotal(rollup.grandTotal)}</strong></td>`;
  tfoot.append(footRow);
  table.append(tfoot);
}

/** Standard Blob+anchor download — no library needed for a CSV string. */
function downloadCSV(text, filename) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function exportReportRollupCSV() {
  if (!reportRollup || !reportRollup.rows.length) return;
  downloadCSV(rollupToCSV(reportRollup), `tentacalendar-time-report-${$("#report-start").value}-to-${$("#report-end").value}.csv`);
}

/** Raw export re-derives its OWN session list rather than reusing the
 *  rollup's (which is period-split by design) — this one is deliberately
 *  UN-split, so it re-filters S.sessions by the same range/project. */
function exportReportRawCSV() {
  const startVal = $("#report-start").value, endVal = $("#report-end").value;
  if (!startVal || !endVal) return;
  const rangeStart = new Date(`${startVal}T00:00`).getTime();
  const rangeEnd = new Date(`${endVal}T00:00`).getTime() + DAY_MS;
  const raw = S.sessions.filter(s =>
    (!reportProjectId || s.projectId === reportProjectId) &&
    s.start < rangeEnd && (s.end ?? Date.now()) > rangeStart);
  if (!raw.length) return;
  downloadCSV(sessionsToCSV(raw, S.projects), `tentacalendar-raw-sessions-${startVal}-to-${endVal}.csv`);
}

function renderProjects(now) {
  const box = $("#projects-list");
  box.innerHTML = "";
  // D126 fix — Jake, from a screenshot: a someday project was showing in
  // the sidebar even on the Have-tos tab. The sidebar reads through
  // projectsForMode() now, same as the want-tos card list, so the two
  // can't disagree about what's currently on screen.
  const projects = projectsForMode();
  $("#projects-empty").hidden = projects.length !== 0;
  $("#projects-empty").textContent = S.todoMode === "want"
    ? "No someday projects yet. Mark a tier ⏳ timeless in ⚙️ Settings, then create one on the right."
    : "No projects yet. Create one on the right — its whole pipeline comes with it.";

  // D56: unfinished projects up top (whatever their dates — a stalled
  // past project stays visible on purpose); finished ones fold into
  // their own collapsed section below. Both keep start-date order.
  const open = projects.filter(p => !p.completedAt);
  const finished = projects.filter(p => p.completedAt);

  // D122 — Katie's NOW bar: the current project and how long she's been
  // on it, at the top of the list. Exists ONLY while a timer runs (an
  // empty nag bar would be noise, not accountability). The elapsed span
  // carries #now-elapsed so the 1-second interval (boot) can move the
  // second hand without a render. Tap = the clock-out dialog; the handler
  // re-derives the open session at click time so a stale card can't
  // clock out the wrong thing.
  // D126 — deliberately reads S.projects UNFILTERED, not projectsForMode():
  // a running timer is "what you're doing right now," and that shouldn't
  // vanish just because you flipped to the other tab to browse.
  {
    const os = openSessionNow();
    if (os) {
      const p = S.projects.find(x => x.id === os.projectId);
      const color = p?.color || "#4dd0c4";
      const bar = document.createElement("div");
      bar.className = "now-bar";
      bar.style.borderLeftColor = color;
      bar.style.background = hexToRgba(color, 0.10);
      bar.title = "Working on it — tap to clock out or adjust the end time";
      const glyph = document.createElement("span");
      glyph.className = "now-pulse";
      glyph.textContent = "⏱";
      const main = document.createElement("div");
      main.className = "now-main";
      const nm = document.createElement("strong");
      nm.textContent = p?.name || projName(os.projectId);
      const since = document.createElement("div");
      since.className = "sub";
      since.textContent = `since ${fmtTime(os.start)}`;
      main.append(nm, since);
      const el = document.createElement("span");
      el.className = "now-elapsed";
      el.id = "now-elapsed";
      el.textContent = fmtClockLive(Date.now() - os.start);
      bar.append(glyph, main, el);
      bar.addEventListener("click", () => {
        const cur = openSessionNow();
        if (cur) openClockOutDialog(cur);
      });
      box.append(bar);
    }
  }

  for (const p of open) box.append(projectCard(p));

  if (finished.length) {
    const toggle = document.createElement("button");
    toggle.className = "mini finished-toggle";
    toggle.textContent = `${S.showFinished ? "▾" : "▸"} Finished ✓ (${finished.length})`;
    toggle.title = "Completed projects, kept for the record";
    toggle.addEventListener("click", () => {
      S.showFinished = !S.showFinished;
      localStorage.setItem("tc-show-finished", S.showFinished ? "1" : "0");
      render();
    });
    box.append(toggle);
    if (S.showFinished) for (const p of finished) box.append(projectCard(p));
  }
}

/** D56: collapsed = header row + dates + progress bar. The header row
 *  never wraps: [chevron][name (wraps internally)][buttons] — the
 *  buttons Jake kept losing to the second row are now pinned. */
function projectCard(p) {
  const prog = projectProgress(p);
  const expanded = S.expandedProjects.has(p.id);
  const card = document.createElement("div");
  card.className = "project-card" + (p.completedAt ? " project-done" : "");
  card.dataset.projectId = p.id; // D126 — lets the want-tos shuffle find its pick after a render
  card.style.borderTop = `3px solid ${p.color}`;

  const head = document.createElement("div");
  head.className = "project-head";
  head.title = expanded ? "Collapse" : "Expand stages";
  const chev = document.createElement("span");
  chev.className = "proj-chevron";
  chev.textContent = expanded ? "▾" : "▸";
  const nameEl = document.createElement("strong");
  nameEl.textContent = p.name;
  const btns = document.createElement("span");
  btns.className = "proj-btns";
  // D126 — "duplicate for next year" has no year to bump on a timeless
  // project; offering it would either no-op confusingly or need its own
  // invented semantics. Left out on purpose, not forgotten.
  if (p.startDate != null) {
    btns.append(iconBtn("🔁", "Duplicate this project for next year (same window, stages reset)", () => openDuplicateModal(p)));
  }
  btns.append(
    iconBtn("✎", "Edit project (name, color, tier, dates, workload)", () => startProjectEdit(p)),
    iconBtn("✎⋮", "Edit this project's stages (rename, reorder, add, remove)", () => openStagesDialog(p)),
    iconBtn("✕", "Delete project", () => {
      if (confirm(`Delete project "${p.name}" and its pipeline?`)) deleteProject(p.id);
    })
  );
  head.append(chev, nameEl, btns);
  head.addEventListener("click", ev => {
    if (ev.target.closest("button")) return; // buttons act, header toggles
    if (expanded) S.expandedProjects.delete(p.id); else S.expandedProjects.add(p.id);
    persistExpanded();
    render();
  });
  card.append(head);
  const wl = p.workload === 3 ? " · heavy" : p.workload === 1 ? " · light" : "";
  const dates = document.createElement("div");
  dates.className = "project-dates sub";
  dates.append(document.createTextNode(
    `${projWhen(p)}${wl}` +
    (p.completedAt ? ` · finished ${fmtDay(p.completedAt)}` : "")));
  {
    // D119 — Jake: the clock row "adds a ton of vertical space." The
    // controls now ride the dates/weight line: icon + in/out, no "Clock".
    const os = openSessionNow();
    const runningHere = os && os.projectId === p.id;
    const cbtn = document.createElement("button");
    cbtn.className = "mini clock-btn" + (runningHere ? " running" : "");
    cbtn.textContent = runningHere ? `⏹ ${fmtElapsed(Date.now() - os.start)}` : "⏱ in";
    cbtn.title = runningHere
      ? `Clock out — running since ${fmtTime(os.start)}. You'll get to adjust the end time (or cancel a misclick).`
      : os ? `Clock in — the ${projName(os.projectId)} timer ends at this same moment. One tap, no double-running.`
           : "Clock in — start the timer for this project";
    cbtn.addEventListener("click", e => {
      e.stopPropagation();
      if (runningHere) openClockOutDialog(os);
      else clockIn(p.id).then(info => {   // D116: silent switch, fully reversible
        pushUndo("clock in",
          async () => { await deleteSession(info.newId); for (const id of info.closedIds) await setSessionEnd(id, null); },
          async () => { for (const id of info.closedIds) await setSessionEnd(id, info.at); await restoreDoc("sessions", info.newId, info.body); });
      });
    });
    const tot = document.createElement("span");
    tot.className = "clock-total";
    const ms = projectClockedMs(p.id, Date.now());
    if (ms > 0) {
      tot.textContent = `Σ ${fmtHoursTotal(ms)}`;
      tot.title = `${S.sessions.filter(s => s.projectId === p.id).length} session(s) logged — next year's ask, off the paper. Click for the time report.`;
      tot.classList.add("clickable");
      tot.addEventListener("click", e => { e.stopPropagation(); openTimeReport(p.id); });   // D120
    }
    const fix = iconBtn("🕰", "Log time by hand — forgot to clock in? Pick start and end; an overlapping running timer gets truncated where this starts.", () => openLogDialog(p));
    // D119 finish (Jake: "the clock icon being alone on its row does not
    // make it smaller — it's the same size it was before the move"). The
    // 🕰 was still a full-size .icon-btn; .clock-btn slims it to match ⏱.
    // And the three controls now live in ONE cluster that right-aligns
    // and wraps as a unit — a narrow card wraps the whole clock, never
    // the 🕰 alone.
    fix.classList.add("clock-btn");
    const cluster = document.createElement("span");
    cluster.className = "clock-cluster";
    cluster.append(cbtn, tot, fix);
    dates.append(cluster);
  }
  card.append(dates);

  const barWrap = document.createElement("div");
  barWrap.className = "progress-wrap";
  barWrap.title = `${prog.done}/${prog.total} stages`;
  const bar = document.createElement("div");
  bar.className = "progress-fill";
  bar.style.width = `${(prog.pct * 100).toFixed(0)}%`;
  bar.style.background = p.color;
  barWrap.append(bar);
  const barLabel = document.createElement("span");
  barLabel.className = "progress-label";
  barLabel.textContent = `${prog.done}/${prog.total}`;
  barWrap.append(barLabel);
  card.append(barWrap);

  if (!expanded) return card;

  const stages = p.stages || [];
  const activeIdx = stages.findIndex(x => !x.completedAt);
  const list = document.createElement("div");
  list.className = "stage-list";
  stages.forEach((sRaw, i) => {
    const st = normalizeStage(sRaw);
    const row = document.createElement("div");
    row.className = "stage-row"
      + (st.completedAt ? " stage-done" : "")
      + (i === activeIdx ? " stage-active" : "");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!st.completedAt;
    cb.addEventListener("change", ev => onStageToggle(p.id, i, cb.checked, ev));
    row.append(cb);

    const label = document.createElement("span");
    label.className = "stage-name";
    label.textContent = st.name;
    row.append(label);

    if (st.direction && st.direction !== "none") {
      const code = `${st.direction === "before" ? "−" : "+"}${st.offsetDays}wd ${st.anchor === "end" ? "end" : "start"}`;
      row.append(badge(code, `${st.offsetDays} working day(s) ${st.direction} project ${st.anchor} (counts this tier's allowed days)`));
    }
    if (st.dueAt) {
      const due = badge(`⏰ ${fmtDay(st.dueAt)}`, "Hard due date — click to change/clear");
      due.classList.add("clickable");
      due.addEventListener("click", () => openDueDialog({ kind: "stage", projectId: p.id, stageIndex: i }, `Hard due date — ${st.name}`, st.dueAt));
      row.append(due);
    } else if (!st.completedAt) {
      const setDue = iconBtn("⏰", "Set a hard due date", () => openDueDialog({ kind: "stage", projectId: p.id, stageIndex: i }, `Hard due date — ${st.name}`, null));
      setDue.classList.add("stage-due-btn");
      row.append(setDue);
    }
    list.append(row);
  });
  card.append(list);
  return card;
}

async function onStageToggle(projectId, stageIndex, done, ev) {
  const result = await setStageDone(projectId, stageIndex, done);
  if (done && result) {
    // D109 — the big hurrah belongs to the stage Katie says it does.
    // Publishing is the party; follow-up is paperwork. A 🎆-marked stage
    // gets level 3 the moment IT completes; the true last stage then gets
    // an ordinary level 2 (the party already happened). A project with no
    // 🎆 anywhere keeps the old rule: finishing everything = level 3.
    const level = result.hurrah ? 3
      : (result.allDone && !result.projectHasHurrah) ? 3
      : 2;
    // D121: the parade banner carries the project's name — the party
    // should say WHOSE party it is.
    const pName = S.projects.find(x => x.id === projectId)?.name;
    celebrate(level, clickPoint(ev), level === 3 && pName ? { name: pName } : undefined);
    // D59: once the fireworks land, offer next year's run.
    if (result.allDone) {
      const p = S.projects.find(x => x.id === projectId);
      if (p) setTimeout(() => openDuplicateModal(p), 2600);
    }
  }
}

// ---------- Duplicate for next year (D59) ----------

/** Same calendar date next year; Feb 29 clamps to Feb 28. */
function plusOneYear(ts) {
  const d = new Date(ts);
  const m = d.getMonth();
  d.setFullYear(d.getFullYear() + 1);
  if (d.getMonth() !== m) d.setDate(0); // rolled over → back to month end
  return d.getTime();
}

function openDuplicateModal(p) {
  if (p.startDate == null) {   // D126 — the 🔁 button is hidden for these; belt and suspenders
    alert("Someday projects don't duplicate for next year — there's no year to bump. Use ✎⋮ for a fresh checklist instead.");
    return;
  }
  const tier = S.tiers.find(t => t.id === p.tierId);
  const allowed = tier?.allowedDays;
  // Shift the window +1 year, then snap onto the tier's working days:
  // start slides FORWARD to the next allowed day, end slides BACK to the
  // previous one (never widening the window), with an order guard.
  let startDate = plusOneYear(p.startDate);
  let endDate = plusOneYear(p.endDate);
  if (!isDayAllowed(startDate, allowed)) startDate = allowedNeighbors(startDate, allowed).next;
  if (!isDayAllowed(endDate, allowed)) endDate = allowedNeighbors(endDate, allowed).prev;
  if (endDate < startDate) endDate = allowedNeighbors(startDate, allowed).next;
  // D62 rev: the stage list is part of the review — copied (and reset)
  // up front so "✎⋮ Review the pipeline first…" can edit it pre-create.
  const stages = (p.stages || []).map(sRaw => {
    const st = normalizeStage(sRaw);
    return {
      name: st.name,
      direction: st.direction || "none",
      anchor: st.anchor || "start",
      offsetDays: st.offsetDays || 0,
      completedAt: null,
      dueAt: null
    };
  });
  S.dupTarget = { projectId: p.id, stages };
  $("#dup-text").textContent =
    `Everything below is pre-filled for next year and editable — double-check before creating. ` +
    `The ${stages.length}-stage pipeline copies over exactly as this project has it (surgery included), ` +
    `checkboxes and hard dues reset; review or reshape it first with ✎⋮ below.`;
  $("#dup-name").value = bumpYearTokens(p.name, new Date(p.startDate).getFullYear(), new Date(startDate).getFullYear());
  $("#dup-start").value = toDateInput(new Date(startDate));
  $("#dup-end").value = toDateInput(new Date(endDate));
  $("#dup-color").value = p.color;
  const taskTiers = S.tiers.filter(t => t.kind !== "anchor");
  $("#dup-tier").innerHTML = taskTiers.map(t =>
    `<option value="${t.id}">${t.rank} — ${esc(t.name)}</option>`).join("");
  $("#dup-tier").value = p.tierId;
  $("#dup-workload").value = String(p.workload || 2);
  $("#dup-modal").hidden = false;
}

/** D62: bump year tokens in a project name — the full year (2026→2027)
 *  and Katie's YYNN codes (resv2606→resv2706, where the first two
 *  digits are the two-digit year of the project's start). */
function bumpYearTokens(name, fromYear, toYear) {
  let out = String(name);
  out = out.replace(new RegExp(`(^|\\D)${fromYear}(?=\\D|$)`, "g"), `$1${toYear}`);
  const fyy = String(fromYear % 100).padStart(2, "0");
  const tyy = String(toYear % 100).padStart(2, "0");
  out = out.replace(new RegExp(`(^|\\D)${fyy}(\\d{2})(?=\\D|$)`, "g"), `$1${tyy}$2`);
  return out;
}

function dupConfirm() {
  const t = S.dupTarget;
  if (!t) { $("#dup-modal").hidden = true; return; }
  const p = S.projects.find(x => x.id === t.projectId);
  if (!p) { S.dupTarget = null; $("#dup-modal").hidden = true; return; }
  const name = $("#dup-name").value.trim() || p.name;
  const startDate = new Date(`${$("#dup-start").value}T00:00`).getTime();
  const endDate = new Date(`${$("#dup-end").value}T00:00`).getTime();
  const tierId = $("#dup-tier").value;
  const workload = parseInt($("#dup-workload").value, 10) || 2;
  if (isNaN(startDate) || isNaN(endDate)) { alert("Both dates are needed."); return; }
  if (endDate < startDate) { alert("Project can't end before it starts. (The octopus checked.)"); return; }
  // Edited dates still respect the chosen tier's working days (D60).
  const tier = S.tiers.find(x => x.id === tierId);
  for (const [label, ts] of [["start", startDate], ["end", endDate]]) {
    if (!isDayAllowed(ts, tier?.allowedDays)) {
      const { prev, next } = allowedNeighbors(ts, tier?.allowedDays);
      alert(`${fmtDay(ts)} is outside ${tier ? tier.name + "'s" : "this tier's"} working days — ` +
        `try ${fmtDay(prev)} or ${fmtDay(next)} for the ${label} date.`);
      return;
    }
  }
  const stages = t.stages || [];
  S.dupTarget = null;
  $("#dup-modal").hidden = true;
  addProjectWithStages({
    name, color: $("#dup-color").value, tierId, workload, startDate, endDate, stages
  }).then(ref => {
    // Open the new card so the pipeline is immediately reviewable
    // (✎⋮ from there for stage surgery — "Excel setup" → five steps).
    if (ref?.id) { S.expandedProjects.add(ref.id); persistExpanded(); }
  });
}

/** D62 rev: edit next year's pipeline BEFORE it exists — borrows the
 *  per-project stages editor against the staged copy ("@dup" target). */
function openDupStages() {
  if (!S.dupTarget) return;
  const p = S.projects.find(x => x.id === S.dupTarget.projectId);
  S.stagesTarget = "@dup";
  S.stagesFromDup = true;
  $("#dup-modal").hidden = true;
  $("#stages-title").textContent = `✎ Stages — next year's ${p ? p.name : "run"}`;
  const box = $("#stage-proj-editor");
  box.innerHTML = "";
  (S.dupTarget.stages || []).forEach(st => projStageRow(st, -1, false));
  $("#stages-modal").hidden = false;
}

/** D62: "too soon after the fireworks" escape hatch — snooze the
 *  duplication decision into a real task 1/7/30 days out. */
function dupSnooze(days) {
  const t = S.dupTarget;
  S.dupTarget = null;
  $("#dup-modal").hidden = true;
  if (!t) return;
  const p = S.projects.find(x => x.id === t.projectId);
  if (!p) return;
  const tier = S.tiers.find(x => x.id === p.tierId);
  let due = Date.now() + days * DAY_MS;
  if (!isDayAllowed(due, tier?.allowedDays)) due = allowedNeighbors(due, tier?.allowedDays).next;
  const d = new Date(due); d.setHours(9, 0, 0, 0);
  addTask({
    title: `🔁 Set up next year's "${p.name}"?`,
    tierId: p.tierId,
    dueAt: d.getTime(),
    escalation: { every: 1, unit: "days" }
  });
}

function badge(text, title) {
  const b = document.createElement("span");
  b.className = "stage-badge";
  b.textContent = text;
  b.title = title || "";
  return b;
}

function clickPoint(ev) {
  if (ev && ev.target) {
    const r = ev.target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return {};
}

// ---------- Due-date dialog ----------

function openDueDialog(target, label, existingDueAt) {
  // D84: target = {kind:"stage", projectId, stageIndex} | {kind:"task", taskId}
  S.dueTarget = target;
  $("#due-title").textContent = label;
  if (existingDueAt) {
    const d = new Date(existingDueAt);
    $("#due-date").value = toDateInput(d);
    $("#due-time").value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } else {
    $("#due-date").value = "";
    $("#due-time").value = "17:00";
  }
  $("#due-clear").hidden = !existingDueAt;
  $("#due-modal").hidden = false;
}

function dueSave() {
  const date = $("#due-date").value;
  if (!date || !S.dueTarget) { $("#due-modal").hidden = true; return; }
  const time = $("#due-time").value || "17:00";
  const ts = new Date(`${date}T${time}`).getTime();
  pushDueUndo(ts);   // D116
  if (S.dueTarget.kind === "task") updateTask(S.dueTarget.taskId, { dueAt: ts });
  else setStageDue(S.dueTarget.projectId, S.dueTarget.stageIndex, ts);
  $("#due-modal").hidden = true;
}

/** D116 — one capture for save AND clear: both are "the due changed". */
function pushDueUndo(after) {
  const tgt = S.dueTarget;
  if (!tgt) return;
  if (tgt.kind === "task") {
    const before = S.tasks.find(t => t.id === tgt.taskId)?.dueAt ?? null;
    if (before === after) return;
    pushUndo("due change", () => updateTask(tgt.taskId, { dueAt: before }), () => updateTask(tgt.taskId, { dueAt: after }));
  } else {
    const before = S.projects.find(p => p.id === tgt.projectId)?.stages?.[tgt.stageIndex]?.dueAt ?? null;
    if (before === after) return;
    pushUndo("stage due change",
      () => setStageDue(tgt.projectId, tgt.stageIndex, before),
      () => setStageDue(tgt.projectId, tgt.stageIndex, after));
  }
}

function dueClear() {
  pushDueUndo(null);   // D116
  if (S.dueTarget?.kind === "task") updateTask(S.dueTarget.taskId, { dueAt: null }); // → Waiting
  else if (S.dueTarget) setStageDue(S.dueTarget.projectId, S.dueTarget.stageIndex, null);
  $("#due-modal").hidden = true;
}

// ---------- Per-project stage surgery (D42) ----------

function openStagesDialog(p) {
  S.stagesTarget = p.id;
  $("#stages-title").textContent = `✎ Stages — ${p.name}`;
  const box = $("#stage-proj-editor");
  box.innerHTML = "";
  (p.stages || []).forEach((st, i) => projStageRow(normalizeStage(st), i, false));
  $("#stages-modal").hidden = false;
  markClean("stages", stagesSignature);   // D129
}

function timingSelects(st) {
  const dir = st.direction || "none";
  const undated = dir === "none";
  return `
    <select class="st-dir" title="No date: this stage is pipeline weight — it just has to happen before the next dated thing. Before/After: this stage has a real target date.">
      <option value="none" ${undated ? "selected" : ""}>No date</option>
      <option value="before" ${dir === "before" ? "selected" : ""}>Before</option>
      <option value="after" ${dir === "after" ? "selected" : ""}>After</option>
    </select>
    <select class="st-anchor${undated ? " st-ghost" : ""}" title="Counted from project start or project end">
      <option value="start" ${st.anchor !== "end" ? "selected" : ""}>start</option>
      <option value="end" ${st.anchor === "end" ? "selected" : ""}>end</option>
    </select>
    <label class="st-off-label${undated ? " st-ghost" : ""}" title="Working-day offset — this tier's off days never count."><input class="st-off" type="number" min="0" value="${st.offsetDays || 0}">wd</label>`;
}

function syncTimingRow(row) {
  // st-ghost (visibility) keeps the columns aligned across dated and
  // undated rows — display:none let the name field swallow the space.
  const undated = row.querySelector(".st-dir").value === "none";
  row.querySelector(".st-anchor").classList.toggle("st-ghost", undated);
  row.querySelector(".st-off-label").classList.toggle("st-ghost", undated);
}

function projStageRow(st, origIndex, isNew) {
  const box = $("#stage-proj-editor");
  const row = document.createElement("div");
  row.className = "stage-tmpl-row" + (st.completedAt ? " proj-stage-done" : "");
  row.dataset.orig = String(origIndex);
  row.innerHTML = `
    <span class="st-move"><button type="button" class="st-up" title="Move up">▲</button><button type="button" class="st-down" title="Move down">▼</button></span>
    <input class="st-name" type="text" value="${esc(st.name || "")}" placeholder="Stage name">
    ${timingSelects(st)}
    <span class="st-flags">${st.completedAt ? "✓" : ""}${st.dueAt ? " ⏰" : ""}</span>
    <button type="button" class="st-hurrah${st.hurrah ? " active" : ""}" title="The big hurrah 🎆 — the full fireworks land when THIS stage completes, even if follow-ups remain. One per project; if none is marked, finishing the last stage keeps the honor.">🎆</button>
    <button type="button" class="st-del" title="Remove stage from this project">✕</button>`;
  wireTmplRow(row, box);
  box.append(row);
  if (isNew) row.querySelector(".st-name").focus();
}

function stagesSave() {
  if (S.stagesTarget === "@dup") {
    // D62 rev: collect into the staged copy — nothing writes until
    // "Create next year's run"; checkboxes/dues stay reset by design.
    if (S.dupTarget) {
      S.dupTarget.stages = [...document.querySelectorAll("#stage-proj-editor .stage-tmpl-row")].map(row => ({
        name: row.querySelector(".st-name").value.trim() || "Untitled stage",
        direction: row.querySelector(".st-dir").value,
        anchor: row.querySelector(".st-anchor").value,
        offsetDays: clampInt(row.querySelector(".st-off").value, 0, 365, 0),
        completedAt: null,
        dueAt: null,
        ...(row.querySelector(".st-hurrah").classList.contains("active") ? { hurrah: true } : {})  // D109: checkmarks reset, the honor doesn't
      }));
      $("#dup-text").textContent = $("#dup-text").textContent.replace(/The \d+-stage pipeline/, `The ${S.dupTarget.stages.length}-stage pipeline`);
    }
    S.stagesTarget = null;
    S.stagesFromDup = false;
    $("#stages-modal").hidden = true;
    $("#dup-modal").hidden = false;
    return;
  }
  const p = S.projects.find(x => x.id === S.stagesTarget);
  if (!p) { $("#stages-modal").hidden = true; return; }
  const orig = p.stages || [];
  const stages = [...document.querySelectorAll("#stage-proj-editor .stage-tmpl-row")].map(row => {
    const oi = parseInt(row.dataset.orig, 10);
    const carried = (oi >= 0 && orig[oi]) ? orig[oi] : { completedAt: null, dueAt: null };
    return {
      name: row.querySelector(".st-name").value.trim() || "Untitled stage",
      direction: row.querySelector(".st-dir").value,
      anchor: row.querySelector(".st-anchor").value,
      offsetDays: clampInt(row.querySelector(".st-off").value, 0, 365, 0),
      completedAt: carried.completedAt ?? null,
      dueAt: carried.dueAt ?? null,
      ...(row.querySelector(".st-hurrah").classList.contains("active") ? { hurrah: true } : {})  // D109: the editor OWNS this flag (button state, not carried)
    };
  });
  {
    // D116 — the whole array swaps; before/after are both in hand
    const pid = S.stagesTarget;
    const before = structuredClone(S.projects.find(p => p.id === pid)?.stages || []);
    const after = structuredClone(stages);
    pushUndo("stages edit", () => setProjectStages(pid, before), () => setProjectStages(pid, after));
  }
  setProjectStages(S.stagesTarget, stages);
  delete dirtySnapshots["stages"];   // D129 — saved, so no longer dirty
  $("#stages-modal").hidden = true;
}

// ---------- Overdue decision modal (D46) ----------

function decisionKey() {
  const d = new Date();
  return `tc-decision-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/** Items ≥ threshold days past deadline in visible tiers, right now. */
function staleItems() {
  const now = Date.now();
  const threshold = (S.config?.decisionThresholdDays ?? 2) * DAY_MS; // D52
  const q = buildQueue({
    tasks: S.tasks, events: S.events, tiers: S.tiers, projects: S.projects,
    now, viewDay: now, hiddenTierIds: S.hiddenTierIds
  });
  return q.items.filter(it =>
    it.expired && (now - (it.kind === "stage" ? it.deadline : it.originalDue)) >= threshold);
}

/** One project = one modal row across its whole lifetime in the modal,
 *  however many stages it burns through while it's open. */
function decisionItemKey(it) {
  return it.kind === "stage" ? `proj:${it.projectId}` : `task:${it.id}`;
}

function maybeDecisionTime() {
  if (!S.user || S.decisionIds) return;           // already open
  if (localStorage.getItem(decisionKey())) return; // today's shot is spent
  const stale = staleItems();
  if (!stale.length) return;
  localStorage.setItem(decisionKey(), "1"); // once per day per device
  S.decisionIds = new Set(stale.map(decisionItemKey));
  renderDecision();
  $("#decision-modal").hidden = false;
}

function closeDecision() {
  S.decisionIds = null;
  $("#decision-modal").hidden = true;
}

/** D57: the modal is a live view. Every render re-derives its rows from
 *  current state, so ✓ and 🕐 visibly resolve items, a project row
 *  advances to its next stage instead of lying, and the modal closes
 *  itself once everything is dealt with. */
function renderDecision() {
  if (!S.decisionIds) return;
  const current = staleItems().filter(it => S.decisionIds.has(decisionItemKey(it)));
  if (!current.length) { closeDecision(); return; }
  const now = Date.now();
  const list = $("#decision-list");
  list.innerHTML = "";
  for (const it of current) {
    const overdueSince = it.kind === "stage" ? it.deadline : it.originalDue;
    const days = Math.floor((now - overdueSince) / DAY_MS);
    const row = document.createElement("div");
    row.className = "row decision-row";
    // D60: reschedule lands on the tier's next ALLOWED day — a weekend
    // check is unnecessary by construction (disallowed days are skipped).
    const target = (() => {
      const t = addAllowedDays(now, 1, it.tier?.allowedDays);
      const d = new Date(t); d.setHours(9, 0, 0, 0); return d.getTime();
    })();
    // D83: say the plan out loud — tooltips don't exist on phones.
    const plan = ` · 🕐 → ${fmtDay(target)} 9 AM`;
    const main = document.createElement("div");
    main.className = "row-main";
    if (it.kind === "stage") {
      // Show the ACTIVE stage (what ✓ completes); name the overdue
      // deadline separately when it's a different, later stage.
      const dl = it.deadlineStageIndex !== it.stageIndex
        ? ` · deadline: ${esc(it.deadlineStageName)}` : "";
      main.innerHTML = `<strong>${esc(it.projectName)}: ${esc(it.title)}</strong>` +
        `<span class="sub">${days} day${days === 1 ? "" : "s"} overdue${dl}${plan}</span>`;
    } else {
      main.innerHTML = `<strong>${esc(it.title)}</strong>` +
        `<span class="sub">${days} day${days === 1 ? "" : "s"} overdue${plan}</span>`;
    }
    row.append(main);
    row.append(
      iconBtn("✓", it.kind === "stage" ? `Mark "${it.title}" done` : "Mark it done", ev => {
        if (it.kind === "stage") onStageToggle(it.projectId, it.stageIndex, true, ev);
        else { setTaskDone(it.id, true); celebrate(1, clickPoint(ev)); }
      }),
      iconBtn("🕐", `Reschedule to ${fmtDay(target)} 9:00 AM`, () => {
        if (it.kind === "stage") setStageDue(it.projectId, it.deadlineStageIndex, target);
        else updateTask(it.id, { dueAt: target });
      }),
      iconBtn("📅", "Pick a date — kick it way down the road", () => {  // D84
        if (it.kind === "stage") {
          openDueDialog({ kind: "stage", projectId: it.projectId, stageIndex: it.deadlineStageIndex },
            `Reschedule — ${it.deadlineStageName}`, it.deadline);
        } else {
          openDueDialog({ kind: "task", taskId: it.id }, `Reschedule — ${it.title}`, it.originalDue);
        }
      })
    );
    list.append(row);
  }
}

// ---------- Task form (create + edit) ----------

function refreshTierSelects() {
  const taskTiers = S.tiers.filter(t => t.kind !== "anchor"); // rank-sorted upstream
  const taskOpts = taskTiers.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
  const projOpts = taskTiers.map(t => `<option value="${t.id}">${t.rank} — ${esc(t.name)}</option>`).join("");
  const keep1 = $("#task-tier").value, keep2 = $("#project-tier").value;
  $("#task-tier").innerHTML = taskOpts;
  $("#project-tier").innerHTML = projOpts;
  if (keep1 && taskTiers.some(t => t.id === keep1)) $("#task-tier").value = keep1;
  if (keep2 && taskTiers.some(t => t.id === keep2)) {
    $("#project-tier").value = keep2;
  } else {
    const work = taskTiers.find(t => t.name.toLowerCase() === "work");
    if (work) $("#project-tier").value = work.id;
  }
  refreshTypeSelect();   // D124 — keep the project-type picker in sync
  syncProjectDateRequirement();   // D126
}

// D124 — the project-type picker on the new-project form: Default + each
// named type. Preserves the current selection across refreshes.
// D128 — plus a built-in "Blank (no stages)" via the __blank__ sentinel:
// a project that copies NO pipeline, for the things that match no template
// (Jake's tub — refurbishing a bathtub has no "engagement letter"). Also
// the natural home for someday/want-to projects, which shouldn't inherit
// Katie's actuarial stages at all. Sentinel, not a real stored type, so it
// can't be renamed or deleted and always sits in the list.
function refreshTypeSelect() {
  const sel = $("#project-type");
  if (!sel) return;
  const keep = sel.value;
  sel.innerHTML = `<option value="">Default template</option>` +
    `<option value="__blank__">Blank (no stages)</option>` +
    (S.projectTypes || []).map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
  sel.value = (keep === "__blank__" || (keep && (S.projectTypes || []).some(t => t.id === keep))) ? keep : "";
}

/** D124 — copy a pipeline's stages into a fresh project's stage array:
 *  carry name/direction/anchor/offsetDays/hurrah, reset completedAt/dueAt.
 *  Mirrors store.addProject's snapshot (incl. the legacy phase fallback). */
function stagesFromPipeline(stages) {
  const legacy = { before: ["before", "start"], during: ["after", "start"], after: ["after", "end"] };
  return (stages || []).map(s => {
    const [dir, anc] = s.direction && s.anchor ? [s.direction, s.anchor] : (legacy[s.phase] || legacy.during);
    return {
      name: s.name, direction: dir, anchor: anc, offsetDays: s.offsetDays || 0,
      completedAt: null, dueAt: null,
      ...(s.hurrah ? { hurrah: true } : {})
    };
  });
}

function startTaskEdit(task) {
  S.editingTaskId = task.id;
  // D132 — the chain builder is a CREATE-time tool. Editing an existing
  // task uses ↳ (which can already target it), so the builder hides and
  // drops anything half-typed rather than silently attaching new
  // follow-ups to a task that's only being renamed.
  clearChainRows();
  const chainBlock = $("#fu-chain-block"); if (chainBlock) chainBlock.hidden = true;
  $("#task-form-title").textContent = "✎ Edit task";
  $("#task-submit").textContent = "Save changes";
  $("#task-cancel").hidden = false;
  $("#task-title").value = task.title;
  $("#task-notes").value = task.notes || "";
  $("#task-tier").value = task.tierId;
  const d = new Date(task.dueAt);
  $("#task-date").value = toDateInput(d);
  $("#task-time").value = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  $("#task-esc-n").value = task.escalation?.every ?? 1;
  $("#task-esc-unit").value = task.escalation?.unit ?? "hours";
  $("#task-estimate").value = taskEstimate(task) ?? "";   // D100 — blank stays blank
  $("#task-rec-n").value = task.recurrence?.every ?? "";               // D111 — blank stays blank here too
  $("#task-rec-unit").value = task.recurrence?.unit ?? "weeks";
  $("#task-rec-anchor").value = task.recurrence?.anchor ?? "done";
  $("#task-title").focus();
}

function cancelTaskEdit() {
  S.editingTaskId = null;
  $("#task-form-title").textContent = "New task";
  $("#task-submit").textContent = "Add to the tentacles";
  $("#task-cancel").hidden = true;
  // D132 — form.reset() only restores DECLARED inputs; the chain rows are
  // JS-built children and would survive a reset untouched. Clear them by
  // hand, and un-hide the block we hid on the way into edit mode.
  clearChainRows();
  const chainBlock = $("#fu-chain-block"); if (chainBlock) chainBlock.hidden = false;
  $("#task-form").reset();
  $("#task-time").value = "09:00";
  $("#task-esc-n").value = 1;
  $("#task-estimate").value = "";
}

function onTaskFormSubmit(ev) {
  ev.preventDefault();
  const title = $("#task-title").value.trim();
  const tierId = $("#task-tier").value;
  const date = $("#task-date").value;
  const time = $("#task-time").value || "09:00";
  const every = parseInt($("#task-esc-n").value, 10) || 1;
  const unit = $("#task-esc-unit").value;
  if (!title || !tierId || !date) return;
  const dueAt = new Date(`${date}T${time}`).getTime();
  // D100 — blank means "she never said". Don't turn silence into a number.
  const estRaw = $("#task-estimate").value.trim();
  const estimateMinutes = estRaw === "" ? null
    : Math.min(MAX_ESTIMATE_MINUTES, Math.max(MIN_ESTIMATE_MINUTES, parseInt(estRaw, 10) || 0)) || null;
  // D111 — blank repeat-N means "not recurring". Silence isn't a number.
  const recN = parseInt($("#task-rec-n").value, 10);
  const recurrence = recN >= 1
    ? { every: Math.min(999, recN), unit: $("#task-rec-unit").value, anchor: $("#task-rec-anchor").value }
    : null;
  const payload = { title, tierId, dueAt, escalation: { every, unit }, notes: $("#task-notes").value.trim(), estimateMinutes, recurrence };
  if (S.editingTaskId) {
    // D116 — capture before/after over exactly the payload's keys
    const id = S.editingTaskId;
    const cur = S.tasks.find(t => t.id === id);
    if (cur) {
      const before = structuredClone(Object.fromEntries(Object.keys(payload).map(k => [k, cur[k] ?? null])));
      const after = structuredClone(payload);
      pushUndo("task edit", () => updateTask(id, before), () => updateTask(id, after));
    }
    updateTask(id, payload).then(cancelTaskEdit);
  }
  else {
    // D132 — read the chain BEFORE the await; the form is cleared on the
    // way out and reading it afterwards would find an empty builder.
    const chain = readChainRows();
    addTask(payload)
      .then(ref => chain.length ? createFollowUpChain(ref.id, chain, tierId) : null)
      .then(() => {
        $("#task-title").value = ""; $("#task-notes").value = ""; $("#task-estimate").value = "";
        clearChainRows();
      });
  }
}

// ---------- Project form (create + edit) + weekend interception (D45) ----------

/** D126 — the date row's visibility/required-ness follows whichever tier
 *  is currently selected, live. Timeless tier picked → dates hide and stop
 *  being required (and any typed-in values are cleared, so a stale date
 *  can't sneak through unseen); any other tier → dates return required.
 *  Called on tier <select> change AND whenever the form is (re)opened, so
 *  new-project, edit, and the year-view's reparented copy all agree. */
function syncProjectDateRequirement() {
  const tier = S.tiers.find(t => t.id === $("#project-tier").value);
  const timeless = !!tier?.timeless;
  const row = $("#project-dates-row");
  if (row) row.hidden = timeless;
  $("#project-start").required = !timeless;
  $("#project-end").required = !timeless;
  if (timeless) { $("#project-start").value = ""; $("#project-end").value = ""; }
}

function startProjectEdit(p) {
  // D131 — clicking ✎ (on this project or a different one) replaces
  // whatever's in the form. If that content is unsaved and dirty, confirm
  // before blowing it away. guardedClose returns false → keep what's there.
  if (!guardedClose("projectForm", projectFormSignature)) return;
  S.editingProjectId = p.id;
  $("#project-form-title").textContent = "✎ Edit project";
  $("#project-submit").textContent = "Save changes";
  $("#project-cancel").hidden = false;
  $("#project-name").value = p.name;
  $("#project-color").value = p.color;
  $("#project-tier").value = p.tierId;
  $("#project-workload").value = String(p.workload || 2);
  // D126 — a want-to has no dates to prefill; new Date(null) would show
  // the epoch, which is a lie dressed as a date.
  $("#project-start").value = p.startDate != null ? toDateInput(new Date(p.startDate)) : "";
  $("#project-end").value = p.endDate != null ? toDateInput(new Date(p.endDate)) : "";
  syncProjectDateRequirement();
  const tl = $("#project-type-label"); if (tl) tl.hidden = true;   // D124 — editing keeps the project's own stages
  checkProjectColor();
  $("#project-name").focus();
  markClean("projectForm", projectFormSignature);   // D131 — this populated edit form is the clean baseline
}

function cancelProjectEdit(opts = {}) {
  // D131 — the Cancel button abandons an in-progress edit. Guard it unless
  // called internally post-save (opts.saved), where there's nothing to lose.
  if (!opts.saved && !guardedClose("projectForm", projectFormSignature)) return false;
  S.editingProjectId = null;
  $("#project-form-title").textContent = "New project";
  $("#project-submit").textContent = "Launch pipeline";
  $("#project-cancel").hidden = true;
  $("#project-form").reset();
  $("#project-workload").value = "2";
  syncProjectDateRequirement();   // D126 — .reset() can land back on a timeless tier's default
  const tl = $("#project-type-label"); if (tl) tl.hidden = false;   // D124 — new projects choose a pipeline again
  suggestProjectColor(true);
  $("#project-color-hint").textContent = "";
  markClean("projectForm", projectFormSignature);   // D131 — the empty new-project form is clean
  return true;
}

function onProjectFormSubmit(ev) {
  ev.preventDefault();
  const name = $("#project-name").value.trim();
  const color = $("#project-color").value;
  const tierId = $("#project-tier").value;
  const workload = parseInt($("#project-workload").value, 10) || 2;
  const tier = S.tiers.find(t => t.id === tierId);
  const timeless = !!tier?.timeless;   // D126
  const start = $("#project-start").value;
  const end = $("#project-end").value;
  if (!name || !tierId) return;
  if (!timeless && (!start || !end)) return;
  const payload = {
    name, color, tierId, workload,
    startDate: timeless ? null : new Date(`${start}T00:00`).getTime(),
    endDate: timeless ? null : new Date(`${end}T00:00`).getTime()
  };
  if (!timeless && payload.endDate < payload.startDate) {
    alert("Project can't end before it starts. (The octopus checked.)");
    return;
  }
  // D126 — a timeless project has no weekend to intercept; skip straight
  // to commit. validateWeekends assumes a real date in the field it checks.
  if (timeless) { commitProject(payload); return; }
  validateWeekends(payload, "startDate");
}

/** D45→D60: project start/end should land on the tier's ALLOWED days —
 *  everything else is computed from them. A tier that allows all seven
 *  days (e.g. Personal) never triggers this modal. Checks fields one at
 *  a time via the interception modal. */
function validateWeekends(payload, field) {
  if (field === null) { commitProject(payload); return; }
  const next = field === "startDate" ? "endDate" : null;
  const tier = S.tiers.find(t => t.id === payload.tierId);
  const allowed = tier?.allowedDays;
  if (isDayAllowed(payload[field], allowed)) { validateWeekends(payload, next); return; }
  const { prev, next: after } = allowedNeighbors(payload[field], allowed);
  S.weekendPending = { payload, field, next, fri: prev, mon: after };
  const which = field === "startDate" ? "start" : "end";
  const dow = new Date(payload[field]).toLocaleDateString([], { weekday: "long" });
  $("#weekend-text").textContent =
    `${fmtDay(payload[field])} is a ${dow} — that's outside ${tier ? `the ${tier.name} tier's` : "this tier's"} working days, ` +
    `and pipeline math only counts those. Keep it as the project ${which} date anyway?`;
  $("#weekend-fri").textContent = `No — ${fmtDay(prev)}`;
  $("#weekend-mon").textContent = `No — ${fmtDay(after)}`;
  $("#weekend-modal").hidden = false;
}

function weekendChoice(choice) {
  const w = S.weekendPending;
  $("#weekend-modal").hidden = true;
  if (!w) return;
  S.weekendPending = null;
  if (choice === "back") return;
  if (choice === "fri") w.payload[w.field] = w.fri;
  if (choice === "mon") w.payload[w.field] = w.mon;
  // "yes" keeps the weekend date as chosen
  if (w.field === "startDate") $("#project-start").value = toDateInput(new Date(w.payload.startDate));
  else $("#project-end").value = toDateInput(new Date(w.payload.endDate));
  validateWeekends(w.payload, w.next);
}
document.addEventListener("DOMContentLoaded", () => {
  $("#weekend-yes").addEventListener("click", () => weekendChoice("yes"));
  $("#weekend-fri").addEventListener("click", () => weekendChoice("fri"));
  $("#weekend-mon").addEventListener("click", () => weekendChoice("mon"));
  $("#weekend-back").addEventListener("click", () => weekendChoice("back"));
});

function commitProject(payload) {
  if (S.editingProjectId) {
    // D116 — capture before/after over the payload's keys
    const id = S.editingProjectId;
    const cur = S.projects.find(p => p.id === id);
    if (cur) {
      const before = structuredClone(Object.fromEntries(Object.keys(payload).map(k => [k, cur[k] ?? null])));
      const after = structuredClone(payload);
      pushUndo("project edit", () => updateProject(id, before), () => updateProject(id, after));
    }
  }
  if (S.editingProjectId) updateProject(S.editingProjectId, payload).then(() => { cancelProjectEdit({ saved: true }); closeYvProjectModal(); });
  else {
    // D124 — snapshot the CHOSEN pipeline. Default (empty value) keeps the
    // old addProject path (which reads stageTemplate); a named type copies
    // its own stages via the existing addProjectWithStages.
    // D128 — __blank__ sentinel: a project with NO stages at all. Routes
    // through addProjectWithStages with [] so it takes the explicit-stages
    // path and never touches the stageTemplate default.
    const typeId = $("#project-type") ? $("#project-type").value : "";
    const type = (typeId && typeId !== "__blank__") ? (S.projectTypes || []).find(t => t.id === typeId) : null;
    const done = () => {
      $("#project-name").value = ""; suggestProjectColor(true);
      if ($("#project-type")) $("#project-type").value = "";
      markClean("projectForm", projectFormSignature);   // D131 — launched; form is clean again
      closeYvProjectModal();
    };
    (typeId === "__blank__"
      ? addProjectWithStages({ ...payload, stages: [] })
      : type
        ? addProjectWithStages({ ...payload, stages: stagesFromPipeline(type.stages) })
        : addProject(payload)   // D68: new bar appears behind the closing modal
    ).then(done);
  }
}

// ---------- Color conflict assistant (D40) ----------

const COLOR_POOL = [
  "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc",
  "#f783ac", "#63e6be", "#e599f7", "#ff9f43", "#54a0ff", "#00d2d3",
  "#feca57", "#5f27cd", "#48dbfb", "#1dd1a1"
];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
// ---------- D65: Year view (Phase 2) ----------
// Quarter-aligned 4 rows × 3 months (D31: calendar / quarter-first /
// month-first anchors), D30a ghost bars saturating left-to-right by
// pipeline %, D32 drag-to-move + edge-drag-to-stretch, D18 month zoom,
// D27 legend + tap details. Bars are %-positioned inside each row, so
// one renderer serves the year grid AND the zoomed single month.

let yvTapSquelch = false; // a completed drag must not fire the tap popover
let yvDragging = false;

/**
 * D96 — ONE fullscreen toggle for all three views. Today had no ⛶ at all;
 * week and year each carried their own copy, which is exactly how the
 * third one never got written.
 *
 * The webkit* fallbacks aren't decoration — the target is an OLD Android
 * tablet. The year view's copy called `requestFullscreen()` unguarded,
 * which THROWS a TypeError where the unprefixed API doesn't exist; the
 * week's used `?.()`, which fails SILENTLY — the worst outcome for a
 * button whose whole job is to visibly do something. Try prefixed, and
 * say so in the console if the browser refuses.
 */
function toggleFullscreen() {
  const el = document.documentElement;
  const on = document.fullscreenElement || document.webkitFullscreenElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  try {
    if (on) { if (exit) exit.call(document); return; }
    if (!req) { console.warn("No Fullscreen API here — try Add to Home Screen, or Android screen pinning."); return; }
    const r = req.call(el);
    if (r && r.catch) r.catch(e => console.warn("fullscreen refused:", e));
  } catch (e) {
    console.warn("fullscreen refused:", e);
  }
}

function startOfDayTs(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

function setView(v) {
  // D105 — the dashboard is a big-glass creature (Jake: "a 4K beast of a
  // screen"; his tablet: "unlikely"). A device that persisted "dash" and
  // wakes up narrow falls back to Today rather than rendering a postage-
  // stamp kiosk. 1200 matches the CSS that hides the button.
  if (v === "dash" && window.innerWidth < 1200) v = "day";
  // D110 — assembly state comes from the DOM (dashHomes), NOT from S.view.
  // At boot S.view is ALREADY "dash" from localStorage, so a flag-based
  // wasDash skipped enterDash(): flags flipped, panes stayed empty, and
  // the unhidden week-view (first in flow) showed under a lit 🐙 button.
  // Measurement beats model — the codebase's own maxim, applied to itself.
  const assembled = dashHomes.length > 0;
  S.view = v;
  localStorage.setItem("tc-view", v);
  if (assembled && v !== "dash") exitDash();   // every panel goes HOME before the flags flip
  $("main").hidden = v !== "day";            // D35's [hidden]!important beats main's display:grid
  $("#week-view").hidden = v !== "week" && v !== "dash";     // D88 · D105: visible inside its pane
  $("#year-view").hidden = v !== "year" && v !== "dash";
  $("#dashboard-view").hidden = v !== "dash";                // D105
  $("#hdr-fullscreen").hidden = v !== "dash";                // D108: the header carries the dashboard's ⛶
  for (const b of document.querySelectorAll("#view-switch button")) {
    b.classList.toggle("active", b.dataset.view === v);   // D89
  }
  if (v === "dash" && !assembled) enterDash();   // D110: idempotent by construction
  if (v === "year") renderYear();
  if (v === "week") renderWeek();
  if (v === "dash") render();   // render()'s tail fans out to the week and the year
  pokeIdle();           // D107 — the idle timer and the rest overlay are
  updateScreenRest();   // dashboard-only; leaving the view clears both
}

// ---------- D105: THE DASHBOARD (Phase 4 — this is 1.0) ----------
// One wall, all of it: year LEFT, week TOP-RIGHT, agenda BOTTOM-RIGHT
// (with a 🗂 toggle that splits it agenda + project pipeline two-up;
// adding projects stays on the other screens — Jake's call, this is the
// glance wall). NOTHING here is a copy: entering the dashboard REPARENTS
// the real #year-view / #week-view / #queue-panel into the panes — the
// D68 modal trick at kiosk scale. Elements MOVE, listeners ride along,
// and a comment marker holds each one's seat at home, so leaving puts
// every panel back exactly where it came from. Clone nothing and there
// is no second copy to drift (D98).
const dashHomes = [];
function dashMove(el, pane) {
  const marker = document.createComment("dash-home");
  el.parentNode.insertBefore(marker, el);
  dashHomes.push({ el, marker });
  pane.appendChild(el);
}
function dashRestoreAll() {
  while (dashHomes.length) {
    const h = dashHomes.pop();
    h.marker.parentNode.insertBefore(h.el, h.marker);   // markers never moved — exact seats, any order
    h.marker.remove();
  }
}
let dashProjHome = null;
function dashProjectsIn() {
  if (dashProjHome) return;
  const el = $("#projects-panel");
  const marker = document.createComment("dash-home-proj");
  el.parentNode.insertBefore(marker, el);
  dashProjHome = { el, marker };
  $("#dash-bottom").appendChild(el);
}
function dashProjectsOut() {
  if (!dashProjHome) return;
  dashProjHome.marker.parentNode.insertBefore(dashProjHome.el, dashProjHome.marker);
  dashProjHome.marker.remove();
  dashProjHome = null;
}
function enterDash() {
  dashMove($("#year-view"), $("#dash-left"));
  dashMove($("#week-view"), $("#dash-week"));
  dashMove($("#queue-panel"), $("#dash-bottom"));
  if (S.dashProjects) dashProjectsIn();
  $("#dash-projects-toggle").classList.toggle("active", S.dashProjects);
  applyDashShares();
  fitDashHeight();
}
function exitDash() {
  dashProjectsOut();
  dashRestoreAll();
}
function applyDashShares() {
  const d = $("#dashboard-view");
  d.style.setProperty("--dash-cols", S.dashCols + "%");
  d.style.setProperty("--dash-rows", S.dashRows + "%");
}
/** D91's fitWeekHeight, for the whole wall: the dashboard must FIT the
 *  glass, because its panes divide whatever it has. */
function fitDashHeight() {
  const sec = $("#dashboard-view");
  if (!sec || sec.hidden) return;
  const top = sec.getBoundingClientRect().top + window.scrollY;
  sec.style.height = Math.max(400, window.innerHeight - top - 8) + "px";
}
function wireDashboard() {
  const dash = $("#dashboard-view");
  if (!dash || dash.dataset.wired) return;
  dash.dataset.wired = "1";
  // The pane BOUNDARY follows the pointer live (a CSS-var flip per move —
  // flex-basis can both grow and shrink, so the wv-split deadness cannot
  // happen here); the pane CONTENTS refit on release, because re-solving
  // three views per pointermove is not a 60fps job. Divider drags take
  // the D101 gesture lock: a snapshot mid-drag defers, never drops.
  function wireSplit(bar, axis) {
    let dragging = false;
    bar.addEventListener("pointerdown", e => {
      if (dragging) return;   // D110: a second pointer mid-drag must not double beginGesture (stop() only ends once)
      dragging = true; bar.setPointerCapture(e.pointerId); bar.classList.add("dragging");
      beginGesture();   // D101
      e.preventDefault();
    });
    bar.addEventListener("pointermove", e => {
      if (!dragging) return;
      if (axis === "x") {
        const r = dash.getBoundingClientRect();
        S.dashCols = Math.max(20, Math.min(80, ((e.clientX - r.left) / (r.width || 1)) * 100));
      } else {
        const r = $("#dash-right").getBoundingClientRect();
        S.dashRows = Math.max(20, Math.min(80, ((e.clientY - r.top) / (r.height || 1)) * 100));
      }
      applyDashShares();
    });
    const stop = () => {
      if (!dragging) return;
      dragging = false; bar.classList.remove("dragging");
      localStorage.setItem("tc-dash-cols", String(Math.round(S.dashCols)));
      localStorage.setItem("tc-dash-rows", String(Math.round(S.dashRows)));
      endGesture();     // D101 — LAST of the drag; flushes any deferred snapshot
      render();         // every pane refits its new share
    };
    bar.addEventListener("pointerup", stop);
    bar.addEventListener("pointercancel", stop);
    bar.addEventListener("dblclick", () => {
      S.dashCols = 50; S.dashRows = 55;
      localStorage.setItem("tc-dash-cols", "50");
      localStorage.setItem("tc-dash-rows", "55");
      applyDashShares(); render();
    });
  }
  wireSplit($("#dash-vsplit"), "x");
  wireSplit($("#dash-hsplit"), "y");
  $("#dash-projects-toggle").addEventListener("click", () => {
    S.dashProjects = !S.dashProjects;
    localStorage.setItem("tc-dash-projects", S.dashProjects ? "1" : "0");
    $("#dash-projects-toggle").classList.toggle("active", S.dashProjects);
    if (S.view === "dash") { if (S.dashProjects) dashProjectsIn(); else dashProjectsOut(); render(); }
  });
  let dashResizeT = null;
  window.addEventListener("resize", () => {
    if (S.view !== "dash") return;
    if (window.innerWidth < 1200) { setView("day"); return; }   // the tablet rule, live
    clearTimeout(dashResizeT);
    dashResizeT = setTimeout(() => { if (S.view === "dash") render(); }, 150);
  });
}

// ---------- D88: THE WEEK ----------
// Seven queue columns, not a clock. A task due at 4 PM is a DEADLINE, not
// a 4 PM appointment — and every computed stage deadline lands at
// deadlineHour, so a time grid would paint a wall of fake 4 PM collisions.
// Spans live up top (projects + all-day), dated things live in columns.
// Sized for a 55" 4K wall: ~137px columns, big type, nothing hover-only.

/**
 * D90 — "back to now" belongs on the side it TAKES you. You're in the
 * future, so going back is a move LEFT: the button sits by ◀. You're in
 * the past, so going back is a move FORWARD: it sits by ▶. And because
 * both slots are fixed-width in CSS, the arrows do not budge whether the
 * button is showing or not — Jake: "if I know I want to move forward
 * three weeks, I expect to be able to just click three times," not
 * forward / back-to-now / forward. Same flaw, all three views.
 * dir: 1 = we're in the future, -1 = in the past, 0 = we're at now.
 */
function placeNowButton(prefix, dir) {
  const btn = $("#" + prefix + "-today");
  if (!btn) return;
  btn.hidden = dir === 0;
  if (dir === 0) return;
  const slot = $("#" + prefix + (dir > 0 ? "-slot-back" : "-slot-fwd"));
  if (slot && btn.parentElement !== slot) slot.append(btn);
}

function weekAnchor() {
  return weekAnchorFor(S.weekMode, Date.now(), S.weekOffset); // D89
}

// ---------- D139: on-demand history for the week view ----------
// The live task subscription (store.js, Option A) only carries active +
// last-30-days-completed. The week view can page back without limit (D89),
// and each past day draws reflection victories from completed tasks. So when
// a visible week begins before the live floor, fetch that week's completed
// tasks once and cache them by week key; re-paging the same week is then free.
const historyCache = new Map();   // weekKey -> Task[]  (completed tasks in that week)
const historyInFlight = new Set();

/** Live tasks PLUS whatever completed history we've fetched for `anchorDay`'s
 *  week. If the week reaches below the live floor and isn't cached yet, kick
 *  off a one-shot fetch and re-render when it lands. Live wins on id (it's
 *  fresher than any historical copy of the same doc). */
function tasksForWeek(anchorDay) {
  const weekStart = startOfDayTs(anchorDay);
  const weekEnd = weekStart + 7 * DAY_MS;
  const floor = liveCompletedCutoff();

  // Fully inside the live window → nothing to fetch, S.tasks already has it.
  if (weekStart >= floor) return S.tasks;

  const key = String(weekStart);
  if (!historyCache.has(key) && !historyInFlight.has(key)) {
    historyInFlight.add(key);
    // Only the slice below the floor is missing; the rest is live already.
    fetchCompletedTasks(weekStart, Math.min(weekEnd, floor))
      .then(rows => { historyCache.set(key, rows); })
      .catch(err => { console.warn("[D139] history fetch failed:", err); historyCache.set(key, []); })
      .finally(() => { historyInFlight.delete(key); if (S.view === "week") renderWeek(); });
  }

  const hist = historyCache.get(key);
  if (!hist || !hist.length) return S.tasks;   // not back yet, or genuinely none
  const byId = new Map();
  for (const t of hist) byId.set(t.id, t);
  for (const t of S.tasks) byId.set(t.id, t);  // live overrides history
  return [...byId.values()];
}

function renderWeek() {
  fitWeekHeight();          // D91 — measure BEFORE weekBarSize() asks how tall we are
  applyStripShare();        // D94 — ...and before it asks how much of it is ours
  wireWeekSplitter();
  const now = Date.now();
  const w = buildWeek({
    tasks: tasksForWeek(weekAnchor()), events: S.events, tiers: S.tiers, projects: S.projects,
    now, anchorDay: weekAnchor(), days: 7, hiddenTierIds: S.hiddenTierIds
  });

  const live = S.weekOffset === 0;
  const lead = S.weekMode === "rolling" && live ? "Next 7 days — " : "";
  $("#wv-label").textContent = `${lead}${fmtDay(w.days[0].dayStart)} → ${fmtDay(w.days[6].dayStart)}`;
  placeNowButton("wv", live ? 0 : (S.weekOffset > 0 ? 1 : -1)); // D90
  for (const b of document.querySelectorAll("#wv-modes button")) {
    b.classList.toggle("active", b.dataset.window === S.weekMode);
  }
  for (const b of document.querySelectorAll("#wv-sizes button")) {
    b.classList.toggle("active", b.dataset.size === S.weekSize);
  }
  $("#wv-holidays").classList.toggle("active", S.showHolidays);   // D123
  renderWeekDayHeads(w);

  renderWeekBanners(w);
  renderWeekProjects(w);

  for (const b of document.querySelectorAll("#wv-layouts button")) {
    b.classList.toggle("active", b.dataset.layout === S.weekLayout);
  }
  const cardBtn = $("#wv-cards-toggle");
  cardBtn.classList.toggle("active", S.weekCards);
  // The clock draws TIME. Reflection is about days whose work no longer has
  // any — a finished task has no runway — so there's nothing to position.
  cardBtn.hidden = S.weekLayout === "clock";
  // D98 — reflection is not a Tidal feature. It's the week's feature (5a-bis,
  // decided round 7, owed since). Both layouts get the toggle.

  // D97 — the two layouts are siblings, not a rewrite. Both consume the same
  // buildWeek(); each owns only its own DOM. Everything above this line (the
  // heads, the strips, the splitter, the nav) is shared and untouched.
  const grid = $("#wv-grid");
  grid.innerHTML = "";                       // full teardown every render, as
  grid.className = "wv-grid l-" + S.weekLayout;  // it always has — no listeners
  // D103 — the strips are OUTSIDE #wv-grid, so the layout class has to live
  // on a shared ancestor or CSS can't reach them.
  $("#week-view").classList.remove("l-columns", "l-tidal", "l-clock");
  $("#week-view").classList.add("l-" + S.weekLayout);
                                             // survive it, so there is nothing
                                             // to leak and nothing to unmount.
  const anything = S.weekLayout === "tidal" ? renderWeekTidal(w, now, grid)
    : S.weekLayout === "clock" ? renderWeekClock(w, now, grid)
      : renderWeekColumns(w, now, grid);

  renderTidalHorizon(w);
  $("#wv-empty").hidden = anything > 0 || w.projectSpans.length > 0 || w.bannerSpans.length > 0;
}

/**
 * D88 — the original: one honest queue per column. The rows, the ordering and
 * the interleave are the 0.33.0 code, unchanged.
 *
 * D98 — and now the cards it was owed. Gantesque ADDS them under its day list
 * rather than replacing it (that's Tidal's thesis, not this one): the list is
 * still the day, the cards are what the day came to. That contrast IS the
 * comparison — same data, same engine, two honest answers to "what is a past
 * column for."
 */
function renderWeekColumns(w, now, grid) {
  setWeekTracks(null);                   // D103 — plain 7, from the stylesheet
  let anything = 0;
  for (const col of w.days) {
    const c = document.createElement("div");
    c.className = "wv-col" + (col.isToday ? " is-today" : "") +
      (col.isPast ? " is-past" : "") + (S.weekCards ? " cards-open" : "");

    const list = document.createElement("div");
    list.className = "wv-list";
    if (!col.items.length) {
      const e = document.createElement("div");
      e.className = "wv-clear";
      e.textContent = col.isPast ? "" : "clear";
      list.append(e);
    }
    for (const it of col.items) { list.append(weekRow(it, now)); anything++; }
    c.append(list);

    if (S.weekCards && (col.isPast || col.isToday) && (col.victories.length || col.putOffs.length)) {
      const box = reflectionCards(col, now, col.isToday);
      box.classList.add("in-columns");
      // D99 — if nothing is left ON the day, there's no list to sit under and
      // no reason to hold a column of air above the cards. They take the room.
      if (!col.items.length) c.classList.add("cards-fill");
      c.append(box);
      anything += col.victories.length + col.putOffs.length;
    }
    grid.append(c);
  }
  return anything;
}

/**
 * D97 — THE TIDAL GRID (layout #2 under Week).
 *
 * The idea worth keeping from the blueprint: a day is not one list, it's
 * three different KINDS of time, and they should not share a container.
 *   ANCHOR SHELF — events. Fixed time. Not yours to move (they come from
 *                  Google Calendar). This is D93/§5a's "events own time"
 *                  rendered as layout rather than as a clock.
 *   FLOW         — tasks + stages. Flexible time. Yours to arrange.
 *   WAKE         — what a past day actually did to you.
 *
 * NOTE the deliberate cost: separating anchors from the flow BREAKS D43's
 * chronological interleave (a 9 AM task no longer sits visibly above a noon
 * meeting). That is the whole point of this layout and the reason it's a
 * sibling rather than a replacement — Columns keeps the interleave.
 */
function renderWeekTidal(w, now, grid) {
  // The blueprint asked for a smaller flex-basis on past columns. #wv-grid is
  // CSS GRID, not flex — flex-basis on a grid item is inert, so that rule
  // would have been a silent no-op. Compression has to come from the track
  // list, and the track list depends on WHICH days are past, so it's computed
  // here rather than declared in the stylesheet.
  //
  // And it composes with Reflection rather than fighting it: the cards live in
  // past columns, so squeezing those columns while she's reading them is
  // backwards (D89 — Jake: "a part of it is also reflecting on the week to
  // work on next week"). Cards OFF → past days shrink to a summary and hand
  // their glass to the live days. Cards ON → they get it back. Two controls
  // that compose, the D94.1 split/Auto pattern.
  // D103 — via the shared variable, so the DAY HEADS compress with their
  // columns. Setting this on #wv-grid alone is what broke the alignment.
  setWeekTracks(w.days.map(col => (col.isPast && !S.weekCards) ? "0.55fr" : "1fr").join(" "));
  let anything = 0;
  for (const col of w.days) {
    const c = document.createElement("div");
    c.className = "wv-col tidal-col" + (col.isToday ? " is-today" : "") +
      (col.isPast ? " is-past" : "") + (S.weekCards ? " cards-open" : "");

    // --- The Wake: a past day gets reflection, not a to-do list ---
    if (col.isPast) {
      c.append(tidalWake(col, now));
      grid.append(c);
      anything += col.victories.length + col.putOffs.length;
      continue;
    }

    // --- Anchor shelf: fixed time, tinted apart from the flow ---
    const anchors = col.items.filter(it => it.kind === "event");
    const shelf = document.createElement("div");
    shelf.className = "tidal-anchor-shelf" + (anchors.length ? "" : " empty");
    if (anchors.length) {
      for (const it of anchors) { shelf.append(weekRow(it, now)); anything++; }
    } else {
      shelf.innerHTML = `<span class="tidal-shelf-none">no fixed time</span>`;
    }
    shelf.title = "Fixed time — events from Google Calendar. Edit them there.";
    c.append(shelf);

    // --- Flow: the work that's yours to arrange ---
    const flow = document.createElement("div");
    flow.className = "tidal-flow";
    const work = col.items.filter(it => it.kind === "task" || it.kind === "stage");
    if (work.length) {
      for (const it of work) { flow.append(weekRow(it, now)); anything++; }
    } else {
      const e = document.createElement("div");
      e.className = "wv-clear";
      e.textContent = "clear";
      flow.append(e);
    }
    c.append(flow);

    // Today gets its reflection too (5a-bis: "available for today too") —
    // a day you're standing in has already put things off by lunchtime.
    if (col.isToday && S.weekCards && (col.victories.length || col.putOffs.length)) {
      c.append(reflectionCards(col, now, true));
    }
    grid.append(c);
  }
  return anything;
}

/**
 * The Wake. Gemini's summary counted "planned" and "dropped" — half a week.
 * Jake asked for BOTH halves: "what she got done, what she didn't, and how
 * she can better schedule next week to be successful." A card that only
 * counts failures isn't reflection, it's a scolding.
 *
 * D89's rule applies hard here: NO BAR. A number that means what it says.
 */
function tidalWake(col, now) {
  const wrap = document.createElement("div");
  wrap.className = "tidal-wake";

  const won = col.victories.length, lost = col.putOffs.length;
  const sum = document.createElement("div");
  sum.className = "tidal-wake-summary" + (won && !lost ? " all-clear" : "");
  sum.innerHTML =
    `<span class="twk-won">${won ? "✓ " + won : "—"}</span>` +
    `<span class="twk-sep">·</span>` +
    `<span class="twk-lost${lost ? "" : " none"}">${lost ? "↻ " + lost : "0 left"}</span>`;
  sum.title = won || lost
    ? `${won} finished · ${lost} didn't happen`
    : "Nothing was on this day.";
  wrap.append(sum);

  if (!S.weekCards) return wrap;
  if (!won && !lost) {
    const e = document.createElement("div");
    e.className = "wv-clear";
    e.textContent = "";
    wrap.append(e);
    return wrap;
  }
  wrap.append(reflectionCards(col, now, false));
  return wrap;
}

/**
 * The victories + put-offs cards (5a-bis) — LAYOUT-AGNOSTIC. Gantesque hangs
 * them under its list, Tidal's Wake is built out of them. Named for what they
 * are, not for the layout that happened to ship first (D98).
 */
function reflectionCards(col, now, isToday) {
  const box = document.createElement("div");
  box.className = "refl-cards";

  if (col.victories.length) {
    const card = document.createElement("div");
    card.className = "refl-card victories";
    card.innerHTML = `<div class="refl-head">🏆 ${col.victories.length} done</div>`;
    for (const v of col.victories) card.append(victoryRow(v));
    box.append(card);
  }
  if (col.putOffs.length) {
    const card = document.createElement("div");
    card.className = "refl-card putoffs";
    card.innerHTML = `<div class="refl-head">↻ ${col.putOffs.length} ${isToday ? "slipping" : "didn't happen"}</div>`;
    for (const p of col.putOffs) card.append(putOffRow(p));
    box.append(card);
  }
  return box;
}

function victoryRow(v) {
  const r = document.createElement("div");
  r.className = "refl-vrow";
  r.style.borderLeftColor = v.color;
  const title = v.kind === "stage" ? `${v.projectName}: ${v.title}` : v.title;
  r.innerHTML =
    `<span class="tv-time">${esc(fmtTime(v.at))}</span>` +
    `<span class="tv-title">${esc(title)}</span>` +
    (v.moved >= 3 ? `<span class="tv-flag" title="It took ${v.moved} reschedules to land this one.">↻${v.moved}</span>` : "");
  // 5a-bis: the previous stage's completion IS this one's start — so the
  // card can say how long it actually took, with no new schema at all.
  const took = v.startedAt ? `\nStarted ${fmtDay(v.startedAt)} ${fmtTime(v.startedAt)} — ${humanSpan(v.at - v.startedAt)}` : "";
  r.title = `${title}\nDone ${fmtDay(v.at)} ${fmtTime(v.at)}${took}` +
    (v.moved ? `\n↻ moved ${v.moved}× before it landed` : "");
  return r;
}

function putOffRow(p) {
  const r = document.createElement("div");
  r.className = "refl-prow flavor-" + p.flavor + (p.moved >= 3 ? " well-travelled" : "");
  r.style.borderLeftColor = p.color;
  const title = p.kind === "stage" ? `${p.projectName}: ${p.title}` : p.title;
  // Three flavours, three different words. "Didn't happen" is not one thing:
  // deciding to move it and never looking at it are opposite behaviours and
  // the card that conflates them can't teach her anything.
  const tag = p.flavor === "moved" ? `→ ${fmtDay(p.nowDue)}`
    : p.flavor === "shelved" ? "→ shelved"
      : "still open";
  r.innerHTML =
    `<span class="tp-title">${esc(title)}</span>` +
    `<span class="tp-tag">${esc(tag)}</span>` +
    (p.moved ? `<span class="tp-moved">↻${p.moved}</span>` : "");
  r.title = `${title}\n` +
    (p.flavor === "moved" ? `Was due ${fmtDay(p.firstDue)} — now due ${fmtDay(p.nowDue)}`
      : p.flavor === "shelved" ? `Was due ${fmtDay(p.firstDue)} — shelved to "Waiting on…"`
        : `Was due ${fmtDay(p.firstDue)} ${fmtTime(p.firstDue)} and still is. Nobody moved it.`) +
    (p.moved ? `\n↻ moved ${p.moved}× since ${fmtDay(p.firstDue)}` : "") +
    (p.kind === "task" ? "\n\nClick to reschedule." : "");
  if (p.kind === "task") {
    r.classList.add("clickable");
    r.addEventListener("click", () =>
      openDueDialog({ kind: "task", taskId: p.id }, `Reschedule — ${p.title}`, p.nowDue ?? p.firstDue));
  }
  return r;
}

function humanSpan(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = m / 60;
  if (h < 24) return `${h % 1 ? h.toFixed(1) : h} h`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"}`;
}

/**
 * D97 — THE HORIZON: pending inventory, spanning the whole week.
 *
 * Gemini specced "items from the waiting array … visible as pending inventory
 * for the week." Two very different animals live in that array and the
 * distinction is load-bearing: a FOLLOW-UP (D4) has no date because it
 * physically cannot be scheduled — it materialises when its parent is checked
 * off — while a SHELVED task (D84) has no date because she said "not now."
 * Only the second is inventory. Presenting a blocked follow-up as available
 * work invites her to plan around something that isn't hers to plan.
 */
function renderTidalHorizon(w) {
  const box = $("#tidal-horizon");
  box.innerHTML = "";
  const show = S.weekLayout === "tidal" && w.waiting.length;
  box.hidden = !show;
  if (!show) return;

  const free = w.waiting.filter(t => !t.blocked);
  const blocked = w.waiting.filter(t => t.blocked);

  const label = document.createElement("span");
  label.className = "th-label";
  label.textContent = "Horizon";
  label.title = "Undated work. Nothing here is on the week yet.";
  box.append(label);

  for (const t of free) {
    const chip = document.createElement("span");
    chip.className = "th-chip clickable";
    chip.style.borderColor = t.tier?.color || "#4dd0c4";
    chip.textContent = t.title;
    chip.title = `${t.title}\nShelved — no date.` +
      (t.moved ? `\n↻ moved ${t.moved}× · first due ${fmtDay(t.firstDue)}` : "") +
      "\n\nClick to give it a date.";
    if (t.moved >= 3) chip.classList.add("well-travelled");
    chip.addEventListener("click", () =>
      openDueDialog({ kind: "task", taskId: t.id }, `Schedule — ${t.title}`, null));
    box.append(chip);
  }
  for (const t of blocked) {
    const chip = document.createElement("span");
    chip.className = "th-chip blocked";
    chip.textContent = t.title;
    chip.title = `${t.title}\nWaiting on its parent task — it gets a date automatically when the parent is checked off${t.offsetDays != null ? ` (+${t.offsetDays}d)` : ""}.\n\nNot yours to schedule.`;
    box.append(chip);
  }
}

/**
 * D100 — THE CLOCK GRID (layout #3). "If an event is scheduled for 6 PM
 * today, it should show up at 6 PM today" (§5a) — and, per D93, if a task is
 * DUE at 6 PM it should show up as the hour BEFORE it, not the hour after.
 *
 * No gutter column: .wv-strip is a 7-track grid and projectSpans position by
 * grid-column, so a rail here would knock every strip out of alignment with
 * the days. The hour labels ride inside the first column instead.
 */
function renderWeekClock(w, now, grid) {
  setWeekTracks(null);
  const win = weekClockWindow(w.days, { now });
  const span = win.endMin - win.startMin;
  S.clockWin = win;                  // the estimate drag needs the same axis
  let anything = 0;

  w.days.forEach((col, i) => {
    const c = document.createElement("div");
    c.className = "wv-col clock-col" + (col.isToday ? " is-today" : "") + (col.isPast ? " is-past" : "");

    const face = document.createElement("div");
    face.className = "clock-face";

    // Hour rules across every column; labels only in the first, so the axis
    // reads once and the other six stay clean.
    for (let m = win.startMin; m <= win.endMin; m += 60) {
      const line = document.createElement("div");
      line.className = "clock-hour" + (m === 720 ? " noon" : "");
      line.style.top = ((m - win.startMin) / span * 100) + "%";
      if (i === 0) {
        const lab = document.createElement("span");
        lab.className = "clock-hour-label";
        lab.textContent = fmtTime(new Date(2000, 0, 1, Math.floor(m / 60), m % 60).getTime());
        line.append(lab);
      }
      face.append(line);
    }

    if (col.isToday) {
      const mins = (now - col.dayStart) / 60000;
      if (mins >= win.startMin && mins <= win.endMin) {
        const nl = document.createElement("div");
        nl.className = "clock-now";
        nl.style.top = ((mins - win.startMin) / span * 100) + "%";
        nl.title = "Now";
        face.append(nl);
      }
    }

    for (const b of clockBlocks({ items: col.items, dayStart: col.dayStart, now })) {
      face.append(clockBlockEl(b, col, win, span));
      anything++;
    }
    c.append(face);
    grid.append(c);
  });
  return anything;
}

function clockBlockEl(b, col, win, span) {
  const el = document.createElement("div");
  const it = b.it;
  el.className = "clock-block k-" + b.kind +
    (b.estimated ? "" : " unestimated") +
    (b.clippedStart ? " clipped" : "") +
    (it.expired ? " expired" : "");

  const topMin = (b.startMs - col.dayStart) / 60000;
  const endMin = (b.endMs - col.dayStart) / 60000;
  el.style.top = ((topMin - win.startMin) / span * 100) + "%";
  el.style.height = Math.max(0.7, (endMin - topMin) / span * 100) + "%";
  el.style.left = (b.lane / b.laneCount * 100) + "%";
  el.style.width = (100 / b.laneCount) + "%";

  const color = b.kind === "stage" ? (it.projectColor || "#888") : (it.tier?.color || "#4dd0c4");
  el.style.borderLeftColor = color;
  el.style.background = hexToRgba(color, it.expired ? 0.28 : 0.16);

  const title = b.kind === "stage" ? it.projectName : it.title;
  el.innerHTML = '<span class="cb-title">' + esc(title) + '</span>';

  // The RED TAIL: deadline → now. The only thing on this grid that grows.
  if (b.overdueTo != null) {
    const tail = document.createElement("div");
    tail.className = "clock-tail";
    tail.style.height = ((b.overdueTo - b.endMs) / 60000 / span * 100) + "%";
    tail.title = "Past due — this is how far it has run over.";
    el.append(tail);
  }

  const due = it.originalDue ?? it.time;
  if (b.kind === "event") {
    el.title = title + "\n" + fmtTime(it.time) + (it.end ? "–" + fmtTime(it.end) : "") +
      "\n\n(from Google Calendar — edit it there)";
    return el;
  }

  const mins = b.estimateMinutes;
  el.title = title + (it.expired ? "  ❗MISSED" : "") +
    "\nDue " + fmtDay(due) + " " + fmtTime(due) +
    (mins
      ? "\nEstimated " + humanSpan(mins * 60000) + " — runway " + fmtTime(b.trueStartMs) + " → " + fmtTime(due)
      : "\nNo estimate — drawn at " + DEFAULT_ESTIMATE_MINUTES + " min (dashed edge).") +
    (b.clippedStart ? "\n⌃ its runway starts " + fmtTime(b.trueStartMs) + ", the day before" : "") +
    (b.kind === "task" ? "\n\nDrag the TOP edge to estimate how long it takes.\nClick to reschedule." : "\n\nClick to change this stage's due date.");

  // D93 — dragging the top edge IS estimating. This gesture is the layout's
  // reason to exist: it turns "when is it due" into "how long is it", which is
  // the only version of the question a week view can actually answer.
  if (b.kind === "task") {
    const grip = document.createElement("div");
    grip.className = "clock-grip";
    grip.title = "Drag up for more room, down for less.";
    wireEstimateDrag(grip, el, b, col, win, span);
    el.append(grip);
  }

  el.classList.add("clickable");
  el.addEventListener("click", ev => {
    if (el.dataset.dragged === "1") { el.dataset.dragged = ""; return; }
    if (ev.target.closest(".clock-grip")) return;
    if (b.kind === "task") openDueDialog({ kind: "task", taskId: it.id }, "Reschedule — " + it.title, due);
    else openDueDialog({ kind: "stage", projectId: it.projectId, stageIndex: it.stageIndex },
      "Hard due date — " + it.title, it.dueAt ?? null);
  });
  return el;
}

/**
 * D100 — drag the top edge to set estimateMinutes.
 *
 * Document-level listeners so a re-render mid-gesture can't orphan the drag
 * (the minute tick fires every 60s — the D65/D73 lesson, learned the hard way
 * on the year view). The preview is the block ITSELF resizing: a separate
 * ghost would be a second, less truthful preview, which is exactly what D77
 * deleted. The commit is one updateTask; D95 leaves the reschedule count alone
 * because no dueAt is in the payload.
 */
function wireEstimateDrag(grip, el, b, col, win, span) {
  grip.addEventListener("pointerdown", ev => {
    ev.preventDefault();
    ev.stopPropagation();
    const faceH = el.parentElement.getBoundingClientRect().height;
    if (!faceH) return;
    const pxPerMin = faceH / span;
    const startY = ev.clientY;
    const orig = b.estimateMinutes ?? DEFAULT_ESTIMATE_MINUTES;
    const endMin = (b.endMs - col.dayStart) / 60000;
    let next = orig;
    el.classList.add("dragging");
    beginGesture();               // D101 — my own drag had the same exposure

    const onMove = e => {
      const dMin = (startY - e.clientY) / pxPerMin;          // up = longer
      const raw = Math.min(MAX_ESTIMATE_MINUTES, Math.max(MIN_ESTIMATE_MINUTES, orig + dMin));
      next = Math.round(raw / 5) * 5;
      // Re-derive from the SHARED axis, never from the element's own current
      // pixels — reading back what you just wrote makes the drag drift.
      el.style.top = (((endMin - next) - win.startMin) / span * 100) + "%";
      el.style.height = (next / span * 100) + "%";
      el.dataset.dragged = "1";
      grip.textContent = humanSpan(next * 60000);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      el.classList.remove("dragging");
      grip.textContent = "";
      if (next !== orig) {
        pushUndo("estimate drag",
          () => updateTask(b.it.id, { estimateMinutes: orig }),      // D114 (orig may be null — D100: null is a real value)
          () => updateTask(b.it.id, { estimateMinutes: next }));     // D116: + redo
        updateTask(b.it.id, { estimateMinutes: next });
      }
      endGesture(); // D101
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  });
}

/**
 * D103 — the week's column tracks, in ONE place.
 *
 * #wv-grid and the three .wv-strip rows (days, banners, projects) MUST use
 * identical tracks or the heads stop pointing at their days and projectSpans
 * point at the wrong columns. Before this they were declared separately —
 * stylesheet for the strips, inline JS for the grid — which is not a shared
 * number, it's two numbers that happen to agree until one of them doesn't.
 *
 * Setting a VARIABLE instead of an inline style also lets the phone rule keep
 * winning: @media (max-width:900px) forces 3 columns and, being a later rule
 * of equal specificity, beats the var — where an inline style would have
 * bulldozed it. The clock opts out of that rule (see the stylesheet): three
 * rows of three days is three separate time axes, and only the first would
 * carry hour labels.
 */
function setWeekTracks(tracks) {
  const view = $("#week-view");
  if (!view) return;
  if (tracks) view.style.setProperty("--wv-tracks", tracks);
  else view.style.removeProperty("--wv-tracks");
}

function setWeekLayout(v) {
  S.weekLayout = v;
  localStorage.setItem("tc-week-layout", v);
  renderWeek();
}

/** D89 — the dates, at the top, where a calendar puts them. They were
 *  stranded halfway down the screen under the strips. */
function renderWeekDayHeads(w) {
  const bar = $("#wv-days");
  bar.innerHTML = "";
  // D123 — holidays across the seven-day window, keyed by day-start.
  const holMap = S.showHolidays
    ? holidaysForRange(w.days[0].dayStart, w.days[6].dayStart + DAY_MS)
    : null;
  for (const col of w.days) {
    const d = new Date(col.dayStart);
    const hol = holMap ? holMap.get(col.dayStart) : null;   // D123
    const holLine = hol
      ? `<span class="wv-holname" title="${esc(hol.name)}">★ ${esc(hol.abbr)}</span>`
      : "";
    const h = document.createElement("div");
    h.className = "wv-dayhead" + (col.isToday ? " is-today" : "") + (col.isPast ? " is-past" : "") + (hol ? " wv-holiday" : "");
    // Honest words, not a bar. The old meter showed "40% as many items as
    // the busiest day" in the visual language of "40% done" (Jake: "we're
    // unclear as to what that means"). Two numbers that mean what they say.
    const left = col.load.total, missed = col.load.expired;
    // D98 — a past day's honest headline is not "N left", it's what happened:
    // what you finished and what you didn't. "N left" is a FUTURE word, and on
    // a day that's gone it was quietly lying (and `missed` is always 0 back
    // there — expired is viewingToday-gated, D97). Live days keep D89's words.
    if (col.isPast) {
      const won = col.load.done, lost = col.load.putOff;
      h.innerHTML =
        `<span class="wv-dow">${d.toLocaleDateString([], { weekday: "short" })}</span>` +
        `<span class="wv-date">${d.getDate()}</span>` +
        holLine +
        (won ? `<span class="wv-done">✓${won}</span>` : "") +
        (lost ? `<span class="wv-putoff">↻${lost}</span>` : "") +
        (!won && !lost && !hol ? `<span class="wv-left none">—</span>` : "");
      h.title = (won || lost
        ? `${won} finished · ${lost} didn't happen`
        : "Nothing was on this day.") + (hol ? ` · ${hol.name}` : "");
      bar.append(h);
      continue;
    }
    h.innerHTML =
      `<span class="wv-dow">${d.toLocaleDateString([], { weekday: "short" })}</span>` +
      `<span class="wv-date">${d.getDate()}</span>` +
      holLine +
      (left ? `<span class="wv-left">${left} left</span>` : `<span class="wv-left none">clear</span>`) +
      (missed ? `<span class="wv-missed">❗${missed}</span>` : "");
    h.title = (left
      ? `${left} still to do${missed ? ` · ${missed} already missed` : ""}`
      : "Nothing left on this day") + (hol ? ` · ${hol.name}` : "");
    bar.append(h);
  }
}

/** One compact row. Big enough to read across a room; tap = open the day. */
function weekRow(it, now) {
  const row = document.createElement("div");
  row.className = "wv-row" + (it.expired ? " expired" : "") + ` k-${it.kind}`;
  const color = it.kind === "stage" ? (it.projectColor || "#888") : (it.tier?.color || "#4dd0c4");
  row.style.borderLeftColor = color;
  row.style.background = hexToRgba(color, it.expired ? 0.2 : 0.1);

  const when = it.kind === "event"
    ? (it.end ? `${fmtTime(it.time)}–${fmtTime(it.end)}` : fmtTime(it.time))
    : fmtTime(it.originalDue ?? it.time);
  const title = it.kind === "stage" ? it.projectName : it.title;
  const sub = it.kind === "stage" ? it.title : "";

  row.innerHTML =
    `<span class="wv-when">${it.expired ? "❗" : ""}${esc(when)}</span>` +
    `<span class="wv-title">${esc(title)}</span>` +
    (sub ? `<span class="wv-sub">${esc(sub)}</span>` : "");
  // D90 — the full name lives in the hover, because 137px columns will
  // always truncate ("Chec…" is not a thing anyone can act on), and the
  // click reschedules, because "not gonna do it today" is the single most
  // common thing you want to say to a board (Jake).
  if (it.kind === "stage") {
    row.title = `${it.projectName} — ${it.title}${it.expired ? "  ❗MISSED" : ""}` +
      `\nDue ${fmtDay(it.originalDue ?? it.time)} ${fmtTime(it.originalDue ?? it.time)}` +
      `\n\nClick to change this stage's due date.`;
    row.classList.add("clickable");
    row.addEventListener("click", () =>
      openDueDialog({ kind: "stage", projectId: it.projectId, stageIndex: it.stageIndex },
        `Hard due date — ${it.title}`, it.dueAt ?? null));
  } else if (it.kind === "task") {
    // D95 — the history, where she'll actually look at it. A thing that's
    // moved five times is the question, not the answer.
    const moved = it.raw?.rescheduleCount || 0;
    const first = taskFirstDue(it.raw);
    row.title = `${title}${it.expired ? "  ❗MISSED" : ""}\n${fmtDay(it.time)} ${when}` +
      (moved ? `\n↻ moved ${moved}×${first && first !== it.originalDue ? ` · first due ${fmtDay(first)}` : ""}` : "") +
      (it.notes ? `\n\n${it.notes}` : "") +
      `\n\nClick to reschedule.`;
    if (moved >= 3) row.classList.add("well-travelled");
    row.classList.add("clickable");
    row.addEventListener("click", () =>
      openDueDialog({ kind: "task", taskId: it.id }, `Reschedule — ${it.title}`, it.originalDue ?? it.time));
  } else {
    // Events come FROM Google Calendar — this app doesn't own them.
    row.title = `${title}\n${fmtDay(it.time)} ${when}\n\n(from Google Calendar — edit it there)`;
  }
  return row;
}

function renderWeekBanners(w) {
  const strip = $("#wv-banners");
  strip.innerHTML = "";
  strip.hidden = !w.bannerSpans.length;
  for (const b of w.bannerSpans) {
    const el = document.createElement("div");
    el.className = "wv-span wv-banner";
    el.style.gridColumn = `${b.fromIdx + 1} / ${b.toIdx + 2}`;
    const c = b.tier?.color || "#4dd0c4";
    el.style.borderLeftColor = c;
    el.style.background = hexToRgba(c, 0.16);
    el.textContent = `${b.clippedLeft ? "… " : ""}${b.title}${b.clippedRight ? " …" : ""}`;
    el.title = `${b.title}${b.dayTotal > 1 ? ` — ${b.dayTotal} days` : ""}`;
    strip.append(el);
  }
}

/**
 * D91 — Auto is HEIGHT-aware, not just count-aware. The first cut laddered
 * on bar-count alone, which says nothing about whether they FIT: the board
 * has to give the day columns the majority of the glass, whatever the
 * window is doing. Measure, then pick the fattest size that still leaves
 * them ~60%. (Jake: "auto is not reducing the height to the same level as
 * it does in the annual view.")
 */
// D106 — these are now a FIRST GUESS, not the truth. A bar's real height
// is rem padding + a vw-clamped font, and vw measures the GLASS, not the
// pane: on the 4K dashboard the fixed-px model undershot by ~50% and Auto
// overflowed the strip by two bars at every split position ("it seems to
// assume those two should be hidden" — Jake, and yes, that's exactly what
// the arithmetic assumed). D103 made the BUDGET measured; settleWeekBars()
// finishes the thought on the COST side: the model proposes, the layout
// disposes.
const BAR_PX = { full: 34, half: 24, quarter: 17, hair: 9 };

/** Auto's pick must SURVIVE MEASUREMENT: if the strip box actually
 *  overflows, step down a rung and look again. Max 3 passes, each one
 *  attribute flip + one layout read, and only when the model guessed
 *  wrong. A PIN is honest clipping — the user chose that size, the
 *  scrollbar is the truthful cost, we don't override it. */
function settleWeekBars() {
  if (S.weekSize !== "auto") return;
  const box = $("#wv-strips"), proj = $("#wv-projects");
  if (!box || !proj || proj.hidden) return;
  const ladder = ["full", "half", "quarter", "hair"];
  let i = ladder.indexOf(proj.dataset.size); if (i < 0) i = 0;
  while (i < ladder.length - 1 && box.scrollHeight > box.clientHeight + 1) {
    proj.dataset.size = ladder[++i];
  }
}

function weekBarSize(n) {
  if (S.weekSize !== "auto") return S.weekSize;
  if (!n) return "full";
  const board = $("#week-view").clientHeight || window.innerHeight || 800;

  // D103 — the budget was a MODEL of the strip box (34% of the board) and the
  // model had drifted from the box. Two leaks:
  //  · #tidal-horizon is flex:0 0 auto (never shrinks) while #wv-strips is
  //    flex:0 1 auto (always shrinks) — so the horizon takes its height off
  //    the top and the strips silently get less than their share.
  //  · The BANNER rows (SAVY, DnD) live in the same box and were never in n,
  //    which counts projectSpans only. Predates D97; the horizon just made it
  //    visible. Banners render BEFORE projects, so by the time we're asked
  //    they have real layout and can simply be measured.
  const hz = $("#tidal-horizon");
  const horizonH = (hz && !hz.hidden) ? hz.offsetHeight : 0;
  const bn = $("#wv-banners");
  const bannersH = (bn && !bn.hidden) ? bn.offsetHeight : 0;

  const budget = Math.max(BAR_PX.hair + 5,
    (board - horizonH) * (S.weekStripPct / 100) - bannersH);   // D94: Jake owns the split; Auto refits into what's LEFT
  for (const k of ["full", "half", "quarter"]) {
    if (n * (BAR_PX[k] + 5) <= budget) return k;
  }
  return "hair";
}

function setWeekSize(v) {
  S.weekSize = v;
  localStorage.setItem("tc-wsize", v);
  S.weekExpanded.clear();   // a size change re-answers the question the expand asked
  renderWeek();
}

/**
 * D91 — the board must FIT the glass. #week-view had height:100% against
 * #app-screen, which has no height of its own, so 100% resolved to auto:
 * the section grew, #wv-grid's flex:1 had nothing to divide against, and
 * the day columns walked off the bottom of the window. Measure the space
 * left under the header and pin it. offsetTop is stable because it depends
 * on the header, not on us — no layout feedback loop.
 */
/** D94 — the split is Jake's to set. A quarter of a 4K screen is a whole
 *  1080p screen, so "Auto" was never about making bars small — it's about
 *  spending the glass, and only the human knows how they want it spent.
 *  Auto then refits the bars into whatever share is left. */
function applyStripShare() {
  const strips = $("#wv-strips");
  if (strips) strips.style.setProperty("--wv-strip", S.weekStripPct + "%");
}

function wireWeekSplitter() {
  const bar = $("#wv-split");
  if (!bar || bar.dataset.wired) return;
  bar.dataset.wired = "1";
  let dragging = false;
  // D104 — the drag-DOWN deadness. #wv-strips is sized by max-height, and a
  // max-height can shrink a box below its content but can never GROW one
  // past it: granting the strip more share changed nothing on screen until
  // pointerup's renderWeek() picked a fatter bar size and the boundary
  // teleported to the ladder's number, not the pointer's. Fix: Auto
  // re-picks the bar size DURING the drag — one attribute flip; the bar
  // DOM is identical across sizes, CSS does the rest — so the boundary
  // follows the pointer down in honest bar-size steps and release has
  // nothing left to jump to. A PINNED size still stops at the bars'
  // natural height: truthful resistance, pinned bars won't grow.
  let refitQueued = false;
  const liveRefit = () => {
    if (refitQueued) return;
    refitQueued = true;
    requestAnimationFrame(() => {
      refitQueued = false;
      const strip = $("#wv-projects");
      if (!strip || strip.hidden) return;
      const size = weekBarSize(strip.children.length);
      if (strip.dataset.size !== size) strip.dataset.size = size;
      settleWeekBars();   // D106 — mid-drag guesses get verified too
    });
  };
  bar.addEventListener("pointerdown", e => {
    dragging = true; bar.setPointerCapture(e.pointerId); bar.classList.add("dragging");
    e.preventDefault();
  });
  bar.addEventListener("pointermove", e => {
    if (!dragging) return;
    const board = $("#week-view");
    const top = $("#wv-strips").getBoundingClientRect().top;
    const h = board.clientHeight || 1;
    const pct = Math.max(10, Math.min(75, ((e.clientY - top) / h) * 100));
    S.weekStripPct = pct;
    applyStripShare();
    liveRefit();
  });
  const stop = () => {
    if (!dragging) return;
    dragging = false; bar.classList.remove("dragging");
    localStorage.setItem("tc-wstrip", String(Math.round(S.weekStripPct)));
    renderWeek();   // Auto re-picks a bar size for the new share
  };
  bar.addEventListener("pointerup", stop);
  bar.addEventListener("pointercancel", stop);
  bar.addEventListener("dblclick", () => { S.weekStripPct = 34; applyStripShare(); localStorage.setItem("tc-wstrip", "34"); renderWeek(); });
}

/** D105 — every view used to fit itself against the WINDOW; in the
 *  dashboard it must fit its PANE. One question, one answer: "how far
 *  down may I grow?" Outside a pane this is EXACTLY the old arithmetic
 *  (innerHeight minus document-space top), so the three solo views are
 *  untouched by construction. */
function fitAvail(el) {
  const pane = el.closest(".dash-pane");
  if (pane) return pane.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
  return window.innerHeight - (el.getBoundingClientRect().top + window.scrollY);
}

function fitWeekHeight() {
  const sec = $("#week-view");
  if (!sec || sec.hidden) return;
  // Floor 240 (was 320): a dashboard pane can be legitimately short, and
  // the old floor only ever guarded against absurdly small windows.
  sec.style.height = Math.max(240, fitAvail(sec) - 8) + "px";
}

function renderWeekProjects(w) {
  const strip = $("#wv-projects");
  strip.innerHTML = "";
  strip.hidden = !w.projectSpans.length;
  strip.dataset.size = weekBarSize(w.projectSpans.length);
  for (const p of w.projectSpans) {
    const el = document.createElement("div");
    el.className = "wv-span wv-proj" + (p.deckRank === 0 ? " clear-deck" : "");
    el.style.gridColumn = `${p.fromIdx + 1} / ${p.toIdx + 2}`;
    el.style.borderLeftColor = p.color;
    el.style.background = hexToRgba(p.color, 0.14);

    const pct = Math.round(p.pct * 100);
    if (p.expired) el.classList.add("expired");
    el.innerHTML =
      `<span class="wv-proj-name">${p.expired ? "❗" : ""}${p.clippedLeft ? "… " : ""}${esc(p.name)}${p.clippedRight ? " …" : ""}</span>` +
      `<span class="wv-proj-next">${esc(p.activeStageName)}</span>` +
      `<span class="wv-proj-pct">${pct}%</span>`;
    // D89: the deadline DAY gets a highlighted block, not a 7px dot.
    if (p.deadlineIdx != null) {
      const rel = p.deadlineIdx - p.fromIdx, span = (p.toIdx - p.fromIdx) + 1;
      if (rel >= 0 && rel < span) {
        const blk = document.createElement("u");
        blk.className = "wv-dl" + (p.expired ? " expired" : "");
        blk.style.left = `${(rel / span) * 100}%`;
        blk.style.width = `${(1 / span) * 100}%`;
        blk.title = `${p.deadlineStageName} due ${fmtDay(p.deadlineAt)}`;
        el.append(blk);
      }
    }
    const meter = document.createElement("i");
    meter.className = "wv-proj-meter";
    meter.style.width = `${pct}%`;
    meter.style.background = p.color;
    el.append(meter);

    // Pips: the days this project actually wants something from you.
    for (const pip of p.pips) {
      const dot = document.createElement("b");
      dot.className = "wv-pip" + (pip.done ? " done" : "") + (pip.isActive ? " active" : "");
      const rel = pip.dayIdx - p.fromIdx, span = (p.toIdx - p.fromIdx) + 1;
      dot.style.left = `calc(${((rel + 0.5) / span) * 100}% - 4px)`;
      dot.title = `${pip.name} — ${pip.done ? "done" : "due"} ${fmtDay(w.days[pip.dayIdx].dayStart)}`;
      el.append(dot);
    }
    el.title = `${p.name} — ${p.done}/${p.total} stages (${pct}%)` +
      `\nNow: ${p.activeStageName}` +
      `\n${p.expired ? "❗MISSED — was due" : "Next deadline:"} ${p.deadlineStageName}, ${fmtDay(p.deadlineAt)} ${fmtTime(p.deadlineAt)}` +
      (p.deckRank === 0 ? "\n🏁 past the clear-the-deck line — finish it" : "") +
      "\n\n" + (["quarter", "hair"].includes(strip.dataset.size)
        ? (S.weekExpanded.has(p.id) ? "Click to collapse · ✎ sets the due date." : "Click to expand.")
        : "Click to set this stage's due date.");
    el.classList.add("clickable");
    // D92 — ONE rule, no timing: "if you can read it, clicking acts; if you
    // can't, clicking makes it readable." D91 expanded on click but gave no
    // way back (Jake). Jake's fix was to branch on whether the native
    // tooltip had appeared — same intent, but that makes a click mean
    // different things depending on how long you paused over it, which is
    // exactly the kind of surprise a planning board can't afford. So:
    // compact size → click TOGGLES expand/collapse, and the expanded bar
    // grows a ✎ to act. Readable size → click acts directly.
    const compact = ["quarter", "hair"].includes(strip.dataset.size);
    const expanded = S.weekExpanded.has(p.id);
    const editIt = () => openDueDialog(
      { kind: "stage", projectId: p.id, stageIndex: p.activeStageIndex },
      `Hard due date — ${p.activeStageName}`, null);

    if (compact) {
      if (expanded) el.classList.add("forced-full");
      el.addEventListener("click", ev => {
        if (ev.target.closest(".wv-edit")) return;   // the ✎ speaks for itself
        if (expanded) S.weekExpanded.delete(p.id); else S.weekExpanded.add(p.id);
        renderWeek();
      });
      if (expanded) {
        const ed = document.createElement("button");
        ed.className = "wv-edit mini";
        ed.textContent = "✎";
        ed.title = `Set the due date for “${p.activeStageName}”`;
        ed.addEventListener("click", ev => { ev.stopPropagation(); editIt(); });
        el.append(ed);
      }
    } else {
      el.addEventListener("click", editIt);
    }
    strip.append(el);
  }
  settleWeekBars();   // D106 — the model proposed; now the layout disposes
}

function weekPage(n) { S.weekOffset += n; renderWeek(); }

function setWeekMode(m) {
  S.weekMode = m;
  localStorage.setItem("tc-wmode", m);
  S.weekOffset = 0;   // switching frames always lands you on the live week
  renderWeek();
}

/** First month of the visible 12 (D31 mode + paging offset). */
function yearAnchorMonth() {
  const now = new Date();
  let m0 = 0;
  if (S.yearMode === "quarter") m0 = Math.floor(now.getMonth() / 3) * 3;
  else if (S.yearMode === "month") m0 = now.getMonth();
  return new Date(now.getFullYear(), m0 + S.yearOffset, 1);
}

function shiftYear(n) {
  if (S.yearZoom != null) {
    const z = new Date(S.yearZoom);
    S.yearZoom = new Date(z.getFullYear(), z.getMonth() + n, 1).getTime();
  } else {
    S.yearOffset += n * 12;
  }
  renderYear();
}

function yvDetails(p, prog) {
  const tier = S.tiers.find(t => t.id === p.tierId);
  const nd = nextDeadline(p, tier?.allowedDays);
  const s0 = startOfDayTs(p.startDate || 0), e0 = startOfDayTs(p.endDate || p.startDate || 0);
  let out = `${p.name}\n${fmtDay(s0)} → ${fmtDay(e0)} · ${prog.done}/${prog.total} stages (${Math.round(prog.pct * 100)}%)`;
  if (p.completedAt) out += "\n✓ complete";
  else if (nd) out += `\nnext: ${nd.stage.name} — ${fmtDay(nd.date)}`;
  return out;
}

// (D115's click-popover lived here; retired by D117 — the hover title
// carries the details, the click now expands. yvDetails survives as the
// tooltip and legend text.)


/** Commit a drag: snap to the tier's working days exactly like the
 *  form save does (start forward, end back, order-guarded — D59/D60). */
function commitBarDrag(p, ns, ne) {
  const allowed = S.tiers.find(t => t.id === p.tierId)?.allowedDays;
  if (!isDayAllowed(ns, allowed)) ns = allowedNeighbors(ns, allowed).next;
  if (!isDayAllowed(ne, allowed)) ne = allowedNeighbors(ne, allowed).prev;
  if (ne < ns) ne = allowedNeighbors(ns, allowed).next;
  if (ns !== p.startDate || ne !== p.endDate) {
    const before = { startDate: p.startDate, endDate: p.endDate };   // D114
    const after = { startDate: ns, endDate: ne };
    pushUndo("bar drag", () => updateProject(p.id, before), () => updateProject(p.id, after));   // D116: + redo
  }
  updateProject(p.id, { startDate: ns, endDate: ne });
}

// ---------- D74: drag drop-ghosts ----------
let yvGhosts = [];
function yvClearGhosts() { yvGhosts.forEach(g => g.remove()); yvGhosts = []; }

/** Tinted landing slots for [ns..ne] in every row they cross —
 *  D77: colored like the project; they ARE the drag preview. */
function yvShowGhosts(ns, ne, rowMap, color) {
  yvClearGhosts();
  const endEx = ne + DAY_MS; // inclusive end day → exclusive bound
  for (const w of rowMap) {
    // D76: clip to where the bar will actually render (week ∩ month in
    // the calendar layouts) — no more twin ghosts in spillover weeks.
    const lo = w.clipS || w.ws;
    const rd = new Date(w.ws);
    rd.setDate(rd.getDate() + w.days);
    const hi = w.clipE || rd.getTime();
    const segS = Math.max(ns, lo), segE = Math.min(endEx, hi);
    if (segE <= segS) continue;
    const d0 = Math.round((segS - w.ws) / DAY_MS);
    const d1 = Math.round((segE - w.ws) / DAY_MS);
    const g = document.createElement("div");
    g.className = "yv-ghost";
    if (color) {
      g.style.background = hexToRgba(color, 0.4);
      g.style.borderColor = color;
    }
    g.style.left = `${w.rect.left + (d0 / w.days) * w.rect.width}px`;
    g.style.width = `${Math.max(4, ((d1 - d0) / w.days) * w.rect.width)}px`;
    g.style.top = `${w.rect.top}px`;
    g.style.height = `${w.rect.height}px`;
    document.body.append(g);
    yvGhosts.push(g);
  }
}

/** D73: which DATE is under the pointer? Nearest tagged row by
 *  vertical distance (so drags between rows/months/quarters resolve),
 *  x clamped inside it, day index by fraction of the row's window. */
function yvDateAt(clientX, clientY, rowMap) {
  let best = null, bd = Infinity;
  for (const w of rowMap) {
    const r = w.rect;
    // D76: TRUE 2D distance — months sit side-by-side (D72), so rows
    // share y-bands; vertical-only distance let April answer for June.
    const ddx = clientX < r.left ? r.left - clientX : clientX > r.right ? clientX - r.right : 0;
    const ddy = clientY < r.top ? r.top - clientY : clientY > r.bottom ? clientY - r.bottom : 0;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 < bd) { bd = d2; best = w; }
  }
  if (!best) return null;
  const r = best.rect;
  const fx = Math.min(Math.max(clientX, r.left), r.right - 1);
  const idx = Math.min(best.days - 1, Math.max(0, Math.floor((fx - r.left) / r.width * best.days)));
  const d = new Date(best.ws);
  d.setDate(d.getDate() + idx);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** D32 pointer plumbing. Listeners live on document during the drag so
 *  re-renders can't orphan the gesture; the grabbed bar previews via
 *  transform/width only, and truth is committed on release (Firestore's
 *  latency compensation re-renders the real thing instantly). */
function wireBarDrag(bar, p, rowSpanMs, lanes) {
  bar.addEventListener("pointerdown", ev => {
    if (yvDragging || (ev.button != null && ev.button !== 0)) return;
    const mode = ev.target.classList && ev.target.classList.contains("yv-handle")
      ? (ev.target.classList.contains("l") ? "start" : "end") : "move";
    const originX = ev.clientX, originY = ev.clientY;
    const s0 = startOfDayTs(p.startDate || 0);
    const e0 = startOfDayTs(p.endDate || p.startDate || 0);
    // D73: snapshot every tagged row so the drag resolves dates across
    // weeks, months, and quarter rows.
    const rowMap = [...$("#yv-grid").querySelectorAll("[data-ws]")].map(el => ({
      rect: el.getBoundingClientRect(), ws: +el.dataset.ws, days: +el.dataset.days,
      clipS: +el.dataset.clipS, clipE: +el.dataset.clipE   // D76
    }));
    const grabDate = yvDateAt(ev.clientX, ev.clientY, rowMap) ?? s0;
    let moved = false, ns = s0, ne = e0;
    yvDragging = true;
    beginGesture();               // D101
    const onMove = e => {
      const dx = e.clientX - originX, dy = e.clientY - originY;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      bar.classList.add("dragging");
      const under = yvDateAt(e.clientX, e.clientY, rowMap);
      const dDays = under == null ? 0 : Math.round((under - grabDate) / DAY_MS);
      ns = s0; ne = e0;
      if (mode !== "end") ns += dDays * DAY_MS;
      if (mode !== "start") ne += dDays * DAY_MS;
      if (ne < ns) { if (mode === "start") ns = ne; else ne = ns; }
      yvShowGhosts(ns, ne, rowMap, p.color);              // D77: the tinted ghost IS the preview
      $("#yv-label").textContent = `${fmtDay(ns)} → ${fmtDay(ne)}`;
      e.preventDefault();
    };
    const finish = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", finish);
      document.removeEventListener("pointercancel", finish);
      yvClearGhosts();                                      // D74
      yvDragging = false;
      if (moved) {
        yvTapSquelch = true;
        setTimeout(() => { yvTapSquelch = false; }, 50);
        commitBarDrag(p, ns, ne);
      }
      renderYear(); // restores label + geometry; the snapshot re-renders saved truth
      endGesture(); // D101 — LAST: flushes any snapshot that landed mid-drag
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
  });
  bar.addEventListener("click", ev => {
    ev.stopPropagation();
    if (yvTapSquelch || yvDragging) return;
    // D117 — the week's answer, transplanted (Jake: "expand like it does in
    // the week view so that I can see multiple projects at once even when
    // it's tight — I can only hover over one line at a time"). Click
    // toggles this bar open at readable height with its name; hover keeps
    // the details tooltip; the D115 click-popover is retired with it.
    if (S.yearExpanded.has(p.id)) S.yearExpanded.delete(p.id);
    else S.yearExpanded.add(p.id);
    renderYear();
  });
}

function renderYearLegend(projs) {
  const box = $("#yv-legend");
  box.innerHTML = "";
  for (const p of projs) {
    const k = document.createElement("span");
    k.className = "yv-key";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = p.color || "#4dd0c4";
    const prog = projectProgress(p);
    k.append(sw, document.createTextNode(`${p.name} · ${prog.done}/${prog.total}`));
    k.title = yvDetails(p, prog);
    box.append(k);
  }
}

let yvResizeT = 0;

// ---------- D68: ＋ New project modal (form reparenting) ----------
let projFormReturn = null; // where the form goes home to

function openYvProjectModal() {
  const title = $("#project-form-title"), form = $("#project-form");
  if (!projFormReturn) projFormReturn = { parent: title.parentElement, next: form.nextElementSibling };
  $("#yv-project-slot").append(title, form);
  $("#yv-project-modal").hidden = false;
  $("#project-name").focus();
  markClean("projectForm", projectFormSignature);   // D131 — baseline for this modal session
}

// ---------- D129: unsaved-changes guard ----------
// Jake edited a want-to's stages, hit ✕ to leave WITHOUT saving (which he
// wanted), and noted the app never checked — it got lucky that discard
// was the intent. This guards every editing modal with a Save button.
//
// Design (Jake's call): warn ONLY on real unsaved edits, not on every
// close. So it's a snapshot-on-open / compare-on-close dirty check — a
// serialized signature of the editor's fields captured when it opens,
// re-derived on the close path and compared. Edit-then-revert reads as
// clean (the signatures match), so the guard stays quiet exactly when
// there's nothing to lose. One helper per editor produces its signature;
// guardedClose() does the compare + confirm and only closes if clean or
// confirmed. Deliberately NOT a beforeunload/global thing — those fire on
// tab close and can't be styled or scoped; this is per-modal and precise.

const dirtySnapshots = {};   // modalId -> signature string at open time

/** Record the modal's current field signature as its clean baseline.
 *  Call at the END of each open* function, after fields are populated. */
function markClean(modalId, signatureFn) {
  dirtySnapshots[modalId] = signatureFn();
}

/** True if the editor's fields differ from their open-time snapshot. */
function isDirty(modalId, signatureFn) {
  return dirtySnapshots[modalId] !== undefined && signatureFn() !== dirtySnapshots[modalId];
}

/** The close gate: if dirty, confirm; if the user cancels, DON'T close.
 *  Returns true if the close should proceed (clean, or confirmed discard). */
function guardedClose(modalId, signatureFn) {
  if (isDirty(modalId, signatureFn) &&
      !confirm("You have unsaved changes. Leave without saving?")) {
    return false;
  }
  delete dirtySnapshots[modalId];
  return true;
}

/** Signature of the stage editor (✎⋮ / stages-modal): every row's name,
 *  direction, anchor, offset, and hurrah flag, in order. */
function stagesSignature() {
  return [...document.querySelectorAll("#stage-proj-editor .stage-tmpl-row")].map(row =>
    [row.querySelector(".st-name").value.trim(),
     row.querySelector(".st-dir").value,
     row.querySelector(".st-anchor").value,
     (parseInt(row.querySelector(".st-off").value, 10) || 0),
     row.querySelector(".st-hurrah").classList.contains("active") ? "H" : ""
    ].join("\u001f")).join("\u001e");
}

/** Signature of the project form (new/edit): name, color, tier, workload,
 *  dates, and — for a NEW project — the chosen type.
 *  D131 — now wired. The form is a persistent inline PANEL, so it has no
 *  ✕; the two real abandon paths are the Cancel button (on an edit) and
 *  startProjectEdit replacing the form's contents with a different project.
 *  Both guard through this; markClean re-baselines after every open/reset/
 *  save so an untouched or freshly-launched form never nags. The color
 *  field is included, but note suggestProjectColor auto-cycles it on reset —
 *  that's fine, since markClean captures the post-reset value as the
 *  baseline, so an auto-suggested color isn't itself "dirty." */
function projectFormSignature() {
  return [
    $("#project-name").value.trim(),
    $("#project-color").value,
    $("#project-tier").value,
    $("#project-workload").value,
    $("#project-start").value,
    $("#project-end").value,
    S.editingProjectId ? "" : ($("#project-type") ? $("#project-type").value : "")
  ].join("\u001f");
}

/** Signature of the whole Settings modal — every tier row's fields plus
 *  all the cfg-* config inputs. Broad on purpose: Settings has no single
 *  Cancel, and losing a half-built tier is the same sting as losing stage
 *  edits. Config fields are captured generically (every #cfg-* control) so
 *  a future setting can't silently fall outside the dirty check. */
function settingsSignature() {
  const tierSig = [...document.querySelectorAll("#tier-editor .tier-row")].map(row =>
    [row.querySelector(".t-rank")?.value,
     row.querySelector(".t-name")?.value,
     row.querySelector(".t-color")?.value,
     row.querySelector(".t-kind")?.value,
     row.querySelector(".t-cal")?.value,
     row.querySelector(".t-carry")?.checked ? "C" : "",
     row.querySelector(".t-timeless")?.checked ? "T" : "",
     [...row.querySelectorAll(".t-dow")].map(d => d.checked ? "1" : "0").join("")
    ].join("\u001f")).join("\u001e");
  const cfgSig = [...document.querySelectorAll('#settings-modal [id^="cfg-"]')]
    .map(el => `${el.id}=${el.type === "checkbox" ? (el.checked ? "1" : "0") : el.value}`)
    .join("\u001f");
  // Also fold in the pipeline draft, which is edited in-place in Settings
  // ▸ Pipeline and committed on Save alongside everything else.
  const pipeSig = pipelineDraft ? JSON.stringify(pipelineDraft) : "";
  return tierSig + "\u001d" + cfgSig + "\u001d" + pipeSig;
}

/** Signature of the follow-up create/edit modal. */
function followupSignature() {
  return [
    $("#fu-title")?.value.trim() ?? "",
    $("#fu-n")?.value ?? "",
    $("#fu-unit")?.value ?? ""
  ].join("\u001f");
}

function closeYvProjectModal() {
  const modal = $("#yv-project-modal");
  if (modal.hidden) return;
  modal.hidden = true;
  const { parent, next } = projFormReturn;
  parent.insertBefore($("#project-form-title"), next);
  parent.insertBefore($("#project-form"), next);
}

// ---------- D68: month-grid layout ----------

/** A month's Sun-anchored week windows: [{ws,we}] plus [mS,mE). */
function gridWeeksOfMonth(monthStart) {
  const d0 = new Date(monthStart);
  const mE = new Date(d0.getFullYear(), d0.getMonth() + 1, 1).getTime();
  const first = new Date(monthStart);
  first.setDate(first.getDate() - first.getDay()); // back to Sunday
  const weeks = [];
  const c = new Date(first);
  while (c.getTime() < mE) {
    const ws = c.getTime();
    const e = new Date(c);
    e.setDate(e.getDate() + 7);
    weeks.push([ws, e.getTime()]);
    c.setDate(c.getDate() + 7);
  }
  return { mS: monthStart, mE, weeks };
}

/** D69: the user-pinned bar sizing, or null when "auto" (each layout
 *  then applies its own judgment). Pins are honest pixels everywhere. */
function yvPinnedSize() {
  return { full: { LANE: 24, BAR: 20 }, half: { LANE: 14, BAR: 10 }, quarter: { LANE: 9, BAR: 5 }, hair: { LANE: 3, BAR: 2 } }[S.yearBarSize] || null;
}

/** Wall-calendar rendering: bars clip to week ∩ month (so shared
 *  spillover weeks don't show the same bar in two month blocks), and
 *  lanes pack PER WEEK, gcal-style. Drag works within a week row —
 *  the live date readout still tracks past its edges. */
function renderYearGrid(grid, monthsList, projs, now, wall = false) {
  // Pass 1: pack every week; the max concurrency sets the density.
  const months = monthsList.map(m => {
    const { mS, mE, weeks } = gridWeeksOfMonth(m);
    const packed = weeks.map(([ws, we]) => {
      const lo = Math.max(ws, mS), hi = Math.min(we, mE);
      const segs = [], laneEnds = [];
      for (const p of projs) {
        const ps = startOfDayTs(p.startDate || 0);
        const pe = startOfDayTs(p.endDate || p.startDate || 0) + DAY_MS;
        const segS = Math.max(ps, lo), segE = Math.min(pe, hi);
        if (segE <= segS) continue;
        let li = laneEnds.findIndex(le => le <= segS);
        if (li === -1) { li = laneEnds.length; laneEnds.push(segE); } else laneEnds[li] = segE;
        segs.push({ p, ps, pe, segS, segE, lane: li });
      }
      return { ws, we, segs, laneCount: laneEnds.length };
    });
    return { mS, mE, weeks: packed };
  });
  const maxConc = months.reduce((mx, m) => Math.max(mx, 0, ...m.weeks.map(w => w.laneCount)), 0);
  const pin = yvPinnedSize();               // D69: pins beat every auto
  let GL, GB;
  if (wall) {
    // D72: rows ARE quarters. Columns MIRROR the CSS breakpoints
    // (850/520 → 3/2/1) — change both together. Each visual row of
    // months sizes to ITS OWN max weekly concurrency (Jake), so the
    // fit solves GL across the real quarter mix instead of letting
    // one loaded week tax the whole year.
    const rect = grid.getBoundingClientRect();
    const gw = rect.width || 1200;
    const cols = gw >= 850 ? 3 : gw >= 520 ? 2 : 1;
    const stats = [];
    for (let i = 0; i < months.length; i += cols) {
      const g = months.slice(i, i + cols);
      const st = {
        lanes: Math.max(1, ...g.flatMap(m => m.weeks.map(w => w.laneCount))),
        weeks: Math.max(...g.map(m => m.weeks.length))
      };
      g.forEach(m => { m.rowLanes = st.lanes; });
      stats.push(st);
    }
    if (pin) { GL = pin.LANE; GB = pin.BAR; }
    else {
      const avail = Math.max(240, fitAvail(grid) - 110);      // D71 arithmetic · D105: window OR pane, fitAvail knows
      const denom = Math.max(1, stats.reduce((a, st) => a + st.weeks * st.lanes, 0));
      GL = Math.floor((avail - stats.length * 26 - (stats.length - 1) * 10) / denom);
      GL = Math.max(3, Math.min(14, GL));   // floor = 2px hairline bars
      GB = Math.max(2, GL - (GL <= 4 ? 1 : GL <= 8 ? 2 : 4));
    }
  } else if (pin) { GL = pin.LANE; GB = pin.BAR; }
  else {
    GL = maxConc <= 4 ? 20 : maxConc <= 9 ? 13 : 9;
    GB = GL - 4;
  }
  const gLabels = GB >= 16 && true;         // D70: any bar tall enough speaks (wall included)

  const dows = wall ? ["S", "M", "T", "W", "T", "F", "S"]
                    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayTs = startOfDayTs(now);
  // D123 — holidays for the whole grid window, once. In-month cells only, so a
  // holiday on a spillover day shows in its OWN month block, never twice.
  let holMap = null;
  if (S.showHolidays && monthsList.length) {
    const lastD = new Date(Math.max(...monthsList));
    holMap = holidaysForRange(Math.min(...monthsList),
      new Date(lastD.getFullYear(), lastD.getMonth() + 1, 1).getTime());
  }
  for (const m of months) {
    const box = document.createElement("div");
    box.className = "yvg-month";
    const md = new Date(m.mS);
    const head = document.createElement("div");
    head.className = "yvg-head";
    const nd0 = new Date(now);
    if (nd0.getFullYear() === md.getFullYear() && nd0.getMonth() === md.getMonth()) head.classList.add("yv-now");
    head.textContent = wall
      ? md.toLocaleDateString([], md.getMonth() === 0 ? { month: "short", year: "numeric" } : { month: "short" })
      : md.toLocaleDateString([], { month: "long", year: "numeric" });
    if (S.yearZoom == null) {
      head.title = "Zoom to this month";
      head.addEventListener("click", () => { S.yearZoom = m.mS; renderYear(); });
    }
    box.append(head);

    if (!wall) { // D71: the Annual view spends these pixels on lanes instead
      const dowRow = document.createElement("div");
      dowRow.className = "yvg-dow";
      dows.forEach(d => {
        const sp = document.createElement("span");
        sp.textContent = d;
        dowRow.append(sp);
      });
      box.append(dowRow);
    }

    for (const wk of m.weeks) {
      const wkEl = document.createElement("div");
      wkEl.className = "yvg-week";
      const daysEl = document.createElement("div");
      daysEl.className = "yvg-days";
      const c = new Date(wk.ws);
      for (let i = 0; i < 7; i++) {
        const cell = document.createElement("div");
        cell.className = "yvg-day";
        const ts = c.getTime();
        const inMonth = ts >= m.mS && ts < m.mE;
        if (!inMonth) cell.classList.add("yvg-out");
        if (c.getDay() === 0 || c.getDay() === 6) cell.classList.add("yvg-we");
        if (inMonth && ts === todayTs) cell.classList.add("yvg-today");
        if (inMonth && holMap && holMap.has(ts)) {          // D123
          cell.classList.add("yvg-holiday");
          cell.title = holMap.get(ts).name;
        }
        cell.textContent = c.getDate();
        daysEl.append(cell);
        c.setDate(c.getDate() + 1);
      }
      wkEl.append(daysEl);

      const lanes = document.createElement("div");
      lanes.className = "yvg-lanes";
      lanes.dataset.ws = wk.ws;                             // D73: drag hit-testing
      lanes.dataset.days = 7;
      lanes.dataset.clipS = Math.max(wk.ws, m.mS);          // D76: ghosts respect the
      lanes.dataset.clipE = Math.min(wk.we, m.mE);          // month-clip, like bars do
      lanes.style.height = `${(wall ? m.rowLanes : Math.max(1, wk.laneCount)) * GL + 2}px`; // D72: uniform per QUARTER row
      const span = wk.we - wk.ws;
      for (const g of wk.segs) {
        const bar = document.createElement("div");
        bar.className = "yv-bar" + (g.ps < g.segS ? " cont-l" : "") + (g.pe > g.segE ? " cont-r" : "");
        bar.style.left = `${((g.segS - wk.ws) / span) * 100}%`;
        bar.style.width = `${((g.segE - g.segS) / span) * 100}%`;
        bar.style.top = `${g.lane * GL}px`;
        const yvExp = S.yearExpanded.has(g.p.id);           // D117
        const gbH = yvExp ? Math.max(GB, 18) : GB;
        if (yvExp) bar.classList.add("forced-full");
        bar.style.height = `${gbH}px`;
        bar.style.setProperty("--bar-r", gbH >= 14 ? "5px" : gbH >= 5 ? "3px" : "2px");
        if (gbH <= 4) bar.classList.add("thin");            // D70: hairlines drop the border
        const prog = projectProgress(g.p);
        const fillT = g.ps + prog.pct * (g.pe - g.ps);
        const fillPct = Math.max(0, Math.min(1, (fillT - g.segS) / (g.segE - g.segS))) * 100;
        const col = g.p.color || "#4dd0c4";
        bar.style.background = `linear-gradient(90deg, ${hexToRgba(col, 0.95)} ${fillPct}%, ${hexToRgba(col, 0.28)} ${fillPct}%)`;
        if ((gLabels && (g.segE - g.segS) >= 3 * DAY_MS) || yvExp) {   // D117: expanded bars ALWAYS get their name
          const lbl = document.createElement("span");
          lbl.className = "yv-bar-label";
          lbl.textContent = g.p.name;
          if (fillPct < 35) {
            lbl.style.color = "#dce7f0";
            lbl.style.textShadow = "0 1px 2px rgba(0,0,0,.7)";
          }
          bar.append(lbl);
        }
        bar.title = yvDetails(g.p, prog);
        if (g.ps === g.segS) { const h = document.createElement("div"); h.className = "yv-handle l"; bar.append(h); }
        if (g.pe === g.segE) { const h = document.createElement("div"); h.className = "yv-handle r"; bar.append(h); }
        wireBarDrag(bar, g.p, span, lanes);
        lanes.append(bar);
      }
      wkEl.append(lanes);
      box.append(wkEl);
    }
    grid.append(box);
  }
}

function renderYear() {
  // D110 — this guard predates the dashboard and silently refused to
  // repaint the year PANE: buttons fired, state changed, nothing drew,
  // and the pane sat there as a frozen snapshot of the last solo render.
  // (renderWeek never had a view guard, which is why the week pane lived.)
  if ((S.view !== "year" && S.view !== "dash") || !S.user) return;
  const grid = $("#yv-grid");
  grid.innerHTML = "";
  const now = Date.now();

  // Row windows: one zoomed month, or 4 quarter-aligned rows of 3.
  let rows = [];
  if (S.yearZoom != null) {
    const z = new Date(S.yearZoom);
    rows.push([z.getTime(), new Date(z.getFullYear(), z.getMonth() + 1, 1).getTime()]);
  } else {
    const a = yearAnchorMonth();
    for (let r = 0; r < 4; r++) {
      rows.push([
        new Date(a.getFullYear(), a.getMonth() + r * 3, 1).getTime(),
        new Date(a.getFullYear(), a.getMonth() + r * 3 + 3, 1).getTime()
      ]);
    }
  }
  const winStart = rows[0][0], winEnd = rows[rows.length - 1][1];

  // Nav chrome
  if (S.yearZoom != null) {
    $("#yv-label").textContent = new Date(S.yearZoom).toLocaleDateString([], { month: "long", year: "numeric" });
  } else {
    const a1 = new Date(winStart), a2 = new Date(winEnd - 1);
    $("#yv-label").textContent = a1.getMonth() === 0
      ? String(a1.getFullYear())
      : `${a1.toLocaleDateString([], { month: "short", year: "numeric" })} – ${a2.toLocaleDateString([], { month: "short", year: "numeric" })}`;
  }
  placeNowButton("yv", (S.yearOffset === 0 && S.yearZoom == null) ? 0 : (S.yearOffset > 0 ? 1 : -1)); // D90
  $("#yv-unzoom").hidden = S.yearZoom == null;
  $("#yv-modes").querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.window === S.yearMode));

  // Visible projects — everything intersecting the window, finished
  // included (their bars read fully saturated; that IS the year story).
  // D126 — a want-to's null dates would ALSO fail this window test by
  // epoch-math accident (0 never overlaps a real year), but "accident" is
  // exactly the kind of trap this file's own history keeps warning about
  // (D106, D110). Exclude by tier, explicitly, and let that be the reason.
  const projs = S.projects
    .filter(p => !S.tiers.find(t => t.id === p.tierId)?.timeless)
    .filter(p => startOfDayTs(p.startDate || 0) < winEnd &&
                 startOfDayTs(p.endDate || p.startDate || 0) + DAY_MS > winStart)
    .sort((x, y) => (x.startDate || 0) - (y.startDate || 0));
  $("#yv-empty").hidden = projs.length !== 0;
  $("#yv-layouts").querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.layout === S.yearLayout));

  $("#yv-sizes").querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b.dataset.size === S.yearBarSize));
  $("#yv-holidays").classList.toggle("active", S.showHolidays);   // D123

  // D68/D69: calendar layouts take over here; the Gantt continues below.
  // A zoomed wall month renders BIG (stacked-month styling) — the wall
  // cell look is for the 12-up overview only.
  const wall = S.yearLayout === "wall" && S.yearZoom == null;
  grid.classList.toggle("yv-wall", wall);
  if (S.yearLayout !== "timeline") {
    const monthsList = [];
    if (S.yearZoom != null) monthsList.push(S.yearZoom);
    else {
      const a = yearAnchorMonth();
      for (let m = 0; m < 12; m++) monthsList.push(new Date(a.getFullYear(), a.getMonth() + m, 1).getTime());
    }
    renderYearGrid(grid, monthsList, projs, now, wall);
    renderYearLegend(projs);
    return;
  }

  // Global greedy lane packing: a project keeps ONE lane all year.
  const laneOf = new Map(), laneEnds = [];
  for (const p of projs) {
    const s0 = startOfDayTs(p.startDate || 0), e0 = startOfDayTs(p.endDate || p.startDate || 0);
    let li = laneEnds.findIndex(le => le < s0);
    if (li === -1) { li = laneEnds.length; laneEnds.push(e0); } else laneEnds[li] = e0;
    laneOf.set(p.id, li);
  }
  // D68: bars size to the WINDOW — the rows' total lanes share the
  // vertical space Jake actually has (2K gets thick bars, phones get
  // slivers), clamped to 9–34px lanes; a resize re-flows (debounced).
  const rowLanes = rows.map(([rs0, re0]) => projs.reduce((mx, p) => {
    const ps0 = startOfDayTs(p.startDate || 0);
    const pe0 = startOfDayTs(p.endDate || p.startDate || 0) + DAY_MS;
    return (pe0 <= rs0 || ps0 >= re0) ? mx : Math.max(mx, laneOf.get(p.id) + 1);
  }, 1));
  const totalLanes = rowLanes.reduce((a, b) => a + b, 0);
  const pin = yvPinnedSize();                               // D69: pins beat the window fit
  const avail = Math.max(220, fitAvail(grid) - 150);          // D71 arithmetic · D105: window OR pane, fitAvail knows
  const LANE_H = pin ? pin.LANE
    : Math.max(9, Math.min(34, Math.floor((avail - rows.length * 46) / totalLanes)));
  const BAR_H = LANE_H - 4;
  const showLabels = BAR_H >= 16;
  // D123 — holidays across the whole timeline window, once for every row.
  const tlHolidays = S.showHolidays ? holidaysForRange(winStart, winEnd) : null;

  for (const [rs, re] of rows) {
    const span = re - rs;
    const row = document.createElement("div");
    row.className = "yv-row";

    // Month headers flex-grown by day count (day ticks when zoomed).
    const months = document.createElement("div");
    months.className = "yv-months";
    if (S.yearZoom != null) {
      const dcount = Math.round(span / DAY_MS);
      for (let d = 0; d < dcount; d++) {
        const c = document.createElement("div");
        c.className = "yv-month yv-day-tick";
        c.style.flexGrow = 1;
        c.textContent = d + 1;
        months.append(c);
      }
    } else {
      for (let m = 0; m < 3; m++) {
        const ms = new Date(rs);
        ms.setMonth(ms.getMonth() + m);
        const me = new Date(ms.getFullYear(), ms.getMonth() + 1, 1);
        const c = document.createElement("div");
        c.className = "yv-month";
        const nd = new Date(now);
        if (nd.getFullYear() === ms.getFullYear() && nd.getMonth() === ms.getMonth()) c.classList.add("yv-now");
        c.style.flexGrow = Math.round((me.getTime() - ms.getTime()) / DAY_MS);
        c.textContent = ms.toLocaleDateString([], ms.getMonth() === 0 ? { month: "short", year: "numeric" } : { month: "short" });
        c.title = "Zoom to this month";
        c.addEventListener("click", () => { S.yearZoom = ms.getTime(); renderYear(); });
        months.append(c);
      }
    }
    row.append(months);

    const lanes = document.createElement("div");
    lanes.className = "yv-lanes";
    lanes.dataset.ws = rs;                                  // D73: drag hit-testing
    lanes.dataset.days = Math.round(span / DAY_MS);
    lanes.dataset.clipS = rs; lanes.dataset.clipE = re;     // D76: ghost clip = full row
    const rowMax = projs.reduce((mx, p) => {
      const ps0 = startOfDayTs(p.startDate || 0);
      const pe0 = startOfDayTs(p.endDate || p.startDate || 0) + DAY_MS;
      return (pe0 <= rs || ps0 >= re) ? mx : Math.max(mx, laneOf.get(p.id));
    }, 0);
    lanes.style.height = `${(rowMax + 1) * LANE_H + 4}px`; // only the lanes this row uses

    // D66 day texture (both views): weekend shading, faint day lines,
    // stronger Monday week lines; month boundaries strongest.
    const cur = new Date(rs);
    while (cur.getTime() < re) {
      const ts = cur.getTime();
      if (cur.getDay() === 6) {                 // Saturday → shade through Sunday
        const wkEnd = new Date(cur);
        wkEnd.setDate(wkEnd.getDate() + 2);
        const w = document.createElement("div");
        w.className = "yv-weekend";
        w.style.left = `${((ts - rs) / span) * 100}%`;
        w.style.width = `${((Math.min(wkEnd.getTime(), re) - ts) / span) * 100}%`;
        lanes.append(w);
      }
      if (ts !== rs && cur.getDate() !== 1) {   // 1sts get the month line below
        const gl = document.createElement("div");
        gl.className = "yv-gridline " + (cur.getDay() === 1 ? "yv-weekline" : "yv-dayline");
        gl.style.left = `${((ts - rs) / span) * 100}%`;
        lanes.append(gl);
      }
      if (tlHolidays && tlHolidays.has(ts)) {   // D123 — accent tick + name on hover
        const hm = document.createElement("div");
        hm.className = "yv-holiday-mark";
        hm.style.left = `${((ts - rs) / span) * 100}%`;
        hm.title = tlHolidays.get(ts).name;
        lanes.append(hm);
      }
      cur.setDate(cur.getDate() + 1);
    }
    if (S.yearZoom == null) {
      for (let m = 1; m < 3; m++) {
        const ms = new Date(rs);
        ms.setMonth(ms.getMonth() + m);
        const gl = document.createElement("div");
        gl.className = "yv-gridline";
        gl.style.left = `${((ms.getTime() - rs) / span) * 100}%`;
        lanes.append(gl);
      }
    }

    if (now >= rs && now < re) {
      const t = document.createElement("div");
      t.className = "yv-todayline";
      t.style.left = `${((now - rs) / span) * 100}%`;
      lanes.append(t);
    }

    for (const p of projs) {
      const ps = startOfDayTs(p.startDate || 0);
      const pe = startOfDayTs(p.endDate || p.startDate || 0) + DAY_MS; // end day inclusive
      if (pe <= rs || ps >= re) continue;
      const segS = Math.max(ps, rs), segE = Math.min(pe, re);
      const bar = document.createElement("div");
      bar.className = "yv-bar" + (ps < rs ? " cont-l" : "") + (pe > re ? " cont-r" : "");
      bar.style.left = `${((segS - rs) / span) * 100}%`;
      bar.style.width = `${((segE - segS) / span) * 100}%`;
      bar.style.top = `${laneOf.get(p.id) * LANE_H + 2}px`;
      const yvExpT = S.yearExpanded.has(p.id);              // D117
      const tlH = yvExpT ? Math.max(BAR_H, 18) : BAR_H;
      if (yvExpT) bar.classList.add("forced-full");
      bar.style.height = `${tlH}px`;
      bar.style.setProperty("--bar-r", tlH >= 16 ? "6px" : "3px");

      // D30a: pale ghost of the project color, saturating left-to-right
      // by pipeline % — computed against the WHOLE bar, clipped to this
      // segment, so multi-quarter projects fill continuously.
      const prog = projectProgress(p);
      const fillT = ps + prog.pct * (pe - ps);
      const fillPct = Math.max(0, Math.min(1, (fillT - segS) / (segE - segS))) * 100;
      const c = p.color || "#4dd0c4";
      bar.style.background = `linear-gradient(90deg, ${hexToRgba(c, 0.95)} ${fillPct}%, ${hexToRgba(c, 0.28)} ${fillPct}%)`;

      if (showLabels || yvExpT) { // thin bars speak through hover/tap/legend (D66) — D117: expanded bars ALWAYS get their name
        const lbl = document.createElement("span");
        lbl.className = "yv-bar-label";
        lbl.textContent = p.name;
        if (fillPct < 35) { // label sits over the ghost — go light-on-dark
          lbl.style.color = "#dce7f0";
          lbl.style.textShadow = "0 1px 2px rgba(0,0,0,.7)";
        }
        bar.append(lbl);
      }
      bar.title = yvDetails(p, prog);

      // Stretch handles only where this segment shows a TRUE end.
      if (ps >= rs) { const h = document.createElement("div"); h.className = "yv-handle l"; bar.append(h); }
      if (pe <= re) { const h = document.createElement("div"); h.className = "yv-handle r"; bar.append(h); }
      wireBarDrag(bar, p, span, lanes);
      lanes.append(bar);
    }
    row.append(lanes);
    grid.append(row);
  }
  renderYearLegend(projs);
}

function hexToRgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function colorDistance(h1, h2) {
  const [r1, g1, b1] = hexToRgb(h1), [r2, g2, b2] = hexToRgb(h2);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
function bestFreeColor() {
  const used = S.projects.filter(p => p.id !== S.editingProjectId).map(p => p.color);
  if (!used.length) return COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
  let best = COLOR_POOL[0], bestScore = -1;
  for (const c of COLOR_POOL) {
    const score = Math.min(...used.map(u => colorDistance(c, u)));
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}
function suggestProjectColor(force = false) {
  const field = $("#project-color");
  if (!field || S.editingProjectId) return;
  if (force || field.value.toLowerCase() === S.lastSuggestedColor.toLowerCase()) {
    const c = bestFreeColor();
    field.value = c;
    S.lastSuggestedColor = c;
    checkProjectColor();
  }
}
function checkProjectColor() {
  const hint = $("#project-color-hint");
  if (!hint) return;
  const chosen = $("#project-color").value;
  let nearest = null, nearestDist = Infinity;
  for (const p of S.projects) {
    if (p.id === S.editingProjectId) continue;
    const d = colorDistance(chosen, p.color);
    if (d < nearestDist) { nearestDist = d; nearest = p; }
  }
  if (nearest && nearestDist < 25) {
    hint.textContent = `⚠️ Same color as ${nearest.name} (${projWhen(nearest)}). Try ${bestFreeColor()}.`;
  } else if (nearest && nearestDist < 60) {
    hint.textContent = `⚠️ Very close to ${nearest.name} (${projWhen(nearest)}). Try ${bestFreeColor()}.`;
  } else {
    hint.textContent = "";
  }
}

// ---------- Un-complete rewind (D53) ----------

/** Incomplete children that HAVE a dueAt were materialized by this
 *  parent's completion (follow-ups are born with dueAt:null). */
function materializedKids(parentId) {
  return S.tasks.filter(t =>
    t.parentTaskId === parentId && t.dueAt != null && !t.completedAt);
}

function onTaskUncheck(t) {
  const kids = materializedKids(t.id);
  if (!kids.length) { setTaskDone(t.id, false); return; }
  S.uncheckTarget = t;
  const names = kids.map(k => `"${k.title}" (${fmtDay(k.dueAt)})`).join(", ");
  $("#uncheck-title").textContent = `Un-complete "${t.title}"?`;
  $("#uncheck-text").textContent =
    `Completing it scheduled ${kids.length === 1 ? "a follow-up" : "follow-ups"}: ${names}. What should happen?`;
  $("#uncheck-modal").hidden = false;
  render(); // snap the checkbox back to ✓ until a choice is made
}

function resolveUncheck(choice) {
  const t = S.uncheckTarget;
  S.uncheckTarget = null;
  $("#uncheck-modal").hidden = true;
  if (!t) return;
  if (choice === "oops") { render(); return; }        // stays done, follow-ups keep dates
  if (choice === "rewind") {                          // truly not done: pull kids back to Waiting
    setTaskDone(t.id, false).then(() => rewindFollowUps(t.id));
    return;
  }
  setTaskDone(t.id, false);                           // "keep": un-done, follow-ups stay dated
}

/** D82: "+45m", "+2h", "+3d", "+1w" from fractional offsetDays. */
function fmtOffset(days) {
  const m = Math.round((days || 0) * 1440);
  if (m > 0 && m % 10080 === 0) return `${m / 10080}w`;
  if (m > 0 && m % 1440 === 0) return `${m / 1440}d`;
  if (m > 0 && m % 60 === 0) return `${m / 60}h`;
  return `${m}m`;
}

/** Decompose fractional days into the friendliest {n, unit}. */
function splitOffset(days) {
  const m = Math.round((days || 0) * 1440);
  if (m > 0 && m % 10080 === 0) return { n: m / 10080, unit: "weeks" };
  if (m > 0 && m % 1440 === 0) return { n: m / 1440, unit: "days" };
  if (m > 0 && m % 60 === 0) return { n: m / 60, unit: "hours" };
  return { n: Math.max(1, m), unit: "minutes" };
}

// D111 — harmonized ladder. Follow-ups store offsetDays, so the calendar
// units are day-averages here (30.44 / 365.25 / ×10 / ×100) — a follow-up
// a century out can tolerate leap drift ("amusing" was the design goal).
// Recurrence, which owns real schedules, uses calendar-correct addInterval
// in store.js instead.
const OFFSET_UNIT_DAYS = { minutes: 1 / 1440, hours: 1 / 24, days: 1, weeks: 7, months: 30.44, years: 365.25, decades: 3652.5, centuries: 36525 };
let fuTarget = null; // {mode:"create", item} | {mode:"edit", task}

function openFollowUpModal(target) {
  fuTarget = target;
  const isEdit = target.mode === "edit";
  $("#fu-heading").textContent = isEdit ? "Edit follow-up" : `Follow-up to "${(target.item || target.task).title}"`;
  const t = isEdit ? target.task : null;
  $("#fu-title").value = isEdit ? t.title : `Follow up: ${target.item.title}`;
  const { n, unit } = splitOffset(isEdit ? t.offsetDays : 3);
  $("#fu-n").value = n;
  $("#fu-unit").value = unit;
  $("#followup-modal").hidden = false;
  $("#fu-title").focus();
  markClean("followup", followupSignature);   // D129
}

function saveFollowUpModal() {
  const title = $("#fu-title").value.trim();
  const n = Math.max(1, parseInt($("#fu-n").value, 10) || 0);
  const unit = $("#fu-unit").value;
  if (!title || !OFFSET_UNIT_DAYS[unit]) return;
  const offsetDays = n * OFFSET_UNIT_DAYS[unit];
  if (fuTarget?.mode === "edit") updateTask(fuTarget.task.id, { title, offsetDays });
  else if (fuTarget?.mode === "create") addFollowUp(fuTarget.item.id, { title, offsetDays, tierId: fuTarget.item.tier?.id || fuTarget.item.raw.tierId });
  delete dirtySnapshots["followup"];   // D129 — saved
  $("#followup-modal").hidden = true;
  fuTarget = null;
}

function followUpPrompt(item) {
  openFollowUpModal({ mode: "create", item });
}

// ---------- D132: chained follow-ups authored at task creation ----------
//
// The whole feature rides on the model D4 already shipped and needs NO
// schema change: a follow-up is a task with dueAt:null + parentTaskId, and
// setTaskDone materializes every waiting child of the task just completed.
// Both anchors Katie asked for fall out of that for free:
//   "after the previous step" → each row parents the row above → completing
//      step 1 dates ONLY step 2; step 3 is waiting on step 2, untouched.
//      A sequential chain, with no chain concept in the database.
//   "after this task"         → the row parents the ROOT → completing the
//      root dates all such rows at once. That's D4's fan-out, unchanged.
// Row 1 is always root-anchored because "the previous step" IS the task —
// offering a choice there would be two words for one thing.
//
// Creation must be SEQUENTIAL, not Promise.all: a row anchored to "prev"
// cannot be written until its parent's id exists. That's the one real
// constraint the model imposes, and it's why this is a for-await loop.

const CHAIN_UNITS = ["minutes", "hours", "days", "weeks", "months", "years"];

/** Build one chain row. Rows are DOM-persistent (never re-rendered) so
 *  adding or removing a row can't wipe what she's already typed. */
function chainRow() {
  const row = document.createElement("div");
  row.className = "fu-chain-row";
  const opts = CHAIN_UNITS.map(u =>
    `<option value="${u}"${u === "days" ? " selected" : ""}>${u}</option>`).join("");
  row.innerHTML = `
    <div class="fuc-top">
      <input class="fuc-title" type="text" placeholder="Then what?">
      <button type="button" class="icon-btn fuc-del" title="Remove this follow-up">✕</button>
    </div>
    <div class="fuc-when">
      <input class="fuc-n" type="number" min="1" max="999" value="2">
      <select class="fuc-unit">${opts}</select>
      <span class="fuc-anchor-fixed">after this task</span>
      <select class="fuc-anchor" hidden>
        <option value="prev">after the previous step</option>
        <option value="root">after this task</option>
      </select>
    </div>`;
  row.querySelector(".fuc-del").addEventListener("click", () => {
    row.remove();
    syncChainRows();
  });
  return row;
}

/** Row 0 has no anchor CHOICE (previous step == the task itself), so it
 *  shows the fixed label; every later row gets the select. Called after
 *  any add or remove, because deleting row 0 promotes row 1. */
function syncChainRows() {
  const rows = [...document.querySelectorAll("#fu-chain-rows .fu-chain-row")];
  rows.forEach((row, i) => {
    const sel = row.querySelector(".fuc-anchor");
    const fixed = row.querySelector(".fuc-anchor-fixed");
    sel.hidden = i === 0;
    fixed.hidden = i !== 0;
  });
}

function addChainRow() {
  const host = $("#fu-chain-rows");
  if (!host) return;
  host.append(chainRow());
  syncChainRows();
  host.lastElementChild.querySelector(".fuc-title").focus();
}

function clearChainRows() {
  const host = $("#fu-chain-rows");
  if (host) host.innerHTML = "";
}

/** Read the builder into plain objects. A row with no title is not a
 *  follow-up she meant to make — dropped silently, same as a blank
 *  estimate means "never said" rather than zero (D100). */
function readChainRows() {
  return [...document.querySelectorAll("#fu-chain-rows .fu-chain-row")].map((row, i) => {
    const title = row.querySelector(".fuc-title").value.trim();
    const n = Math.max(1, Math.min(999, parseInt(row.querySelector(".fuc-n").value, 10) || 0));
    const unit = row.querySelector(".fuc-unit").value;
    const anchor = i === 0 ? "root" : row.querySelector(".fuc-anchor").value;
    return { title, offsetDays: n * (OFFSET_UNIT_DAYS[unit] || 1), anchor };
  }).filter(r => r.title);
}

/** Write the chain, in order, after the root task exists. prevId advances
 *  to EVERY row created regardless of that row's own anchor — "previous
 *  step" means the row above in the list, not the last one that happened
 *  to be sequential. */
async function createFollowUpChain(rootId, rows, tierId) {
  let prevId = rootId;
  for (const r of rows) {
    const parentTaskId = r.anchor === "root" ? rootId : prevId;
    const ref = await addFollowUp(parentTaskId, {
      title: r.title, offsetDays: r.offsetDays, tierId
    });
    prevId = ref.id;
  }
}

// ---------- D133: ending a repeat ----------
//
// §5c filed "repeat until done" as a CHAIN with no fixed count — a bigger
// sibling of D132. Reading store.js says otherwise: D111's cactus already
// spawns forever on completion, so "review photos every 2 days until I'm
// done" has been expressible since D111. The only missing verb was STOP,
// and she can't know at creation time how many batches there are — the
// discovery is "oh, that was the last one." So the control belongs on the
// TASK, at the moment she notices, not in the New Task form as a count.
//
// Ending = recurrence:null on this instance. That is the whole mechanism:
// setTaskDone's spawn is gated on t.recurrence?.every, so a null-ed task
// completes like any ordinary task and plants nothing. The task itself
// survives and still wants checking off — ending the series is not the
// same as finishing today's occurrence, and conflating them would check
// something off on her behalf. Reversible by ✎ (and by undo, D116).

function endRecurrence(it) {
  const r = it.raw?.recurrence;
  if (!r) return;
  if (!confirm(
    `Stop "${it.title}" from repeating?\n\n` +
    `It stays on your list and still needs checking off — but finishing it ` +
    `won't schedule another one. You can start it up again by editing the task.`
  )) return;
  pushUndo("end repeat",
    () => updateTask(it.id, { recurrence: r }),
    () => updateTask(it.id, { recurrence: null }));
  updateTask(it.id, { recurrence: null });
}

// ---------- Settings ----------

function switchSettingsTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-pane").forEach(p =>
    { p.hidden = p.dataset.pane !== tab; });
}

function openSettings() {
  $("#settings-modal").hidden = false;
  switchSettingsTab("tiers");
  renderPeople();   // E5 — members may already be in hand
  const c = S.config || {};
  $("#cfg-carryover").value = c.carryoverWriteHour ?? 9;
  $("#cfg-sleep-start").value = c.sleepStart ?? 22;
  $("#cfg-sleep-end").value = c.sleepEnd ?? 6;
  $("#cfg-poll").value = c.pollIntervalMinutes ?? 60;
  $("#cfg-mirror-cal").value = c.mirrorCalendarId ?? "";  // D81
  $("#cfg-rest").checked = localStorage.getItem("tc-rest") !== "0";          // D107 (per-device)
  $("#cfg-idle-dim").checked = localStorage.getItem("tc-idle-dim") !== "0";  // D107 (per-device)
  $("#cfg-alerts").checked = alertsOn();                                     // D137 (per-device)
  $("#cfg-alert-sound").checked = alertSound();
  $("#cfg-alert-notify").checked = alertNotify();
  $("#cfg-alert-vol").value = String(Math.round(alertVol() * 100));
  refreshAlertStatus();
  $("#cfg-deadline-hour").value = c.deadlineHour ?? 16;   // D51
  $("#cfg-decision-days").value = c.decisionThresholdDays ?? 2; // D52
  $("#cfg-cleardeck").value = Math.round((c.clearDeckThreshold ?? 0.6) * 100); // D85
  updatePollCostHint();
  const box = $("#tier-editor");
  box.innerHTML = "";
  for (const t of S.tiers) tierEditorRow(t, false);
  checkTierColors();
  // D124 — the pipeline library draft: Default (stageTemplate) + named types.
  pipelineDraft = {
    default: (S.stageTemplate || []).map(x => ({ ...x })),
    types: (S.projectTypes || []).map(t => ({ id: t.id, name: t.name, stages: (t.stages || []).map(x => ({ ...x })) }))
  };
  pipelineCurrent = "default";
  refreshPipelineTarget();
  loadPipelineEditor();
  markClean("settings", settingsSignature);   // D129
}

/** D55: tiers get the same conflict assistant projects have. One shared
 *  hint line under the editor names the closest colliding pair. */
function checkTierColors() {
  const hint = $("#tier-color-hint");
  if (!hint) return;
  const rows = [...document.querySelectorAll("#tier-editor .tier-row")].map(r => ({
    name: r.querySelector(".t-name").value.trim() || "Untitled",
    color: r.querySelector(".t-color").value
  }));
  let worst = null;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const d = colorDistance(rows[i].color, rows[j].color);
      if (d < 60 && (!worst || d < worst.d)) worst = { d, a: rows[i], b: rows[j] };
    }
  }
  if (!worst) { hint.textContent = ""; return; }
  const used = rows.map(r => r.color.toLowerCase());
  const fresh = TIER_PALETTE.filter(c => !used.includes(c));
  let suggestion = fresh[0] || TIER_PALETTE[0];
  if (fresh.length) {
    let bestScore = -1;
    for (const cand of fresh) {
      const score = Math.min(...used.map(u => colorDistance(cand, u)));
      if (score > bestScore) { bestScore = score; suggestion = cand; }
    }
  }
  hint.textContent = worst.d < 25
    ? `⚠️ ${worst.a.name} and ${worst.b.name} are the same color. Try ${suggestion}.`
    : `⚠️ ${worst.a.name} and ${worst.b.name} are very close. Try ${suggestion}.`;
}

const TIER_PALETTE = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc", "#f783ac", "#63e6be", "#ffc9c9", "#a5d8ff"];

function tierEditorRow(t, isNew) {
  const box = $("#tier-editor");
  if (isNew) {
    const ranks = [...box.querySelectorAll(".t-rank")].map(el => parseInt(el.value, 10) || 0);
    const used = new Set([...box.querySelectorAll(".t-color")].map(el => el.value.toLowerCase()));
    const fresh = TIER_PALETTE.filter(c => !used.has(c));
    t = {
      rank: (ranks.length ? Math.max(...ranks) : 0) + 1,
      color: (fresh.length ? fresh : TIER_PALETTE)[Math.floor(Math.random() * (fresh.length ? fresh.length : TIER_PALETTE.length))],
      kind: "task"
    };
  }
  const row = document.createElement("div");
  row.className = "tier-row";
  row.dataset.id = t.id || "";
  // D60: which days count for this tier — reschedule targets, project
  // date interception, and stage-offset math all follow these toggles.
  const allowed = new Set((Array.isArray(t.allowedDays) && t.allowedDays.length) ? t.allowedDays : [1, 2, 3, 4, 5]);
  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const dayToggles = dayNames.map((n, d) =>
    `<label class="t-day" title="${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d]}"><input type="checkbox" class="t-dow" data-dow="${d}" ${allowed.has(d) ? "checked" : ""}>${n}</label>`
  ).join("");
  row.innerHTML = `
    <input class="t-rank" type="number" min="1" value="${t.rank ?? 1}" title="Priority rank: only breaks ties in the queue now (D43), but orders the filter chips and dropdowns">
    <input class="t-name" type="text" value="${esc(t.name || "")}" placeholder="Tier name">
    <input class="t-color" type="color" value="${t.color || "#4dabf7"}" title="Tier color (chips in the queue)">
    <select class="t-kind" title="Tasks = checkable items you create here. Calendar = appointments pulled from a Google Calendar (they pin near their start time and never nag).">
      <option value="task" ${t.kind !== "anchor" ? "selected" : ""}>Tasks</option>
      <option value="anchor" ${t.kind === "anchor" ? "selected" : ""}>Calendar</option>
    </select>
    <label class="t-carry-label" title="If tasks in this tier are still unchecked at midnight, they get written onto tomorrow's Google Calendar with a ❗ at the carryover hour below. (Phase 3 feature.)"><input class="t-carry" type="checkbox" ${t.midnightCarryover ? "checked" : ""}> ❗ carryover</label>
    <label class="t-timeless-label" title="Projects on this tier need no start/end date — a parking lot for someday ideas (D126's want-tos). Only ONE tier may be timeless; checking this one unchecks any other." ${t.kind === "anchor" ? "hidden" : ""}><input class="t-timeless" type="checkbox" ${t.timeless ? "checked" : ""}> ⏳ timeless</label>
    <button class="t-del" title="Delete tier">✕</button>
    <span class="t-days" title="Working days for this tier: reschedules land on these days, project dates outside them get intercepted, and pipeline offsets only count them. Weekend jobs? Check Sa/Su." ${t.kind === "anchor" ? "hidden" : ""}>${dayToggles}</span>
    <input class="t-cal" type="text" value="${esc(t.gcalCalendarId || "")}"
      placeholder="Google Calendar ID — GCal ⚙️ → pick calendar → 'Integrate calendar' → Calendar ID"
      title="Which Google Calendar feeds this tier. calendar.google.com → ⚙️ Settings → click the calendar → 'Integrate calendar' → Calendar ID. Your main personal calendar's ID is just your Gmail address."
      ${t.kind === "anchor" ? "" : "hidden"}>`;
  row.querySelector(".t-kind").addEventListener("change", ev => {
    row.querySelector(".t-cal").hidden = ev.target.value !== "anchor";
    row.querySelector(".t-days").hidden = ev.target.value === "anchor";
    row.querySelector(".t-timeless-label").hidden = ev.target.value === "anchor";
    if (ev.target.value === "anchor") row.querySelector(".t-timeless").checked = false; // an anchor can't be someday's parking lot
  });
  // D126 — timeless is a radio across the whole editor, same shape as
  // D109's 🎆: checking one unchecks every other row's box. Containment
  // depends on there being AT MOST one (project form reads whichever
  // tier the editor currently marks).
  row.querySelector(".t-timeless").addEventListener("change", ev => {
    if (!ev.target.checked) return;
    box.querySelectorAll(".t-timeless").forEach(cb => { if (cb !== ev.target) cb.checked = false; });
  });
  row.querySelector(".t-del").addEventListener("click", () => {
    if (row.dataset.id) {
      if (!confirm(`Delete tier "${t.name}"? Tasks in it will show as "?" until re-tiered.`)) return;
      deleteTier(row.dataset.id);
    }
    row.remove();
  });
  box.append(row);
  if (isNew) row.querySelector(".t-name").focus();
}

function wireTmplRow(row, box) {
  row.querySelector(".st-dir").addEventListener("change", () => syncTimingRow(row));
  row.querySelector(".st-up").addEventListener("click", () => {
    if (row.previousElementSibling) box.insertBefore(row, row.previousElementSibling);
  });
  row.querySelector(".st-down").addEventListener("click", () => {
    if (row.nextElementSibling) box.insertBefore(row.nextElementSibling, row);
  });
  row.querySelector(".st-del").addEventListener("click", () => row.remove());
  // D109 — 🎆 is a radio across the editor: marking one un-marks the rest;
  // clicking the marked one clears it (back to last-stage-wins default).
  const hb = row.querySelector(".st-hurrah");
  if (hb) hb.addEventListener("click", () => {
    const was = hb.classList.contains("active");
    box.querySelectorAll(".st-hurrah").forEach(b => b.classList.remove("active"));
    if (!was) hb.classList.add("active");
  });
}

// ---------- D124: project-type LIBRARY (the Pipeline tab) ----------
// One stage editor edits any pipeline. A draft holds the whole library while
// settings is open; switching targets syncs the editor into the draft first,
// so unsaved edits survive a hop. Save persists Default -> saveStageTemplate
// and the rest -> saveProjectTypes.
let pipelineDraft = null;        // { default:[stages], types:[{id,name,stages}] }
let pipelineCurrent = "default"; // "default" | type id

/** Read the shared stage editor's rows into a stages array (with clamping). */
function readStageEditor() {
  return [...document.querySelectorAll("#stage-template-editor .stage-tmpl-row")].map(row => ({
    name: row.querySelector(".st-name").value.trim() || "Untitled stage",
    direction: row.querySelector(".st-dir").value,
    anchor: row.querySelector(".st-anchor").value,
    offsetDays: clampInt(row.querySelector(".st-off").value, 0, 365, 0),
    ...(row.querySelector(".st-hurrah").classList.contains("active") ? { hurrah: true } : {})  // D109
  }));
}

/** Fold the editor's current contents back into the draft's current target. */
function capturePipelineEditor() {
  if (!pipelineDraft) return;
  const stages = readStageEditor();
  if (pipelineCurrent === "default") pipelineDraft.default = stages;
  else { const t = pipelineDraft.types.find(x => x.id === pipelineCurrent); if (t) t.stages = stages; }
}

/** Render the current target's stages into the shared editor. */
function loadPipelineEditor() {
  const stBox = $("#stage-template-editor");
  stBox.innerHTML = "";
  const stages = pipelineCurrent === "default"
    ? pipelineDraft.default
    : (pipelineDraft.types.find(t => t.id === pipelineCurrent)?.stages || []);
  for (const st of stages) stageTemplateRow(normalizeStage(st), false);
}

/** Populate the target selector; Default can't be renamed or deleted. */
function refreshPipelineTarget() {
  const sel = $("#pipeline-target");
  if (!sel || !pipelineDraft) return;
  sel.innerHTML = `<option value="default">Default template</option>` +
    pipelineDraft.types.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
  sel.value = pipelineCurrent;
  $("#pipeline-delete").disabled = pipelineCurrent === "default";
  $("#pipeline-rename").disabled = pipelineCurrent === "default";
}

function wirePipelineManager() {
  $("#pipeline-target").addEventListener("change", e => {
    capturePipelineEditor();
    pipelineCurrent = e.target.value;
    refreshPipelineTarget();
    loadPipelineEditor();
  });
  $("#pipeline-new").addEventListener("click", () => {
    const name = (prompt("Name this project type (e.g. Holiday Card):") || "").trim();
    if (!name) return;
    capturePipelineEditor();
    const id = "pt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    pipelineDraft.types.push({ id, name, stages: [] });
    pipelineCurrent = id;
    refreshPipelineTarget();
    loadPipelineEditor();
  });
  $("#pipeline-rename").addEventListener("click", () => {
    if (pipelineCurrent === "default") return;
    const t = pipelineDraft.types.find(x => x.id === pipelineCurrent);
    if (!t) return;
    const name = (prompt("Rename this project type:", t.name) || "").trim();
    if (!name) return;
    t.name = name;
    refreshPipelineTarget();
  });
  $("#pipeline-delete").addEventListener("click", () => {
    if (pipelineCurrent === "default") return;
    const t = pipelineDraft.types.find(x => x.id === pipelineCurrent);
    if (!t) return;
    if (!confirm(`Delete the "${t.name}" project type? Projects already created from it keep their stages.`)) return;
    pipelineDraft.types = pipelineDraft.types.filter(x => x.id !== pipelineCurrent);
    pipelineCurrent = "default";
    refreshPipelineTarget();
    loadPipelineEditor();
  });
}

function stageTemplateRow(st, isNew) {
  const box = $("#stage-template-editor");
  const row = document.createElement("div");
  row.className = "stage-tmpl-row";
  row.innerHTML = `
    <span class="st-move"><button class="st-up" title="Move up">▲</button><button class="st-down" title="Move down">▼</button></span>
    <input class="st-name" type="text" value="${esc(st.name || "")}" placeholder="Stage name">
    ${timingSelects(st)}
    <button class="st-hurrah${st.hurrah ? " active" : ""}" title="The big hurrah 🎆 — every project built from this template celebrates big when THIS stage completes. One per template.">🎆</button>
    <button class="st-del" title="Remove stage">✕</button>`;
  wireTmplRow(row, box);
  box.append(row);
  if (isNew) row.querySelector(".st-name").focus();
}

function onSaveSettings() {
  // D107 — the two screen-care toggles are PER-DEVICE (the TV is a device):
  // localStorage, not workspace config, and they apply immediately.
  localStorage.setItem("tc-rest", $("#cfg-rest").checked ? "1" : "0");
  localStorage.setItem("tc-idle-dim", $("#cfg-idle-dim").checked ? "1" : "0");
  // D137 — the alert switches are per-device for the same reason (the wall
  // and the tablet should speak; a phone in a client meeting should not).
  localStorage.setItem("tc-alerts", $("#cfg-alerts").checked ? "1" : "0");
  localStorage.setItem("tc-alert-sound", $("#cfg-alert-sound").checked ? "1" : "0");
  localStorage.setItem("tc-alert-notify", $("#cfg-alert-notify").checked ? "1" : "0");
  localStorage.setItem("tc-alert-vol", String(clampInt($("#cfg-alert-vol").value, 0, 100, 70)));
  pokeIdle();
  updateScreenRest();
  refreshAlertStatus();
  saveConfig({
    carryoverWriteHour: clampInt($("#cfg-carryover").value, 0, 23, 9),
    pollIntervalMinutes: clampInt($("#cfg-poll").value, 5, 1440, 60),
    mirrorCalendarId: $("#cfg-mirror-cal").value.trim(),   // D81
    sleepStart: clampInt($("#cfg-sleep-start").value, 0, 23, 22),
    sleepEnd: clampInt($("#cfg-sleep-end").value, 0, 23, 6),
    deadlineHour: clampInt($("#cfg-deadline-hour").value, 0, 23, 16),      // D51
    decisionThresholdDays: clampInt($("#cfg-decision-days").value, 1, 30, 2), // D52
    clearDeckThreshold: clampInt($("#cfg-cleardeck").value, 0, 100, 60) / 100 // D85
  });
  for (const row of document.querySelectorAll(".tier-row")) {
    const kind = row.querySelector(".t-kind").value;
    // D60: gather the day toggles; an accidental zero-day tier falls
    // back to Mon–Fri rather than making scheduling math impossible.
    let allowedDays = [...row.querySelectorAll(".t-dow")]
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.dataset.dow, 10));
    if (!allowedDays.length) allowedDays = [1, 2, 3, 4, 5];
    const data = {
      rank: clampInt(row.querySelector(".t-rank").value, 1, 99, 99),
      name: row.querySelector(".t-name").value.trim() || "Untitled",
      color: row.querySelector(".t-color").value,
      kind,
      midnightCarryover: row.querySelector(".t-carry").checked,
      timeless: kind !== "anchor" && row.querySelector(".t-timeless").checked, // D126
      gcalCalendarId: kind === "anchor" ? row.querySelector(".t-cal").value.trim() : "",
      allowedDays
    };
    if (kind === "anchor") data.defaultLeadWindowMinutes = 30;
    saveTier(row.dataset.id || null, data);
  }
  // D124 — persist the whole pipeline library. Capture the visible editor
  // into its target first, then write Default and the named types.
  capturePipelineEditor();
  saveStageTemplate(pipelineDraft.default);
  saveProjectTypes(pipelineDraft.types);
  delete dirtySnapshots["settings"];   // D129 — saved; the close below must not re-prompt
  closeSettings();
}

function closeSettings() {
  // D129 — fold the visible pipeline editor into the draft first, so an
  // unsaved stage-row edit counts as dirty (the draft is what the
  // signature reads). capturePipelineEditor is a no-op if nothing's loaded.
  capturePipelineEditor();
  if (!guardedClose("settings", settingsSignature)) return;
  $("#settings-modal").hidden = true;
}

function updatePollCostHint() {
  const raw = parseInt($("#cfg-poll").value, 10);
  const mins = clampInt($("#cfg-poll").value, 5, 1440, 60);
  const runs = Math.round((60 / mins) * 24 * 30.4);
  const clampNote = (!isNaN(raw) && raw !== mins) ? `Minimum is 5 minutes, so I'm using ${mins}. ` : "";
  $("#poll-cost-hint").textContent =
    `${clampNote}Checking every ${mins} min ≈ ${runs.toLocaleString()} checks/month ` +
    `(avg 30.4 days). Google charges nothing until 2,000,000/month — unreachable here. ` +
    `(Phase 3 feature — has no effect yet.)`;
}

// ---------- Utils ----------

// D140 — "Today" beside the due-date field. The native <input type="date">
// picker is drawn by the BROWSER, so we cannot add a button inside it (Jake
// asked; the answer is genuinely no). This is the layer we do own. The
// handler stops propagation because the button lives INSIDE the <label>:
// a click that reaches the label gets forwarded to the labelled control,
// which would pop the very calendar we're trying to skip.
function onDateToday(e) {
  e.preventDefault();
  e.stopPropagation();
  const el = $("#task-date");
  el.value = toDateInput(new Date());
  el.dispatchEvent(new Event("change", { bubbles: true }));   // whatever listens to the field still hears it
}

function toDateInput(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return dflt;
  return Math.max(min, Math.min(max, n));
}

function iconBtn(txt, title, fn) {
  const b = document.createElement("button");
  b.className = "icon-btn";
  b.textContent = txt;
  b.title = title;
  b.addEventListener("click", fn);
  return b;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
