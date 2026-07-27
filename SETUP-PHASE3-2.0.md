# SETUP-PHASE3-2.0.md — Calendars for Octodo (poll · mirror · carryover)

**Version 1.1.0** · 2026-07-27 by Marginatus · For `functions/index.js` **1.0.0** · Build item 7

> ## ⚠️ WHO DOES WHAT — read this first
>
> **This entire document is for YOU, once.** It stands up the machinery: one Cloud Run service, one robot account, one schedule, for the whole installation. Nobody else ever opens a Google Cloud console, and nobody else reads this file.
>
> **Every other user does exactly one thing, once, inside the app:** ⚙️ Settings → Tiers → **"📅 How do I show my Google Calendar here?"** — which shows them the robot's address with a copy button and walks the six clicks in Google Calendar. That walkthrough is the per-user guide, and it is the only one there is.
>
> **They share their OWN calendar and see only their own events.** The E37 guard means a personal calendar can only be polled by a workspace that person belongs to — so nobody can point a tier at somebody else's address and read their week.
>
> **⚠️ Fill `CALENDAR_ROBOT` into `config.js` after Part 3.** Until you do, the in-app walkthrough tells users calendar sync isn't switched on yet, which is honest but not useful.
>
> **What this is:** the browser-only walkthrough that gives Octodo working calendars — appointments pulled *in*, tasks mirrored *out* (which is what makes phone notifications happen), and the ❗ carryover. You did this once for 1.x. Same shape, one new project, and a few things that bit you last time are now steps instead of surprises.
>
> **Time:** about an hour. Splits cleanly at the ⏸.
>
> **Nothing here touches `tentacalendar`.** Different project, different service account, different tag namespace. Katie's mirror keeps running exactly as it does today — see Part 9.
>
> ⚠️ **If a console screen doesn't match what's written here, take a screenshot and ask rather than hunting.** These UIs move, and two rounds were burned this week on a dialog described from memory.

---

## Before you start

| | |
|---|---|
| Project | `fantasktic-octodo` |
| Billing | **Blaze — already on.** Nothing to do. |
| Files | `functions/index.js` 1.0.0 and `functions/package.json` 1.0.0, both in the octodo repo |
| Realistic bill | **$0.00.** ~720 invocations/month against a 2M free allowance; the Calendar API is free. |

---

## Part 1 — Enable the APIs (5 min)

**Google Cloud Console** → make sure the project selector at the top reads **`fantasktic-octodo`** (this is the single easiest mistake to make today) → **APIs & Services → Library**. Enable each:

- **Google Calendar API**
- **Cloud Run Admin API**
- **Cloud Build API**
- **Cloud Scheduler API**

Some may already be on from the Firebase setup. Enabled is enabled.

---

## Part 2 — Create the function (15 min, the paste job)

**Cloud Run → Write a function** (not "Deploy container"). If you only see container options, look for the **Node.js** tile or a "Use an inline editor to create a function" link.

Fill the form exactly:

| Field | Value | Why |
|---|---|---|
| **Service name** | `pollcalendars` | **Lowercase, no capitals.** Cloud Run enforces RFC-1035 and rejects `pollCalendars`. The *entry point* keeps the capital — that's a different field. |
| **Region** | `us-central1` | Where the data is |
| **Runtime** | Node.js 20 | |
| **Function entry point** | `pollCalendars` | Capital C here. Must match `functions.http("pollCalendars", …)` in the code. |
| **Authentication** | **Allow unauthenticated / public** | The `POLL_SECRET` header is the lock. Locking it at the platform level would also lock out Scheduler. |
| **Billing** | Request-based | |
| **Scaling** | min **0**, max **1** | 0 = scale to zero = free (ignore the cold-start nudge). Max 1 means no parallelism, which caps any retry storm. |
| **Ingress** | **All** | Scheduler and your `curl` both come from the internet. Not "Internal". |
| **Trigger** | **SKIP IT** | "Add trigger" means Eventarc. The URL is invocable on its own. |

**Create.** The inline editor opens.

1. Replace the contents of **`index.js`** with `functions/index.js` from the repo. **Select all first** — appending instead of replacing is what took the site down on 2026-07-12.
2. Replace **`package.json`** with `functions/package.json`.
3. **Variables & Secrets** (under Containers, in the edit view) → add two environment variables:

   | Name | Value |
   |---|---|
   | `POLL_SECRET` | a long random string you invent. Keep a copy — Part 4 needs it. |
   | `TZ` | `America/Chicago` |

   `TZ` is load-bearing, not cosmetic: it makes all-day event midnights, sleep hours, and the carryover's "today" land in Nashville rather than UTC.

4. **Deploy.** First build takes a few minutes.
5. Copy the **service URL** from the service page. Part 4 needs it.

---

## Part 3 — Find the robot's email, and share the calendars (10 min)

The function authenticates as its own **service account** — no OAuth, no tokens. You grant it access by sharing calendars with it, exactly like sharing with a person.

1. Cloud Run → your service → **Security** (or Details) → **Service account**. It looks like `<something>@fantasktic-octodo.iam.gserviceaccount.com`. Copy it.
2. **Google Calendar** (as yourself) → hover a calendar → ⋮ → **Settings and sharing** → **Share with specific people** → **Add people** → paste the robot address.

**Which calendars, and at which permission:**

| Calendar | Permission | Why |
|---|---|---|
| Each calendar an **anchor tier** points at (your Home tier currently points at your own primary calendar) | **See all event details** | Read-only; this is the poll |
| The **dedicated mirror calendar** | **Make changes to events** | The mirror and carryover write here |

**Create the mirror calendar now if it doesn't exist:** Google Calendar → **Other calendars +** → *Create new calendar* → name it something like `Octodo Mirror`. Then open its settings and copy the **Calendar ID** from *Integrate calendar*.

⚠️ **The mirror calendar must be a calendar no tier polls.** The function refuses outright if it isn't, because mirroring into a polled calendar feeds every task back into your own queue as a fake appointment. A brand-new dedicated calendar can't hit this.

4. In Octodo: ⚙️ **Settings → Timing → Mirror calendar** → paste that Calendar ID. (The tab is **Timing**, not "Calendar" — the docs said Calendar for a while and were wrong.)

5. **Paste that same service-account address into `config.js`** as `CALENDAR_ROBOT`, and push. This is what puts it in front of every other user, so you never have to send it to anyone by hand.

> **Sharing is per calendar and per person.** Whoever wants their calendar polled shares it with this robot themselves. Nothing is automatic, and nobody can be added without doing it.
>
> **⚠️ SCHOOL AND WORK ACCOUNTS MAY REFUSE THIS.** Plenty of Google Workspace administrators block sharing calendars with addresses outside the organisation. If a colleague's district account won't accept the robot, that is the cause and there is no fix on our side — they can use a personal calendar, or ask their admin to permit it. **Worth testing with one colleague before promising anything to several**, because it decides whether path A is viable for faculty at all. If it is blocked broadly, that is the argument for path B (E13) sooner rather than later.

---

⏸ **Natural stopping point.** Everything above is setup; everything below is testing and scheduling.

---

## Part 4 — Test by hand (5 min)

Terminal.app on your Mac needs no admin rights for this.

```
curl -H "x-poll-secret: YOUR_SECRET" "https://YOUR-SERVICE-URL/?job=all&force=1"
```

`force=1` bypasses the sleep-hours gate so you can test at any hour.

**A healthy reply looks like:**

```json
{
  "version": "1.0.0",
  "tz": "America/Chicago",
  "localHour": 14,
  "job": "all",
  "claimed": 2,
  "workspaces": {
    "abc123": { "name": "Jake", "jobs": { "poll": {...}, "mirror": {...}, "carryover": {...} } },
    "def456": { "name": "Nico", "jobs": { "poll": { "skipped": "no anchor tier has a gcalCalendarId" } } }
  }
}
```

**Reading it:**

| You see | Means |
|---|---|
| `"tz": "(unset — running in UTC…)"` | The `TZ` variable didn't save. Go back to Part 2 step 3. |
| `POLL_SECRET env var is not set` | Same, for the other variable. It fails **closed** on purpose. |
| `"claimed": 0` with a `note` | Everything is polled and nothing is due yet. **Not an error.** Add `&force=1`. |
| `"skipped": "no anchor tier has a gcalCalendarId"` | Correct and expected for a workspace with no calendar attached. |
| `"skipped": "sleep hours"` | You forgot `force=1`, or it's genuinely between 22:00 and 06:00. |
| A tier with an `error` about permission | That calendar isn't shared with the robot yet, or the Calendar ID has a typo. |

**One workspace at a time:** add `&ws=<workspaceId>` to run just one. Grab the id from the version tooltip in the app (hover the version number in the header). This is the first thing to reach for when one person's calendar misbehaves.

---

## Part 5 — Put it on a schedule (10 min)

**Cloud Scheduler → Create job.**

| Field | Value |
|---|---|
| Name | `octodo-sync` |
| Region | `us-central1` |
| Frequency | `7 * * * *` |
| Timezone | America/Chicago |
| Target type | HTTP |
| URL | `https://YOUR-SERVICE-URL/?job=all` |
| Method | GET |
| Headers | `x-poll-secret` : `YOUR_SECRET` |

`7 * * * *` means seven minutes past every hour — off the hour, where everyone else's cron traffic is.

**No `force=1` here.** The schedule should respect sleep hours; that's what they're for.

Hit **Run now** once, then check the job's log for a `200`.

---

## Part 6 — Smoke tests

- **WW1. Events arrive.** An appointment on a polled calendar appears in Today's queue at its real time, with its tier's colour.
- **WW2. A change propagates.** Rename or move that event in Google Calendar; within a poll cycle the queue agrees.
- **WW3. Deletion propagates.** Delete it; it leaves the queue.
- **WW4. The mirror writes.** Create a dated task in Octodo. Within a cycle it appears on the mirror calendar — **and your phone notifies you**, which is the entire point of the mirror.
- **WW5. The mirror cleans up.** Check that task off. The event disappears.
- **WW6. The loop guard holds.** Temporarily set the mirror calendar to one a tier polls → the report returns a clear `error`, not a mess. Set it back.
- **WW7. The carryover lands.** Leave a task in a ❗ tier unchecked overnight. Next morning there's a tomato-coloured `❗ <task>` at 9 AM. Check it off; it vanishes on the next run.
- **WW8. ⚠️ ISOLATION — the one that is new in 2.0.** Confirm the report names **more than one workspace**, and that each `poll`/`mirror` block is scoped to its own. One person's broken calendar share must show as an `error` on *their* row while everyone else's row is fine.

---

## Part 7 — What is deliberately NOT here

- **App Check** (E18) — free, and required *before* you hand the URL to a colleague. The signup door is already open.
- **Path B "Connect with Google"** (E13) — the one-button OAuth alternative to sharing with the robot. Designed for, not built. Path A has no user cap and no review process.
- **Katie's migration** — build item 9, needs `import.html`.

---

## Part 8 — ⚠️ Running alongside 1.x: read before flip day

Both apps will be mirroring to Google Calendar during the overlap. **They cannot collide, by construction**, and it is worth knowing exactly why.

The mirror lists events by an **exact-match** tag, then deletes any tagged event whose task it can't find. Two apps sharing one tag would take turns deleting each other's work, every hour.

| App | Mirror tag | Carryover tag |
|---|---|---|
| 1.x (tentacalendar) | `tcApp=tentacalendar` | `tcApp=tentacalendar-carryover` |
| 2.0 (octodo) | `tcApp=octodo` | `tcApp=octodo-carryover` |

Distinct namespaces make them mutually invisible — the same trick D87 already used to let the mirror and carryover share one calendar.

> **A combined tag like `octodo tentacalendar` cannot work.** The list filter is exact-match, so such an event would be invisible to *both* apps rather than visible to both. The tag records **ownership**, and ownership has to be binary for a prune step to be safe.

**Also, and simplest of all: point each workspace at its own mirror calendar.** `mirrorCalendarId` is per workspace, so during the overlap Octodo writes to `Octodo Mirror` and 1.x keeps writing to Katie's. They never meet.

**At flip**, when Katie's Octodo workspace inherits her existing mirror calendar, the events already there carry the `tentacalendar` tag and Octodo won't recognise them — so they'd linger as stale duplicates. **The mirror is derived data, fully rebuildable from her tasks**, so the clean answer is: disable the 1.x Scheduler job, delete the events in that calendar, and let Octodo's first run repopulate it. That step belongs on the flip-day checklist and is already noted there.

---

*Marginatus, 2026-07-27.* 🐙
