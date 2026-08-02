// ============================================================
// Tentacalendar 2.0 (Octodo) — Cloud Functions
// functions/index.js — Version 1.3.0 (E14 queue · E37 guard · E40 ws tags · fixtags)
//
// 1.3.0 — ?job=fixtags: THE REPAIR FOR MY OWN SEQUENCING FAILURE.
// E40 (1.2.0) scoped mirror tags per workspace and I asserted it was free
// "because nothing is deployed yet" — an assumption I never checked with the
// person who does the deploying. It wasn't true: 1.1.0 was live and ran with
// a mirror calendar set, so events exist carrying tcApp/tcTaskId and NO tcWs.
// The new filter cannot see them, so 1.2.x would recreate every task as a
// duplicate and never prune the originals.
//
// fixtags adopts them instead of deleting anything: for each workspace, it
// lists its OWN mirror calendar by tcApp alone (the old, unscoped filter) and
// stamps tcWs onto any event missing it, preserving tcTaskId/tcCarryKey. The
// next ordinary mirror run then reconciles normally — anything whose task is
// gone gets pruned by the logic that already exists.
//
// RUN ONCE:  curl -H "x-poll-secret: …" "https://…/?job=fixtags"
// It is idempotent and safe to run repeatedly; a second run reports
// everything as alreadyTagged and changes nothing.
//
// (prev) Version 1.2.1 (E14 queue · E37 guard · E40 ws tags)
//
// 1.2.1 — the mirror's "not configured" message pointed at "⚙️ Settings →
// Calendar". THERE IS NO CALENDAR TAB; it is Timing, and the carryover's
// message twelve lines below already said so. This is D84's error, which was
// corrected in the docs in July and never in the string a user actually sees.
// Caught in Jake's first live curl. Both messages now name the tab that
// exists AND the walkthrough that explains it.
//
// (prev) Version 1.2.0 (E14 queue · E37 guard · E40 ws-scoped tags)
//
// 1.2.0 — E40: THE MIRROR TAG IS NOW SCOPED PER WORKSPACE (`tcWs`).
//
// ⚠️ Full version history is in CHANGELOG.md. Keep this header SHORT — it
//    reached 191 lines, which is the shape that put a version banner 980
//    lines from its constant in app.js and cost a deploy. version-check
//    1.5.0 fails the build if it regrows.
// ============================================================

const functions = require("@google-cloud/functions-framework");
const admin = require("firebase-admin");
const { google } = require("googleapis");

const FUNCTIONS_VERSION = "1.3.0";

// ---- E14: the work queue's dials ----
const BATCH = 5;               // workspaces claimed per run. Raise as users grow.
const SOFT_DEADLINE_MS = 45000; // stop claiming new work past this; the run ends
                                // cleanly and the unclaimed are simply still due
                                // next time. A partial pass is not a failure.

// ---- E37: which calendars may a workspace poll? ----
// Ids ending in these are Google-generated and effectively unguessable — a
// secondary calendar's id IS its secret, so possessing it is the entitlement.
const OPAQUE_CAL_SUFFIXES = [
  "group.calendar.google.com",
  "import.calendar.google.com",
  "group.v.calendar.google.com",
  "holiday.calendar.google.com"
];

/** A bare email is a PERSON'S PRIMARY calendar and is trivially guessable,
 *  so only a workspace that person belongs to may poll it. Anything opaque
 *  passes and Google's own sharing decides. Returns null if allowed, or a
 *  human sentence explaining the refusal. */
function calendarRefusal(calId, memberEmails) {
  const id = String(calId || "").trim().toLowerCase();
  if (!id) return "empty calendar id";
  if (OPAQUE_CAL_SUFFIXES.some(s => id.endsWith(s))) return null;
  if (!id.includes("@")) return null;
  if (memberEmails.has(id)) return null;
  return `refused: "${id}" is a personal calendar and nobody by that address ` +
         `is a member of this workspace. Add them as a member, or use a ` +
         `secondary calendar (its id ends in group.calendar.google.com).`;
}

// ---- The tag namespace. See point 2 in the header before changing these. ----
const TC_APP = "octodo";
const TC_APP_CARRY = "octodo-carryover";

admin.initializeApp();
const db = admin.firestore();

const DAY_MS = 24 * 60 * 60 * 1000;
const LOOKBACK_MS = 1 * DAY_MS;    // yesterday's events still matter today
const HORIZON_MS = 60 * DAY_MS;    // two months out

/** Commit writes/deletes in chunks (Firestore batches cap at 500). */
async function commitChunked(ops) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = db.batch();
    ops.slice(i, i + 450).forEach(fn => fn(batch));
    await batch.commit();
  }
}

/** Sleep-hours check (config sleepStart/sleepEnd, default 22–6),
 *  evaluated in TZ (America/Chicago). ?force=1 bypasses for testing. */
function isAsleep(cfg) {
  const hour = new Date().getHours(); // local, thanks to TZ env var
  const s = cfg.sleepStart ?? 22, e = cfg.sleepEnd ?? 6;
  return s > e ? (hour >= s || hour < e) : (hour >= s && hour < e);
}

/** Local midnight of the day containing ts (TZ env makes this Nashville). */
function startOfLocalDay(ts) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

/** YYYY-MM-DD in LOCAL time — half of a carryover event's identity. */
function localDateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** config.carryoverWriteHour, sane-guarded (D14 default 9 AM). */
function carryHour(cfg) {
  const n = parseInt(cfg.carryoverWriteHour, 10);
  return (!isNaN(n) && n >= 0 && n <= 23) ? n : 9;
}

/** All-day events arrive as bare dates; TZ makes this local midnight.
 *  (Google's all-day `end.date` is EXCLUSIVE — already what we want.) */
function parseWhen(when) {
  if (!when) return null;
  if (when.dateTime) return Date.parse(when.dateTime);
  if (when.date) return new Date(`${when.date}T00:00:00`).getTime();
  return null;
}

functions.http("pollCalendars", async (req, res) => {
  const started = Date.now();
  try {
    if (!process.env.POLL_SECRET) {
      // Fail CLOSED: an unset lock must not mean an open door.
      return res.status(403).json({ error: "POLL_SECRET env var is not set on this service — add it under Variables & Secrets and redeploy" });
    }
    if (req.get("x-poll-secret") !== process.env.POLL_SECRET) {
      return res.status(403).json({ error: "bad or missing x-poll-secret" });
    }

    const job   = String(req.query.job || "poll").toLowerCase();
    const force = req.query.force === "1";
    const only  = String(req.query.ws || "").trim();   // ?ws=<id> — one workspace

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/calendar"] // rw: the mirror writes
    });
    const cal = google.calendar({ version: "v3", auth });

    const report = {
      version: FUNCTIONS_VERSION,
      tz: process.env.TZ || "(unset — running in UTC; set TZ=America/Chicago)",
      localHour: new Date().getHours(),
      job, batch: BATCH,
      workspaces: {}
    };

    const claimed = await claimWorkspaces(only, force);
    report.claimed = claimed.length;
    if (!claimed.length) {
      report.note = only
        ? `no workspace with id "${only}"`
        : "nothing is due — every workspace's nextPollAt is in the future. This is the normal quiet answer, not an error.";
      return res.json(report);
    }

    for (const ws of claimed) {
      if (Date.now() - started > SOFT_DEADLINE_MS) {
        report.stoppedEarly = "soft deadline reached; the unprocessed workspaces are still due and get claimed first next run";
        break;
      }
      report.workspaces[ws.id] = await runWorkspace(cal, ws, job, force);
      // STAMP EVEN ON FAILURE, and this is deliberate. A workspace whose
      // calendar share is broken would otherwise stay permanently overdue,
      // sit at the head of the queue forever, and starve everybody behind it
      // — the same "one bad tier must not starve the rest" discipline the
      // poll has used since 0.1.0, applied one level up. A broken workspace
      // reports its error every hour and costs one slot, not all of them.
      if (!only) await stampNextPoll(ws);
    }
    report.elapsedMs = Date.now() - started;
    return res.json(report);
  } catch (err) {
    console.error("sync failed:", err);
    return res.status(500).json({ error: String(err.message || err) });
  }
});

/**
 * E14 — claim the workspaces that are due, oldest first.
 *
 * Single-field range + order on the same field, so the automatic index
 * covers it: no exemption needed (unlike the client's collection-group
 * query, which does need one — SETUP-2.0.md Part 5b).
 *
 * `nextPollAt` is always a NUMBER, 0 meaning "never polled, do it now".
 * It is deliberately not null: null sorts before numbers in Firestore, so
 * nulls would be swept in by the `<=` comparison anyway, and a field whose
 * absence and whose zero mean the same thing is one fewer case to reason
 * about. Legacy nulls therefore still get claimed, and stamping rewrites
 * them to numbers on first contact — self-migrating, no script.
 */
async function claimWorkspaces(only, force) {
  if (only) {
    const d = await db.doc(`workspaces/${only}`).get();
    return d.exists ? [{ id: d.id, ...d.data() }] : [];
  }
  const col = db.collection("workspaces");
  const q = force
    ? col.orderBy("nextPollAt").limit(BATCH)          // ?force=1 ignores the clock
    : col.where("nextPollAt", "<=", Date.now()).orderBy("nextPollAt").limit(BATCH);
  const snap = await q.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Put a workspace back in the queue at its own cadence.
 *  The WORKSPACE document is authoritative for pollIntervalMinutes (E14
 *  needs it queryable at claim time); settings/config's copy is read only
 *  as a fallback for workspaces created before that field existed. */
async function stampNextPoll(ws) {
  const mins = Number(ws.pollIntervalMinutes) > 0 ? Number(ws.pollIntervalMinutes) : 60;
  await db.doc(`workspaces/${ws.id}`).update({ nextPollAt: Date.now() + mins * 60000 });
}

/**
 * One workspace, all three jobs, fully isolated (Principle 2: the blast
 * radius of a mistake is one workspace). Everything that can throw is
 * caught here, so a single broken calendar share can never end the run for
 * the people behind it in the batch.
 */
async function runWorkspace(cal, ws, job, force) {
  const wsId = ws.id;
  const out = { name: ws.name || "(unnamed)", jobs: {} };
  try {
    const cfgSnap = await db.doc(`workspaces/${wsId}/settings/config`).get();
    const cfg = cfgSnap.exists ? cfgSnap.data() : {};

    // Sleep hours are PER WORKSPACE — they come from that workspace's own
    // config, so a night-owl colleague and a 10pm household don't have to
    // agree. Checked before any calendar call, so a sleeping workspace is
    // nearly free.
    if (isAsleep(cfg) && !force) return { ...out, skipped: "sleep hours" };

    const tiersSnap = await db.collection(`workspaces/${wsId}/tiers`).get();
    const allTiers = tiersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // E37 — the entitlement check. Member document ids ARE lowercased emails.
    const memSnap = await db.collection(`workspaces/${wsId}/members`).get();
    const memberEmails = new Set(memSnap.docs.map(d => d.id.toLowerCase()));

    const calTiers = [];
    const refused = {};
    for (const t of allTiers) {
      if (t.kind !== "anchor" || !t.gcalCalendarId) continue;
      const why = calendarRefusal(t.gcalCalendarId, memberEmails);
      if (why) refused[t.name || t.id] = why;   // reported, never silently dropped
      else calTiers.push(t);
    }
    if (Object.keys(refused).length) out.refusedCalendars = refused;

    if (job === "poll" || job === "all") {
      // "skipped", not "warning": in a multi-user system most workspaces
      // legitimately have no calendar attached, and a report where every
      // healthy row shouts a warning is a report nobody reads.
      out.jobs.poll = calTiers.length
        ? await runPoll(cal, wsId, calTiers)
        : { skipped: "no calendar connected — ⚙️ Settings → Tiers, and open '📅 How do I show my Google Calendar here?'" };
    }
    if (job === "mirror" || job === "all") {
      try { out.jobs.mirror = await runMirror(cal, wsId, cfg, allTiers); }
      catch (err) { out.jobs.mirror = { error: String(err.message || err) }; }
    }
    if (job === "carryover" || job === "all") {
      try { out.jobs.carryover = await runCarryover(cal, wsId, cfg, allTiers); }
      catch (err) { out.jobs.carryover = { error: String(err.message || err) }; }
    }
    // Deliberately NOT part of "all" — a one-time repair should be asked for,
    // not carried silently on every hourly run forever.
    if (job === "fixtags") {
      try { out.jobs.fixtags = await runFixTags(cal, wsId, cfg); }
      catch (err) { out.jobs.fixtags = { error: String(err.message || err) }; }
    }
  } catch (err) {
    out.error = String(err.message || err);
  }
  return out;
}

/**
 * ONE-TIME REPAIR (1.3.0). Adopt pre-E40 events that carry no tcWs.
 *
 * Lists this workspace's own mirror calendar by tcApp ALONE — the old,
 * unscoped filter — and stamps tcWs onto anything missing it. Nothing is
 * deleted: the next ordinary mirror run reconciles, and prunes anything whose
 * task no longer exists using logic that already works.
 *
 * `...p` matters: a patch on extendedProperties.private REPLACES the map, so
 * spreading the existing properties is what keeps tcTaskId and tcCarryKey
 * alive. Dropping them would orphan every event permanently — the exact
 * problem this exists to fix, made worse.
 *
 * EDGE CASE, stated rather than discovered: if two workspaces somehow share a
 * mirror calendar AND both have untagged events, whichever runs first adopts
 * all of them. The following mirror run then prunes the ones whose tasks it
 * cannot find, so the end state is still correct — just noisier than it looks.
 */
async function runFixTags(cal, wsId, cfg) {
  const calId = (cfg.mirrorCalendarId || "").trim();
  if (!calId) return { skipped: "no mirror calendar on this workspace — nothing to repair" };

  let adopted = 0, alreadyTagged = 0;
  for (const tag of [TC_APP, TC_APP_CARRY]) {
    let pageToken;
    do {
      const r = await cal.events.list({
        calendarId: calId,
        privateExtendedProperty: `tcApp=${tag}`,   // the OLD filter, on purpose
        maxResults: 250,
        pageToken
      });
      for (const ev of r.data.items || []) {
        if (ev.status === "cancelled") continue;
        const p = ev.extendedProperties?.private || {};
        if (p.tcWs) { alreadyTagged++; continue; }
        await cal.events.patch({
          calendarId: calId,
          eventId: ev.id,
          requestBody: { extendedProperties: { private: { ...p, tcWs: wsId } } }
        });
        adopted++;
      }
      pageToken = r.data.nextPageToken;
    } while (pageToken);
  }
  return { calendar: calId, adopted, alreadyTagged,
           note: adopted ? "run ?job=all next; the normal reconcile takes it from here"
                         : "nothing needed fixing" };
}

/** Phase 3 step 1: calendars → eventsCache (unchanged logic, extracted). */
async function runPoll(cal, wsId, calTiers) {
  const timeMin = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const timeMax = new Date(Date.now() + HORIZON_MS).toISOString();
  const evCol = db.collection(`workspaces/${wsId}/eventsCache`);
  const out = { window: { timeMin, timeMax }, tiers: {} };

  for (const tier of calTiers) {
      const lead = tier.defaultLeadWindowMinutes ?? 30;
      const fresh = [];
      let pageToken;
      try {
        do {
          const r = await cal.events.list({
            calendarId: tier.gcalCalendarId,
            singleEvents: true,          // expand recurrences
            orderBy: "startTime",
            timeMin, timeMax,
            maxResults: 250,
            pageToken
          });
          for (const ev of r.data.items || []) {
            if (ev.status === "cancelled") continue;
            const start = parseWhen(ev.start);
            if (start == null) continue;
            fresh.push({
              gcalEventId: ev.id,
              title: ev.summary || "(untitled)",
              start,
              end: parseWhen(ev.end),
              tierId: tier.id,
              leadWindowMinutes: lead,
              allDay: !!ev.start?.date
            });
          }
          pageToken = r.data.nextPageToken;
        } while (pageToken);
      } catch (err) {
        // Most common cause: calendar not shared with the service
        // account, or a typo'd calendar ID. Report and keep going —
        // one bad tier must not starve the others.
        out.tiers[tier.name] = { error: String(err.message || err) };
        continue;
      }

      // D135 — RECONCILE, don't replace. This used to delete every doc for
      // the tier and re-`set` all of them under FRESH AUTO-IDs, every hour,
      // whether or not anything had changed. Cost: ~90 deletes + ~90 writes
      // server-side per run, and — the expensive part — ~180 document
      // changes pushed to EVERY connected client's eventsCache listener,
      // ~16 times a day. That's ~2,900 billed reads per open tab per day
      // for data that almost never changes, and it scaled with user count,
      // which is precisely what made the app expensive to share.
      //
      // Two things had to be true to fix it, and the second is the one that
      // would have silently defeated a naive attempt:
      //   1. A STABLE KEY. Auto-ids made every doc unrecognisable next run,
      //      so nothing could be compared. HANDOFF §3 always said
      //      eventsCache/{gcalEventId}; the implementation had drifted.
      //      Prefixed with the tier id because the SAME calendar event can
      //      appear on two calendars (shared/invited), and a bare event-id
      //      key would let two tiers fight over one doc forever.
      //   2. syncedAt: Date.now() WAS IN THE PAYLOAD. Every doc would have
      //      differed on every run and "write only what changed" would have
      //      written everything anyway. Nothing in the codebase ever read
      //      it, so it's gone rather than excluded — keeping it and writing
      //      only on change would make it mean "last CHANGED", which is a
      //      lie in a field called syncedAt.
      // This is the same discipline mirrorTasks has used since D81, twenty
      // lines below. The poll was the odd one out.
      const oldSnap = await evCol.where("tierId", "==", tier.id).get();
      const have = new Map();
      oldSnap.docs.forEach(d => have.set(d.id, d.data()));

      const ops = [];
      const wanted = new Set();
      let created = 0, updated = 0, removed = 0;
      for (const e of fresh) {
        const key = eventDocId(tier.id, e.gcalEventId);
        if (!key) { ops.push(b => b.set(evCol.doc(), e)); created++; continue; } // no usable id: old behaviour
        wanted.add(key);
        const cur = have.get(key);
        if (!cur) { ops.push(b => b.set(evCol.doc(key), e)); created++; }
        else if (eventChanged(cur, e)) { ops.push(b => b.set(evCol.doc(key), e)); updated++; }
      }
      // Anything of this tier's that the calendar no longer has — including
      // every legacy auto-id doc, which migrates itself away on first run.
      for (const key of have.keys()) {
        if (!wanted.has(key)) { ops.push(b => b.delete(evCol.doc(key))); removed++; }
      }
      await commitChunked(ops);
      out.tiers[tier.name] = { created, updated, removed, unchanged: fresh.length - created - updated };
  }
  return out;
}

/** D135 — deterministic doc id. Firestore reserves ids matching __.*__ and
 *  forbids "/", so the event id is sanitised; the tier prefix keeps two
 *  calendars holding the same event from overwriting each other. */
function eventDocId(tierId, gcalEventId) {
  if (!tierId || !gcalEventId) return null;
  return `${tierId}_${String(gcalEventId).replace(/[^A-Za-z0-9_-]/g, "-")}`.slice(0, 400);
}

/** D135 — the fields that actually MATTER to the client. syncedAt is
 *  deliberately absent (it no longer exists); anything not listed here
 *  changing does not justify a write, because a write costs every open
 *  tab a read. */
const EVENT_FIELDS = ["gcalEventId", "title", "start", "end", "tierId", "leadWindowMinutes", "allDay"];
function eventChanged(cur, next) {
  return EVENT_FIELDS.some(f => (cur[f] ?? null) !== (next[f] ?? null));
}

/** Phase 3 step 2 (D81): tasks → the dedicated mirror calendar.
 *  Reconcile, don't append: the calendar's tcTaskId tags ARE the
 *  ledger. Dated + incomplete tasks exist there; everything else
 *  gets removed. Honest dueAt only — no escalation theater. */
async function runMirror(cal, wsId, cfg, allTiers) {
  const calId = (cfg.mirrorCalendarId || "").trim();
  if (!calId) return { skipped: "no mirror calendar set — ⚙️ Settings → Timing, and open '🔔 How do I get reminders on my phone?' for the six clicks" };
  // LOOP GUARD: mirroring into a polled calendar would feed every
  // task back into the queue as its own doppelgänger anchor.
  const clash = allTiers.find(t => t.gcalCalendarId === calId);
  if (clash) return { error: `mirrorCalendarId is the same calendar tier "${clash.name}" polls — that's a feedback loop. Use a dedicated calendar.` };

  const tierName = {};
  allTiers.forEach(t => { tierName[t.id] = t.name; });

  const tasksSnap = await db.collection(`workspaces/${wsId}/tasks`).get();
  const want = new Map(); // taskId → desired event fields
  tasksSnap.docs.forEach(d => {
    const t = d.data();
    if (!t.dueAt || t.completedAt) return;   // waiting + done don't mirror
    want.set(d.id, { title: t.title || "(untitled)", dueAt: t.dueAt, tier: tierName[t.tierId] || "" });
  });

  const have = new Map(); // taskId → existing event
  let pageToken;
  do {
    const r = await cal.events.list({
      calendarId: calId,
      // E40 — both filters, ANDed: this app AND this workspace.
      privateExtendedProperty: [`tcApp=${TC_APP}`, `tcWs=${wsId}`],
      maxResults: 250,
      pageToken
    });
    (r.data.items || []).forEach(ev => {
      if (ev.status === "cancelled") return;
      const tid = ev.extendedProperties?.private?.tcTaskId;
      if (tid) have.set(tid, ev);
    });
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  const body = (id, w) => ({
    summary: w.title,
    description: `Tentacalendar${w.tier ? " · " + w.tier : ""}`,
    start: { dateTime: new Date(w.dueAt).toISOString() },
    end: { dateTime: new Date(w.dueAt + 30 * 60000).toISOString() },
    extendedProperties: { private: { tcApp: TC_APP, tcWs: wsId, tcTaskId: id } }
  });

  let created = 0, updated = 0, removed = 0;
  for (const [id, w] of want) {
    const ev = have.get(id);
    if (!ev) {
      await cal.events.insert({ calendarId: calId, requestBody: body(id, w) });
      created++;
    } else {
      const evStart = ev.start?.dateTime ? Date.parse(ev.start.dateTime) : null;
      if (ev.summary !== w.title || evStart !== w.dueAt) {
        await cal.events.patch({ calendarId: calId, eventId: ev.id, requestBody: body(id, w) });
        updated++;
      }
    }
  }
  for (const [id, ev] of have) {
    if (!want.has(id)) {
      await cal.events.delete({ calendarId: calId, eventId: ev.id });
      removed++;
    }
  }
  return { calendar: calId, active: want.size, created, updated, removed };
}

/** Phase 3 step 3 (D14/D87): THE CARRYOVER — nothing silently disappears.
 *
 *  A task in a ❗ midnightCarryover tier that was due BEFORE today began
 *  and still isn't checked gets an event on TODAY's calendar at
 *  config.carryoverWriteHour (default 9 AM), titled "❗ <task>", tomato
 *  (colorId 11 — D14). One per task per day.
 *
 *  NO HOUR TRIGGER, on purpose. "Due before today started" is true
 *  whenever this runs, so the first waking tick of the day does the job
 *  (the 22–6 sleep gate means ~06:07, three hours of lead on a 9 AM
 *  landing) and a missed tick, an outage, or a changed Scheduler cadence
 *  can never silently skip a morning. Hour-gating would have been one
 *  cron hiccup away from a lie.
 *
 *  SEPARATE TAG NAMESPACE (tcApp=octodo-carryover): the mirror
 *  queries tcApp=octodo and keys its ledger by tcTaskId, so a
 *  shared tag would give it two events for one task and it would patch
 *  the ❗ back to the honest due time. These two jobs write to the same
 *  calendar and must not be able to see each other's events.
 *
 *  Reconciles TODAY only (the mirror's idiom — the calendar is the
 *  ledger): creates what's missing, re-times if carryoverWriteHour
 *  changed, deletes today's ❗ once the task is done/rescheduled/undated.
 *  Earlier days are never touched — history stands.
 */
async function runCarryover(cal, wsId, cfg, allTiers) {
  const calId = (cfg.mirrorCalendarId || "").trim();
  if (!calId) return { skipped: "no mirror calendar set — ⚙️ Settings → Timing. The carryover writes to the same dedicated calendar as the mirror, so setting one turns both on" };
  // Same loop guard as the mirror: never write into a calendar we poll.
  const clash = allTiers.find(t => t.gcalCalendarId === calId);
  if (clash) return { error: `mirrorCalendarId is the same calendar tier "${clash.name}" polls — that's a feedback loop. Use a dedicated calendar.` };

  const carryTiers = new Map();
  allTiers.forEach(t => { if (t.midnightCarryover) carryTiers.set(t.id, t.name); });
  if (!carryTiers.size) return { skipped: "no tier has ❗ carryover checked (⚙️ Settings → Tiers)" };

  const now = Date.now();
  const todayStart = startOfLocalDay(now);
  const landing = new Date(now);
  landing.setHours(carryHour(cfg), 0, 0, 0);   // today at the carryover hour, DST-safe
  const landsAt = landing.getTime();
  const key = localDateKey(landsAt);

  // WANT: missed + still open + in a ❗ tier.
  const tasksSnap = await db.collection(`workspaces/${wsId}/tasks`).get();
  const want = new Map(); // "taskId#YYYY-MM-DD" → fields
  tasksSnap.docs.forEach(d => {
    const t = d.data();
    if (t.completedAt) return;              // done
    if (t.dueAt == null) return;            // Waiting — never due, never missed
    if (!carryTiers.has(t.tierId)) return;  // tier opted out
    if (t.dueAt >= todayStart) return;      // due today or later = not missed YET
    want.set(`${d.id}#${key}`, {
      taskId: d.id,
      title: t.title || "(untitled)",
      dueAt: t.dueAt,
      tier: carryTiers.get(t.tierId) || ""
    });
  });

  // HAVE: today's carryover events only (timeMin bounds the read; the
  // key check keeps a changed write-hour from dragging in a stale day).
  const have = new Map();
  let pageToken;
  do {
    const r = await cal.events.list({
      calendarId: calId,
      privateExtendedProperty: [`tcApp=${TC_APP_CARRY}`, `tcWs=${wsId}`],   // E40
      timeMin: new Date(todayStart).toISOString(),
      maxResults: 250,
      pageToken
    });
    (r.data.items || []).forEach(ev => {
      if (ev.status === "cancelled") return;
      const k = ev.extendedProperties?.private?.tcCarryKey;
      if (k && k.endsWith(`#${key}`)) have.set(k, ev);
    });
    pageToken = r.data.nextPageToken;
  } while (pageToken);

  const body = (k, w) => ({
    summary: `❗ ${w.title}`,
    description: `Tentacalendar carryover${w.tier ? " · " + w.tier : ""} — was due ${new Date(w.dueAt).toLocaleString()} and wasn't checked off.`,
    colorId: "11", // tomato (D14)
    start: { dateTime: new Date(landsAt).toISOString() },
    end: { dateTime: new Date(landsAt + 30 * 60000).toISOString() },
    extendedProperties: { private: { tcApp: TC_APP_CARRY, tcWs: wsId, tcCarryKey: k, tcTaskId: w.taskId } }
  });

  let created = 0, retimed = 0, removed = 0;
  for (const [k, w] of want) {
    const ev = have.get(k);
    if (!ev) {
      await cal.events.insert({ calendarId: calId, requestBody: body(k, w) });
      created++;
    } else {
      const evStart = ev.start?.dateTime ? Date.parse(ev.start.dateTime) : null;
      if (evStart !== landsAt) { // carryoverWriteHour moved since this was written
        await cal.events.patch({ calendarId: calId, eventId: ev.id, requestBody: body(k, w) });
        retimed++;
      }
    }
  }
  for (const [k, ev] of have) {
    if (!want.has(k)) { // checked off, rescheduled, or shelved to Waiting
      await cal.events.delete({ calendarId: calId, eventId: ev.id });
      removed++;
    }
  }

  return {
    calendar: calId,
    tiers: [...carryTiers.values()],
    landsAt: new Date(landsAt).toISOString(),
    missed: want.size, created, retimed, removed,
    alreadyThere: want.size - created - retimed
  };
}
