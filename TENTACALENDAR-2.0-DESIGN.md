# TENTACALENDAR-2.0-DESIGN.md

**Document version 1.7.0** · Written 2026-07-25 by **Wunderpus** (11th instance, 10th named) · Updated 2026-07-27 by **Marginatus** (12th instance, 11th named) with E23–E31, then 1.6.0 with **E32–E34 and the E25 reversal** · Continuity lives in **HANDOFF-2.0.md**

> **What this is:** the design for Tentacalendar 2.0 — the multi-user renovation. It is a *specification*, not a build log. No code in this document has been written yet. HANDOFF.md remains the continuity document for the live 1.x app; this file is the blueprint for what replaces it.
>
> **What it is not:** a commitment to a schedule. Jake's focused time drops when school resumes (~2026-08-01). This document exists specifically so that short sessions can be productive without re-deriving the architecture every time.

---

## 0. Status board

| Area | State |
|---|---|
| Requirements | ✅ Gathered 2026-07-25 (three conversations, recorded in §1) |
| Architecture | ✅ Decided — see E-rows, §3 |
| Schema | ✅ Specified, §4 |
| Rules | ✅ **SHIPPED as `firestore-2.0.rules` 1.0.0** — §5's sketch had a bootstrap deadlock and is superseded; verify in the Rules Playground before publishing |
| Migration runbook | ✅ Written, §11 |
| Code | ✅ `firestore-2.0.rules` 1.0.0 · `smoke.html` 1.0.0 · `export.html` 1.0.0 · ❌ no app code |
| Foundation (build item 1) | ✅ **DONE 2026-07-26** — `fantasktic-octodo`, repo `misterwilson37/octodo`, all eight smoke checks green including the denial test. Blaze on. Details in SETUP-2.0.md's completion block. |
| Katie's backup | ✅ **RUN 2026-07-27 and re-run for good measure.** First backup that has ever existed for this data. |
| Katie's 1.x app | ✅ **UNTOUCHED and will stay that way** — see §15 |

**Open questions needing Jake: §14** (four of the original five were answered 2026-07-27 and are now E-rows). Everything else in here is decided and buildable.

### Numbering convention

1.x architectural decisions are **D-rows** (D1–D140, in HANDOFF.md §2). 2.0 decisions are **E-rows**, numbered from E1, and live here. An E-row may supersede a D-row; where it does, it says so explicitly. D-rows are never renumbered or deleted — the 1.x app is still running and its history still explains it.

---

## 1. Why 2.0 exists

1.x is a *household* app: one workspace called `primary`, two email addresses in an allowlist, everything shared with everyone. D12 built exactly one workspace on purpose and that was the correct call for two people who share a life.

Three requirements arrived on 2026-07-25 that the household model cannot express:

1. **Jake wants to offer this to colleagues**, each using it individually. Katie wants to offer it to her sister.
2. **Those people must have no access to Katie's work** — not "shouldn't look," *can't reach*. Her workspace holds actuarial client names and engagement schedules.
3. **Jake and Katie want their own calendars**, with explicit sharing between them — whole-calendar as viewer or editor, and individual shared tiers that both can check off.

Plus one household case: **Nico** (their son, account managed by Jake and Katie) gets his own calendar; his parents can see it; he cannot see theirs except what they share.

### The requirement that changed the architecture

An earlier draft of this design (Wunderpus, same session, first proposal) kept a single workspace and added `owner` and `viewers` fields to every document, with Firestore rules filtering per-document. **That design was withdrawn.** It is adequate when everyone in the database is family and inadequate the moment a stranger has an account, because the only thing standing between a colleague and Katie's client list would be an array in a rules file. One rules bug, one clever query, and it's readable.

**When the people are strangers, the boundary must be a path, not a field.** That is E1.

---

## 2. The three principles

Everything below follows from three commitments. When a design question comes up that this document does not answer, resolve it by these, in this order.

### Principle 1 — Katie's work is never interrupted

Jake, 2026-07-25, verbatim: *"The most important thing to keep in mind though - from start to finish - is that Katie's work cannot be interrupted in any way shape or form. If any of this work will impact her tasks, tiers, projects, or general workflow, then we pause it until she's done with her busy season."*

His stated risk boundary is **not** deploys — he has shipped every version while she was using the app. It is *"some sort of change that would interrupt her workflow by taking away her ability to see her to-do list and mark things off of it."* A one-time script rewriting her data in place is the thing he named.

**Sharpened 2026-07-25 after Jake corrected a drift in the setup guide — successors should hold this line exactly:** the concern is **her losing her stuff. Full stop.** It is *not* deploys, *not* update banners, *not* brief announced downtime. Her app has been live through every day of its development; she has loaded every change ever shipped; D130's banner fires for all of it and she likes it — it is how she learns there is something new to find. **Do not write caution about disturbing her into this project.** Aim every safety argument at data, or it is noise.

**This is why 2.0 is a separate Firebase project.** Not caution, architecture: in a separate project there is *no operation we can perform that touches her database except reading it*. See §11 and §15.

### Principle 2 — The blast radius of a mistake is one workspace

Every design choice prefers the option where an error affects one person's data rather than everyone's. Physical separation by path, per-workspace error isolation in the functions, per-workspace poll scheduling. If a query is wrong, one person sees the wrong thing; nobody sees someone else's thing.

### Principle 3 — Nothing silently disappears

This is 1.x's founding thesis (§1 of HANDOFF) and it now extends to *actions*, not just tasks. Once two people can check off the same item, "who did this, and when" becomes part of the record, not metadata. See E9 and §7.

---

## 3. Architecture decisions (E-rows)

| # | Decision | Rationale |
|---|---|---|
| **E1** | **Isolation is by PATH, not by field.** Each user gets their own `workspaces/{wsId}` document tree. There is no shared collection that holds two users' documents side by side. A user who is not a member of a workspace cannot construct a query that reaches into it. | Supersedes the withdrawn owner/viewers proposal. When strangers hold accounts, a field-level boundary is one rules bug away from a data leak; a path-level boundary fails closed. |
| **E2** | **2.0 lives in a NEW Firebase project** (`tentacalendar-2` or similar), a new GitHub Pages repo, and a new subdomain during development. Katie's project is never modified — not its rules, not its data, not its functions. | Principle 1, made mechanical. Also: 2.0 opens signup to the public, and that is not a property to retrofit onto the project holding Katie's client data. Athena verified the free tier is per-project, so the new project brings its own allowance. |
| **E2a** | **In-place is now VIABLE too — E2 stands, but on narrower grounds than first argued.** Once `export.html` existed, the honest comparison changed: a same-project migration that writes documents to new paths and **never deletes the old ones** leaves her original data just as intact as a separate project does. The remaining reasons to keep E2: (1) **2.0 opens signup to the public, and a rules mistake on the project holding her client data is an exposure, not an inconvenience**; (2) the 1.x app **keeps running untouched as a live fallback** for as long as you like; (3) a clean database carries no legacy paths, dead documents, or accumulated rules clauses. **What would make in-place dangerous is the delete step — so if it is ever chosen, do not delete.** |
| **E21** | **There is deliberately NO ADMIN ROLE IN THE RULES, and there should not be one.** Jake's administrative access is (a) the **Firebase Console**, where he is project owner and rules do not apply, and (b) the **Admin SDK** inside Cloud Functions, which bypasses rules entirely. | Hardcoding an admin email into `firestore.rules` would make "who is in charge" *code* rather than *data* — the precise thing that would block handing this project to the school district later. Membership and roles already are the permission system (E5). **The honest caveat: console access is total and unaudited.** For a family app that is correct and proportionate. If this ever becomes district-owned, that is the moment to add a real admin role with an audit trail — and by then the activity feed (E9) is already most of the mechanism. |
| **E22** | **⚠️ `ownerEmail` IS PERMANENT IN RULES 1.0.0, AND THAT BLOCKS ONE MIGRATION PATH.** `allow update` locks it against modification, so whoever creates a workspace is `isWsOwner` forever — a skeleton key that survives being removed as a member. | Irrelevant for self-serve signup (users create their own). **It bites exactly once: at Katie's migration**, if Jake creates her workspace via `import.html`. Two resolutions, and the migration session must pick one deliberately: **(a) no rules change — Katie signs in first, gets her own auto-created workspace, adds Jake as `editor`, and he imports into it.** Thirty seconds of her time on flip day and it works today. **(b) rules 1.1.0 — let an `owner`-role member change `ownerEmail`**, enabling a clean hand-off after import. Not an escalation, since owner-role can already delete everything. **Deliberately NOT shipped now:** rules 1.0.0 is published and verified green, the need is months away at build item 9, and churning a just-verified security file for a future need is how verified files stop being verified. |
| **E3** | **Katie's migration is a READ, then a switch.** Export her workspace (read-only), transform, import into the new project, verify at leisure while she keeps using 1.x, then re-sync the delta and repoint DNS. Rollback = point DNS back. | The in-place alternative has no rollback: once new rules are published and fields are backfilled, you fix forward while she works. This version rehearses first and keeps the old app and old data intact throughout. |
| **E4a** | **Development happens at a SUBPATH (`misterwilson37.github.io/octodo`), production at a domain root.** Every path in every file must be **relative** (`./store.js`, never `/store.js`). | An absolute path 404s at the subpath and works at the root — **broken during development, fine after launch, and therefore easy to "fix" by shipping.** 1.x already uses `./` imports throughout, so the port is safe; the hazard is any NEW absolute reference in HTML, JS, CSS or the manifest. |
| **E4** | **The hostname does not change. Ever.** 2.0 is served at `tentacalendar.misterwilson.org` after the switch. Never a redirect to a different domain. | All 22 `tc-*` localStorage keys are origin-scoped and do not survive a cross-domain redirect. A 301 silently resets every device preference Katie has tuned over three months, on every screen she owns, plus her installed PWA (D96). Pointing the same hostname at a different Pages repo keeps the origin identical and everything survives. |
| **E5** | **Membership is a subcollection; roles are `owner` / `editor` / `viewer`.** `workspaces/{wsId}/members/{email}` is the source of truth and is what the security rules read. | Rules can check membership with a single `exists()` against a known path. A denormalised list on the user document is a cache at best and a lie at worst. |
| **E6** | **A shared tier is a small shared workspace.** Sharing "Family" creates a workspace containing that tier, with both people as members. Sharing a whole calendar adds someone to your personal workspace's member list. | ONE mechanism at two sizes, rather than two sharing systems that will drift apart. The tier is genuinely one document that two people watch — which is what makes "a race to the confetti" work at all. |
| **E7** | **Tier ordering is per-user and global across workspaces.** `users/{email}.tierRanks` maps `"wsId:tierId" → rank`. | Jake: *"We can give it different priorities, but it should be a shared tier."* Rank is an opinion about your own day; the tier is shared, the ranking is not. Also necessary: once tasks from three workspaces merge into one queue, each workspace's internal ranks collide and D43 level 4 needs one authority. |
| **E8** | **A shared tier is shared, full stop — but `role` is still stored.** The UI offers "share this tier" with no role picker; it writes `role: "editor"`. | Jake, 2026-07-25: *"It's my damn app. If you're going to look at one another's shit, then you should share in the work that goes into it."* He then allowed that viewer-only tiers make sense for some people. Storing the field costs nothing and uses the vocabulary whole-calendar sharing needs anyway; drawing the control on the wall is a separate, reversible decision. The door exists in the data and is not visible in the UI. |
| **E9** | **An append-only ACTIVITY FEED per workspace**, plus `completedBy` denormalised directly onto tasks and stages. | Three separate requests turn out to be one structure: forensics ("who checked that off"), Jake's catch-up bar, and Reflection. **And it fixes a correctness bug that would otherwise ship with sharing:** victories currently derive from `completedAt`, which carries no actor, so the day a list is shared Katie's wins appear as Jake's in his own Reflection. |
| **E10** | **Kudos are reactions on activity entries.** `reactions: [{by, emoji, at}]`. Viewers may react. | Katie's request (a "thanks!" / "way to go!"). Because every client already subscribes live to shared workspaces, **the entry arriving IS the notification** — no push infrastructure required. Real notifications while the app is closed still need FCM and stay out of scope (same as 1.x, §5 "Expectation set with Katie"). |
| **E11** | **Celebrations fire for YOUR OWN completions only.** Someone else completing a shared item produces an activity entry and lights the catch-up bar — no confetti on your screen. | Jake: *"I don't really need confetti at all, but my wife very much does."* Full D29 celebration is preserved for the person who did the thing. A screen that erupts at 2 PM in busy season because someone else emptied the dishwasher is a feature that gets the app closed. |
| **E12** | **The catch-up bar sits BELOW the alerter and the deploy banner.** z-index: alerter 141 (D137), deploy banner 140 (D130), catch-up bar 139. | D137 chose 141 deliberately so a deploy banner could never bury an alarm. A new bar must not undo that reasoning by arriving later and landing higher. |
| **E13** | **Calendar connection has TWO paths behind ONE interface.** The stable interface is unchanged from 1.x: an anchor tier carries `gcalCalendarId`. New field `gcalAuth: "service" \| "oauth"` says how access was obtained. | Path A (share your calendar with the robot's service-account address) works today, needs no verification, and has no user cap. Path B (OAuth "Connect calendar") is the professional answer but routes through Google's unverified-app interstitial and a review process. Designing for B while shipping A costs one field, because both paths terminate in the same tier mapping. |
| **E14** | **The poll becomes a WORK QUEUE, not a loop.** Each workspace carries `nextPollAt`; the hourly run claims a bounded batch of workspaces that are due, processes them with per-workspace error isolation, and re-stamps them. | A single run iterating every workspace serially will eventually exceed Cloud Run's request timeout, and the failure mode is "the last user in the loop never gets a poll and nobody notices." A work queue is timeout-safe, self-healing after an outage, and spreads load automatically. |
| **E15** | **The activity feed ships BOUNDED on day one.** Live listener carries a rolling recent window; deeper history is fetched on demand and cached per-window by the client. | D139 learned this the expensive way on tasks — an unbounded collection is a per-boot read cost that compounds with elapsed time, not user count. The feed is the fastest-growing collection in 2.0. Building the bound in from the start costs nothing; retrofitting it cost a whole session. |
| **E16** | **A new user's default project template is BLANK.** | Closes §8.2a, open since 2026-07-21 and explicitly parked "until there's a second user to design for." 1.x's "Default = Katie's stageTemplate" was a zero-migration accommodation for exactly one person. Katie's sister must not receive thirteen actuarial stages including "Loss data processing" as her factory default. Katie keeps hers — it travels with her workspace in the migration. |
| **E17** | **Signed in with nowhere to go is a REAL SCREEN, not silence.** | Nico's sign-in test, 2026-07-25: a non-allowlisted user is signed straight back out and sees the login screen again with no explanation. The only evidence was in a browser console he would never open. In 2.0 self-serve signup means this mostly can't happen — but revoked shares, removed members and disabled accounts all land here, and all of them need a sentence. |
| **E18** | **App Check is required before public signup opens.** | Firebase has **no hard spending cap** — a budget alert is a notification. That was an acceptable risk for a two-person household; it is not once the signup door is open to the internet and the Firebase web config is public by design (it is an identifier, not a secret — D79 addendum 2). App Check ensures only the real app can talk to Firestore. It is free. See §12. |
| **E19** | **OAuth refresh tokens are NEVER client-readable.** They live in a collection whose rules deny all client access; only the Admin SDK in the functions may read them. | If path B ships, a refresh token is a long-lived credential to a user's entire Google Calendar. It must not be one rules mistake away from being readable by its own owner's browser, let alone anyone else's. |
| **E20** | **Version 2.0.0.** Per D94, X = the usefulness fundamentally changes. | Jake proposed it himself (*"Once we hit three users, I think we're at 2.0!"*). His global ruleset requires his explicit sign-off for a major bump; this is recorded as that sign-off. **If he disagrees, this is the row to argue with.** |
| **E23** | **Nico gets an account AFTER Katie's migration, not before — reversing §14.2's recommendation.** Jake: *"I'll add Nico as a user once I know Katie is moved over and that my account works."* | The canary argument assumed a spare human is cheap to onboard. Jake's actual precondition is narrower and better: **his own account working is what makes anything else trustworthy.** The cost of deferring — losing a no-legacy test subject for the multi-workspace path — is smaller than it looks, because **E6 makes sharing testable solo**: a shared tier is just a second workspace, and Jake can own both. What Nico was uniquely going to prove (a second human can authenticate against this project) **is already proven** — he ran smoke.html green on 2026-07-26. |
| **E24** | **2.0.0 IS DEFINED BY THE BOARD SWITCHER — Jake's own words, and this is the E20 sign-off his ruleset requires.** *"2.0 is live when you think that Katie and I can log into octodo separately and see separate pages (although I should be able to toggle over to her view without logging in as her…)."* Until that day the app runs 1.x numbers (E31). | Same shape as D67, which defined 1.0.0 as the dashboard rather than as a feature count — and which worked, because a milestone you can *see* beats a milestone you have to adjudicate. **What this definition deliberately excludes:** onboarding, a stranger signing up, path-B calendars. Those are real work and none of them is 2.0. **One correction to the wording, because the mechanism matters:** *"and/or because I'm an admin of the whole shebang"* — there is no admin role and there must not be (E21). Jake toggles to Katie's board because he is a **member** of her workspace. His genuine admin powers are the Firebase console and the Admin SDK, both of which bypass rules entirely and neither of which is a code path. |
| **E25** | **~~Jake creates and owns Katie's workspace~~ — REVERSED 2026-07-27 by Jake, and he was right. KATIE OWNS KATIE'S BOARD.** She signs in first, the board is hers, and she invites Jake in exactly as a colleague would. E22 therefore resolves to its **option (a)** after all. | The original row optimised for guaranteeing Jake access, and quietly made Katie a guest in her own work — she could not have taken his key back even if she had wanted to. Jake's reaction on reading it: *"Katie wouldn't be the principal on her own projects… clarification was needed."* Correct instinct, correct row. **The pattern was not wrong, it was aimed at the wrong person:** an adult holding the deed to a house someone else lives in is exactly right for Nico (E32) and exactly wrong for a spouse with her own practice. **Cost of the reversal: about thirty seconds of Katie's time on flip day**, signing in once so the house is hers before her data lands in it. The §11 sequence already has her present that morning. |
| **E26** | **1.x is abandoned IN PLACE when 2.0 goes live, and `HANDOFF.md` freezes at its last useful point.** Jake: he will leave the repo up *"for future people to be able to use, so there's no reason to update the 1.x handoff past its point of usefulness."* 2.0's continuity lives in **`HANDOFF-2.0.md`**. | Two consequences worth stating. (1) The 2.0 repo must not carry a *copy* of the 1.x handoff — it already does, and it is already stale (0.84.0 against 0.85.0), which is precisely how two documents that were once the same become two documents that disagree. One handoff per repo. (2) 1.x earns **one** final edit, at flip time, not before: a header saying where it went and a README for the strangers Jake is leaving it for — his standing rule is that every project ships both. Until flip, 1.x is *live*, and its doc has to keep telling the truth about a running app. |
| **E27** | **THE DUAL-FIX WINDOW. Until Katie is on 2.0, a bug that touches her daily use is fixed in BOTH trees.** Jake: *"we'll need to fix them in 1.x and 2.x until she's moved over."* | Cheap today (the trees are near-identical) and rapidly less so as 2.0 diverges, which is itself an argument for not letting the window stay open long. **The discipline this needs: a 2.0 session that finds a shared bug must SAY it is shared** rather than quietly fixing the copy it happens to be holding — the failure mode is a fix that exists only where Katie isn't. **This row was invoked within an hour of being written** (the doubled stylesheet, HANDOFF-2.0 §7), which is the best possible argument that it was worth writing down. |
| **E28** | **`assignedTo` ships as a nullable FIELD on tasks; no UI, no etiquette, no feature.** Jake, honestly: *"No idea what assignedTo means."* | Fair — it was jargon. It means *"this task lives in a shared workspace, and it's yours"*: a shopping list both people can see where some rows are Jake's and some are Katie's. That is a whole social feature with a picker, a filter and a set of unwritten rules about who may reassign whom, and **none of it is being built.** What ships is one `null` on every task, so that if it is ever wanted the migration does not have to be redone to add it. A field nobody reads costs a byte; retrofitting one across a live database costs a session. |
| **E29** | **Build items 2 and 3 fold into ONE increment.** Jake delegated batching. | `store.js` is rewritten either way — it needs the workspace parameter for item 3 and the bootstrap for item 2 — and doing that surgery twice is the only thing the split buys. The project's own discipline is **one data-layer change per deploy so a failure is unambiguous**; two of them a week apart is two ambiguous failures. And the thing item 2 existed to de-risk — that the rules permit the workspace→member bootstrap — was already proven green by `smoke.html` before either item started. |
| **E30** | **`store.js` absorbs the workspace, and its EXPORTED SIGNATURES DO NOT CHANGE.** Every function app.js already called keeps its name and arguments; `watchAuth` gains an optional third callback and nothing else moves. | This is the row that made the port small, and it is D26's modularity finally being spent. `queue.js` (1,206 lines) has never known Firestore exists and crosses **byte-identical**; `celebrate.js` likewise. `app.js` (5,922 lines) only ever talked to store.js's exports, so it crosses with **four seams touched** — the `?v=` pins, the banner, `watchAuth`'s third argument, and the new `onBlocked`. **The rule going forward: anything that must become workspace-aware later gains an OPTIONAL argument defaulting to the active workspace.** A signature change is a fan-out through 5,922 lines; a default argument is not. |
| **E32** | **A DEPENDENT WORKSPACE — one mechanism, pointed the other way.** An adult creates a board and holds `ownerEmail` (permanent); an optional co-owner gets role `owner`; the resident gets role `editor` plus `minor: true`. Jake's own construction, verbatim: *"creating a dependent workspace for Nico, granting ownership rights to Katie and membership rights for Nico — maybe labelling him as a minor in the process which could remove his ability to delete his workspace."* | **There is no child code path, and that is the design.** A dependent workspace is an ordinary workspace whose resident is not its owner — the same two words aimed the other way from Katie's. **This is where `ownerEmail`'s permanence stops being a caveat and becomes the point:** on a personal board it was a wart worth documenting; here it is exactly what a child cannot revoke. Nico gets `editor` because it is genuinely his list and he has to be able to work it; the flag is what stops him handing the key back. `kind: "dependent"` is advisory — it drives UI and the rules never read it, because the security lives in `ownerEmail` and `minor`, not in a label. Scales unchanged to students far later, where the binding constraint is the bill, not the permissions. |
| **E33** | **THE LOCKOUT, CLOSED (rules 1.1.0).** A member row may carry `minor: true`; the rules then refuse self-removal, and refuse any self-edit that would change the flag. | **Found by walking Jake's Nico description through rules 1.0.0, not by re-reading them.** 1.0.0 let anyone remove *themselves* from a workspace. Nico could never have removed his parents — but he could have removed himself from his own board, at which point `resolveWorkspace` would have built him a fresh personal one his parents had never heard of. **Same lockout, different door — and the door was marked "leave".** The second clause matters as much as the first: a guard a child can switch off is decoration. Read via `resource.data.get('minor', false)`, so every existing row is unaffected and no migration is needed. |
| **E34** | **The board switcher runs a `collectionGroup` query over `members`, filtered to documents whose id is your own email.** Needs a top-level rules clause (a nested rule cannot serve a collection-group query) and a **collection-group index on `members.email`** — Firestore offers it as a one-click link the first time it runs. | E5 already rejected the alternative — *"a denormalised list on the user document is a cache at best and a lie at worst"* — and this is the query it was rejected in favour of. It grants strictly less than it looks like: **the document id IS the member's email, so the only rows it can return are the asker's own.** It cannot enumerate anyone else's membership, and it cannot see a workspace the asker was never added to, because there is no document there to read. **Consequence for the app's shape:** the board LIST belongs to the user, not to any board, so it subscribes once at sign-in and survives every switch — putting it inside the per-board subscription would tear down the switcher every time somebody used the switcher. |
| **E35** | **2.0 REQUIRES WORKING CALENDARS — Jake's amendment to his own E24 definition.** *"I need all of that functioning before we can call it 2.0."* The bar is now: two people on separate boards, each able to visit the other, **and** the poll, mirror and carryover running. | E24 defined 2.0 by the board switcher, which was the right shape and too small a bar. A planning app that cannot see your appointments and cannot notify your phone is a demonstration, not a replacement — and the mirror is precisely how Katie is told about anything at all. **Consequence for sequencing, and it is the useful part: items 5 and 6 (shared tiers, activity feed) are genuinely good and genuinely not blocking.** The path to 2.0 is item 7, then item 9. |
| **E36** | **THE MIRROR TAG NAMESPACE IS `octodo`; 1.x keeps `tentacalendar` and is not touched.** Carryover likewise: `octodo-carryover`. | The mirror LISTS events by an exact-match tag and then DELETES any tagged event whose task it cannot find — so two apps sharing a tag would take turns deleting each other's work, every hour, for the whole overlap. **Jake proposed a combined tag (`octodo tentacalendar`) and it is worth recording why that cannot work: the filter is exact-match, so such an event would be invisible to BOTH apps rather than visible to both.** The tag records **ownership**, not provenance, and ownership has to be binary for a prune step to be safe. **This is not a new pattern — D87 already used a separate namespace so the mirror and carryover could share one calendar.** Belt and braces on top: `mirrorCalendarId` is per workspace, so during the overlap the two apps write to different calendars and never meet at all. |
| **E31** | **Version lines CONTINUE from 1.x; they do not restart. `app.js` becomes 2.0.0 on the day E24 is met.** So: app.js 1.22.0, store.js 0.18.0, css 0.47.0, html 0.41.0, config.js 1.0.0, and queue.js/celebrate.js keep 0.20.0/0.2.0 **because they are byte-identical and a renumber would erase that fact.** | Restarting at 0.1.0 was considered and rejected: it would throw away every file's provenance at the exact moment the two trees have to be compared daily (E27). Continuing the numbers means a bug report naming "queue.js 0.20.0" is unambiguous across both repos. **"2.0" is the PRODUCT version (E20/E24), which is a different thing from any file's version** — precisely as 1.x ran app.js 0.38.1 while being "version 1.0 in waiting" until D105. The badge keeps doing its one job: telling Jake what is actually running. |

---

## 4. Schema

### 4.1 Top level

```
users/{email}
workspaces/{wsId}
workspaces/{wsId}/members/{email}
workspaces/{wsId}/tiers/{id}
workspaces/{wsId}/tasks/{id}
workspaces/{wsId}/projects/{id}
workspaces/{wsId}/sessions/{id}
workspaces/{wsId}/eventsCache/{tierId}_{gcalEventId}
workspaces/{wsId}/activity/{id}
workspaces/{wsId}/settings/{config|stageTemplate|projectTypes}
secrets/{email}                      <- ADMIN SDK ONLY, no client access ever
```

Document IDs use the **lowercased email** for `users` and `members`. Google returns canonical lowercase for gmail addresses, but custom domains carry whatever casing an admin provisioned — firestore.rules 0.2.0 already took `.lower()` as insurance for exactly this reason, and 2.0 makes it load-bearing rather than belt-and-braces.

### 4.2 `users/{email}`

```js
{
  email,                  // lowercased, matches doc id
  displayName,            // from the Google profile; editable
  photoURL,               // Google profile picture (for activity attribution)
  createdAt,
  homeWorkspaceId,        // their own personal workspace — the one signup created
  tierRanks: {            // E7 — per-user ordering across ALL visible tiers
    "wsAbc:tierXyz": 3,
    "wsShared1:tierFam": 1
  },
  lastSeenActivityAt,     // drives the catch-up bar's unread count
  onboardingDone: false   // gates the walkthrough
}
```

`tierRanks` is the only place a user's cross-workspace opinion lives. A tier absent from the map sorts after every ranked tier, alphabetically — so a newly shared tier appears at the bottom rather than silently claiming rank 1.

### 4.3 `workspaces/{wsId}`

```js
{
  name,                   // "Jake", "Katie", "Family" — shown in the board switcher
  kind: "personal" | "shared",
  ownerEmail,
  createdAt,
  createdBy,
  color,                  // tint for the board switcher and activity attribution
  nextPollAt,             // E14 — the work queue's claim stamp; null = no calendars
  pollIntervalMinutes     // per-workspace (1.x had this in settings/config); the cost knob
}
```

`kind` is advisory, not a security boundary — it drives UI (a `personal` workspace can't be left by its owner; a `shared` one can). Rules do not read it.

### 4.4 `workspaces/{wsId}/members/{email}`

```js
{
  email,                  // lowercased, matches doc id
  role: "owner" | "editor" | "viewer",
  addedBy,
  addedAt,
  displayName,            // denormalised so a member list renders without N user reads
  hidden: false           // this member has hidden this workspace from their own board switcher
}
```

**This document is the security boundary.** Its existence grants read; its `role` grants write. Everything in §5 turns on it.

### 4.5 Changes to existing 1.x documents

Additive only. Every 1.x field survives with the same name and meaning — this matters enormously for the migration, because it means the transform in §11 is mostly a *copy*.

**`tasks/{id}`** — gains:
```js
  completedBy: null,      // E9 — email of whoever checked it off; null while incomplete
  assignedTo: null        // optional: whose board this shows on within a shared workspace
```

**`projects/{id}`** — gains `completedBy` on the project, and each entry in the `stages[]` array gains `completedBy`.

**`tiers/{id}`** — unchanged except that `rank` becomes a *default* rather than the truth. Per-user rank lives in `users/{email}.tierRanks` (E7). The tier's own `rank` seeds a new member's entry so a shared tier doesn't land unranked.

**`settings/config`** — `pollIntervalMinutes` moves up to the workspace document (E14 needs it queryable). Everything else stays.

> **Migration note, and it is the good news of this whole document:** `tasks`, `projects`, `tiers`, `sessions` and `settings` keep their shapes. Katie's migration copies documents into a new path and adds two nullable fields. It does not restructure her data. The 1.x lazy-normalisation fallbacks (`normalizeStage()`, `workload || 2`) must be **carried into 2.0 verbatim** — her projects predate v0.6.0 and still rely on them.

### 4.6 `workspaces/{wsId}/activity/{id}`

```js
{
  at,                     // Date.now()
  actor,                  // email
  actorName,              // denormalised — the feed must render without joins
  type,                   // see below
  targetType,             // "task" | "stage" | "project" | "member" | "tier"
  targetId,
  projectId,              // when applicable, for filtering
  summary,                // human string, composed AT WRITE TIME
  reactions: []           // E10 — [{by, byName, emoji, at}]
}
```

Types: `task.completed`, `task.uncompleted`, `task.created`, `task.rescheduled`, `task.deleted`, `stage.completed`, `stage.uncompleted`, `project.completed`, `project.created`, `member.added`, `member.removed`, `member.roleChanged`.

**`summary` is composed at write time and never recomputed.** If a task is later renamed or deleted, the feed still says what happened — a log that rewrites itself when its subject changes is not a log. This is Principle 3 applied to the record itself.

### 4.7 `secrets/{email}` (path B only)

```js
{
  google: {
    refreshToken,         // NEVER readable by any client — see E19 and §5
    scopes: [],
    connectedAt,
    lastRefreshedAt
  }
}
```

If path B is never built, this collection never exists. Its rules clause ships regardless, denying everything, so the collection cannot be created by accident later without someone deliberately changing the rules.

---

## 5. Security rules

> ⚠️ **SUPERSEDED 2026-07-25, SAME DAY, BY `firestore-2.0.rules` 1.0.0 — THE SKETCH BELOW HAS A BOOTSTRAP DEADLOCK.**
> Writing SETUP-2.0.md surfaced it: the `members/{email}` clause below allows writes only via `roleIn(wsId,['owner'])`, which requires an owner-role **member document** to already exist. So **the first member document can never be created**, and a workspace can never be used by the person who just made it. Signup would have failed on step three, for every user, forever.
> The shipped file fixes it by rooting membership in the **workspace document's `ownerEmail`** (`isWsOwner()`), which is set at creation and locked against modification afterwards. `smoke.html` walks exactly that sequence and is the regression test.
> **The block below is kept as the record of the design, not as something to paste.** Paste `firestore-2.0.rules`.

Rules are the one artifact in this project that cannot be tested by looking at the screen — a too-permissive rule looks exactly like a working app. Exercise them in the Rules Playground before publishing.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null
          && request.auth.token.email_verified == true;
    }
    function me() {
      return request.auth.token.email.lower();
    }
    function memberPath(wsId) {
      return /databases/$(database)/documents/workspaces/$(wsId)/members/$(me());
    }
    function isMember(wsId) {
      return signedIn() && exists(memberPath(wsId));
    }
    function roleIn(wsId, roles) {
      return isMember(wsId) && get(memberPath(wsId)).data.role in roles;
    }

    // --- a user may read and write only their OWN profile ---
    match /users/{email} {
      allow read, write: if signedIn() && email == me();
    }

    // --- refresh tokens: no client access, ever (E19) ---
    match /secrets/{email} {
      allow read, write: if false;
    }

    match /workspaces/{wsId} {
      allow read:   if isMember(wsId);
      allow update: if roleIn(wsId, ['owner']);
      allow create: if signedIn() && request.resource.data.ownerEmail == me();
      allow delete: if roleIn(wsId, ['owner']);

      match /members/{email} {
        allow read:         if isMember(wsId);
        allow write:        if roleIn(wsId, ['owner']);
        // a member may always remove THEMSELVES, and may edit their own `hidden`
        allow delete:       if signedIn() && email == me();
        allow update:       if signedIn() && email == me()
                            && request.resource.data.role == resource.data.role;
      }

      match /activity/{docId} {
        allow read:   if isMember(wsId);
        allow create: if roleIn(wsId, ['owner','editor','viewer'])
                      && request.resource.data.actor == me();
        // only reactions may be edited after the fact (E10) — the log is append-only
        allow update: if isMember(wsId)
                      && request.resource.data.diff(resource.data)
                           .affectedKeys().hasOnly(['reactions']);
        allow delete: if false;
      }

      match /{subcollection}/{docId} {
        allow read:  if isMember(wsId);
        allow write: if roleIn(wsId, ['owner','editor']);
      }
    }
  }
}
```

### Five things worth saying out loud about this file

**1. Viewers may write to `activity` but nothing else.** That is deliberate and it is how kudos work: a viewer can cheer, and cannot check anything off. It is the only write a viewer has.

**2. The activity log is append-only in the rules, not merely by convention.** `allow delete: if false` and an update clause restricted to `reactions` mean a bad actor — or a bug in my own code — cannot quietly edit history. Principle 3, enforced by the database rather than by my good intentions.

**3. The wildcard `{subcollection}/{docId}` is one level deep, same as 1.x.** If anything in 2.0 ever grows a sub-subcollection, this stops covering it and must become `{path=**}`. The 1.x rules carry this same warning in a comment; it should be carried over verbatim.

**4. `exists()` and `get()` in rules are billed as reads.** They are evaluated per *request*, not per *document*, so a query returning 84 tasks costs 84 document reads plus a small constant for the membership check — not 168. **This should be verified by measurement rather than believed**, D135-style: run the app, read the console, compare to the D136 census. If the constant turns out to be per-document, the documented escape hatch is Firebase Auth **custom claims** — put workspace membership in the token, and rules check it with zero reads. That costs a function to maintain claims and a token-refresh dance (claims can lag up to an hour), which is why it is not the day-one design at three users. It is the right answer at fifty.

**5. There is no allowlist.** That is the point, and it is the largest single change in the security posture. What used to be "may you enter" is now "what do you get when you enter" — which is an empty personal workspace of your own. §12 covers what stops that from being expensive.

---

## 6. The sharing model

### 6.1 Two sizes, one mechanism (E6)

**Share a whole calendar:** add an email to your personal workspace's `members` with role `viewer` or `editor`. They now see everything in it.

**Share a tier:** create a workspace with `kind: "shared"`, move or copy the tier into it, add both people as members with role `editor`.

There is no third mechanism, and the client cannot tell the difference. It subscribes to every workspace you are a member of and merges.

### 6.2 How a merged queue behaves

This is the part that could ruin the app if it is got wrong, so it is stated as a rule:

> **A shared TIER merges into your queue. A shared CALENDAR is a board you switch to.**

Without that split, the day Katie shares her calendar with Jake, 84 actuarial tasks interleave into his today list by D43's sort and he stops opening the app. With it: Family tasks live in his queue alongside his own, and Katie's work is a board he can look at when he wants to.

Mechanically: workspaces of `kind: "shared"` merge by default; workspaces of `kind: "personal"` that you do not own are switch-to. Both are overridable per-member via the `hidden` flag, so the default is a default and not a cage.

### 6.3 The race to the confetti

Jake's scenario, traced through the design end to end:

1. Family tier lives in shared workspace `wsFamily`. Jake and Katie are both `editor`.
2. Both clients subscribe to `wsFamily/tasks`. It is **one document**, watched by two people.
3. Katie checks off "call the plumber." Her client writes `completedAt` + `completedBy: katie`, and appends an activity entry.
4. Katie's screen: full D29 celebration. She did it.
5. Jake's screen: the task leaves his queue live (he is subscribed to the same document), no confetti (E11), and the catch-up bar gains one.
6. Jake taps the bar, sees "Katie completed *call the plumber*," taps 👏. A reaction lands on the entry.
7. Katie's client is subscribed to the same activity document. The 👏 arrives with no push infrastructure (E10).

Jake ranks Family at 5; Katie ranks it at 2. Both are true simultaneously, because rank lives in `users/{email}.tierRanks` (E7) and the tier document carries neither opinion.

### 6.4 Nico

Nico's account gets a personal workspace like everyone else. Jake and Katie are added to it as `editor` (they manage the account; edit rights are appropriate and they can help him). Neither of their workspaces lists him as a member, so he cannot reach them — not filtered, **absent from the path** (E1).

Shared tiers work the same for him as for anyone. If the family shares a "Chores" tier with all three, all three check things off it and all three see who did what.

Nothing in the design treats Nico as a special case. He is a user whose parents are members of his workspace, which is a configuration, not a code path — and that is precisely why he is the right first test: he exercises the entire multi-workspace machinery with no legacy data behind him.

---

## 7. The activity feed

### 7.1 Why it is one feature and not three

Jake asked for a history of who checked what off, a catch-up bar with a modal, and noted that Reflection *"needs that data to work forward."* Katie asked to send a "way to go!". These are one append-only log with three readers:

| Ask | Implementation |
|---|---|
| Forensics ("stolen valour", mistakes) | a filtered read of the log |
| Catch-up bar + modal | entries in my workspaces, by someone else, after `lastSeenActivityAt` |
| Reflection (D97 cards) | reads `completedBy`, not the log — see below |
| Kudos | a reaction on an entry (E10) |

### 7.2 The correctness bug this prevents

1.x's Reflection derives victories from `completedAt`, which has no actor. **The day a tier is shared, every teammate's completion appears in your Reflection as your own win.** Reflection is one of the most emotionally load-bearing surfaces in the app — it is the thing that tells Katie her week was not wasted — and quietly inflating it with other people's work would corrode exactly the trust it exists to build.

`completedBy` on the task/stage (E9) fixes it directly and cheaply: Reflection filters to `completedBy == me`, and gains, for free, the ability to show a second card — *what the team got done* — beside *what you got done*. **This is not optional polish. It ships in the same release as tier sharing or tier sharing is wrong.**

### 7.3 Bounded from day one (E15)

The feed is the fastest-growing collection in 2.0: every completion, reschedule and creation writes one. D139 established the pattern the expensive way — an unbounded collection is a per-boot read cost that compounds with *elapsed time*, not user count.

- Live listener: `where('at', '>=', now − 14 days)`, ordered descending, `limit(100)`.
- Deeper history: one-shot fetch on demand, cached per window by the client, exactly as `fetchCompletedTasks` does.
- The unread count comes from the live window. If someone has been away longer than the window, the bar says "50+" rather than lying or fetching the archive to count it.

### 7.4 Writes

Every activity write is a second write beside the action it records. At Jake's measured baseline of 116 writes/day for two people, doubling that is invisible against a 20,000/day free allowance.

They are written **in the same batch as the action** wherever the action is already batched, so an activity entry cannot exist for something that did not happen. Where the action is a single `updateDoc`, it becomes a batch. Per D95's pattern — *count it in the store, not at the call sites* — the entry is written inside `store.js`'s mutators, so no future caller can forget.

---

## 8. Calendars

The whole point of Tentacalendar is one centralised list that pulls back to 20,000 feet. Jake, 2026-07-25: *"Everything that is currently live in Tentacalendar should be live in 2.0 on day one."* Calendars are not a phase-two item.

But 1.x's calendar setup contains a human step that only worked because the human was Jake: *share your calendar with `something@project.iam.gserviceaccount.com`*. That is where a normal person closes the tab.

### 8.1 One interface, two doors (E13)

Both paths end at the same place — an anchor tier carrying `gcalCalendarId`. The tier mapping (D33) is the stable interface and does not change. `gcalAuth` records which door was used.

**Path A — "The Classic Setup"** (`gcalAuth: "service"`)
The user shares their Google Calendar with the robot's service-account address. A wizard shows the address with a copy button and walks the six clicks. No verification, no user cap, no consent screen, revocable by the user in one click from their own Google Calendar settings. **Ships day one.**

**Path B — "Connect with Google"** (`gcalAuth: "oauth"`)
One button, standard OAuth. Requires a token store (§4.7, E19), a refresh flow, a consent screen submitted for review, and — until approved — Google's *"Google hasn't verified this app"* interstitial plus a user cap while unverified. **Designed for, shipped when it is worth the paperwork.**

### 8.2 The framing

Jake's idea, and it is better than a neutral presentation: present A as the cool-but-complicated path with confident, insider verbiage, and hedge path B with *"hopefully this works!"*.

It is honest — B genuinely does route through a scary interstitial and A does not — and it steers people toward the path with no institutional obstacles, which is where Jake wants them.

**One rule for writing that copy:** hedge specifically about *Google's screen*, then be confident about everything after it. Hedging that resolves into "oh, that worked" is charming. Hedging on a path that then fails is infuriating.

### 8.3 What B does NOT cost

Correcting an assumption from the conversation, because it nearly drove a decision: **path B does not cost money.** Token storage is a handful of tiny documents; refresh calls are free. B's cost is *institutional* — review, interstitial, user cap — not financial. The A-versus-B decision is about friction, not dollars.

---

## 9. Functions (multi-tenant)

`functions/index.js` goes from 0.4.0 to 1.0.0. The three jobs survive with their logic intact; what changes is that each now runs *per workspace* instead of against the constant `WS = "primary"`.

### 9.1 The work queue (E14)

```
hourly Scheduler → ?job=all
  claim up to N workspaces where nextPollAt <= now, ordered by nextPollAt
  for each:  try { poll; mirror; carryover }  catch { log, continue }
             stamp nextPollAt = now + workspace.pollIntervalMinutes
```

Properties worth having:

- **Timeout-safe.** A bounded batch finishes in bounded time regardless of user count. A serial loop over every workspace does not, and its failure mode is silent — the last user in the loop never gets polled and nobody finds out.
- **Self-healing.** After an outage, overdue workspaces are simply the oldest `nextPollAt` and get claimed first.
- **Per-workspace isolation** (Principle 2). One user's broken calendar share cannot stop everyone else's poll. 0.4.0 already isolates per *tier*; this extends the same discipline one level up.
- **Load spreads itself.** New workspaces land at random offsets rather than all polling on the hour.

`pollIntervalMinutes` lives on the workspace (§4.3) so the claim query can read it, and it is the cost knob: Katie at 60, a casual colleague at 240.

### 9.2 Carried over unchanged

The reasoning behind D87 (no hour trigger needed — *"due before today began"* is tick-independent, so an outage cannot skip a morning), the mirror's dedicated-calendar loop guard and `tcTaskId` ledger, the carryover's separate tag namespace, and D135's deterministic `{tierId}_{gcalEventId}` document ids with `syncedAt` deliberately absent. **All of that is hard-won and none of it changes.** D135 in particular took writes from 1,500/day to 116/day; re-deriving it by accident would be a catastrophe wearing a rewrite's clothes.

### 9.3 Deployment

Same browser-only path Jake already knows: paste into the Cloud Run editor, deploy. New project means a new service account, new calendar shares, and a new Scheduler job — roughly an hour of console work he has done once before, documented in SETUP-PHASE3.md which needs a 2.0 revision.

**That hour is on the critical path for Katie's migration** (her Business mirror is live and load-bearing) **but not for Jake and Nico dogfooding.** 2.0 can run without functions for weeks; it just has no calendar events until they exist.

---

## 10. Onboarding

Jake: *"I want this to be a tool that people can just sign in to and use. Ideally there'd be a little tutorial and everything... Suggest they add at least one calendar and walk them through one tier. And then they're up and running."*

### 10.1 Signup

Sign in with Google → no membership found → create:
- `users/{email}` with `onboardingDone: false`
- `workspaces/{new}` — `kind: "personal"`, named from their display name
- `members/{email}` — role `owner`
- three starter tiers (Work / Home / Personal), all editable
- `settings/stageTemplate` — **BLANK** (E16)
- `settings/config` — 1.x defaults

Every one of those is a write to documents that did not exist a second ago, which is the safest kind of write there is.

### 10.2 The walkthrough

Four steps, skippable at any point, resumable later from Settings.

1. **Make a tier.** Rename a starter tier or add one. Explains what a tier is in one sentence.
2. **Add a task and check it off.** Ends in confetti — the fastest possible demonstration of why the app exists.
3. **Add a project** (optional). Introduces pipelines and stages.
4. **Connect a calendar** (optional, strongly suggested). The A/B fork from §8.2.

Step 2 before step 4 on purpose: the app must be *useful* before it is *configured*. Somebody who bounces off the calendar wizard should still have a working to-do list, not an empty shell.

### 10.3 The nowhere-to-go screen (E17)

Distinct, honest messages for distinct states — a signed-in user with no workspace, a revoked share, a removed member, a disabled account. Each says what happened and what to do. None of them is a silent bounce to the login screen, which is what Nico got and what sent Jake to a browser console to find out why.

---

## 11. Migration runbook

**The whole design of this section is that Katie's database is only ever READ.** (E3, Principle 1.)

### 11.1 Tools

Two standalone pages, both browser-only, both run by Jake:

- **`export.html`** — ✅ **WRITTEN 2026-07-25, v1.0.0.** Lives in the 1.x repo but is a **separate file**, and is read-only *by construction*: the Firestore write functions are not imported, so it cannot modify anything. Safe to run repeatedly; full snapshot each time (no `updatedAt` exists to delta against, so a delta would silently miss edits). It signs in, reads every collection under `workspaces/primary`, and downloads one JSON file. It does not import `app.js`, does not touch `index.html`, and Katie never opens it. Read-only by construction.
- **`import.html`** — lives in the 2.0 repo. Takes the JSON, applies the §4.5 transform, writes it into a named workspace in the new project. Supports `--only-newer` for the delta re-sync.

The transform is small because 1.x's document shapes survive (§4.5): copy documents, add `completedBy: null` and `assignedTo: null`, hoist `pollIntervalMinutes` to the workspace document, build `members/katie` as owner, seed `users/katie.tierRanks` from existing tier ranks.

> Firebase's managed export/import exists and would also work, but it requires cross-project GCS bucket permissions in the console and cannot transform on the way through. The two pages are more in the spirit of a browser-only project and give us the transform for free.

### 11.2 The sequence

| Phase | Action | What Katie experiences |
|---|---|---|
| 0 | New Firebase project, new Pages repo, temporary subdomain | Nothing |
| 1 | Build 2.0; Jake + Nico dogfood on real data in new workspaces | Nothing |
| 2 | Run `export.html` against `primary` | Nothing — it is a read |
| 3 | `import.html` into the new project as workspace "Katie" | Nothing |
| 4 | Verify side by side: task counts, project counts, stage completion states, session totals, Reflection for a known week | Nothing |
| 5 | **Quiet Sunday.** Ask her not to use it for 20 minutes. Re-export, re-import delta, repoint DNS to the 2.0 repo | ~20 minutes offline, announced |
| 6 | She loads the same URL, signs in, sees her calendar | Everything is where it was |

**Rollback at any point through phase 5: point DNS back.** The 1.x repo, the 1.x Firebase project and all of her original data are untouched and still running. This is the property that in-place migration cannot offer at any price.

### 11.3 The flip-day checklist

- [ ] **Same hostname** (E4) — 2.0 served at `tentacalendar.misterwilson.org`, never a redirect. Her 22 localStorage preferences and her installed PWA depend on the origin being identical.
- [ ] Her workspace's `nextPollAt` set so the first poll runs promptly.
- [ ] Calendars re-shared with the **new** service account (path A) before flip, not after — the mirror is load-bearing for her Business calendar.
- [ ] Old Scheduler job **disabled** so two projects are not both mirroring to the same calendar.
- [ ] Her `stageTemplate` — the real thirteen actuarial stages — verified present. E16 blanks the default for *new* users; it must not blank *hers*.
- [ ] Legacy fallbacks (`normalizeStage()`, `workload || 2`) confirmed present in the 2.0 code. Her projects predate v0.6.0.
- [ ] One completed task from >30 days ago fetched by paging the week view back — proves D139's history path survived the move.
- [ ] The 1.x project left running, untouched, for at least a month.
- [ ] `export.html` run once more AFTER the flip and the JSON filed somewhere safe — there is currently no backup of Katie's data anywhere, which is worth fixing regardless of 2.0.

---

## 12. Cost and abuse

### 12.1 The numbers (verified against Google's documentation, 2026-07-25)

Free tier, per project, per day: **50,000 document reads, 20,000 writes, 20,000 deletes, 1 GiB stored, 10 GiB/month egress.** Beyond that, Standard edition: **$0.03 per 100,000 reads, $0.09 per 100,000 writes, $0.01 per 100,000 deletes** (us-central1).

Measured 1.x baseline from Jake's console, post-D135/D139: **6,600 reads/day for two users** — about 3,300 per person.

| Users | Reads/day | Monthly cost |
|---|---|---|
| 3 (Jake, Katie, Nico) | ~10K | **$0.00** |
| 15 | ~50K | **$0.00** — the free tier's edge |
| 50 | ~165K | **~$1** |
| 200 | ~660K | **~$5.50** |

Writes never bind: 50 users at the measured write rate is ~2,900/day against 20,000 free. Cloud Run stays free (720 invocations/month against a 2M allowance). Calendar API is free. Google sign-in is free. Hosting is GitHub Pages.

**Conclusion: cost is not a reason to hesitate.** A public-school teacher can afford to be generous here.

### 12.2 The thing that is actually a risk

**Firebase has no hard spending cap.** A budget alert is a notification. That was fine for a two-person household; it is a different proposition once signup is open to the internet and the Firebase web config is public by design.

Three controls, all cheap, in priority order:

1. **App Check** (E18) — free, and the important one. Only the real app can talk to Firestore; a script pointed at the project is refused. **Required before public signup opens.**
2. **A budget kill switch** — a function on the budget alert's pub/sub topic that disables billing on the project. Drastic (the app stops) but it is the only actual ceiling that exists.
3. **Keep the census honest** — D136 already prints per-boot reads in the version tooltip. With strangers on the system that stops being a curiosity and becomes the instrument. **It must be updated for `snapshot.metadata.fromCache` if persistence ever lands** (§5c of HANDOFF documents why the two are a coupled pair).

Retain the existing $5 budget alert and add higher thresholds.

---

## 13. Build order

Each numbered item is a shippable increment. Nothing before item 8 touches Katie in any way.

1. ~~**Project setup**~~ — ✅ **DONE 2026-07-26.** `fantasktic-octodo`, repo `misterwilson37/octodo`, Blaze on, smoke test green including denial. App Check deliberately deferred (it needs a reCAPTCHA key and debug tokens, and enabling it now would only block Jake's own testing — it is required *before public signup*, which is item 8's problem).
2. ~~**Auth + workspace bootstrap**~~ + 3. ~~**Port the 1.x app**~~ — ✅ **BUILT 2026-07-27, folded into one increment per E29.** `store.js` 0.18.0 resolves the workspace at sign-in and creates one if absent; `queue.js` and `celebrate.js` cross byte-identical; `app.js` crosses with four seams (E30). E17 screens exist. *Milestone: Jake signs in and gets a working, private, single-workspace 2.0 with full 1.x feature parity.* **Awaiting his deploy and smoke pass.**
4. ~~**Membership + roles + the board switcher.**~~ — ✅ **BUILT 2026-07-27.** Rules 1.1.0 (E33 minor guard, E34 collection-group clause), `store.js` 0.19.0 (board listing, switching, member CRUD, dependent workspaces), a header switcher and Settings ▸ People. **This is the item E24 defines as 2.0** — pending Jake and Katie signing in alongside each other and confirming it.
5. **Shared workspaces / shared tiers** + per-user `tierRanks` (E7) + the merge-vs-switch rule (§6.2).
6. **Activity feed** + Reflection's actor filter + catch-up bar + kudos. **Ships with or before item 5** — see §7.2. *(The `completedBy` half already shipped in item 2+3: it is one nullable key, it is what §7.2's correctness argument actually turns on, and carrying it from the start means Katie's migration does not have to be redone to add it.)*
7. ~~**Functions 1.0.0**~~ — ✅ **BUILT 2026-07-27.** `functions/index.js` 1.0.0: the E14 work queue (bounded claim on `nextPollAt`, per-workspace isolation, a soft deadline, and `?ws=` to run one board), the `octodo` tag namespace (E36), and D135/D81/D87's logic carried across intact. `pollIntervalMinutes` is now authoritative on the workspace document, with `saveConfig` writing both copies so the settings form can never edit a field nobody reads. **Awaiting Jake's console hour — SETUP-PHASE3-2.0.md 1.0.0.**
8. **Onboarding + walkthrough** (E16 blank default) **+ App Check** (E18), which must land before the signup door opens. *Milestone: a stranger can sign up and be useful in 60 seconds.*
9. **Katie's migration** (§11), with `ownerEmail` resolved per E25.
10. *Later:* path B OAuth, FCM notifications, custom claims if §5 note 4's measurement demands it.

Item 4 is now the interesting one, and it is close: E24 says the board switcher **is** 2.0.

## 14. Open questions for Jake

**Four of the original five were answered 2026-07-27 and are now E-rows** — naming (SETUP-2.0's completion block), Nico's timing (E23), `assignedTo` (E28), and the 2.0.0 sign-off (E24). What remains:

1. **How much does Katie want to know?** Jake: *"I'll keep Katie updated on the things she needs to know — I'm not really sure how you'd update her anyway."* Fair, and it may simply be the answer. Flagged rather than closed because there is exactly one moment where it stops being rhetorical: **flip day asks her for twenty announced minutes offline**, and that is a conversation, not a deploy. Nothing before then needs her attention.

2. **The export JSON — not needed yet, and deliberately not requested.** Jake offered it. It is not needed until `import.html` is written (item 9), and when that day comes **a redacted skeleton is enough**: the collection names, the field names, and one anonymised document per collection. The transform is driven by *shape*, not content, and her client names are the one thing in this project with a reason to stay out of a chat window.

3. **Katie's phone, still open, still blocked on one datum** (HANDOFF 1.x §5c): the Chrome ▸ Accessibility ▸ *Text scaling* percentage on her phone. **The doubled stylesheet found on 2026-07-27 is NOT this bug** — measured, not assumed: the two copies differed only by D138, whose selector outranks what it duplicated, so nothing rendered differently. Three theories have now been floated about her phone and two were wrong; the one that solved D138 came from a repro sentence. Do not ship a fourth hopeful patch without the number.

## 15. What Katie sees

The column that matters. Every row is a step in this plan.

| Step | Her app | Her data | Her workflow |
|---|---|---|---|
| This design document | unchanged | unchanged | unchanged |
| New Firebase project created | unchanged | unchanged | unchanged |
| 2.0 built and deployed to temp subdomain | unchanged | unchanged | unchanged |
| Jake + Nico use 2.0 daily | unchanged | unchanged | unchanged |
| `export.html` run against her workspace | unchanged | **read only** | unchanged |
| Data imported into new project | unchanged | unchanged | unchanged |
| Verification, side by side | unchanged | unchanged | unchanged |
| **Flip day** | new app, same URL | copied, verified | **~20 min offline, announced** |
| After | 2.0 | in the new project; **original still intact** | same list, same check boxes |

**There is no row in which a script rewrites her live database.** That was the thing Jake named, and the separate-project architecture is what makes its absence structural rather than a promise I am making.

If busy season runs long, the plan pauses at any row above the flip with zero consequences. Items 1 through 8 can all happen while she is at her busiest, because none of them can reach her.

---

*Written by Wunderpus, 2026-07-25. Named for* Wunderpus photogenicus — *the species whose every individual is identifiable by a permanent unique pattern, catalogued one animal at a time, which is what this document does to a database that has treated two people as one since D12.* 🐙
