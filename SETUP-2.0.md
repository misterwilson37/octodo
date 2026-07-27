# SETUP-2.0.md — Standing up Tentacalendar 2.0

**Version 1.3.0** · Written 2026-07-25 by Wunderpus · Companion to TENTACALENDAR-2.0-DESIGN.md 1.0.0

> **What this is:** the browser-only walkthrough for creating the new Firebase project and repo that 2.0 lives in. Same shape as SETUP-PHASE3.md, which you followed successfully once already. No CLI, no admin tools, no terminal.
>
> **Why it comes first:** nobody can write a line of 2.0 code until this exists, because `config.js` needs real values — apiKey, projectId, appId — and those only come from a console you're logged into.
>
> **Time:** about 45 minutes, and it splits cleanly across two sittings at the line marked ⏸.
>
> **⚠️ NOTHING HERE TOUCHES KATIE'S PROJECT** — with one deliberate, read-only exception, called out at the top and nowhere else. Every step creates something new. If you find yourself in the `tentacalendar` console, you're in the wrong place — back out.

---

## ✅ COMPLETED 2026-07-26 — the foundation exists

Jake ran this guide end to end. **Smoke test: all eight checks green, including the denial test.** The values below are real; a successor does not need to ask for them.

| | |
|---|---|
| **Project name** | `octodo` |
| **Project ID** | **`fantasktic-octodo`** (permanent — `octodo` was taken; the prefix is Nico's, *fantastic* + *task*) |
| **Project number** | `470873844999` |
| **OAuth public-facing name** | `octodo-tentacalendar` — chosen so school admin recognises it regardless of which domain it is served from. **This is what a colleague sees on the Google consent screen.** Good call. |
| **Web app nickname** | `octodo` |
| **Repo** | `github.com/misterwilson37/octodo` |
| **Dev URL** | **`https://misterwilson37.github.io/octodo`** — no CNAME yet; the custom domain gets pointed from GitHub Pages at flip time |
| **Edition codename** | **Octodo** |

```js
const firebaseConfig = {
  apiKey: "AIzaSyCLfoNFU0PB38xDIX_l3l47KXjLSgKv2fQ",
  authDomain: "fantasktic-octodo.firebaseapp.com",
  projectId: "fantasktic-octodo",
  storageBucket: "fantasktic-octodo.firebasestorage.app",
  messagingSenderId: "470873844999",
  appId: "1:470873844999:web:3abbbe071b2c87e64529a2"
};
```

**Authorized domains already set** (verified from console): `localhost`, `fantasktic-octodo.firebaseapp.com`, `fantasktic-octodo.web.app`, `tentacalendar.misterwilson.org`, `octodo.misterwilson.org`, `misterwilson37.github.io`. Flip day needs no auth change — the destination was authorised in advance.

### ⚠️ ONE CONSEQUENCE OF THE DEV URL, AND IT WILL BITE THE FIRST BUILD SESSION

`misterwilson37.github.io/octodo` is a GitHub Pages **project site**, so the app is served from a **SUBPATH, not a domain root.** Two things follow:

1. **Every path must be RELATIVE.** `./store.js`, never `/store.js`. An absolute path resolves to `misterwilson37.github.io/store.js` and 404s. 1.x already imports with `./` throughout (D26), so porting is safe — but any new absolute reference, in HTML, JS, CSS or the manifest, breaks silently at the subpath and works fine once the custom domain lands. **That is the worst possible timing for a bug: invisible during development, invisible after launch, broken only in between.**
2. **`localStorage` is shared with every other page on `misterwilson37.github.io`.** During development the origin is the whole github.io host, not the project. Namespace keys deliberately — which 2.0 wants anyway, since preferences become per-user.

Neither affects Katie: E4 still holds, her flip lands on `tentacalendar.misterwilson.org`, and her existing preferences live at that origin untouched.

---

## ⚡ FIRST — back up Katie's data (10 min, independent of everything below)

**There is currently no backup of Katie's data anywhere.** That is true today, has nothing to do with 2.0, and takes ten minutes to fix. Do it before Part 0.

**This part runs against the OLD project** (`tentacalendar`), not the new one. It is the only section of this document that touches anything existing — and it touches it *read-only*.

1. Add **`export.html`** (shipped with this guide) to the root of the **1.x repo**, via the GitHub web interface.
2. Go to **`https://tentacalendar.misterwilson.org/export.html`**, sign in, press the button.
3. Download the JSON. Put it somewhere that isn't your laptop — Drive, BeastSync, anywhere.
4. **While you are in that console anyway:** Firestore offers **point-in-time recovery**, which lets you read or restore the database as it stood at a past moment. My recollection is a rolling ~7-day window that **must be switched on BEFORE you need it** — confirm the current terms in the console, since that is exactly the kind of detail that moves. Turning it on for the OLD project costs little and covers the gap between exports. Given that the whole concern here is data loss, it is the single cheapest insurance available and it is independent of 2.0 entirely.

**Why this is safe to deploy to her live site:** it adds one new file that `index.html` does not reference, so nothing she loads changes.

> ⚠️ **CORRECTION, 2026-07-25 — READ THIS BEFORE WRITING ANY MORE CAUTION INTO THIS PROJECT.** An earlier draft of this paragraph bragged that Katie "will not see so much as a notification." **That framing was wrong and Jake corrected it.** Her app has been live throughout every day of its development; she has loaded every change ever made; index.html has been hot-updated under her hundreds of times; **D130's update banner has fired for all of it and works beautifully — she sees it and goes looking for the new features.** Notifications are a feature she enjoys, not a disturbance to be engineered around.
>
> **The concern is exactly one thing: HER LOSING HER STUFF.** Not deploys, not banners, not brief interruptions, not being asked to wait twenty minutes. **Data.** Every "is this safe?" question in this project should be answered against that and nothing else. Caution aimed at the wrong target is not free — it makes documents longer, decisions slower, and the real risk harder to see.

**Why it cannot hurt her data:** the Firestore write functions (`setDoc`, `addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`) are **deliberately not imported** by that file. It is not that the page is written carefully — it is that the code to write is not in its module graph. A bug in it cannot modify anything.

**Run it as often as you like.** Every run is a full snapshot and costs only reads — a few hundred against a 50,000/day free allowance. Daily for a year would not approach the free tier. **Run it again the week before flip day**, and once more after; the freshest export is what Part 9 of the migration re-syncs from.

> **Why full snapshots rather than deltas:** 1.x documents have no reliable `updatedAt` field — tasks carry `createdAt` and `completedAt`, and an edit updates neither. A delta export would therefore **silently miss edits**, which is the worst failure a backup can have. Full, every time, cheaply.

The task count will be much larger than the app's 222-document census. That census bounds completed tasks to 30 days (D139); a backup that only kept what was on screen would not be a backup.

## Part 0 — Name it (5 minutes, and it's permanent)

**A Firebase project ID cannot be changed after creation.** Not renamed, not edited. It appears in the auth domain (`<id>.firebaseapp.com`) forever. Pick deliberately.

The *app* is still called Tentacalendar — E4 keeps 2.0 at the same hostname with the same name and the same 🐙. What needs naming here is only the project, the repo, and a temporary dev subdomain. Which means Nico's idea doesn't get rejected; it becomes the **edition codename**, which is a better job than product name anyway.

| Candidate | Notes |
|---|---|
| **taskopus** | Closest to Nico's *Taskacle*, keeps his idea alive, safely nowhere near the word that killed it |
| **octodo** | octopus + to-do. Short, obvious, types well as a repo name |
| **argonaut** | *Argonauta*, the paper nautilus — a real octopus whose female **builds her own shell to live in**, which is literally what every user does in this design |

Avoid **inkling** (Nintendo's, and this goes public).

Write your choice here before continuing, because the next four parts all use it:

```
PROJECT ID:  ____________________     (permanent, lowercase, no spaces)
REPO NAME:   ____________________     (can be changed later)
DEV SUBDOMAIN: ______________.misterwilson.org
```

Throughout this document, `<PROJECT>` means the project ID you just wrote down.

---

## Part 1 — Create the Firebase project (5 min)

1. Go to **console.firebase.google.com** → **Create a project**.
2. Project name: whatever reads nicely (e.g. "Tentacalendar 2.0").
3. **Under the name, Firebase shows the generated project ID with a small edit pencil. Click it and set your chosen ID.** This is the only moment it is editable, ever. If it's taken, Firebase appends a suffix — accept it rather than picking a worse name.
4. **Google Analytics: turn it OFF.** You don't need it, it adds a second linked property to manage, and it collects data from users you're about to invite.
5. Create, and wait for provisioning.

> This also creates a Google Cloud project of the same ID — that's where billing, Cloud Run and Scheduler live later. Same arrangement as `tentacalendar` today.

**Billing:** the new project starts on Spark (free). It must move to **Blaze** before Cloud Run functions work — same as Phase 3. You can do that now or wait until Part 9 of the build; nothing before then needs it. Use the same billing account as your other projects.

---

## Part 2 — Firestore (5 min)

1. Left sidebar → **Build → Firestore Database → Create database**.
2. **Edition: Standard.** If offered Enterprise, decline — Standard is what the design's cost model is priced against, and Enterprise's per-unit billing is a different animal.
3. **Location: `nam5 (us-central)`.** ⚠️ **Permanent, like the project ID.** us-central is where the quoted pricing applies ($0.03/100K reads).
4. **Start in production mode** (locked down). Not test mode — test mode opens the database to the world for 30 days, and you'd be pasting real rules in Part 5 anyway.

---

## Part 3 — Authentication (5 min)

1. **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable.** Set a project support email (yours).
3. Save.
4. **Now the part that will bite you if you skip it:** go to **Authentication → Settings → Authorized domains**. Add:
   - your dev subdomain (`____________.misterwilson.org`)
   - `tentacalendar.misterwilson.org` — add it **now**, so flip day is a DNS change and not a debugging session

`localhost` and `<PROJECT>.firebaseapp.com` are there by default. **Sign-in fails with `auth/unauthorized-domain` on any host not in this list**, and the error surfaces in the console rather than on screen — which is exactly how Nico's test went.

---

## Part 4 — Register the web app and grab the config (5 min)

1. **⚙️ (top left) → Project settings → General**.
2. Scroll to **Your apps** → click the **`</>`** (web) icon.
3. Nickname: "Tentacalendar 2.0 web". **Do NOT tick "Also set up Firebase Hosting"** — you're on GitHub Pages.
4. Register, and Firebase shows a `firebaseConfig = { ... }` block.

**Copy that whole block and keep it.** It goes into `smoke.html` in Part 6 and becomes `config.js` when the real build starts.

> **It is not a secret.** Same as D79 addendum 2 for the old project: the web config is an *identifier*, not a key. It's safe in a public repo — it has to be, since every browser downloads it. What protects your data is the rules file, not the obscurity of this block.

---

## Part 5 — Publish the rules (5 min)

1. **Firestore Database → Rules**.
2. Select everything in the editor and **replace** it with the contents of **`firestore-2.0.rules`** (shipped alongside this guide).
3. **Before Publish, use the Rules Playground** (the link on that same screen). Two checks, thirty seconds:

   | Simulate | Expect |
   |---|---|
   | **get** on `/users/<your email>`, authenticated as your email | **Allow** |
   | **get** on `/workspaces/somebodyelse/tasks/x`, authenticated as your email | **Deny** |

4. **Publish.**

> ⚠️ **Select-all-and-replace, do not paste at the end.** Appending instead of replacing is what took the site down on 2026-07-12 (queue.js deployed doubled). The rules editor has the same failure mode.

**About these rules, briefly, because "rules" sounded scarier than it is:** this file decides who can touch which bytes. It's different from every other file in the project because *a mistake in it is invisible* — a too-permissive rule looks exactly like a working app. That's the whole reason for the Playground checks above and for test 6 in the smoke page. It matters most at two moments, both months away: when Katie's data arrives, and when strangers can sign up. Today the only data in this project will be yours.

**One thing worth knowing about the file you just pasted:** writing this guide turned up a deadlock in the design document's rules sketch. It allowed creating a member document only if you were already an owner-*member* — so the first member document could never exist and no workspace could ever be used. `firestore-2.0.rules 1.0.0` fixes it by rooting membership in the workspace document's `ownerEmail` instead. The smoke test in Part 7 walks exactly that sequence, which is how you'll know the fix holds.

---

⏸ **Natural stopping point.** Everything above is console work. Everything below is GitHub and DNS.

---

## Part 6 — The repo (10 min)

1. New GitHub repo, named whatever you wrote in Part 0. **Public** (Pages on private repos needs a paid plan).
2. Add these files at the root, via the web interface:
   - **`smoke.html`** — shipped with this guide. **Open it first and paste your Part 4 config into the `FIREBASE_CONFIG` block near the top**, replacing the six `PASTE_ME` values.
   - **`firestore-2.0.rules`** — for the record. GitHub Pages ignores it; it's there so the deployed rules and the repo can't drift apart the way 1.x's `firestore.rules` did (it sat at `KATIE_EMAIL_HERE@gmail.com` for weeks while the live rules had her real address).
   - **`CNAME`** — one line, your dev subdomain, no protocol, no trailing slash.
3. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save.**
4. Wait for the green check on the Actions tab.

---

## Part 7 — DNS, then the smoke test (10 min)

**DNS:** add a `CNAME` record in Cloudflare for your dev subdomain pointing at `<your-github-username>.github.io` — the same arrangement `tentacalendar.misterwilson.org` already uses. Copy that existing record's settings exactly, including its proxy state. This is **not** a Caddy route; nothing here touches PLEXBEAST.

Then back in GitHub → **Settings → Pages**, confirm the custom domain shows a green check and tick **Enforce HTTPS** once it's available (it can take a few minutes for the certificate).

**Now the payoff.** Visit `https://<your dev subdomain>/smoke.html` and press the button. It signs in with Google and runs eight checks — config, sign-in, your user profile, workspace creation, the first member document, a task round-trip, **a deliberate attempt to read a workspace you don't own that must be DENIED**, and cleanup.

**All green means the entire foundation is proven** — config, auth, Firestore, rules, DNS, and Pages — before anyone writes a line of app code.

If something's red, the failing row names the part of this guide to revisit. The two most likely:

| Symptom | Fix |
|---|---|
| `auth/unauthorized-domain` | Part 3 step 4 — the dev subdomain isn't in Authorized domains |
| Test 5 fails, "bootstrap deadlock" | Part 5 — the published rules aren't `firestore-2.0.rules 1.0.0` |
| **Test 7 says a foreign workspace was READ** | **Stop.** You published test-mode rules. Redo Part 5. Nothing else matters until this is a pass. |

---

## Part 8 — Budget alert (5 min)

Your existing $5 alert is on the *billing account*, filtered to specific projects — it will not see the new one automatically.

**Google Cloud Console → Billing → Budgets & alerts** → either edit the existing budget to include `<PROJECT>`, or create a second one for it. Thresholds at 50% / 90% / 100%.

**Remember what this is: a notification, not a cap.** Firebase has no hard spending limit. That was fine for a household; it's the one thing that genuinely changes when signup opens to the internet. Two controls land later in the build, not now:

- **App Check** (design doc E18) — free, and required *before* public signup. It ensures only the real app can talk to your Firestore, so a script pointed at the project gets refused. Deliberately deferred: it needs a reCAPTCHA key and debug tokens, and turning it on now would only block your own testing.
- **A budget kill switch** — a function on the budget's pub/sub topic that disables billing. Drastic, and the only actual ceiling that exists.

Neither is needed while the only users are you and Nico.

---

## Part 9 — What to hand the next session

Paste this back, filled in. It's everything needed to start writing code:

```
PROJECT ID:      ____________________
DEV URL:         https://____________________
REPO:            github.com/____________________

firebaseConfig = {  ...paste the whole block from Part 4...  }

Smoke test:      [ ] all green     [ ] failed on: ______
Blaze:           [ ] on   [ ] still Spark
Nico's account:  [ ] can sign in   [ ] not tried yet
Edition codename: ____________________
```

With that in hand, the next session starts at **build order item 2** (auth + workspace bootstrap) with nothing left to guess at.

---

## What this deliberately does NOT include

- **Cloud Run / Scheduler / service account.** That's build item 7, and it needs the app to exist first. SETUP-PHASE3.md gets a 2.0 revision then.
- **App Check enforcement.** Part 8 explains why.
- **Anything touching `tentacalendar` that writes.** The backup section at the top reads her workspace and adds one unreferenced file to her repo; nothing else in this document goes near her project, and nothing anywhere in it writes to her data. Her app, her data, and her workflow are exactly as they were before you started.

---

*Setup guide 1.0.0 — Wunderpus, 2026-07-25.* 🐙
