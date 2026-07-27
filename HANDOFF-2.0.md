# HANDOFF-2.0.md — Tentacalendar 2.0 (the Octodo line)

**Document version: 0.7.0** | Last updated: 2026-07-27 | **App: 1.23.0 · store 0.19.0 · queue 0.20.0 · celebrate 0.2.0 · config 1.0.0 · css 0.48.0 · html 0.42.0 · manifest 0.2.0 · **rules 1.1.1 · functions 1.1.0 (BUILT, NOT DEPLOYED — needs Jake's console hour)** — the web app is deployed and **RUNNING 2026-07-27.** Jake and Nico both signed in; the collection-group index is created; **smoke IA · ID · IJ · IQ · IR all PASS.**|

> **✅ IR PASSED, and it is the one that mattered.** Nico's dependent board was created from Jake's People tab, and Nico then signed in and **landed on that board rather than a fresh personal one** — the adoption path in `resolveWorkspace` fired, and the E33 rules held (his row shows `dependent`, he sees no member controls). This is the case that could not be tested any way but for real.
>
> **STILL OUTSTANDING — the actual E24 milestone:** Katie has not signed in. Two people on two boards, each seeing their own, one visiting the other, is what defines 2.0, and it has not happened yet.

> **⚠️ IF YOU READ ONE THING: rules 1.1.0's collection-group clause could never have worked, and 1.1.1 fixes it.** It matched on the document ID (`match /{path=**}/members/{email}` with `email == me()`). That reasoning is correct for a GET of one named document and **meaningless for a QUERY** — a query names no documents, so Firestore evaluates the rule before reading anything, the ID wildcard is unbound, and the whole query is REFUSED as `permission-denied`. Not "returns nothing": refused. **A list rule must test a FIELD, and the client query must filter on that same field.** Member documents carry `email` exactly so this works.

> **⚠️ RULES 1.1.0 MUST BE PUBLISHED, and it is a separate action from pushing files.** Firestore Rules live in the console, not the repo. Publish before or with the deploy: the E33 minor guard and the E34 collection-group clause are both in it, and the board switcher **returns nothing at all** without the latter. Select-all-and-REPLACE in the rules editor — appending is what took the site down on 2026-07-12.
>
> **⚠️ ONE-TIME INDEX.** The first time the switcher runs, Firestore needs a **collection-group index on `members.email`** and will emit a one-click "create index" link in the browser console. It takes about a minute. Until it exists the board list errors rather than coming back empty — so if the switcher never appears, open the console before theorising.
Live 1.x: `tentacalendar.misterwilson.org` (Katie's, untouched). Dev 2.0: `misterwilson37.github.io/octodo`.
Current instance: **Marginatus** (Claude Opus 5, 12th instance / 11th named).
Names taken across both lines: **Inky, Otto, Rambo, Billye, Octavia, Heidi, Ivy, Athena, Truman, Wunderpus, Marginatus**.

## 0. Read this first — which document answers your question

**New Claude: read THIS file and §3 (E-rows) of the design doc. That is the whole required reading.** Everything else is lookup.

| Your question | Where the answer is |
|---|---|
| What is built, what is next, what am I allowed to assume? | **This file** |
| Why is the architecture shaped this way? Schema, rules, sharing, migration? | `TENTACALENDAR-2.0-DESIGN.md` §3 (E-rows) |
| How do I stand up the Firebase project / repo / DNS? | `SETUP-2.0.md` (done; read only if something needs re-doing) |
| **"Why on earth does this line of code exist?"** | `HANDOFF.md` (1.x) — **look up the D-row the comment cites. Do not read the file.** |

**⚠️ `HANDOFF.md` (1.x) IS NOT HISTORY. IT IS THE REFERENCE MANUAL FOR CODE THAT IS RUNNING RIGHT NOW.**
`app.js`, `queue.js`, `celebrate.js` and most of the CSS crossed into 2.0 essentially verbatim, and **113 of its 140 D-rows are cited by comments inside those shipped files** (measured 2026-07-27, not estimated). When `app.js` says `// D37 — drift transforms #drift-wrap, NEVER <body>`, D37 is the only place that explains why, and there is no substitute for it.

**This is why the two documents are not merged, and should not be.** Merging means either (a) a ~325KB file that costs a large fraction of a short session just to read — destroying the reason this file was written short — or (b) discarding the explanations for live code, which is worse. **D-rows are also never renumbered or deleted**, precisely because 113 code comments point at them by number.

**The right relationship is: this file is required, that file is a dictionary.** §7 below lifts the handful of D-rows you need *before* writing code, so the 300KB file is only opened when a specific comment sends you there. If Jake hands you only this document, you are still equipped.

**On the version number:** this file stays 0.x and becomes **1.0.0 on the day 2.0 ships** — the same discipline the app itself follows (1.x ran 0.x for months until D105 earned the 1.0). 1.x's HANDOFF never reached 1.0 either; it froze at 0.85.0. The number's only job is telling Jake whether he is holding the newest copy.

---

## 1. Why this document exists separately

1.x's `HANDOFF.md` is the continuity document for an app **Katie is using right now**. E26 freezes it: when 2.0 goes live, 1.x is abandoned in place on GitHub for whoever finds it useful, and its doc stops at its last true statement. Writing 2.0's history into it would make it lie about a running app.

**Document map — four files, one job each:**

| File | Job | Who edits it |
|---|---|---|
| `TENTACALENDAR-2.0-DESIGN.md` | The blueprint. **All E-rows live here** (E1–E31). Architecture, schema, rules, migration runbook. | Amend when a decision changes; bump its version |
| `HANDOFF-2.0.md` (this) | Continuity. What's built, what's next, what's awaiting Jake, session log. | Every session, at the end, no exceptions |
| `SETUP-2.0.md` | Standing up the project/repo/DNS. ✅ Complete. | Only if the console changes |
| `HANDOFF.md` (1.x) | Frozen history. Explains `queue.js` and `app.js` line by line. | Only for a genuine 1.x fix (E27) |

⚠️ **The 2.0 repo currently holds a STALE COPY of 1.x's `HANDOFF.md` (0.84.0 vs the live 0.85.0) and a stale `SETUP-2.0.md` (1.2.0 vs 1.3.0), and does not hold the design doc at all.** That is exactly how two documents that were once identical become two documents that disagree. **One handoff per repo** — delete the 1.x copy from octodo.

---

## 2. The foundation (done, verified, don't re-derive)

| | |
|---|---|
| Firebase project | **`fantasktic-octodo`** (permanent) · number `470873844999` |
| Repo | `github.com/misterwilson37/octodo` · **Blaze billing on** |
| Dev URL | **`https://misterwilson37.github.io/octodo`** — a **SUBPATH**, see E4a below |
| Rules | `firestore-2.0.rules` **1.0.0, published and verified green** |
| Smoke test | ✅ all eight checks 2026-07-26, **including the denial test** |
| Katie's backup | ✅ export run and re-run 2026-07-27 — the first backup this data has ever had |
| Authorized domains | already include `tentacalendar.misterwilson.org` — **flip day needs no auth change** |

**E4a is not theoretical and it already bit once.** The dev URL is a subpath, so every reference must be relative. `manifest.json` shipped from 1.x with `"id": "/"` — harmless at a domain root, wrong at a subpath, and **caught by a mechanical sweep, not by reading**. Fixed to `"./"`, which is correct in both places and is what keeps Katie's installed PWA identity intact across the flip (E4). Run the sweep every time markup or the manifest changes.

---

## 3. What is built (this session)

**Build items 1 and 2+3 are done** (E29 folded 2 and 3). The app is a complete 1.x running on a multi-tenant database, private to whoever signs in.

| File | Version | What happened |
|---|---|---|
| `config.js` | **1.0.0** | Rewritten. `ALLOWED_EMAILS` and `WORKSPACE_ID` are **gone** — the first is theatre once rules 1.0.0 dropped the allowlist, the second is resolved per user at sign-in |
| `store.js` | **0.18.0** | The only real surgery. `ACTIVE_WS` + sign-in bootstrap + `completedBy` (E9). **Every exported signature unchanged** (E30) |
| `app.js` | **1.22.0** | Four seams: `?v=` pins, banner, `watchAuth`'s third callback, `onBlocked()` (E17). No feature code touched |
| `index.html` | **0.41.0** | One `<div>` added (`#blocked-screen`) + pins |
| `tentacalendar.css` | **0.47.0** | Two rules: `#blocked-screen` shares `#auth-screen`'s selector (D104's one grammar), plus `.blocked-detail` |
| `manifest.json` | **0.2.0** | `"id": "/"` → `"./"` (E4a) |
| `firestore-2.0.rules` | **1.1.1** | E33 minor guard + E34 collection-group clause, **the latter rewritten to secure a query rather than a document**. Publish in the console. |

### Item 7 — calendars (built 2026-07-27, awaiting the console hour)

`functions/index.js` **1.0.0** + `functions/package.json` 1.0.0 + **`SETUP-PHASE3-2.0.md`** 1.0.0, the browser-only walkthrough. **Nothing runs until Jake spends about an hour in the Google Cloud console** — the function has to exist somewhere before it can be scheduled.

**Carried across untouched**, because re-deriving any of it by accident would be "a catastrophe wearing a rewrite's clothes": D135's poll reconcile (deterministic doc ids, write-only-what-changed, `syncedAt` deliberately absent — it took writes from 1,500/day to 116), D81's mirror ledger and loop guard, D87's no-hour-trigger carryover. The three job functions changed **only** by gaining a `wsId` parameter.

**New: the E14 work queue.** 0.4.0 hardcoded `WS = "primary"`. A serial loop over every workspace eventually blows the request timeout, and the failure mode is silent — the last user never gets polled and nobody finds out. Instead: claim a bounded batch whose `nextPollAt` is due, oldest first, each inside its own try/catch, then re-stamp. Timeout-safe, self-healing after an outage, and load spreads itself.

**Two decisions worth not re-litigating:**

- **A failed workspace is stamped anyway.** Otherwise a broken calendar share stays permanently overdue at the head of the queue and starves everyone behind it. It reports its error hourly and costs one slot, not all of them — the poll's own "one bad tier must not starve the rest" discipline, one level up.
- **`nextPollAt` is always a NUMBER, 0 = never polled.** Null sorts before numbers in Firestore, so nulls get swept into the `<=` comparison regardless; a field whose null and whose zero mean the same thing is one fewer case for the next reader. Legacy nulls self-migrate on first contact.

**`?ws=<id>` runs one workspace** — the id is in the version tooltip. First thing to reach for when one person's calendar misbehaves, and 1.x never had it.

### Item 4 — houses and keys (the E24 milestone)

Two words carry the whole permission model. **Owner** holds the deed and is the only one who hands out or takes back keys. **Member** holds a key — `editor` for full use, `viewer` for read-only (a viewer may still react on the activity feed, which is how kudos work). Everything Jake described is that model pointed one of two ways:

- **An adult holds their own deed and invites others in** — Katie, colleagues. `ownerEmail` is theirs; guests are member rows.
- **A dependent lives in a house an adult holds the deed to** — Nico, and students far later. Same documents, opposite direction, plus `minor: true` on the resident's row.

**A shared board is one set of documents, not a copy.** Two people watching the same workspace watch the same documents, so a completion lands on both screens within a second and there is never anything to reconcile.

**The bug that walking Nico through 0.18.0 exposed, and it would have been invisible until he tried:** a dependent board is created *before* its resident has ever signed in, so there is no `users/{email}` document pointing at it. 0.18.0's `resolveWorkspace` would have seen "no home workspace" and built Nico a second, personal board his parents did not hold — the same lockout E33 closes in the rules, arriving through the front door instead. `resolveWorkspace` now asks *"do I already hold a key somewhere?"* before building anything, and adopts a board where it is flagged the resident minor. **Only a minor flag adopts**, and that restriction is load-bearing: if any membership counted, a colleague sharing a board with someone who had never signed in would silently deny that person a house of their own.
| `queue.js` | 0.20.0 | **Byte-identical to 1.x.** 1,206 lines that have never known Firestore exists (D26) |
| `celebrate.js` | 0.2.0 | **Byte-identical to 1.x** |

**The one genuine trap, documented in the code and repeated here because it will be re-encountered:** the workspace document and the first member document **cannot be written in a batch.** The members rule is `isWsOwner(wsId)`, which does `get(workspaces/{wsId})`; inside a `writeBatch` every write is evaluated against pre-batch state, so the workspace would not exist yet and the first member write is denied — the same deadlock the design doc's §5 sketch had, arriving by a different door. Two sequential `await`s. `smoke.html` proves it; that is why it went green.

**One latent 1.x bug fixed here and deliberately NOT hotfixed to 1.x:** the settings-tab handler bound to a bare `.tab-btn`, which also matches D126's Have-tos/Want-tos bar — so clicking Want-tos called `switchSettingsTab(undefined)` and hid every settings pane. It has never been visible, because `openSettings()` calls `switchSettingsTab("tiers")` on every open and repairs it. Scoped to `#settings-modal .tab-btn` in 2.0 because a fourth tab was about to join the same unscoped query. **No symptom for Katie, so E27 does not fire** — the dual-fix window is for defects she can hit, not for every shared imperfection, or it becomes a tax that stops being paid.

**Ship-check run, all green:** banner === declaration for all seven versioned files (iterated, not hand-listed — meta-rule 6); **every `?v=` pin === the target file's own declaration** (this closes the gap Wunderpus named in 1.x's header, where nothing asserted that the URL requesting a file matched what that file said it was); function census on `store.js` (48 definitions, 0 duplicates, 0 unresolved calls, comments stripped first); all 39 names `app.js` imports from `store.js` are exported; all **236** ids `app.js` reaches for exist in the markup; **div balance 135/135**, 0 duplicate ids (D127).

---

## 4. Deploying this drop

Push all thirteen files to the **octodo** repo root, then:

1. **Delete `smoke.html`** — it says so itself, and the real app now exists.
2. **Delete the stale `HANDOFF.md`** from octodo (§1).
3. Replace `SETUP-2.0.md` with 1.3.0 and add `TENTACALENDAR-2.0-DESIGN.md` 1.5.0 + this file.
4. Visit `https://misterwilson37.github.io/octodo/` and run the smoke list in §5b.

There is **no CNAME** and there should not be one yet — the custom domain gets pointed at flip time (§11), and adding it early would move the origin twice instead of once.

---

## 5. Open items

### 5a. Jake's list

- **How much does Katie want to know?** Only becomes a real question on flip day, which asks her for twenty announced minutes. Everything before that is invisible to her.
- **Her phone, still blocked on one number** — Chrome ▸ Settings ▸ Accessibility ▸ *Text scaling* percentage. **The doubled stylesheet was not this bug** (§7). Three theories, two wrong; the one that worked came from a repro sentence. Don't ship a fourth patch without the number.

### 5b. Awaiting Jake's ✅ — smoke tests for this drop

- **IA. It builds you a workspace.** Sign in at the dev URL. You land in a working app with **three** tiers — Home, Work, Personal — not Jake's six.
- **IB. It builds you exactly ONE.** Reload, sign out and back in. Same workspace every time. Firebase console → `workspaces/` should hold **one** document, not a new one per visit.
- **IC. The bones still work.** Add a task, check it off → confetti. Add a project → it appears. The whole 1.x app should be indistinguishable from home, because it is the same code.
- **ID. The template is EMPTY (E16).** ⚙️ → Pipeline: no stages. Katie's thirteen actuarial steps must not be here — they travel with *her* workspace at migration.
- **IE. The badge tells the truth.** Hover the version number: `app.js 1.22.0 · store.js 0.18.0 · queue.js 0.20.0 · celebrate.js 0.2.0 · config.js 1.0.0 · css 0.47.0 · html 0.41.0`, then a line reading **`workspace <id>`**. If css says anything other than 0.47.0, stop — that is the 1.x doubling bug arriving in a new house.
- **IF. THE IMPORTANT ONE — isolation.** Sign in as a second Google account (Nico's, or any other). It should get its **own** workspace with its own three tiers, and **must not see Jake's tasks**. Then in the Firebase console, confirm two `workspaces/` documents with different `ownerEmail`s. *This is E1, and it is the entire security model.*
- **IG. `completedBy` is landing.** Console → any completed task → it should carry `completedBy` with your lowercased email. This is what stops Reflection crediting you with someone else's work the day a tier is shared (§7.2).
**Item 7 — calendars.** Smoke tests WW1–WW8 live in SETUP-PHASE3-2.0.md Part 6. **WW8 is new and 1.x could not have had it:** the report must name more than one workspace, and one person's broken calendar share must show as an `error` on *their* row while everybody else's row is fine.

- **IH. Sign-out is clean.** The ⏻ button returns you to the sign-in screen, not to a blank page.

**Item 4 — the E24 milestone. This is the set that decides whether this is 2.0.**

- **IJ. One key, no switcher.** With only your own board, the header chip is absent. A switcher with one entry is furniture.
- **IK. Katie invites you.** She signs in (her board is hers — E25, reversed), ⚙️ ▸ **People**, types your address, "Can edit", *Give them a key*. **Nothing for you to accept.** Reload: the chip appears in your header.
- **IL. You visit her house.** Click the chip → her board. **Her tiers, her tasks, her projects, her calendars.** The chip goes dashed and reads *visiting* with her name — that is the identifier in the corner. Check something off: it should behave exactly as it does for her, and **vanish from her screen within a second if she has it open.** Same documents, not a copy.
- **IM. Your settings stay yours.** In her house you keep *your* view, *your* hidden tiers, *your* week layout. Those are per-device, not per-board, and that is deliberate.
- **IN. It remembers.** Reload while on her board → you land back on her board. Switch to your own → reload → your own.
- **IO. She can take the key back.** Katie removes you in ⚙️ ▸ People → her board leaves your switcher on reload, and opening it directly fails.
- **IP. A shared TIER is different from a shared BOARD, on purpose.** Not yet built (item 5). Today sharing is whole-board only; the tier-sized version is the next increment.
- **IQ. Nico's board.** ⚙️ ▸ People ▸ *A board for someone who doesn't own it* → name, his address, Katie as co-owner. It appears in your switcher and in hers. **He can use it fully and cannot remove either of you, cannot delete it, and cannot leave it.** In his row you should see a **dependent** badge and no ✕.
- **IR. THE ONE THAT MATTERS MOST — he signs in and lands in the right house.** Nico signs in for the first time *after* his board exists. He must land on **that** board, not on a fresh one of his own. If he lands somewhere with three starter tiers and no sign of you, the adoption path in `resolveWorkspace` did not fire — check the console for the missing collection-group index first, because that query is how adoption finds his key.

### 5c. Claude's backlog (no input needed)

- **`pollIntervalMinutes` has two homes and one truth.** Written on the workspace document per §4.3, but `settings/config`'s copy is what the settings UI edits and therefore what is authoritative. **Item 7 unifies them and deletes the config copy** — at the same moment the settings form is repointed, which is the only way to change it without a window where the UI edits the wrong field.
- **`subscribeSessions` is still unfiltered** (inherited from 1.x §5c). 11 documents today, so it is the right shape rather than a fire. Jake's constraint stands: the Σ must be lifetime **"but stored by dates so that we can see what was used when"** — the ledger remains the source of truth and any denormalised total is only ever a display cache.
- **Firestore persistence** — still unbuilt, still ~3 lines, and 1.x's §5c corrected the claim: a listener disconnected >30 minutes is billed as a new query anyway, so it is a **kiosk optimisation, not a general one**. Whoever builds it must also make the D136 census count only `snapshot.metadata.fromCache === false`, or the counter stops being a cost dashboard. Jake's trusted-device decision is already made: **default on, always clear on sign-out.**
- **App Check** before item 8 opens signup (E18). Free, and the only real ceiling on a project with no hard spending cap.
- **The E17 screen has never actually been seen.** Both its states are hard to trigger deliberately. Worth one console-forced render before anyone relies on the copy.

---

## 6. Standing meta-rules

**All ten of 1.x's meta-rules carry over unchanged** — one clarifying question before chasing a bug theory; version bumps on every shipped file with D94's meanings (Z = it isn't working as asked, *including* refining something already agreed; Y = something exists that didn't; X = the usefulness fundamentally changes); complete replacement files, never diffs; incremental disk-based builds; never store student-identifying data; the mechanical ship-check; instance naming; keep §5 lean; **parse-clean ≠ wired**; update this file every session. Two of them earned their keep this session and are worth restating with their 2.0 edge:

**6 (ship-check) — now also asserts the pin.** Banner === declaration was never enough: nothing checked that the `?v=` *requesting* a file matched what that file *declared*. 1.x is live right now with `index.html` asking for `?v=0.46.0` while the stylesheet says `0.45.1`. The check is four lines and it is in this session's script; keep it.

**6c (a failed write is not a no-op)** — build in memory, write to a temp file, `os.replace()` into position. Used throughout this session.

**Two rules that are new to 2.0:**

11. **E4a — SWEEP FOR ABSOLUTE PATHS on every markup, manifest or CSS change.** `href="/`, `src="/`, `url(/`, and the manifest's `id`/`start_url`/`scope`. An absolute path **works at a domain root and 404s at a subpath**, which means it is broken during development, fine after launch, and therefore easy to "fix" by shipping. This is the worst possible failure timing and it already produced one real bug.

12. **E27 — SAY WHEN A BUG IS SHARED.** Until Katie is migrated, a defect in code that exists in both trees must be called out as such, not silently fixed in whichever copy is open. The failure mode is a fix that exists everywhere except where she is.

---

## 7. The platform landmines — carried forward so you never have to open the big file

Mirrored from 1.x's D-rows because these are the ones that bite **before** you have a symptom to look up. Every one is a settled fact about a browser, not a design opinion, and none of them will change — which is what makes mirroring them safe here when copying a *live* document would not be (that mistake is documented in §1). **If you discover a new one from here on, it goes in THIS file, not that one.**

| # | The trap | What it looks like when you hit it |
|---|---|---|
| **D35** | CSS must contain `[hidden] { display: none !important; }` | The `hidden` attribute is UA-stylesheet priority, so **any** author `display` rule silently beats it. Caused the very first deploy failure: the settings modal rendered over the sign-in screen and every write fired unauthenticated. Still 3 rules deep in the shipped CSS. |
| **D37** | Never put a CSS `transform` on `<body>` or any ancestor of a `position: fixed` element | A transformed ancestor becomes the containing block for fixed descendants, so "centred" means centred in the *page*, not the viewport. The burn-in drift lives on `#drift-wrap`; **every modal must stay outside it.** D127 later found that nine modals had been inside it for months because a stray `</div>` moved the wrapper's real close 150 lines down. |
| **D49** | `?v=` on a `<script>` tag does **not** cache-bust `import` statements inside the module | A stale cached `config.js` broke the entire module graph with `SyntaxError: Importing binding name not found` and a dead sign-in button. Every internal import carries `./file.js?v=x.y.z`, **identical across importers** — differing queries load duplicate module instances. |
| **D58** | An `<label>` forwards its click to the labelled control | So a popover opened inside a label is closed by its own re-dispatched click, the same tick. Needs `preventDefault()` / `stopPropagation()`. Hit again from the other direction in D140's "Today" button. |
| **D66** | Flex items will not shrink below their content's min-width | Two native date inputs out-minimum a narrow panel and push it off screen. `min-width: 0` is the fix and appears **30 times** in the shipped CSS. D138's phone overflow was this same landmine wearing `.nav-slot`. |
| **D110** | A renderer that is *called* is not a renderer that *agrees* | `renderYear()` had an early-return guard that silently refused every repaint in the dashboard. Buttons fired, state changed, nothing drew — a still photograph wearing live controls. **Verifying a call happens is not verifying the callee will act.** |
| **D127** | HTML has no `node --check` | Nothing mechanical asserts well-formed nesting, so a stray tag can sit for entire feature lifetimes. **Run a comment-stripped div-balance count on every `index.html` delivery.** (Comment-stripped, because prose mentioning a tag produces a false positive — it did, once, while verifying that very fix.) |
| **D132** | `form.reset()` does not clear JS-built children | It only restores *declared* inputs. Anything appended by script must be cleared by hand. |
| **D103** | Any geometry declared in two places is a bug with a delay on it | The week's seven columns were declared in the stylesheet *and* inline in JS. Two numbers that agree until one doesn't. Now one CSS variable both read. |

**And the one process rule that has bitten most often, in three different disguises:** *a check that silently matches less than it claims is worse than no check, because it reports ok.* The function census was blind to `async function` for its entire life; the id-duplicate grep counted ids inside HTML comments; the ship-check compared a hand-written version literal instead of a derived one. **Iterate and derive; never hand-write a per-file list of checks, because that is a per-file list of holes.**

---

## 8. The 1.x hotfix shipped alongside this drop — and how it was found

**`tentacalendar.css` in the live 1.x repo contained TWO COMPLETE COPIES OF ITSELF.** Version 0.45.1 (1,694 lines) followed immediately by the whole of 0.45.0 (1,677 lines), appended with no newline at what was line 1695. Same accident that hit `queue.js` on 2026-07-12: a web-editor paste that appended instead of replacing — the exact failure `SETUP-2.0.md` Part 5 warns about for the rules editor.

**Found by accident**, while reading the file to port it: two `--tc-version` declarations where there should be one.

**Blast radius, measured rather than asserted** — a line diff of the two copies:

- They differ **only** by D138: the banner, `--tc-version`, and two **added** rules inside an existing 600px block. D138 modified nothing.
- D138's selector `.day-nav .nav-slot` (0,2,0) **outranks** the bare `.nav-slot` (0,1,0) it duplicated, so the later copy never won anything.
- **Therefore nothing rendered differently, and this does NOT explain Katie's phone.** The §5c text-scaling theory is untouched and still needs its datum. Saying otherwise would have been the fourth wrong theory about her phone.

**What it did break** is the one instrument that had to keep working: both copies declare `--tc-version` inside `:root`, the second wins, so **the badge has been reporting `0.45.0` — a version that was never deployed.** That is the project's only deploy check (meta-rule 2), and Jake is about to run a migration that leans on it. Plus 74KB of dead weight parsed on every cold load.

**Shipped:** `tentacalendar.css` **0.45.2** (de-doubled) + `index.html` **0.40.1** (repins to `?v=0.45.2`). A **Z** per D94 — no feature, one instrument made honest. **Not 0.47.0**, which 1.x's header ordered: the real constraint was only ever *don't serve new bytes under `?v=0.46.0`*, which browsers have cached. `?v=0.45.2` has never been requested, so it is not burned — and it does not read "lower" than the badge, because the badge says 0.45.0 today.

**This is E27's first invocation, within an hour of the row being written.** The 2.0 stylesheet skips 0.46.0 entirely and starts at 0.47.0, so no number means two things in two repos.

---

## 8b. The first sign-in failure — what it cost and what it taught

**Symptom:** Nico signed in at the dev URL and got the E17 screen reading *"We couldn't finish setting up your calendar… almost always a connection hiccup."* Console: `Missing or insufficient permissions` at `store.js:193`.

**Three things went wrong, and only the first was a bug.**

1. **The rules bug (real).** Covered in the header. The clause was written and commented with confident reasoning — *"the document id IS the member's email, so the only rows this can ever return are the asker's own"* — that is simply not how list authorisation works. **The comment was more confident than the code was correct, which is the worst possible pairing** because it discourages the next reader from checking.
2. **The error message lied.** It said "connection hiccup, try again." `permission-denied` is never a hiccup and retrying never fixes it. E17 exists so a stranded user gets the truth; a screen that guesses wrong is only marginally better than the silent bounce it replaced. Fixed: `permission-denied` now has its own copy that says the account is fine and the configuration is not.
3. **The diagnostic said "bootstrap failed" and nothing else.** `resolveWorkspace` has four steps that can throw and the console named none of them. Now every step is tagged and the failing one is printed, and a `permission-denied` prints an ordered checklist. **Cost of not having this: one full round trip to identify a line number.**

**The design flaw underneath, which is the durable lesson:** the failing query was the *optional* one — a lookup that exists so a child lands on the board built for them. In 0.19.0 a failure there threw, so **one bad clause in an enhancement stopped every new user from signing up at all.** An optional step that can strand everybody is not optional. It now warns and falls through. **Residual risk, stated rather than discovered: if that query is broken AND a dependent board exists, its resident gets a personal board instead of the one their parents hold — recoverable, where a locked-out app is not. This is why smoke test IR must be re-run after ANY rules change.**

## 8c. First-run defects, in the order they were found

Four, all mine, none of them in the feature — all four in what happens when something goes wrong.

| # | Defect | Fixed in |
|---|---|---|
| 1 | The E34 rule matched on the **document ID**, which cannot secure a query. Every first sign-in died `permission-denied`. | rules 1.1.1 |
| 2 | The E17 screen blamed the **network** for a refusal no retry could fix. | app 1.23.1 |
| 3 | The console said "bootstrap failed" without naming which of four steps. | store 0.19.1 |
| 4 | The **live board listener had no error handler**, so a missing index printed forty lines of Firestore internals — while the one-shot lookup beside it, fixed one round earlier, printed one clean sentence. | store 0.19.2 |

**#4 is the one worth internalising: I fixed a failure mode and left its twin untouched.** The one-shot `getDocs` and the live `onSnapshot` run the *same query against the same index*, so they were always going to fail together; only one had been taught to fail well. **When you harden one call, grep for every other caller of the same thing before you ship.**

**And a fifth, cosmetic but instructive:** the People tags reused the existing `.badge` class, which means DANGER (`background: var(--danger)`, bold). My rule set colour and border but not background, so specificity produced grey text on a red pill — and "holds the deed" is a statement of fact, not an alarm. **Reusing a class for its shape while inheriting its meaning.** D104's "one grammar" argues for reusing a *vocabulary*; it does not license borrowing a word that already means something else. Now `.person-tag`.

## 8d. The tag namespace, and why a combined tag can't work

Jake asked whether the mirror could tag `tentacalendar` on 1.x, `octodo` on 2.0, and `octodo tentacalendar` when both were involved — or whether that was overcomplicating and a separate script was cleaner.

**Separate namespaces: yes. Combined tag: no, and the failure is worth understanding.** The mirror lists events with an **exact-match** filter on `tcApp`, then deletes any tagged event whose task it cannot find. A value of `octodo tentacalendar` matches neither filter, so such an event is invisible to **both** apps rather than visible to both. The tag records **ownership**, not provenance, and ownership must be binary for a prune to be safe — two apps sharing one tag would take turns deleting each other's work every hour.

**It was never a new pattern.** D87 already gave the carryover its own namespace precisely so the mirror couldn't see its events and patch the ❗ back to the honest due time. Same calendar, two writers, mutually invisible. Jake re-derived his own project's solution without knowing it was already there.

**On "new script or same script": both, and they don't conflict.** New file in a new project — it had to be, for the work queue — but a *descendant*, not a fresh start. One changed constant and a new dispatcher around logic that is otherwise verbatim.

## 8e. The calendar hole — E1 was airtight and irrelevant

Jake asked, while reading SETUP-PHASE3-2.0: does this let anyone add *their own* calendar, or just pull mine? And *"am I just being paranoid?"*

**Not paranoid, and the real exposure was the inverse of the one he named.** He worried a colleague would be stuck with his calendar. The truth was that a colleague could have taken it.

**The service account is project-wide.** Sharing a calendar with the robot grants access for every workspace in the project — the grant lives on Google's side and knows nothing about workspaces. functions 1.0.0 polled whatever `gcalCalendarId` a tier named, with no check. So any signed-up user could type `jacob.v.wilson@gmail.com` into their own Home tier and receive his entire calendar.

**The lesson worth keeping: Firestore isolation was airtight and completely beside the point.** E1 is a property of the *database*; this leak was on the *calendar* side, where no rules file can see. **Every external system an app touches has its own boundary, and "our data model is secure" says nothing about any of them.** The one thing that did work correctly by accident: new users seed with `gcalCalendarId: ""`, so nobody ever *inherits* a calendar — they'd have had to go and ask for one.

Closed as E37 in functions 1.1.0. It is defence in depth, not proof of ownership; path B (per-user OAuth) is the complete answer and remains unbuilt.

## 9. Session log

| Date | Instance | What happened |
|---|---|---|
| 2026-07-25 | Opus 5 · **Wunderpus** (11th) | The 2.0 design + setup kit. No app code, on purpose. Named for *Wunderpus photogenicus*, catalogued one animal at a time by its permanent unique pattern. |
| 2026-07-26 | — (Jake solo) | Ran SETUP-2.0 end to end. `fantasktic-octodo`, repo, rules published, **smoke test green including denial**. Nico authenticated successfully. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **THE CALENDAR HOLE (E37) + Jake's first real use of item 4 (E38).** He asked whether colleagues could end up with his calendar; tracing it found they could have TAKEN it — the shared service account plus an unchecked calendar id. **§8e is the entry to read: E1 was airtight and irrelevant, because the boundary that leaked belonged to Google, not Firestore.** Also fixed three things he hit inside five minutes of using the People tab, one of which was a placeholder that read like a value and produced a board named `nico.m.wilson`. **He found all four by using the thing, which is the argument for shipping to one careful user before shipping to five polite ones.** |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **ITEM 7 — CALENDARS, BUILT.** functions 1.0.0 (the E14 work queue + the `octodo` tag namespace) and SETUP-PHASE3-2.0.md. **Ported by transformation, not rewrite**, so D135's reconcile survives byte-for-byte; the dispatcher is the only genuinely new code. Jake amended his own 2.0 definition (E35) — calendars must work — which is a bigger and better bar than E24 set and reorders the rest: items 5 and 6 are not blocking, 7 and 9 are. **Told him he never needed to anonymise the export JSON:** `export.html` dumps documents verbatim, so the shape is fully derivable from store.js, which I already had. His paste still earned its keep — it revealed a 7th tier the design didn't know about, and that his Home tier polls his PRIMARY calendar rather than a dedicated one. **Caught two stale comments in the ported function that still named the 1.x tag while the code used the new one** — the same "comment more confident than the code" shape that cost a round trip this morning, found this time by a check rather than by a user. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **IT RUNS.** Jake signed in, Nico's dependent board was created and Nico landed on it — **IR passed**, which is the case no amount of reading could have verified. Four first-run defects found and fixed (§8c), every one in error handling rather than in the feature: the feature worked the first time it was allowed to run. **The two most useful things I shipped this morning both paid out within the hour** — the step tags told us instantly that the second failure was a different animal from the first, and the non-fatal fallthrough is why Jake was looking at a working app instead of a blocked screen while the index built. **Process failure worth recording: I twice described a Firebase console dialog from memory and got it wrong, costing round trips on a screen Jake could simply have shown me.** Console UIs move; my picture of them is stale by construction. New rule adopted mid-session: for any console step, ask for the screenshot and answer in clicks. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **FIRST DEPLOY, FIRST FAILURE.** Nico's sign-in died on permission-denied. Cause was mine: rules 1.1.0's collection-group clause matched the document ID, which cannot secure a query. **The clause carried a paragraph of confident reasoning for why it was safe, and that reasoning was about the wrong operation** — the surest sign a comment needs checking is that it argues rather than states. Fixed in 1.1.1 (match the field, filter on the field). Two things fixed alongside that were not the bug but made it expensive: the E17 screen blamed the network for a refusal that retrying can never fix, and the console said "bootstrap failed" without naming which of four steps. **Also made the failing query non-fatal — it was an optional lookup that could strand every new user, which is not optional.** Filled in SETUP-2.0's Part 0 and Part 9 blanks, which Jake caught: the real values were in the completion block at the top, so the document disagreed with itself and read as unfinished work. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th, cont.) | **ITEM 4 — houses and keys.** Jake stopped the deploy, said the permission description was more technical than he could follow, and re-described the target audiences himself. **He was right to stop, and the re-description contained a correction I had got wrong:** E25 had Jake owning Katie's board, which made her a guest in her own practice. Reversed — she owns hers, he owns Nico's, same mechanism opposite directions. He then improved on it, inventing the dependent workspace and the minor flag unprompted. **Two bugs came out of walking HIS description through MY rules rather than re-reading them:** Nico could have left his own board through a door marked "leave" (E33), and Nico's first sign-in would have built him a second board his parents never held (the adoption path). Neither was findable by reading the file; both were obvious the moment a real person's Tuesday was traced through it. **Lesson worth keeping: when the human re-describes the problem in their own words, walk the code through THEIR version, not yours.** Also declined to hotfix a latent 1.x tab-selector bug — no symptom, so E27 doesn't fire; a dual-fix window that covers every shared imperfection stops being paid. |
| 2026-07-27 | Opus 5 · **Marginatus** (12th) | **Named for *Amphioctopus marginatus*, the coconut octopus — the only one that carries its shelter with it, disassembled, and rebuilds it somewhere else, never exposed in between.** That is §11 and §15 exactly. The other half: *marginatus* means "bordered," and E1 is the whole design — the boundary is a path, not a field. **Built items 1→3.** Jake's answers from the day became E23–E31; the two biggest are E24 (2.0.0 = the board switcher, his own definition, D67's shape) and E30 (store.js absorbs the workspace so 7,100 lines of app.js + queue.js cross unchanged). **Found the doubled 1.x stylesheet** while reading it to port it, measured the blast radius instead of assuming it, and explicitly ruled it OUT as an explanation for Katie's phone — the finding that would have been most tempting to over-claim. Caught the manifest's absolute `id` by running E4a's sweep rather than trusting that a byte-identical carry is a safe carry. **Process note for successors: the 1.x repo did not arrive in the first upload and I said so instead of inferring the missing files** — three of the four documents I needed were in hand, and the fourth was one sentence away. |

---

*Marginatus, 2026-07-27.* 🐙
