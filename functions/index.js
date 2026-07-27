// ============================================================
// Tentacalendar 2.0 (Octodo) — Cloud Functions
// functions/index.js — Version 1.2.1 (E14 queue · E37 guard · E40 ws tags)
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
// 1.1.0 tagged every mirrored event `tcApp=octodo` and nothing else, then
// listed by that tag and DELETED any event whose task it could not find. One
// app, many workspaces — so if two workspaces ever pointed at the SAME mirror
// calendar, each run would see the other's events as orphans and delete them.
// Every hour. This is the identical failure the 1.x/2.0 tag split was written
// to prevent (E36), one level further down, and it was still open.
//
// Fixed by adding `tcWs: <workspaceId>` to every written event and to the
// list filter (privateExtendedProperty repeats and ANDs). Each workspace now
// sees and prunes only its own events, which turns "two people share one
// mirror calendar" from a mutual-deletion machine into something that simply
// works — a household might well want exactly that.
//
// ⚠️ FREE ONLY BECAUSE NOTHING IS DEPLOYED YET. An event written by 1.0.0 or
// 1.1.0 carries no tcWs, so it would fall outside the new filter, become
// invisible, and never be pruned. There are no such events today. If this
// ever changes after a real deploy, the migration is a one-off pass that
// lists by tcApp alone and stamps tcWs onto anything missing it.
//
// (prev) Version 1.1.0 (E14 work queue + E37 calendar guard)
//
// 1.1.0 — ⚠️ CLOSES A REAL HOLE THAT 1.0.0 SHIPPED WITH, found by Jake
// asking whether a colleague could end up with HIS calendar. He could have
// ended up with worse: a colleague could have TAKEN it.
//
//   THE HOLE. The service account is PROJECT-WIDE. When Jake shares his
//   calendar with the robot so his own poll works, he grants that robot
//   access for EVERY workspace in the project — the grant lives on Google's
//   side and knows nothing about workspaces. 1.0.0 then read whatever
//   calendar id a tier happened to name, with no check that the workspace
//   was entitled to it. So any signed-up user could type
//   jacob.v.wilson@gmail.com into their own Home tier and pull his entire
//   calendar into their queue. Firestore isolation (E1) is airtight and
//   completely beside the point here: the leak is on the CALENDAR side.
//
//   THE GUARD (E37). A bare email address is somebody's primary calendar,
//   and it is guessable — so it may only be polled by a workspace that
//   person is a MEMBER of. Everything else (…@group.calendar.google.com and
//   friends) is an opaque random id nobody can guess, so it passes; those
//   are secondary calendars whose id is itself the secret.
//
//   WHAT THIS IS AND IS NOT. It is a real fix for the guessable case, which
//   is the one that matters, and it is defence in depth rather than a proof
//   of ownership — path A cannot prove ownership, because sharing a calendar
//   with a robot leaves no record of WHO shared it. **The complete answer is
//   path B (E13): per-user OAuth, where each person authorises their own
//   calendar and no shared robot exists.** Until then this guard plus a
//   trusted user base is the honest position, and it is written down here so
//   nobody has to rediscover it.
//
// (prev) Version 1.0.0 (E14, the multi-tenant work queue)
//
// 1.0.0 — WHAT CHANGED FROM 1.x's 0.4.0, AND WHAT DELIBERATELY DID NOT.
//
// DID NOT CHANGE, and re-deriving any of it by accident would be, in the
// design doc's own words, "a catastrophe wearing a rewrite's clothes":
//   · D135's poll reconcile — deterministic {tierId}_{gcalEventId} doc ids,
//     write-only-what-changed, syncedAt deliberately absent. This took
//     writes from 1,500/day to 116/day. It is carried across verbatim.
//   · D81's mirror ledger — the CALENDAR is the ledger, keyed by tcTaskId;
//     no task-doc writes, honest dueAt only, and the loop guard that refuses
//     to mirror into a calendar some tier polls.
//   · D87's carryover — no hour trigger, because "due before today began" is
//     true whenever it runs, so no cron hiccup can silently skip a morning.
//   · The separate tag namespace between mirror and carryover, so two jobs
//     can write to ONE calendar and stay mutually invisible.
//
// CHANGED:
//   1. THE WORK QUEUE (E14). 0.4.0 hardcoded `WS = "primary"`. A serial loop
//      over every workspace would eventually exceed the request timeout, and
//      its failure mode is silent — the last user in the loop never gets
//      polled and nobody finds out. Instead: claim a bounded batch of
//      workspaces whose nextPollAt is due, oldest first, process each with
//      its own try/catch, and re-stamp. Timeout-safe by construction,
//      self-healing after an outage (the overdue are simply the oldest), and
//      load spreads itself because stamps land at staggered times.
//   2. THE TAG NAMESPACE IS `octodo`, NOT `tentacalendar`. This is the whole
//      answer to "can both apps share a calendar during the migration."
//      The mirror LISTS by exact-match on tcApp, then DELETES any tagged
//      event whose task it cannot find — so two apps sharing one tag would
//      take turns deleting each other's work, every hour. Distinct tags make
//      them mutually invisible, exactly as D87 already made the carryover
//      invisible to the mirror. 1.x keeps its tag and is not touched.
//      ⚠️ A COMBINED TAG ("octodo tentacalendar") CANNOT WORK: the list
//      filter is exact-match, so such an event is invisible to BOTH apps
//      rather than visible to both. The tag records OWNERSHIP, and ownership
//      has to be binary for the prune step to be safe.
//   3. pollIntervalMinutes is read from the WORKSPACE document (E14 needs it
//      queryable), falling back to settings/config and then 60.
//   4. ?ws=<id> runs one workspace only — the testing door 0.4.0 never
//      needed, and the first thing anyone will want when a poll misbehaves.
//
// Deploy: Google Cloud Console inline editor (no CLI). See SETUP-PHASE3-2.0.md.
//
// (prev) Version 0.4.0 (D135, the poll reconcile)
// 0.4.0: pollCalendars RECONCILES instead of replacing. It used to delete
// every cached event and re-write all of them under new auto-ids every
// hour regardless of change — ~180 document changes pushed to every open
// tab per run, ~2,900 billed reads per tab per day, scaling with users.
// Now: docs are keyed {tierId}_{gcalEventId} (what HANDOFF §3 always
// specified; the code had drifted to auto-ids, which is WHY nothing could
// be compared), only genuinely-changed events are written, and only
// vanished ones deleted. syncedAt was REMOVED from the payload — it was
// never read anywhere, and being Date.now() it would have made every doc
// differ every run and defeated the whole fix. Legacy auto-id docs delete
// themselves on the first run (they're not in the wanted set). Same
// discipline mirrorTasks has used since 0.2.0. No client change needed:
// nothing keys off an event's doc id, and eventsCache is read-only display.
// 0.3.0: PHASE 3 IS COMPLETE. Third job, ?job=carryover (and in "all"):
// 0.3.0: PHASE 3 IS COMPLETE. Third job, ?job=carryover (and in "all"):
// a task in a ❗ midnightCarryover tier that was due before today began
// and still isn't checked gets "❗ <task>" on today's calendar at
// config.carryoverWriteHour (default 9), tomato colorId 11 — D14, the
// "nothing silently disappears" promise. Deliberately NOT hour-triggered:
// "due before today started" is true whenever it runs, so the first
// waking tick (~06:07, past the 22–6 sleep gate) writes the 9 AM landing
// and no cron hiccup can skip a morning. Its own tag namespace
// (tcApp=octodo-carryover) so the mirror — same calendar, keyed by
// tcTaskId — can't see these and patch the ❗ back to the due time.
// Reconciles TODAY only: create / re-time / delete-when-done; history stands.
// 0.2.0: one service, two jobs, routed by ?job= — "poll" (default),
// "mirror", or "all" (what the Scheduler should call). The mirror
// reconciles dated, incomplete tasks onto a DEDICATED write-shared
// calendar (cfg.mirrorCalendarId): create missing, patch drifted
// (title/time), delete completed/deleted/undated. Events are tagged
// with extendedProperties.private.tcTaskId, so the CALENDAR is the
// sync ledger — no task-doc writes, no schema changes. Honest due
// times only (escalation theater stays in the app). 30-min blocks.
// LOOP GUARD: refuses to mirror into any calendar attached to a tier.
// Scope widened readonly → calendar (rw).
// 0.1.1: an UNSET POLL_SECRET now refuses everything with a distinct
// message (previously undefined === undefined let header-less requests
// through an unset lock — Jake's "did I miss the variables?" question
// exposed it). The JSON report now includes tz + localHour, so one
// curl verifies BOTH env vars.
//
// pollCalendars: reads Google Calendar events for every anchor tier
// with a gcalCalendarId and mirrors them into eventsCache. The web
// client has subscribed to eventsCache since v0.1.0 — no client
// changes needed; events appear in the queue the moment this runs.
//
// Deploy: Google Cloud Console inline editor (no CLI — Jake's school
// Mac has no admin rights). See SETUP-PHASE3.md. Plain
// functions-framework style on purpose: it's what the console's
// Cloud Run functions editor expects.
//
// Env vars (set in the console):
//   POLL_SECRET  — shared secret; requests must send x-poll-secret
//   TZ           — America/Chicago (makes all Date math Nashville-local,
//                  including all-day event midnights and sleep hours)
//
// Auth to Calendar: the function's runtime service account, using
// Application Default Credentials. Jake & Katie SHARE their calendars
// with that service account's email ("See all event details") — no
// OAuth dance, no token storage.
// ============================================================

const functions = require("@google-cloud/functions-framework");
const admin = require("firebase-admin");
const { google } = require("googleapis");

const FUNCTIONS_VERSION = "1.2.1";

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
  } catch (err) {
    out.error = String(err.message || err);
  }
  return out;
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
