# 🐙 Tentacalendar 2.0 — *Octodo*

A planning board that takes deadlines seriously, now for more than one household.

**Development:** [misterwilson37.github.io/octodo](https://misterwilson37.github.io/octodo)
**Production (1.x, still live):** [tentacalendar.misterwilson.org](https://tentacalendar.misterwilson.org)

This repository is the multi-user rebuild of [Tentacalendar 1.x](https://github.com/misterwilson37/tentacalendar). The 1.x app is a real, in-daily-use application built for exactly two people who share a life; it has one workspace called `primary` and a two-address allowlist, which is the correct design for a household and an impossible one for anybody else.

2.0 keeps the entire application and replaces the floor it stands on.

---

## Sharing, at two sizes

There is **one** sharing mechanism, offered at two sizes, and it is worth knowing which you want.

**Share a whole board.** ⚙️ ▸ People. You hand somebody a key to your workspace and they can switch to it from the header chip. They see everything: your tiers, your tasks, your projects, your calendars. This is how a colleague looks at your school board, and how a parent looks at a child's.

**Share one tier.** ⚙️ ▸ Tiers ▸ 🤝. That tier — and its tasks, its projects and their clocked time — moves onto a small workspace of its own that you both hold, and it then appears **inside both of your queues** alongside your own tiers. Nobody switches anywhere; it is simply part of both days.

The split matters more than it looks. Without it, the day somebody shares a busy work calendar, eighty of their tasks interleave into your today list and you stop opening the app. With it: *a shared **tier** merges into your queue; a shared **board** is somewhere you visit.*

A shared tier follows you into a house where somebody who lives there also holds a key to it — so the tier you share with Katie is still there when you are looking at Katie's board, and the one you share with a colleague is not. And each person ranks it in their own day: the tier is shared, the priority is not.

Visiting somebody's board shows you **their** ordering, including of the tier you share — because the point of looking at someone's board is an honest picture of their load, and a priority that is secretly yours is not that.

Bringing a tier back is the same machinery pointed the other way, and it is one button.

---

## The permission model, in two words

Everything in this app's sharing model is **owner** and **member**. It is worth understanding before reading any code, because there is no third *concept* — only four sizes of key.

A workspace is **a house, not a photocopy.** There is one house. Everything in it — tasks, tiers, projects — exists exactly once. People holding keys walk into the *same* house, so a task checked off vanishes from every screen watching it within a second. There is never a second copy to fall out of sync.

- **Owner** holds the deed. Only an owner hands out and takes back keys.
- **Member** holds a key, in one of four sizes.

The four are split by *what a document is*, not by one blanket verb — which was the bug in rules 1.1.1, where a single catch-all clause meant "can edit this board's tasks" and "can repoint this board at a different Google Calendar" were the same permission:

| | `viewer` | `helper` | `editor` | `owner` |
|---|---|---|---|---|
| Read everything; react on the activity feed (kudos) | ● | ● | ● | ● |
| **The list** — tasks, projects, sessions | | ● | ● | ● |
| Delete from the list — *only what they created* | | ● | ● | ● |
| Delete anything on the list | | | ● | ● |
| **The setup** — tiers, settings, calendar ids | | | ● | ● |
| **The people** — members, the workspace document | | | | ● |

`helper` exists for the person pitching in rather than running the place: they can work the list and tidy up after themselves, and cannot reconfigure the board. `createdBy` is immutable on update for every role — without that, a helper could relabel someone else's task as their own and delete it, and the restriction would be undone by the permission next to it.

The role table rendered in the app's People tab is the same table. **If you change one, change both**, or the UI becomes a promise the server breaks.

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
| `app.js` | Rendering, interaction, views. ~6,500 lines, ported from 1.x with four seams changed. |
| `store.js` | **Every** Firebase call. Auth, workspace bootstrap, subscriptions, CRUD. Nothing here touches the DOM. |
| `queue.js` | Pure scheduling logic — priority, pipelines, week/clock geometry, holidays. Has never known Firestore exists. |
| `celebrate.js` | The confetti, the parade, the fireworks. |
| `config.js` | The only hand-edited file. Firebase identifiers. |
| `tentacalendar.css` | One stylesheet. |
| `functions/` | The hourly Cloud Run job: pulls Google Calendar into `eventsCache`, mirrors tasks out. Deployed separately; the Admin SDK bypasses the rules below. |
| `firestore-2.0.rules` | **The security model.** Lives in the Firebase console; kept here so the two cannot drift. |
| `import.html` + `import-transform.js` | The 1.x migration. The page is a form and a batch writer; **all the logic is in the transform**, as pure functions over plain objects, which is the only reason it can be tested. |
| `whereis.html` | A read-only diagnostic. Prints every board you hold a key to, every tier and which board it lives in, and flags any task sitting in a different board from its own tier. Writes nothing. Prefer it over the Firebase console for any "where does this live" question — the console's subcollection list is a sample, not an inventory. |
| `rules-test/` | The emulator suite. 42 assertions over the rules and the import. The project's only automated tests. |
| `manifest.json`, `icon-*.png` | PWA install. |

**Documentation, and which to read:**

| Document | Answers |
|---|---|
| `GUIDE.md` | **For people who are going to USE it, not build it.** What a tier is, why the queue refuses to be reordered, how sharing works. Hand this to anyone you give the link to. |
| `HANDOFF-2.0.md` | **Start here if you're building.** What is built, what is next, what to test, and the platform landmines you need before writing a line. |
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
| Calendar sync | Google Cloud Run (Node) on an hourly Cloud Scheduler trigger. Built; see `functions/`. |

**There is no `npm install` and no build.** The files you edit are the files that ship. That is a design choice, not an omission: it means the app can be maintained from a browser on a locked-down school laptop, which is the environment it was built in.

---

## Running it yourself

You need your own Firebase project — this one's identifiers are in `config.js` and its data is not yours.

1. Follow `SETUP-2.0.md`. It is a browser-only walkthrough: create the project, enable Google auth, create Firestore, publish the rules, register a web app.
2. Put your own `firebaseConfig` block into `config.js`.
3. Publish `firestore-2.0.rules` in the Firebase console. **Do not skip this** — a project in test mode is a public database.
4. Serve the files from anywhere static. GitHub Pages needs no configuration beyond enabling it.

**Before handing over any file: `node version-check.mjs`.** It reads every source file's banner against the constant in its code, every `?v=` pin against its target, the handoff's version table against all of them, and — since 1.5.0 — the size of each file's comment header. That last one exists because the headers had grown into full changelogs (949 lines in `app.js`) which put a version banner 980 lines from the constant it must agree with; they drifted four times and the last one cost a deploy. Old entries live in `CHANGELOG.md`, verbatim. `node stage-merge.test.mjs` and `node move.test.mjs` extract real functions out of `store.js` and assert against them — they do not re-implement anything, and a rename fails the run rather than quietly passing.

**Testing the rules.** `firestore-2.0.rules` is the one file where a mistake is silent and expensive, and the Firebase console no longer carries an inline simulator — its "Develop & Test" button now just points at the Emulator Suite docs. There is a suite for this: `cd rules-test && npm install && npm test`. It tests a **copy**, so `cp ../firestore-2.0.rules ./firestore.rules` before every run, and check that file's declared version against what is actually published in the console. A rules file that lives in two places will disagree with itself, and the stale copy is the one a newcomer reads and believes. The two rules bugs this project has shipped were both of a kind a three-line test would have caught.

⚠️ **Every path in this project must be relative** (`./store.js`, never `/store.js`). It is served from a subpath during development and a domain root in production; an absolute path works in one and 404s in the other, which makes it broken only *in between* — the worst possible timing for a bug.

---

## Status

**Built:** the app on a multi-tenant database, auto-created personal workspaces, the board switcher, membership and the four roles, dependent workspaces, calendar sync in both directions, **shared tiers with per-person priority**, and a skippable onboarding layer (splash, tours, hints, help panels).

**Migrated, for real:** on 2026-08-02 the 1.x household board moved onto 2.0 — 245 documents, in one run, with no dry rehearsal. There was never a throwaway account to practise on, and the reason that was an acceptable bet is that **1.x is still live and untouched**: a failed import costs a wiped 2.0 board and nothing else. The risk that mattered was never in the code — an export holds calendar **ids** and cannot hold calendar **permissions**, and 2.0 runs under a different service account, so calendars are re-shared by hand or the tiers import perfectly and stay empty forever, silently.

**Not built yet:** the activity feed and kudos. A **soft delete for projects** — today, deleting one destroys its clocked hours and stage history, which on a shared project means one person can erase another's work and credit with a button. A **super-admin panel** to export and wipe a user, which the migration plan above quietly assumes exists. And **outrider stages** — turning a stage that is really a separate errand into a task.

**Per-user tier colours and names** shipped: on a shared tier the name and colour you type are yours alone, so renaming *ELA 8* to *ELA* on your screen does not rename it on anybody else's.

Version 2.0.0 arrives when two people can sign in separately, see separate boards, and visit each other's. Until then the app carries 1.x's continuing version numbers, and the badge in the header reports exactly what is running.

---

*Built with Claude, one named instance at a time. The names are in the session logs.* 🐙
