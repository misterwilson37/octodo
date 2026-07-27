// ============================================================
// Tentacalendar — queue.js
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

export const QUEUE_VERSION = "0.20.0";

const DAY_MS = 24 * 60 * 60 * 1000;

// D51: computed (date-only) deadlines are "due by this hour" (24-hr).
// Default 4 PM; settings/config.deadlineHour overrides via the setter.
let DEADLINE_HOUR = 16;
export function setDeadlineHour(h) {
  const n = parseInt(h, 10);
  DEADLINE_HOUR = (!isNaN(n) && n >= 0 && n <= 23) ? n : 16;
}
export function getDeadlineHour() { return DEADLINE_HOUR; }

// D85: completion point (0–1) where a project flips from "keep abreast"
// to "clear the deck" in the level-3 queue tiebreaker. Settings-driven,
// default 60%; fed from the config subscription via setClearDeckThreshold.
let CLEAR_DECK_THRESHOLD = 0.6;
export function setClearDeckThreshold(frac) {
  const n = Number(frac);
  CLEAR_DECK_THRESHOLD = (isFinite(n) && n >= 0 && n <= 1) ? n : 0.6;
}
export function getClearDeckThreshold() { return CLEAR_DECK_THRESHOLD; }

const UNIT_MS = {
  minutes: 60 * 1000,
  hours: 60 * 60 * 1000,
  days: DAY_MS,
  weeks: 7 * DAY_MS
};

export function addMonths(ts, n) {
  const d = new Date(ts);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, maxDay));
  return d.getTime();
}

// ---------- Working-day math (D45 weekdays → D60 per-tier days) ----------

/** Default working days: Mon–Fri (JS getDay: 0=Sun … 6=Sat). */
export const WEEKDAYS = [1, 2, 3, 4, 5];

/** Normalize a tier's allowedDays into a usable Set. Missing/empty →
 *  Mon–Fri, which keeps every pre-D60 tier behaving exactly as before. */
function allowedSet(allowedDays) {
  return (Array.isArray(allowedDays) && allowedDays.length)
    ? new Set(allowedDays) : new Set(WEEKDAYS);
}

export function isDayAllowed(ts, allowedDays) {
  return allowedSet(allowedDays).has(new Date(ts).getDay());
}

/** Move n ALLOWED days from ts (n<0 = backward). Disallowed days don't
 *  count. Guard prevents infinite loops on a pathological empty set. */
export function addAllowedDays(ts, n, allowedDays) {
  if (!n) return ts;
  const ok = allowedSet(allowedDays);
  let t = ts;
  const step = n > 0 ? DAY_MS : -DAY_MS;
  let left = Math.abs(n), guard = 0;
  while (left > 0 && guard++ < 4000) {
    t += step;
    if (ok.has(new Date(t).getDay())) left--;
  }
  return t;
}

/** Nearest allowed day at-or-before / at-or-after ts (for the date
 *  interception modal and duplicate-project snapping). */
export function allowedNeighbors(ts, allowedDays) {
  const ok = allowedSet(allowedDays);
  let prev = ts, next = ts, guard = 0;
  while (!ok.has(new Date(prev).getDay()) && guard++ < 14) prev -= DAY_MS;
  guard = 0;
  while (!ok.has(new Date(next).getDay()) && guard++ < 14) next += DAY_MS;
  return { prev, next };
}

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

// ---------- US federal holidays (D123) ----------
// Client-computed, per Jake's call and the 5b-bis roadmap: a pure function
// per year, zero infrastructure, works offline, no calendar sharing. Local
// Date construction throughout so a holiday lands on the SAME calendar day
// the rest of the app draws (startOfDayTs is local; new Date(y,m,d) is local).
// Returns local-midnight timestamps — the day key the render loops compare on.

/** The n-th given weekday of a month (n≥1). weekday: 0=Sun … 6=Sat. */
function nthWeekdayOfMonth(year, monthIdx, weekday, n) {
  const first = new Date(year, monthIdx, 1);
  const shift = (weekday - first.getDay() + 7) % 7;   // days until the first such weekday
  return new Date(year, monthIdx, 1 + shift + (n - 1) * 7).getTime();
}

/** The LAST given weekday of a month (e.g., Memorial Day = last Mon of May). */
function lastWeekdayOfMonth(year, monthIdx, weekday) {
  const last = new Date(year, monthIdx + 1, 0);       // day 0 of next month = last day
  const back = (last.getDay() - weekday + 7) % 7;
  return new Date(year, monthIdx, last.getDate() - back).getTime();
}

const atMidnight = (year, monthIdx, day) => new Date(year, monthIdx, day).getTime();

/**
 * The eleven US federal holidays for a given calendar year, as observed on
 * their actual date (NOT the Monday-observed shift for a Sat/Sun — the wall
 * is a planning surface, and "July 4 is a Saturday this year" is exactly what
 * Katie wants to SEE, not have quietly moved to the 3rd or 5th). Juneteenth
 * is included from 2021 on (the year it became federal); asking for an earlier
 * year simply omits it, so a rolling window across 2020→2021 is honest.
 * @returns {{ts:number, name:string, abbr:string}[]}
 */
export function usFederalHolidays(year) {
  const list = [
    { ts: atMidnight(year, 0, 1),                        name: "New Year's Day",         abbr: "New Year" },
    { ts: nthWeekdayOfMonth(year, 0, 1, 3),              name: "Martin Luther King Jr. Day", abbr: "MLK Day" },
    { ts: nthWeekdayOfMonth(year, 1, 1, 3),              name: "Presidents' Day",        abbr: "Presidents'" },
    { ts: lastWeekdayOfMonth(year, 4, 1),                name: "Memorial Day",           abbr: "Memorial" },
    { ts: atMidnight(year, 5, 19),                       name: "Juneteenth",             abbr: "Juneteenth", since: 2021 },
    { ts: atMidnight(year, 6, 4),                        name: "Independence Day",       abbr: "July 4" },
    { ts: nthWeekdayOfMonth(year, 8, 1, 1),              name: "Labor Day",              abbr: "Labor Day" },
    { ts: nthWeekdayOfMonth(year, 9, 1, 2),              name: "Columbus Day",           abbr: "Columbus" },
    { ts: atMidnight(year, 10, 11),                      name: "Veterans Day",           abbr: "Veterans" },
    { ts: nthWeekdayOfMonth(year, 10, 4, 4),             name: "Thanksgiving",           abbr: "Thanksgiving" },
    { ts: atMidnight(year, 11, 25),                      name: "Christmas Day",          abbr: "Christmas" }
  ];
  return list.filter(h => !h.since || year >= h.since)
             .map(({ ts, name, abbr }) => ({ ts, name, abbr }));
}

/**
 * A day-keyed lookup of holidays intersecting [startTs, endTs). Computes only
 * the years the window actually spans (a rolling year can straddle two, a
 * quarter view rarely does). Key = local-midnight ms; value = {name, abbr}.
 * @returns {Map<number,{name:string, abbr:string}>}
 */
export function holidaysForRange(startTs, endTs) {
  const map = new Map();
  const y0 = new Date(startTs).getFullYear();
  const y1 = new Date(endTs - 1).getFullYear();
  for (let y = y0; y <= y1; y++) {
    for (const h of usFederalHolidays(y)) {
      if (h.ts >= startTs && h.ts < endTs) map.set(h.ts, { name: h.name, abbr: h.abbr });
    }
  }
  return map;
}

// ---------- Stage timing (D44) ----------

/** Legacy migration: pre-0.5.0 stages used phase before/during/after.
 *  D50: "during" meant "sometime during the project" — UNDATED. */
export function normalizeStage(s) {
  if (s.direction) return s;
  const phase = s.phase || "during";
  const map = {
    before: { anchor: "start", direction: "before" },
    during: { anchor: "start", direction: "none" },
    after:  { anchor: "end",   direction: "after" }
  };
  return { ...s, ...(map[phase] || map.during) };
}

export function stageIsDated(s) {
  const n = normalizeStage(s);
  return n.dueAt != null || n.direction !== "none";
}

/** Computed target date: anchor(start|end) ± offsetDays counted in the
 *  owning tier's ALLOWED days (D60; default Mon–Fri), at the deadline
 *  hour (D51). Returns null for undated stages (D50). */
export function stageScheduledAt(project, stage, allowedDays) {
  if (project.startDate == null || project.endDate == null) return null; // D126 — timeless project: no anchor to compute FROM
  const s = normalizeStage(stage);
  if (s.direction === "none") return null;
  const base = s.anchor === "end" ? (project.endDate || 0) : (project.startDate || 0);
  const dated = addAllowedDays(base, s.direction === "before" ? -(s.offsetDays || 0) : (s.offsetDays || 0), allowedDays);
  const d = new Date(dated);
  d.setHours(DEADLINE_HOUR, 0, 0, 0);
  return d.getTime();
}

/** A stage's real deadline: manual hard due wins; else the computed target;
 *  null when the stage is undated (it's weight, not a deadline). */
export function stageEffectiveDate(project, stage, allowedDays) {
  return stage.dueAt ?? stageScheduledAt(project, stage, allowedDays);
}

function atDeadlineHour(ts) { const d = new Date(ts); d.setHours(DEADLINE_HOUR, 0, 0, 0); return d.getTime(); }

/** [first, last] effective dates across ALL stages — the pipeline window (D48). */
export function projectPipelineWindow(project, allowedDays) {
  const start = project.startDate || 0, end = project.endDate || 0;
  const dated = (project.stages || [])
    .map(s => stageEffectiveDate(project, s, allowedDays))
    .filter(d => d != null);
  return [Math.min(start, ...dated), Math.max(end, ...dated)];
}

/** The NEXT dated commitment: earliest effective date among incomplete stages. */
export function nextDeadline(project, allowedDays) {
  const st = project.stages || [];
  let best = null;
  st.forEach((s, i) => {
    if (s.completedAt) return;
    const date = stageEffectiveDate(project, s, allowedDays);
    if (date == null) return; // undated = weight, not deadline (D50)
    if (!best || date < best.date) best = { date, stage: s, index: i };
  });
  return best; // null = no dated incomplete stages (caller falls back to project end)
}

export function projectProgress(project) {
  const stages = project.stages || [];
  if (!stages.length) return { done: 0, total: 0, pct: 0 };
  const done = stages.filter(s => s.completedAt).length;
  return { done, total: stages.length, pct: done / stages.length };
}

/** D43 level 3 (pre-D85): remaining pipeline fraction × workload. No longer
 *  in the sort — D86's deckRank/compareDeck below own that. Kept as a utility. */
export function remainingWork(project) {
  const { done, total } = projectProgress(project);
  if (!total) return 0;
  return ((total - done) / total) * (project.workload || 2);
}

/**
 * D86 level-3 grouping — supersedes D85's single blended weight.
 * Two PILES, split at CLEAR_DECK_THRESHOLD, and the pile always wins:
 *   0 = CLEAR THE DECK (pct >= T) — every one of these outranks every
 *       catch-up project, no matter how heavy the catch-up one is.
 *   1 = CATCH UP (pct < T) — still behind; keep everything abreast.
 *   2 = not a project (tasks/events carry no pipeline) — sorts last at
 *       this level, exactly as remainingWork:0 always did.
 * Ordering INSIDE a pile lives in compareDeck below.
 */
export function deckRank(project, threshold = CLEAR_DECK_THRESHOLD) {
  const { total, pct } = projectProgress(project);
  if (!total) return 2;
  return pct >= threshold ? 0 : 1;
}

/**
 * D86 level-3 comparator (Jake's grouped two-tier model). Given a 60%
 * threshold, four otherwise-identical projects sort 95 → 65 → 30 → 40:
 *   · pile first — past the threshold beats not-past, always;
 *   · inside CLEAR THE DECK: MOST done first (95 before 65 — finish it);
 *   · inside CATCH UP: LEAST done first (30 before 40 — rescue laggards);
 *   · workload ONLY breaks a genuine tie (two projects at the same pct):
 *     heavier first — the peer review takes longer, so it needs to be out
 *     the door sooner (Jake).
 * Deliberately NOT a blended score: workload can never carry a catch-up
 * project over a clear-deck one, and there's no U-shaped sag in the
 * middle where a barely-started project outranks a nearly-finished one.
 */
export function compareDeck(a, b) {
  const ra = a.deckRank ?? 2, rb = b.deckRank ?? 2;
  if (ra !== rb) return ra - rb;                    // pile dominates
  if (ra === 2) return 0;                           // tasks/events: neutral here
  const pa = a.progressPct || 0, pb = b.progressPct || 0;
  if (pa !== pb) return ra === 0 ? pb - pa : pa - pb; // clear: most done; catch-up: least done
  return (b.workload || 0) - (a.workload || 0);     // tie → heavier first
}

// ---------- Task escalation (unchanged from v0.1.0, D3) ----------

export function effectiveDue(task, now) {
  if (task.completedAt) return null;
  if (task.dueAt == null) return null;
  const base = task.dueAt;
  if (now <= base) return base;
  const esc = task.escalation || { every: 1, unit: "hours" };
  const every = Math.max(1, esc.every || 1);
  // D111 — the harmonized unit ladder (Jake: "a century-later follow-up
  // feels amusing"). Calendar units step via addMonths in month quanta —
  // months=1, years=12, decades=120, centuries=1200 — so Jan-31 clamps
  // and leap years behave, exactly as the months branch always did.
  const MONTH_QUANTA = { months: 1, years: 12, decades: 120, centuries: 1200 };
  if (MONTH_QUANTA[esc.unit]) {
    const step = MONTH_QUANTA[esc.unit] * every;
    let t = base, guard = 0;
    while (t < now && guard < 1200) { t = addMonths(t, step); guard++; }
    return t;
  }
  const stepMs = (UNIT_MS[esc.unit] || UNIT_MS.hours) * every;
  const k = Math.ceil((now - base) / stepMs);
  return base + k * stepMs;
}

export function isOverdue(task, now) {
  return !task.completedAt && task.dueAt != null && now > task.dueAt;
}

export function isPinned(event, now) {
  const lead = (event.leadWindowMinutes ?? 30) * 60 * 1000;
  return now >= event.start - lead && now < (event.end || event.start + 30 * 60 * 1000);
}

function startOfDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

/**
 * Calendar-safe day step, always landing on a LOCAL midnight.
 * Do not replace with `ts + n*DAY_MS`: across a fall-back boundary that
 * day is 25 hours, so Nov 1 00:00 + DAY_MS = Nov 1 23:00 — startOfDay
 * would hand back Nov 1 AGAIN and the week would show a duplicate day
 * and silently drop one. setDate() walks the calendar, which is what a
 * week actually is. (Nashville observes DST; TZ is America/Chicago.)
 */
export function addDaysLocal(ts, n) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Whole days from local midnight `from` to the day containing `ts`. */
function dayOffset(from, ts) {
  return Math.round((startOfDay(ts) - startOfDay(from)) / DAY_MS); // rounding absorbs DST's ±1h
}
function endOfDay(ts) { return startOfDay(ts) + DAY_MS; }

// ---------- The queue ----------

/**
 * D43 sort:
 *   1. expired first (missed things at the very top, oldest deadline first)
 *   2. chronological by deadline/due — TIER DOES NOT MATTER HERE
 *   3. clear-deck piles (D86): past-threshold projects (most-done first),
 *      then catch-up projects (least-done first), then tasks/events;
 *      workload only breaks an exact-pct tie (heavier first)
 *   4. tier rank
 *   5. alphabetical
 * hiddenTierIds (D47 filter) removes those tiers from EVERYTHING here.
 */
export function buildQueue({ tasks, events, tiers, projects = [], now, viewDay, hiddenTierIds = new Set() }) {
  const dayStart = startOfDay(viewDay);
  const dayEnd = endOfDay(viewDay);
  const viewingToday = now >= dayStart && now < dayEnd;
  const tierById = Object.fromEntries(tiers.map(t => [t.id, t]));
  const rankOf = id => tierById[id]?.rank ?? 999;
  // D61: is the VIEWED day outside this tier's working days? Off-day
  // tiers vanish from the queue (not from cards, Done, or Waiting).
  const viewDow = new Date(viewDay).getDay();
  const offDay = tierId => {
    const t = tierById[tierId];
    return !!t && t.kind !== "anchor" && !allowedSet(t.allowedDays).has(viewDow);
  };
  const hidden = id => hiddenTierIds.has(id);

  // --- All-day banners (D80): ambient truth, not appointments ---
  const banners = events
    .filter(e => e.allDay && !hidden(e.tierId))
    .filter(e => e.start < dayEnd && (e.end || e.start + DAY_MS) > dayStart)
    .map(e => {
      const s0 = startOfDay(e.start);
      const endEx = e.end || e.start + DAY_MS;         // all-day end is EXCLUSIVE
      const dayTotal = Math.max(1, Math.round((endEx - s0) / DAY_MS));
      const dayN = Math.min(dayTotal, Math.max(1, Math.round((dayStart - s0) / DAY_MS) + 1));
      return { id: e.id, title: e.title, tier: tierById[e.tierId] || null, start: e.start, end: e.end || null, dayN, dayTotal };
    })
    .sort((a, b) => (rankOf(a.tier?.id) - rankOf(b.tier?.id)) || (a.start - b.start));

  // --- Events (anchors); D82: past windows sink out of the live list,
  // but only when the view IS today ---
  // (viewingToday already computed above for pin/escalation logic)
  const isPast = e => viewingToday && (e.end ?? e.start + 3600000) <= now;
  const passedEvents = events
    .filter(e => !e.allDay && !hidden(e.tierId) && isPast(e))
    .filter(e => e.start < dayEnd && (e.end || e.start) >= dayStart)
    .map(e => ({ id: e.id, title: e.title, start: e.start, end: e.end || null, tier: tierById[e.tierId] || null }))
    .sort((a, b) => a.start - b.start);

  const dayEvents = events
    .filter(e => !e.allDay && !hidden(e.tierId) && !isPast(e))
    .filter(e => e.start < dayEnd && (e.end || e.start) >= dayStart)
    .map(e => ({
      kind: "event", id: e.id, title: e.title,
      tier: tierById[e.tierId] || null,
      time: e.start, end: e.end || null,
      sortTime: e.start, expired: false, deckRank: 2,
      pinned: viewingToday && isPinned(e, now)
    }));
  const pinned = dayEvents.filter(e => e.pinned).sort((a, b) => a.time - b.time);

  // --- Tasks ---
  const active = [];
  const waiting = [];
  const doneToday = [];
  for (const t of tasks) {
    if (hidden(t.tierId)) continue;
    if (t.completedAt) {
      if (t.completedAt >= dayStart && t.completedAt < dayEnd) doneToday.push(t);
      continue;
    }
    if (t.dueAt == null) { waiting.push(t); continue; }
    if (offDay(t.tierId)) continue; // D61
    const dueThisDay = t.dueAt >= dayStart && t.dueAt < dayEnd;
    const overdueIntoToday = viewingToday && t.dueAt < dayStart;
    if (!(dueThisDay || overdueIntoToday)) continue;
    const expired = viewingToday && isOverdue(t, now);
    active.push({
      kind: "task", id: t.id, title: t.title,
      tier: tierById[t.tierId] || null,
      originalDue: t.dueAt,
      time: viewingToday ? effectiveDue(t, now) : t.dueAt, // escalation theater slot
      sortTime: t.dueAt,      // D43 level 2 uses the HONEST due, not the theater
      expired, overdue: expired,
      deckRank: 2,
      escalation: t.escalation || { every: 1, unit: "hours" },
      raw: t
    });
  }

  // --- Projects (one item each: active stage shown, next deadline sorted) ---
  for (const p of projects) {
    if (hidden(p.tierId)) continue;
    if (offDay(p.tierId)) continue; // D61
    if (tierById[p.tierId]?.timeless) continue; // D126 — want-tos live off the deadline spine entirely
    const stages = p.stages || [];
    const activeIdx = stages.findIndex(s => !s.completedAt);
    if (activeIdx === -1) continue; // complete
    const allowedDays = tierById[p.tierId]?.allowedDays; // D60
    const [first, last] = projectPipelineWindow(p, allowedDays);
    // D48: invisible until its earliest pipeline date; rides the queue through
    // its last date; past that it lives on "today" as expired until dealt with.
    const inWindow = viewingToday
      ? now >= startOfDay(first)
      : (dayEnd > startOfDay(first) && dayStart <= last);
    if (!inWindow) continue;
    const nd = nextDeadline(p, allowedDays);
    const deadline = nd ? nd.date : atDeadlineHour(p.endDate || last);
    const expired = viewingToday && now > deadline;
    const prog = projectProgress(p);
    active.push({
      kind: "stage",
      id: `${p.id}#${activeIdx}`,
      projectId: p.id,
      stageIndex: activeIdx,
      title: stages[activeIdx].name,
      projectName: p.name,
      projectColor: p.color,
      tier: tierById[p.tierId] || null,
      progressPct: prog.pct,
      workload: p.workload || 2,
      deckRank: deckRank(p),
      deadlineStageName: nd ? nd.stage.name : "project end",
      deadlineStageIndex: nd ? nd.index : activeIdx,
      deadlineManual: nd ? nd.stage.dueAt != null : false,
      deadline,
      sortTime: deadline,
      time: deadline,
      originalDue: deadline,
      expired, overdue: expired,
      dueAt: stages[activeIdx].dueAt ?? null
    });
  }

  const unpinnedEvents = dayEvents.filter(e => !e.pinned);
  const items = [...unpinnedEvents, ...active].sort((a, b) => {
    if (a.expired !== b.expired) return a.expired ? -1 : 1;                 // 1 expired
    if ((a.sortTime ?? 0) !== (b.sortTime ?? 0)) return (a.sortTime ?? 0) - (b.sortTime ?? 0); // 2 chrono
    const deck = compareDeck(a, b);
    if (deck !== 0) return deck;                                            // 3 clear-deck piles (D86)
    const ra = rankOf(a.tier?.id), rb = rankOf(b.tier?.id);
    if (ra !== rb) return ra - rb;                                          // 4 tier
    return String(a.title).localeCompare(String(b.title));                  // 5 alphabet
  });

  doneToday.sort((a, b) => b.completedAt - a.completedAt);
  waiting.sort((a, b) => rankOf(a.tierId) - rankOf(b.tierId));

  return { pinned, items, waiting, doneToday, banners, passedEvents };
}

/**
 * D88 — THE WEEK. Seven (or N) honest days plus the two spanning strips.
 *
 * buildQueue owns the truth for a single day, so this calls it once per
 * column: expiry, D61 off-day tiers, escalation slots, the D86 piles and
 * the whole sort come along for free. What this adds is everything that
 * only exists ACROSS days.
 *
 * PROJECTS DO NOT REPEAT DOWN THE COLUMNS. D48 rides a project through
 * every day of its pipeline window, which is right for "what could I
 * touch today?" and wrong for a week — a 3-month project would render in
 * all seven columns. So a stage row appears ONLY on the day its deadline
 * actually lands (plus today, if it's expired — a missed thing must not
 * vanish just because we changed views). The project's SPAN lives in the
 * top strip instead, where a span belongs.
 *
 * Returns:
 *   days[]        — { dayStart, isToday, isPast, items, load, passedEvents }
 *   projectSpans  — bars for the top strip, with stage pips per day index
 *   bannerSpans   — all-day events as one bar each, not one pill per day
 * Both span lists carry fromIdx/toIdx CLIPPED to the window, plus
 * clippedLeft/clippedRight so the UI can show "this continues offscreen"
 * rather than lying about a start date.
 */
/** D100 — what an unestimated task is drawn as. Not a guess at her work: a
 *  legible minimum so the block has a grabbable edge. The UI marks these. */
export const DEFAULT_ESTIMATE_MINUTES = 30;
export const MIN_ESTIMATE_MINUTES = 5;
export const MAX_ESTIMATE_MINUTES = 12 * 60;

/** D100 — null/0/absent all mean "she never said". Only a real number counts. */
export function taskEstimate(t) {
  const m = t?.estimateMinutes;
  return (typeof m === "number" && m >= MIN_ESTIMATE_MINUTES) ? m : null;
}

/**
 * D100 — THE CLOCK GEOMETRY. One day's items → positioned blocks.
 *
 * Per D93, three different shapes, because they are three different claims:
 *   EVENT — owns [start, end]. Given, not inferred.
 *   TASK  — owns a DEADLINE. Block is [due − estimate, due]: the runway you
 *           have to do it in, ending at the promise. Backward. Never forward.
 *   STAGE — a deadline too; same shape, default length (stages carry no
 *           estimate field and inventing one would be a lie).
 *
 * OVERDUE extends FORWARD from due → now, and only today (`expired` is
 * viewingToday-gated in buildQueue, D97), because that's the only direction
 * a blown deadline actually travels.
 *
 * Blocks that overlap in time share the column's width via greedy lane
 * packing — the same convention a calendar uses, so "Tuesday is full" is a
 * thing you can SEE rather than count.
 */
export function clockBlocks({ items = [], dayStart, now, defaultEstimate = DEFAULT_ESTIMATE_MINUTES }) {
  const dayEnd = addDaysLocal(dayStart, 1);
  const clamp = ms => Math.max(dayStart, Math.min(dayEnd, ms));
  const blocks = [];

  for (const it of items) {
    let startMs, endMs, estimated = true, overdueTo = null;

    if (it.kind === "event") {
      startMs = it.time;
      endMs = it.end ?? (it.time + defaultEstimate * 60000);
      estimated = false;                       // an event is not an estimate
    } else {
      // The HONEST due (D83/D93): escalation moves the nag slot, never the
      // promise. Drawing the block at the escalated time would render the
      // app's own nagging as if it were Katie's commitment.
      const due = it.originalDue ?? it.time;
      const est = it.kind === "task" ? taskEstimate(it.raw) : null;
      estimated = est != null;
      endMs = due;
      startMs = due - (est ?? defaultEstimate) * 60000;
      if (it.expired && now > due) overdueTo = clamp(now);
    }

    blocks.push({
      it,
      kind: it.kind,
      startMs: clamp(startMs),
      endMs: clamp(endMs),
      trueStartMs: startMs,                    // pre-clamp: a 00:15 deadline with
      trueEndMs: endMs,                        // a 30-min runway starts yesterday
      clippedStart: startMs < dayStart,
      estimated,                               // false = we defaulted; UI must say so
      estimateMinutes: it.kind === "task" ? taskEstimate(it.raw) : null,
      overdueTo,
      lane: 0, laneCount: 1
    });
  }

  // Greedy lane packing over the block's FULL visual extent (a red overdue
  // tail still occupies the column — pretending otherwise would let a blown
  // deadline hide behind the next thing).
  const extent = b => (b.overdueTo != null ? Math.max(b.endMs, b.overdueTo) : b.endMs);
  blocks.sort((a, b) => a.startMs - b.startMs || extent(a) - extent(b));
  const laneEnds = [];
  for (const b of blocks) {
    let lane = laneEnds.findIndex(end => end <= b.startMs);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
    laneEnds[lane] = extent(b);
    b.lane = lane;
  }
  // laneCount is per OVERLAP CLUSTER, not per day: one 3-way pileup at 9 AM
  // must not shave every other block on the day to a third of the width.
  let cluster = [], clusterEnd = -Infinity;
  const closeCluster = () => {
    const n = cluster.reduce((m, b) => Math.max(m, b.lane + 1), 1);
    cluster.forEach(b => { b.laneCount = n; });
    cluster = [];
  };
  for (const b of blocks) {
    if (b.startMs >= clusterEnd && cluster.length) closeCluster();
    cluster.push(b);
    clusterEnd = Math.max(clusterEnd, extent(b));
  }
  if (cluster.length) closeCluster();

  return blocks;
}

/**
 * D100 — the shared vertical axis. Every column must use ONE window or the
 * grid is seven unrelated charts and 9 AM isn't a row you can read across.
 * Fits the week's real content, rounded out to whole hours, with a floor so
 * a single 20-minute task doesn't become a wall.
 */
export function weekClockWindow(days = [], { now = Date.now(), minSpanHours = 6, defaultEstimate = DEFAULT_ESTIMATE_MINUTES } = {}) {
  let lo = Infinity, hi = -Infinity;
  for (const col of days) {
    for (const b of clockBlocks({ items: col.items, dayStart: col.dayStart, now, defaultEstimate })) {
      lo = Math.min(lo, (b.startMs - col.dayStart) / 60000);
      hi = Math.max(hi, ((b.overdueTo != null ? Math.max(b.endMs, b.overdueTo) : b.endMs) - col.dayStart) / 60000);
    }
  }
  if (!isFinite(lo)) { lo = 8 * 60; hi = 18 * 60; }       // an empty week: a working day
  lo = Math.floor(lo / 60) * 60;
  hi = Math.ceil(hi / 60) * 60;
  if (hi - lo < minSpanHours * 60) hi = lo + minSpanHours * 60;
  if (hi > 24 * 60) { hi = 24 * 60; lo = Math.min(lo, hi - minSpanHours * 60); }
  return { startMin: Math.max(0, lo), endMin: Math.min(24 * 60, hi) };
}

/**
 * D95's read-side fallback, twinned from store.taskFirstDue(). NOT imported:
 * queue.js is pure logic (D26) and store.js drags Firebase in with it, which
 * would break every unit test that loads the real module. Deliberately NOT
 * exported either — app.js already imports taskFirstDue from store.js, and a
 * second binding of the same name in that file is exactly the duplicate
 * identifier that bit D82. Keep the two in sync; they are one line each.
 *
 * The `??` IS the backfill (D95), and it is load-bearing HERE more than
 * anywhere: firstDueAt is only written on a task's first reschedule AFTER
 * D95 deploys, so every task in the live database has firstDueAt === undefined
 * right now. Reading t.firstDueAt directly would make every reflection card
 * empty until Katie happens to move something.
 */
function firstDueOf(t) { return t?.firstDueAt ?? t?.dueAt ?? null; }

/**
 * D97 — what a day did to you, once it's over (or once it's today).
 *
 * VICTORIES are free and always were (5a-bis): tasks.completedAt and
 * stage.completedAt both exist, and the PREVIOUS stage's completedAt IS this
 * one's start — so "started when Excel setup finished, done Thu 3:14 PM" is
 * derivable with no schema change at all.
 *
 * PUT-OFFS are the half that needed D95. Three honest flavours, because
 * "didn't happen" has three different meanings and they deserve different
 * words:
 *   moved   — she decided, and picked a new date. dueAt is now later.
 *   shelved — she decided, and picked NO date (D84's "not now, maybe ever").
 *   ignored — nobody decided anything. It's still sitting on that day, past.
 * The first two are choices and only D95's firstDueAt can see them; the third
 * is derivable and is the one that stings. A count of 5 means something.
 */
export function dayReflection({ tasks = [], projects = [], tiers = [], dayStart, now, hiddenTierIds = new Set() }) {
  const dayEnd = addDaysLocal(dayStart, 1);
  const hidden = id => hiddenTierIds.has(id);
  const tierById = {};
  tiers.forEach(t => { tierById[t.id] = t; });
  const inDay = ts => ts != null && ts >= dayStart && ts < dayEnd;
  const dayHasBegun = now >= dayStart;

  const victories = [];
  const putOffs = [];

  for (const t of tasks) {
    if (hidden(t.tierId)) continue;
    const tier = tierById[t.tierId] || null;
    const moved = t.rescheduleCount || 0;

    if (t.completedAt) {
      if (inDay(t.completedAt)) {
        victories.push({
          kind: "task", id: t.id, title: t.title, tier,
          color: tier?.color || "#4dd0c4",
          at: t.completedAt,
          moved,
          firstDue: firstDueOf(t)
        });
      }
      continue;                               // a done task is never a put-off
    }

    if (!dayHasBegun) continue;               // the future can't disappoint you yet
    const first = firstDueOf(t);
    const startedHere = inDay(first);

    if (startedHere && t.dueAt == null) {
      putOffs.push({ kind: "task", id: t.id, title: t.title, tier, color: tier?.color || "#4dd0c4",
        flavor: "shelved", firstDue: first, nowDue: null, moved });
    } else if (startedHere && t.dueAt >= dayEnd) {
      putOffs.push({ kind: "task", id: t.id, title: t.title, tier, color: tier?.color || "#4dd0c4",
        flavor: "moved", firstDue: first, nowDue: t.dueAt, moved });
    } else if (inDay(t.dueAt) && now > t.dueAt) {
      putOffs.push({ kind: "task", id: t.id, title: t.title, tier, color: tier?.color || "#4dd0c4",
        flavor: "ignored", firstDue: first, nowDue: t.dueAt, moved });
    }
  }

  // Stages: completions are victories; a dated stage still open on a day
  // that's gone is the derived put-off (5a-ter option a). Stages carry no
  // firstDueAt — D95 landed in store.updateTask, and setStageDue writes the
  // stage array directly — so "moved" is not knowable for them. Don't fake it.
  for (const p of projects) {
    if (hidden(p.tierId)) continue;
    const tier = tierById[p.tierId] || null;
    const allowedDays = tier?.allowedDays;
    const stages = p.stages || [];
    stages.forEach((st, idx) => {
      if (st.completedAt) {
        if (inDay(st.completedAt)) {
          // 5a-bis: the previous stage's completion IS this one's start.
          let startedAt = null;
          for (let j = idx - 1; j >= 0; j--) {
            if (stages[j].completedAt) { startedAt = stages[j].completedAt; break; }
          }
          victories.push({
            kind: "stage", id: `${p.id}#${idx}`, projectId: p.id, stageIndex: idx,
            title: st.name, projectName: p.name, tier,
            color: p.color || "#888",
            at: st.completedAt, startedAt, moved: 0, firstDue: null
          });
        }
        return;
      }
      if (!dayHasBegun || !stageIsDated(st)) return;
      const when = stageEffectiveDate(p, st, allowedDays);
      if (!inDay(when) || now <= when) return;
      putOffs.push({
        kind: "stage", id: `${p.id}#${idx}`, projectId: p.id, stageIndex: idx,
        title: st.name, projectName: p.name, tier, color: p.color || "#888",
        flavor: "ignored", firstDue: when, nowDue: when, moved: 0
      });
    });
  }

  victories.sort((a, b) => b.at - a.at);
  putOffs.sort((a, b) => (b.moved - a.moved) || String(a.title).localeCompare(String(b.title)));
  return { victories, putOffs };
}

export function buildWeek({ tasks, events, tiers, projects = [], now, anchorDay, days = 7, hiddenTierIds = new Set() }) {
  const start = startOfDay(anchorDay);
  const today = startOfDay(now);
  const weekEndEx = addDaysLocal(start, days); // exclusive
  const hidden = id => hiddenTierIds.has(id);
  const tierById = {};
  tiers.forEach(t => { tierById[t.id] = t; });

  const cols = [];
  for (let i = 0; i < days; i++) {
    const dayStart = addDaysLocal(start, i);
    const dayEnd = addDaysLocal(start, i + 1);
    const isToday = dayStart === today;
    const q = buildQueue({ tasks, events, tiers, projects, now, viewDay: dayStart, hiddenTierIds });

    const items = q.items.filter(it => {
      if (it.kind !== "stage") return true;
      if (isToday && it.expired) return true;                   // missed: still shouts
      return it.deadline >= dayStart && it.deadline < dayEnd;   // otherwise: only on its day
    });

    const refl = dayReflection({ tasks, projects, tiers, dayStart, now, hiddenTierIds });

    cols.push({
      dayStart,
      isToday,
      isPast: dayStart < today,
      items,
      passedEvents: isToday ? q.passedEvents : [],
      victories: refl.victories,     // D97
      putOffs: refl.putOffs,         // D97
      load: {
        total: items.length,
        // NB: expired is gated on viewingToday inside buildQueue (by design —
        // a past column shouldn't re-sort itself around a deadline that's
        // already gone), so this is 0 on every past day. The Wake reads
        // putOffs, NOT this. Anything filtering past items on .expired
        // renders an empty box and looks like it worked.
        expired: items.filter(it => it.expired).length,
        done: refl.victories.length,
        putOff: refl.putOffs.length,
        events: items.filter(it => it.kind === "event").length,
        tasks: items.filter(it => it.kind === "task").length,
        stages: items.filter(it => it.kind === "stage").length
      }
    });
  }

  // --- Project bars (top strip) ---
  const projectSpans = [];
  for (const p of projects) {
    if (hidden(p.tierId)) continue;
    if (tierById[p.tierId]?.timeless) continue; // D126 — want-tos never get a week bar
    const stages = p.stages || [];
    if (!stages.length) continue;
    const activeIdx = stages.findIndex(s => !s.completedAt);
    if (activeIdx === -1) continue; // finished projects don't need a bar
    const allowedDays = tierById[p.tierId]?.allowedDays; // D60
    const [first, last] = projectPipelineWindow(p, allowedDays);
    const s0 = startOfDay(first), s1 = startOfDay(last);
    const nd = nextDeadline(p, allowedDays);
    const deadlineAt = nd ? nd.date : atDeadlineHour(p.endDate || last);
    const expired = now > deadlineAt;
    let rawFrom = dayOffset(start, s0), rawTo = dayOffset(start, s1);

    // D89 — NOTHING SILENTLY DISAPPEARS. A project whose whole pipeline
    // window is already in the past would fail the "is it this week?"
    // test and vanish — but D48 keeps an expired project alive on TODAY
    // until it's dealt with, and an overdue project is the FIRST thing a
    // planning board must show. So a late bar stretches to today.
    const todayIdx = dayOffset(start, now);
    const todayInWeek = todayIdx >= 0 && todayIdx < days;
    if (expired && todayInWeek && rawTo < todayIdx) rawTo = todayIdx;
    if (rawTo < 0 || rawFrom >= days) continue; // genuinely not this week

    const pips = [];
    stages.forEach((st, idx) => {
      if (!stageIsDated(st)) return;
      const when = stageEffectiveDate(p, st, allowedDays);
      if (when == null) return;
      const off = dayOffset(start, when);
      if (off < 0 || off >= days) return;
      pips.push({ dayIdx: off, name: st.name, index: idx, done: !!st.completedAt, isActive: idx === activeIdx });
    });

    const prog = projectProgress(p);
    projectSpans.push({
      id: p.id, name: p.name, color: p.color,
      tier: tierById[p.tierId] || null,
      deadlineAt,
      expired,
      deadlineStageName: nd ? nd.stage.name : "project end",
      deadlineIdx: (dayOffset(start, deadlineAt) >= 0 && dayOffset(start, deadlineAt) < days) ? dayOffset(start, deadlineAt) : null,
      progressPct: prog.pct,
      workload: p.workload || 2,
      fromIdx: Math.max(0, rawFrom),
      toIdx: Math.min(days - 1, rawTo),
      clippedLeft: rawFrom < 0,
      clippedRight: rawTo > days - 1,
      pct: prog.pct, done: prog.done, total: prog.total,
      deckRank: deckRank(p),
      activeStageName: stages[activeIdx].name,
      activeStageIndex: activeIdx,   // D90: the bar is clickable → openDueDialog needs it
      pips
    });
  }
  // D89: the SAME priority language as the queue (D43/D86) — expired
  // shouts, then soonest deadline, then the clear-deck piles. Alphabetical
  // ordering told Katie nothing about which bar to look at first.
  projectSpans.sort((a, b) =>
    (a.expired !== b.expired ? (a.expired ? -1 : 1) : 0) ||
    (a.deadlineAt - b.deadlineAt) ||
    compareDeck(a, b) ||
    String(a.name).localeCompare(String(b.name))
  );

  // --- All-day banners (top strip): ONE bar per event, not a pill per day ---
  const bannerSpans = [];
  for (const e of events) {
    if (!e.allDay || hidden(e.tierId)) continue;
    const s0 = startOfDay(e.start);
    const endEx = e.end || addDaysLocal(s0, 1);
    const s1 = startOfDay(endEx - 1); // inclusive last day
    if (s1 < start || s0 >= weekEndEx) continue;
    const rawFrom = dayOffset(start, s0), rawTo = dayOffset(start, s1);
    bannerSpans.push({
      id: e.id, title: e.title,
      tier: tierById[e.tierId] || null,
      start: e.start, end: e.end || null,
      fromIdx: Math.max(0, rawFrom),
      toIdx: Math.min(days - 1, rawTo),
      clippedLeft: rawFrom < 0,
      clippedRight: rawTo > days - 1,
      dayTotal: Math.max(1, dayOffset(s0, s1) + 1)
    });
  }
  bannerSpans.sort((a, b) => (a.fromIdx - b.fromIdx) || (b.toIdx - a.toIdx) || String(a.title).localeCompare(String(b.title)));

  const peak = Math.max(1, ...cols.map(c => c.load.total));
  cols.forEach(c => { c.loadShare = c.load.total / peak; }); // 0–1, for the header bar

  // D97 — pending inventory: dated-nothing tasks. Two very different animals
  // share this list and a layout that shows them must say which is which:
  // a follow-up (parentTaskId) CANNOT be scheduled — it materialises when its
  // parent is checked off (D4) — while a shelved task (D84) is genuinely
  // available work. Calling both "inventory for the week" would invite Katie
  // to plan around things that aren't hers to plan.
  const waiting = buildQueue({ tasks, events, tiers, projects, now, viewDay: today, hiddenTierIds })
    .waiting.map(t => ({
      id: t.id, title: t.title, tierId: t.tierId,
      tier: tierById[t.tierId] || null,
      blocked: t.parentTaskId != null,
      offsetDays: t.offsetDays ?? null,
      moved: t.rescheduleCount || 0,
      firstDue: firstDueOf(t)
    }));

  return { anchor: start, days: cols, dayCount: days, projectSpans, bannerSpans, peakLoad: peak, waiting };
}

/**
 * D89 — where does the week start? Three answers, all legitimate:
 *   "rolling" — today + 6. No wasted columns; best for a live kiosk.
 *   "sunday"  — Sun–Sat, the wall-calendar week.
 *   "monday"  — Mon–Sun, the working week (ISO).
 * Jake: the past columns are NOT dead space — "a part of it is also
 * reflecting on the week to work on next week." Planning needs the
 * week you just had. weekOffset pages by whole weeks either way.
 */
export function weekAnchorFor(mode, ref = Date.now(), weekOffset = 0) {
  const base = startOfDay(ref);
  if (mode === "sunday" || mode === "monday") {
    const startDow = mode === "monday" ? 1 : 0;
    const back = (new Date(base).getDay() - startDow + 7) % 7;
    return addDaysLocal(base, -back + weekOffset * 7);
  }
  return addDaysLocal(base, weekOffset * 7); // rolling
}

export function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtDay(ts) {
  return new Date(ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ============================================================
// D120 — THE TIME REPORT. Pure logic, no DOM: bucket sessions into
// periods over an arbitrary date range, splitting any session that
// crosses a boundary (the decide-once rule — a 10pm-2am session gives
// 2h to each side of midnight, not a guess about which day "owns" it).
//
// Deliberately NOT built around "calendar year" vs "fiscal year" as a
// setting anywhere: Jake's question to Katie was left open, and the
// answer turned out to be "don't ask — let the range be arbitrary."
// Month/quarter/year buckets step FORWARD from the range's own start
// date (via addMonths, so day-of-month clamps and leap years are
// already handled) rather than from a calendar epoch. Start a range
// Jan 1 and you get calendar quarters/years for free; start it Jul 1
// and you get fiscal ones — same code, no branch, no setting to be
// wrong about. Any other custom range (a specific engagement's window,
// a stretch of months) works exactly the same way.
// ============================================================

/** [{start,end,label}] covering [rangeStart,rangeEnd) at the given
 *  granularity. The last period clips to rangeEnd (an honest partial
 *  bucket, not silently rounded up). Empty range → []. */
export function reportPeriods(rangeStart, rangeEnd, granularity) {
  const periods = [];
  let cur = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  if (end <= cur) return periods;
  while (cur < end) {
    const next =
      granularity === "week" ? addDaysLocal(cur, 7) :
      granularity === "month" ? addMonths(cur, 1) :
      granularity === "quarter" ? addMonths(cur, 3) :
      granularity === "year" ? addMonths(cur, 12) :
      addDaysLocal(cur, 1); // "day" and any unrecognized value
    const periodEnd = Math.min(next, end);
    periods.push({ start: cur, end: periodEnd, label: reportPeriodLabel(cur, periodEnd, granularity) });
    cur = periodEnd;
  }
  return periods;
}

/** Day/month get their own concise label; week/quarter/year show the
 *  actual span instead of a number ("Q3", "week 12") — those buckets
 *  are range-relative here, not necessarily calendar-aligned, and a
 *  numbered label would silently imply an alignment that may not hold. */
function reportPeriodLabel(start, end, granularity) {
  if (granularity === "day") return fmtDay(start);
  if (granularity === "month") return new Date(start).toLocaleDateString([], { month: "short", year: "numeric" });
  return `${fmtDay(start)} – ${fmtDay(end - DAY_MS)}`;
}

/**
 * Bucket sessions into report periods. projectId null = every project
 * that has time in range, one row each; a specific id = that project
 * alone (kept even at zero, since it was asked for by name — e.g. the
 * per-project 🕰 shortcut). Open sessions (end === null) count up to
 * `now`. Returns {periods, rows:[{projectId,projectName,color,byPeriod,
 * totalMs}], periodTotals:[ms], grandTotal:ms}.
 */
export function rollupSessions({ sessions = [], projects = [], rangeStart, rangeEnd, granularity, projectId = null, now = Date.now() }) {
  const periods = reportPeriods(rangeStart, rangeEnd, granularity);
  const relevant = projectId ? projects.filter(p => p.id === projectId) : projects;
  const byProject = new Map(relevant.map(p => [p.id, new Array(periods.length).fill(0)]));
  const clipStart = periods.length ? periods[0].start : rangeStart;
  const clipEnd = periods.length ? periods[periods.length - 1].end : rangeEnd;

  for (const s of sessions) {
    if (projectId && s.projectId !== projectId) continue;
    const bucket = byProject.get(s.projectId);
    if (!bucket) continue; // a session on a project not in this report (deleted project, etc.)
    const start = Math.max(s.start, clipStart);
    const end = Math.min(s.end ?? now, clipEnd);
    if (end <= start) continue; // entirely outside the range
    for (let i = 0; i < periods.length; i++) {
      const ovStart = Math.max(start, periods[i].start);
      const ovEnd = Math.min(end, periods[i].end);
      if (ovEnd > ovStart) bucket[i] += (ovEnd - ovStart);
    }
  }

  const rows = relevant
    .map(p => {
      const byPeriod = byProject.get(p.id);
      return { projectId: p.id, projectName: p.name, color: p.color, byPeriod, totalMs: byPeriod.reduce((a, b) => a + b, 0) };
    })
    .filter(r => r.totalMs > 0 || projectId) // hide untouched projects from the all-projects view; keep the one asked for by name even at zero
    .sort((a, b) => a.projectName.localeCompare(b.projectName)); // steady row order across report runs, not a leaderboard

  const periodTotals = periods.map((_, i) => rows.reduce((sum, r) => sum + r.byPeriod[i], 0));
  const grandTotal = rows.reduce((sum, r) => sum + r.totalMs, 0);
  return { periods, rows, periodTotals, grandTotal };
}

/** Wrap in quotes if the field contains a comma, quote, or newline;
 *  double any internal quotes. The whole reason this is one function. */
function csvField(v) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The rollup as CSV — plain decimal hours (2dp), not "8.5h" strings.
 *  Katie's an actuary; she builds her own models on top of this, so the
 *  numbers need to paste into a spreadsheet ready to compute with. */
export function rollupToCSV(rollup) {
  const header = ["Project", ...rollup.periods.map(p => p.label), "Total"];
  const lines = [header.map(csvField).join(",")];
  for (const row of rollup.rows) {
    lines.push([row.projectName, ...row.byPeriod.map(ms => (ms / 3600000).toFixed(2)), (row.totalMs / 3600000).toFixed(2)]
      .map(csvField).join(","));
  }
  lines.push(["Total", ...rollup.periodTotals.map(ms => (ms / 3600000).toFixed(2)), (rollup.grandTotal / 3600000).toFixed(2)]
    .map(csvField).join(","));
  return lines.join("\n");
}

/** The raw ledger as CSV — one row per session, UN-split by period.
 *  This is the respectful export: her own intervals, not our bucketing
 *  decisions. Sorted oldest first; an open session reports "(still
 *  running)" rather than a fabricated end time. */
export function sessionsToCSV(sessions, projects) {
  const nameById = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const header = ["Project", "Start", "End", "Hours", "Logged by"];
  const lines = [header.map(csvField).join(",")];
  for (const s of [...sessions].sort((a, b) => a.start - b.start)) {
    const end = s.end ?? Date.now();
    lines.push([
      nameById[s.projectId] || "(deleted project)",
      new Date(s.start).toISOString(),
      s.end != null ? new Date(s.end).toISOString() : "(still running)",
      ((end - s.start) / 3600000).toFixed(2),
      s.createdBy || ""
    ].map(csvField).join(","));
  }
  return lines.join("\n");
}
