# browser-test/ — the real app, in a real browser, on a fake database

**Version 1.0.0** · built 2026-09-22 (Cyanea)

**This is for Claude, not for Jake.** Like `version-check.mjs` and the
`*.test.mjs` files, it needs a CLI, and Jake has none on a school-managed
Mac. Run it yourself before handing over any drop that touches the UI.

## What it is

`harness.mjs` serves the repo over `localhost:8765`, opens `index.html` in
headless Chrome, and answers the three `gstatic.com/firebasejs/…` imports
with the modules in `fake/` instead:

| file | stands in for | what it does |
|---|---|---|
| `fake/firestore.js` | firebase-firestore.js | an in-memory database in `window.__fs` (path → document), with live `onSnapshot` |
| `fake/auth.js` | firebase-auth.js | signs in as `katie@example.com`, verified, a fresh account every boot |
| `fake/app.js` | firebase-app.js | nothing |

So the **real** `app.js`, `store.js`, `queue.js`, `index.html` and CSS run
unmodified: first sign-in creates the personal board and default tiers
exactly as in production, and every button is clicked with real mouse,
keyboard and touch events.

## Running it

```
cd browser-test && npm install        # puppeteer-core only; uses an existing Chrome
cd .. && TZ=America/Chicago node browser-test/walk-items-10-4.test.mjs
```

Chrome is found under `~/.cache/puppeteer/chrome/*/`; otherwise set
`CHROME=/path/to/chrome`. `ROOT=/some/other/checkout` points the server at a
different copy, which is how you prove a test can fail: run it against the
code from before your fix. **Always set `TZ`** — the sandbox is UTC, where
the daylight-saving bug fixed in queue 1.2.0 cannot happen.

## The walk-throughs (2026-09-22: 75 checks, all green)

| file | covers |
|---|---|
| `walk-items-10-4.test.mjs` | follow-ups waiting for the real finish; the automatic re-peg on AFICC Bonnie's shape; tasks listed with their project |
| `walk-items-1-2-5.test.mjs` | Duplicate + date chips, 🎆 and outriders carried; Someday copies; Save as template; drag on desktop and in Settings; Pipeline "+ New" |
| `walk-items-6-7-8-9.test.mjs` | year-view tier chips; ⏱ ✎ on Today rows; edit pop-ups — including that they are really on TOP (a hit test, not just `hidden === false`) |
| `walk-phone.test.mjs` | 412px, touch: Saturday's Waiting on…, finger drag and a wiggle that must not reorder, the chips fitting |

## What it found that nothing else could

All three were invisible to unit tests, a linter, and reading the code:

1. **Drag stopped after one step.** Moving the row in the DOM drops pointer
   capture, so listeners on the grip went deaf mid-drag.
2. **Tall rows dragged wrong** — phone rows wrap to ~90px and the 🎆 row
   wraps even on a laptop, so "finger vs row middle" landed rows a half-row
   late. Now the row's leading edge decides.
3. **The Today row's ⏱ was smaller than ✎ and ⏰** — it borrowed the
   card's compact clock class. Found in a screenshot.

## Things that will trip you

- **The welcome splash** covers everything on a fresh account; `boot()`
  dismisses it. **The overdue check-in** (`#decision-modal`) opens by itself
  when seeded data is overdue — close it like a user would, don't delete it.
- **`page.reload()` empties the database** (it lives in the page).
- **A project starting on a Saturday on Work** opens the weekend question,
  on top of everything, correctly. Seed weekday dates unless that is the test.
- **Use real clicks** (`page.mouse.click` at the element's centre, or
  `page.click`) for anything about modals. `element.click()` in `evaluate`
  goes through overlays and will pass a test a person would fail.
- **Not a rules test.** Every write is allowed. Rules go through `rules-test/`.
