# 🐙 Tentacalendar 2.0 — *Octodo*

A planning board that takes deadlines seriously, now for more than one household.

**Development:** [misterwilson37.github.io/octodo](https://misterwilson37.github.io/octodo)
**Production (1.x, still live):** [tentacalendar.misterwilson.org](https://tentacalendar.misterwilson.org)

This repository is the multi-user rebuild of [Tentacalendar 1.x](https://github.com/misterwilson37/tentacalendar). The 1.x app is a real, in-daily-use application built for exactly two people who share a life; it has one workspace called `primary` and a two-address allowlist, which is the correct design for a household and an impossible one for anybody else.

2.0 keeps the entire application and replaces the floor it stands on.

---

## The permission model, in two words

Everything in this app's sharing model is **owner** and **member**. It is worth understanding before reading any code, because there is no third concept.

A workspace is **a house, not a photocopy.** There is one house. Everything in it — tasks, tiers, projects — exists exactly once. People holding keys walk into the *same* house, so a task checked off vanishes from every screen watching it within a second. There is never a second copy to fall out of sync.

- **Owner** holds the deed. Only an owner hands out and takes back keys.
- **Member** holds a key. `editor` is full use; `viewer` is read-only (a viewer may still react on the activity feed — that is how kudos work).

Every case is that model pointed one of two directions:

| Situation | Shape |
|---|---|
| Katie's board; a colleague's board | **They hold their own deed** and invite others in |
| A child's or student's board | **An adult holds the deed**, the resident holds a key flagged `minor` |

A *dependent* workspace is not a special code path — it is an ordinary workspace whose resident is not its owner. The `minor` flag is read by the security rules to refuse two specific things: leaving your own board, and clearing the flag that stops you.

**Isolation is by path, not by field.** Each workspace is its own document tree. Someone who is not a member cannot construct a query that reaches into one — not filtered out, *absent from the path*. That property is the reason 2.0 is a separate Firebase project rather than a schema change to 1.x.

---

## What is here

| File | Role |
|---|---|
| `index.html` | The whole UI. One page, no templating. |
| `app.js` | Rendering, interaction, views. ~5,900 lines, ported from 1.x with four seams changed. |
| `store.js` | **Every** Firebase call. Auth, workspace bootstrap, subscriptions, CRUD. Nothing here touches the DOM. |
| `queue.js` | Pure scheduling logic — priority, pipelines, week/clock geometry, holidays. Has never known Firestore exists. |
| `celebrate.js` | The confetti, the parade, the fireworks. |
| `config.js` | The only hand-edited file. Firebase identifiers. |
| `tentacalendar.css` | One stylesheet. |
| `firestore-2.0.rules` | **The security model.** Lives in the Firebase console; kept here so the two cannot drift. |
| `manifest.json`, `icon-*.png` | PWA install. |

**Documentation, and which to read:**

| Document | Answers |
|---|---|
| `HANDOFF-2.0.md` | **Start here.** What is built, what is next, what to test, and the platform landmines you need before writing a line. |
| `TENTACALENDAR-2.0-DESIGN.md` | Why the architecture is shaped this way. Schema, rules, sharing, cost, migration runbook. Decisions are **E-rows**. |
| `SETUP-2.0.md` | Standing up the Firebase project, repo and DNS from a browser. Already done; kept for reproduction. |

1.x's `HANDOFF.md` lives in the *other* repository and is **not** history — 113 of its 140 decision rows are cited by comments in the code shipped here. Treat it as a dictionary: when a comment says `// D37`, look up D37. Do not read it front to back.

---

## Stack

Deliberately small and dependency-free.

| Layer | Choice |
|---|---|
| Frontend | Vanilla ES modules. No framework, no build step, no bundler. |
| Data | Firebase Firestore (web SDK v11.6.1, from CDN) |
| Auth | Firebase Auth, Google sign-in. **No allowlist** — anyone may sign up and gets their own workspace. |
| Hosting | GitHub Pages |
| Calendar sync | Google Cloud Run (Node), deployed separately, not yet built for 2.0 |

**There is no `npm install` and no build.** The files you edit are the files that ship. That is a design choice, not an omission: it means the app can be maintained from a browser on a locked-down school laptop, which is the environment it was built in.

---

## Running it yourself

You need your own Firebase project — this one's identifiers are in `config.js` and its data is not yours.

1. Follow `SETUP-2.0.md`. It is a browser-only walkthrough: create the project, enable Google auth, create Firestore, publish the rules, register a web app.
2. Put your own `firebaseConfig` block into `config.js`.
3. Publish `firestore-2.0.rules` in the Firebase console. **Do not skip this** — a project in test mode is a public database.
4. Serve the files from anywhere static. GitHub Pages needs no configuration beyond enabling it.

⚠️ **Every path in this project must be relative** (`./store.js`, never `/store.js`). It is served from a subpath during development and a domain root in production; an absolute path works in one and 404s in the other, which makes it broken only *in between* — the worst possible timing for a bug.

---

## Status

**Built:** the app on a multi-tenant database, auto-created personal workspaces, the board switcher, membership and roles, dependent workspaces.

**Not built yet:** shared tiers (as opposed to shared whole boards), the activity feed and kudos, calendar sync, onboarding, and the migration of the 1.x data.

Version 2.0.0 arrives when two people can sign in separately, see separate boards, and visit each other's. Until then the app carries 1.x's continuing version numbers, and the badge in the header reports exactly what is running.

---

*Built with Claude, one named instance at a time. The names are in the session logs.* 🐙
