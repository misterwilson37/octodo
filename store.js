// ============================================================
// Tentacalendar — store.js  (2.0 / OCTODO LINE)
// Version 0.20.0 — item 7 support. nextPollAt is now a NUMBER (0 = never
// polled, poll now) rather than null: the work queue claims on
// `nextPollAt <= now`, and null sorts before numbers in Firestore so it
// would be swept in regardless — a field whose null and whose zero mean the
// same thing is one fewer case for the next reader. And saveConfig now also
// writes pollIntervalMinutes onto the WORKSPACE document, which E14 made
// authoritative because the claim query has to read it. Both copies are
// written so the settings UI can never be editing a field nobody reads.
// (prev) Version 0.19.2 — the twin of 0.19.1's bug. 0.19.1 made the one-shot board
// lookup degrade gracefully and left the LIVE LISTENER beside it with no
// error handler at all — so a missing index printed one clean sentence from
// one and forty lines of Firestore internals from the other. onSnapshot takes
// an error callback and every listener that can fail on an index needs one.
// (prev) Version 0.19.1 — bootstrap diagnostics + a query that can no longer strand
// anybody. Nico's first sign-in died on "Missing or insufficient permissions"
// and the console could only say the bootstrap failed, not WHERE — so this
// adds a step tag to every stage of resolveWorkspace, and makes the one
// optional step optional in fact as well as in intent. The rules bug itself
// is fixed in firestore-2.0.rules 1.1.1.
// (prev) Version 0.19.0 — E32/E33/E34: HOUSES AND KEYS, and the bug that walking
// Nico's first sign-in through 0.18.0 exposed.
//   · THE BUG: a dependent workspace is built for a child BEFORE that child
//     has ever signed in, so there is no users/{email} document to point at
//     it — and 0.18.0's resolveWorkspace saw "no home workspace" and would
//     have cheerfully built Nico a SECOND, personal one that his parents had
//     never heard of. resolveWorkspace now asks "do I already hold a key
//     somewhere?" before it builds anything, and adopts a board where it is
//     flagged as the resident minor. Deliberately ONLY a minor flag adopts:
//     a colleague sharing a board with a stranger must not rob that stranger
//     of a house of their own.
//   · createDependentWorkspace: the same two words (owner / member) aimed
//     the other way. An adult holds the deed, the child holds a key, and the
//     child's member row carries minor:true so the rules refuse to let them
//     hand it back (E33).
//   · subscribeMyWorkspaces: a collectionGroup query over members where the
//     document id is your own email — "which houses do I hold keys to."
//     This is what the board switcher runs on.
//   · setActiveWorkspace / setPreferredWorkspace: switching boards is a
//     variable assignment plus a re-subscribe, exactly as E1 promised.
// (prev) Version 0.18.0 — E1/E5/E30: THE WORKSPACE BECOMES A RUNTIME VALUE.
// This file is the ENTIRE surface on which 2.0's multi-tenancy lands, and
// it keeps every exported signature it had at 0.17.0 (E30) — which is why
// app.js's 5,922 lines and queue.js's 1,206 move across verbatim.
//   · No allowlist. rules 1.0.0 removed it; isolation is by PATH (E1), so a
//     client-side email list would now be theatre, not security.
//   · WORKSPACE_ID (D12's one true workspace) is gone. ACTIVE_WS is resolved
//     at sign-in from users/{email}.homeWorkspaceId, and created if absent.
//   · Sign-in bootstraps: users/{email} -> workspaces/{new} -> members/{email}
//     -> seed tiers + settings. The order is load-bearing; see the comment on
//     createPersonalWorkspace, which is the one genuine trap in this file.
//   · completedBy lands on tasks, stages and projects now (E9). The activity
//     FEED is build item 6; the field is here early because §7.2 is right that
//     Reflection silently mis-attributes the day a tier is shared, and a
//     nullable field costs nothing to carry through the migration.
//   · E16: a new workspace's stage template is BLANK. Katie's thirteen
//     actuarial stages travel with HER workspace and are never a stranger's
//     factory default.
// (prev) Version 0.17.0 — D139: BOUNDED TASK WINDOW (Option A). subscribeTasks no
// longer streams the whole archive: two merged listeners carry active
// (completedAt == null) + last-30-days-completed (completedAt >= floor), and
// fetchCompletedTasks() one-shots a deep-past week on demand. Nothing is
// deleted; history costs a read only when the week view pages back to it.
// (prev) Version 0.16.0 — D124: the project-type library. subscribeProjectTypes /
// saveProjectTypes read/write a settings/projectTypes doc ({types:[{id,name,
// stages}]}); the existing stageTemplate stays the implicit Default, so live
// projects are untouched. addProjectWithStages already snapshots explicit
// stages, so no creation-path change was needed. Rules wildcard covers it.
// (prev) Version 0.15.0 — D116: writes become undo-informative. clockIn/clockOut/
// logSession return the ids and bodies they touched; setSessionEnd and
// restoreDoc (same-id resurrection) join the toolbox.
// (prev) Version 0.14.0
// deleteSession + subscribeSessions). One open session max, enforced by
// the clockIn batch. The rules wildcard already covers the collection.
// (prev) Version 0.13.0
// Task schema gains recurrence {every, unit, anchor} + spawnedNextAt;
// setTaskDone materializes the next occurrence once, spawn-guarded;
// addInterval does the calendar-correct stepping.
// (prev) Version 0.12.0
// climax). setStageDone now reports hurrah + projectHasHurrah so the UI can
// aim the big celebration at the stage Katie says it belongs to.
// (prev) Version 0.11.1
// 0.11.1 (D102): the sign-in allowlist compares LOWERCASE, matching
// firestore.rules 0.2.0's .lower(). This list is NOT security — the rules
// are — but if the two disagree the app breaks in a way that looks like a
// login bug: client stricter = "bounced back to the sign-in screen", rules
// stricter = "Missing or insufficient permissions". Keep them symmetrical.
// 0.11.0
// 0.11.0 (D100): tasks carry estimateMinutes. D93 promoted "estimated time to
// complete" from nice-to-have to load-bearing: a task time is a DUE date, so
// with an estimate a task is a real block [due − estimate, due] with a real
// LENGTH, and that length is the whole answer to "can I fit dinner on
// Tuesday?". addTask destructures explicitly, so a new field would have been
// silently DROPPED — which is exactly the kind of nothing that looks like it
// works. null = unestimated; the clock grid draws those at a default and says
// so. updateTask already passes arbitrary fields through (D95 only special-
// cases dueAt), so editing an estimate needed no change there.
// 0.10.0
// 0.10.0 (D95): tasks remember being moved — firstDueAt (the original
// commitment) + rescheduleCount. Counted inside updateTask so EVERY path
// that changes a due date is caught, including ones not written yet.
// No migration: firstDueAt ?? dueAt at read time IS the backfill.
// Only a date that EXISTED can be moved: null → date is scheduling, not
// rescheduling, and doesn't count.
// 0.9.0 (D85): seed config gains clearDeckThreshold (0.6) — the point
// where the queue flips a project from "keep abreast" to "clear the
// deck." Additive; live DBs never reseed, so readers fall back to 0.6.
// 0.8.0 (D63): tasks carry an optional `notes` string (title stays
// short, details expand under the row). Additive — missing = none.
// 0.7.0: rewindFollowUps (D53 un-complete rewind), addProjectWithStages
// (D59 duplicate-for-next-year), per-tier allowedDays in seed (D60,
// Personal seeds 7-day), config seeds deadlineHour 16 + 
// decisionThresholdDays 2 (D51/D52). Live DBs never reseed — missing
// fields fall back in readers.
// 0.6.2: seed template uses dated/undated mix per D50.
// All Firebase interaction lives here: auth, seeding, live
// subscriptions, CRUD. Nothing in here touches the DOM.
// Schema per HANDOFF.md §3.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore, doc, collection, collectionGroup, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, where, getDocs, serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { FIREBASE_CONFIG } from "./config.js?v=1.1.0";

export const STORE_VERSION = "0.20.0";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- The active workspace (E1) ----------
// 1.x had `const WORKSPACE_ID = "primary"` in config.js. 2.0 resolves it per
// user at sign-in. Everything below reads it through ws(), so switching
// workspaces later (build item 4) is a variable assignment plus a re-subscribe,
// not a rewrite.
let ACTIVE_WS = null;
let ME = null;

/** The workspace every subscription and write below is scoped to. */
export function activeWorkspaceId() { return ACTIVE_WS; }
/** The signed-in user's lowercased email — the id used for users/ and members/. */
export function currentEmail() { return ME; }

// The board switcher's memory. app.js reads its own localStorage key and
// hands the value here BEFORE watchAuth runs, so a returning device opens on
// the board it was left on without a boot-time re-subscribe. Kept as a setter
// rather than a watchAuth argument so the signature stays put (E30).
let PREFERRED_WS = null;
export function setPreferredWorkspace(wsId) { PREFERRED_WS = wsId || null; }

/** Point every subsequent subscription and write at a different board.
 *  Returns true if anything actually changed, so the caller knows whether to
 *  tear down and re-subscribe. The membership check is FREE and implicit:
 *  the rules only let you read a workspace document you hold a key to, so a
 *  board you can open is a board you are entitled to. */
export function setActiveWorkspace(wsId) {
  if (!wsId || wsId === ACTIVE_WS) return false;
  ACTIVE_WS = wsId;
  return true;
}

function ws() {
  if (!ACTIVE_WS) throw new Error(
    "store.js: no active workspace. Something subscribed or wrote before " +
    "watchAuth resolved one — check that it is called from onSignedIn.");
  return ACTIVE_WS;
}
const whoami = () => ME || (auth.currentUser?.email || "").toLowerCase() || "unknown";

const wsRef = () => doc(db, "workspaces", ws());
const col = name => collection(db, "workspaces", ws(), name);
const settingsRef = which => doc(db, "workspaces", ws(), "settings", which);

// ---------- Auth + workspace bootstrap ----------

/**
 * E17 — "signed in with nowhere to go" is a REAL SCREEN, not silence.
 * 1.x signed non-allowlisted users straight back out, which is what Nico got:
 * the login screen again, and the only explanation in a console he would never
 * open. So watchAuth now has a THIRD callback. onBlocked(reason, user, err)
 * fires with reason "unverified" or "error"; app.js draws a sentence for each.
 * Passing it is optional so the signature stays backward-compatible (E30).
 */
export function watchAuth(onIn, onOut, onBlocked) {
  onAuthStateChanged(auth, async user => {
    if (!user) { ACTIVE_WS = null; ME = null; return onOut(); }
    ME = (user.email || "").toLowerCase();

    // firestore.rules 1.0.0 requires email_verified on EVERY read and write.
    // Google's provider always sets it, so this guards a future provider
    // rather than a live case — but an unverified account would otherwise
    // fail every query at once and look like the database was down.
    if (!user.emailVerified) {
      ACTIVE_WS = null;
      return onBlocked ? onBlocked("unverified", user) : onOut();
    }

    try {
      ACTIVE_WS = await resolveWorkspace(user);
      onIn(user);
    } catch (err) {
      ACTIVE_WS = null;
      // The step tag is the point. "Bootstrap failed" sent one debugging
      // round to the wrong place; the failing STEP names the fix.
      console.error(
        `[store] workspace bootstrap failed at step: ${err.tcStep || "unknown"}`,
        err);
      if (String(err?.code || "").includes("permission-denied")) {
        console.error(
          "[store] permission-denied during bootstrap. Check, in this order:\n" +
          "  1. Are firestore rules PUBLISHED, and are they at least 1.1.1?\n" +
          "  2. Rules 1.1.0's collection-group clause matched on the document\n" +
          "     ID, which cannot secure a QUERY — 1.1.1 matches on the field.\n" +
          "  3. Console -> Firestore -> Rules; select all, replace, publish.");
      }
      if (onBlocked) onBlocked("error", user, err); else onOut();
    }
  });
}

/** Can I open this board? Rules answer for free — a denied read throws. */
async function canOpen(wsId) {
  if (!wsId) return false;
  try { return (await getDoc(doc(db, "workspaces", wsId))).exists(); }
  catch { return false; }
}

/** Tag an error with the bootstrap step it died on, then rethrow. */
async function step(name, fn) {
  try { return await fn(); }
  catch (err) { err.tcStep = name; throw err; }
}

/** Find the board this user should land on, or build them one. */
async function resolveWorkspace(user) {
  const uref = doc(db, "users", ME);
  const usnap = await step("1-read-user-profile", () => getDoc(uref));

  // 1. Where they were last time (the switcher's memory).
  if (await canOpen(PREFERRED_WS)) return PREFERRED_WS;

  // 2. Their own house.
  if (usnap.exists() && usnap.data().homeWorkspaceId) {
    const home = usnap.data().homeWorkspaceId;
    // A read here can only fail by NOT EXISTING: ownerEmail is locked by the
    // rules, so an owner never loses read access to their own workspace.
    if (await canOpen(home)) return home;
  }

  // 3. ⚠️ DO THEY ALREADY HOLD A KEY? This step is why Nico works.
  // A dependent board is built for a child BEFORE the child has ever signed
  // in, so there is no users/{email} document pointing at it. Without this
  // check, step 4 would build Nico a brand-new personal workspace that his
  // parents do not hold the deed to — the exact lockout E33 closes at the
  // rules layer, arriving instead through the front door.
  //
  // ONLY a minor flag adopts, and that restriction is load-bearing: if any
  // membership counted, then a colleague sharing a board with someone who
  // had never signed in would silently deny that person a house of their
  // own. A shared board should show up in your switcher, not become your home.
  //
  // ⚠️ NON-FATAL BY DESIGN, and 0.19.0 got this wrong. This lookup is an
  // ENHANCEMENT — it exists so a child lands on the board built for them —
  // and in 0.19.0 a failure here threw, which meant one bad rules clause
  // stopped EVERY new user from signing up at all. An optional step that can
  // strand everybody is not optional. It now warns and falls through.
  //
  // The residual risk, stated rather than discovered: if this query is broken
  // AND a dependent board exists, its resident gets a personal board instead
  // of the one their parents hold. That is recoverable (delete it, sign in
  // again) where a locked-out app is not — but it is why smoke test IR must
  // be re-run after ANY change to the rules.
  let keys = null;
  try {
    keys = await getDocs(
      query(collectionGroup(db, "members"), where("email", "==", ME)));
  } catch (err) {
    console.warn(
      "[store] could not check for an existing board (non-fatal — a personal " +
      "one will be created). If this user was supposed to have a board made " +
      "FOR them, fix this before letting them use the one they just got:", err);
  }
  const dependent = !keys ? null : keys.docs
    .map(d => ({ wsId: d.ref.parent.parent.id, ...d.data() }))
    .find(r => r.minor === true);
  if (dependent) {
    await setDoc(uref, {
      email: ME,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      homeWorkspaceId: dependent.wsId
    }, { merge: true });
    return dependent.wsId;
  }

  // 4. Nobody has built them anything. Build them a house.
  return step("4-create-workspace",
    () => createPersonalWorkspace(user, uref, usnap.exists()));
}

// A small stable palette so two workspaces in the board switcher (item 4)
// don't arrive the same colour. Deterministic on the email so it never
// changes under someone.
const WS_COLORS = ["#4dabf7", "#69db7c", "#ffa94d", "#b197fc", "#ff6b6b", "#38d9a9"];
function pickWorkspaceColor(email) {
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return WS_COLORS[h % WS_COLORS.length];
}

/**
 * ⚠️ THE ORDER BELOW IS LOAD-BEARING AND MUST NOT BECOME A BATCH.
 *
 * The members/ rule is `isWsOwner(wsId)`, which evaluates
 * get(workspaces/{wsId}).data.ownerEmail. Inside a writeBatch every write is
 * checked against the state BEFORE the batch commits, so the workspace
 * document would not exist yet and the very first member write would be
 * DENIED — which is the same bootstrap deadlock the design doc's §5 rules
 * sketch had, arriving by a different door.
 *
 * smoke.html walks exactly this sequence as two separate awaits and went
 * green on 2026-07-26. That is the proof this works; it is not a guess.
 * The tier/settings seed CAN be a batch, because by then both documents exist.
 */
async function createPersonalWorkspace(user, uref, userExists) {
  const ref = doc(collection(db, "workspaces"));   // an id, without writing yet
  const now = Date.now();
  const first = (user.displayName || ME.split("@")[0] || "My").trim().split(/\s+/)[0];

  await setDoc(ref, {
    name: first,
    kind: "personal",
    ownerEmail: ME,                 // the root of trust; rules lock it forever
    createdAt: now,
    createdBy: ME,
    color: pickWorkspaceColor(ME),
    nextPollAt: 0,                  // E14 — 0 = never polled; the first run claims it
    pollIntervalMinutes: 60         // E14 — AUTHORITATIVE as of item 7: the claim
                                    // query reads it, so it has to live here.
                                    // saveConfig mirrors the UI's value onto it.
  });

  await setDoc(doc(db, "workspaces", ref.id, "members", ME), {
    email: ME, role: "owner", addedBy: ME, addedAt: now,
    displayName: user.displayName || "", hidden: false
  });

  await seedWorkspace(ref.id);      // explicit target: never via ACTIVE_WS

  const profile = {
    email: ME,
    displayName: user.displayName || "",
    photoURL: user.photoURL || "",
    homeWorkspaceId: ref.id
  };
  if (!userExists) {                // never stomp an existing profile's fields
    profile.createdAt = now;
    profile.tierRanks = {};         // E7 — per-user, cross-workspace tier order
    profile.lastSeenActivityAt = now;
    profile.onboardingDone = false; // E16/§10.2 — gates the walkthrough
  }
  await setDoc(uref, profile, { merge: true });

  return ref.id;
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export function signOutUser() {
  return signOut(auth);
}

// ---------- First-run seeding ----------
// Jake's confirmed tier queue (session 3):
//   1 Home (calendar/anchor)  2 Business (calendar/anchor)
//   3 Work  4 Family  5 Personal  6 Taiko
// Dark-theme ROYGBIV, all editable in settings.

// D60: allowedDays = which days of the week (0=Sun…6=Sat) this tier's
// scheduling math counts. Personal seeds 7-day (weekend jobs live there);
// missing field reads as Mon–Fri everywhere, so live DBs need no repair.
// §10.1 — THREE starter tiers, not Jake's six. "Business" and "Taiko" are
// facts about one household, and a stranger's factory default should not be
// a stranger's furniture. All three are renameable, recolourable and
// deletable on day one; Home is an ANCHOR because D33 makes the tier the
// calendar mapping, so the connect-a-calendar wizard (§10.2 step 4) has
// somewhere to land without the user first having to invent a tier.
const WD = [1, 2, 3, 4, 5];
const SEED_TIERS = [
  { name: "Home",     rank: 1, color: "#ff6b6b", kind: "anchor", midnightCarryover: false, defaultLeadWindowMinutes: 30, gcalCalendarId: "", gcalAuth: "service" },
  { name: "Work",     rank: 2, color: "#ffd43b", kind: "task",   midnightCarryover: true,  allowedDays: WD },
  { name: "Personal", rank: 3, color: "#4dabf7", kind: "task",   midnightCarryover: false, allowedDays: [0, 1, 2, 3, 4, 5, 6] }
];

// E16 — A NEW WORKSPACE'S PROJECT TEMPLATE IS BLANK.
// 1.x seeded Katie's thirteen actuarial stages here (Engagement letter, Loss
// data processing, Peer review...). That was a zero-migration accommodation
// for exactly one person, and it must not be what her sister receives on
// signup. Her template is real and travels with HER workspace through the
// §11 migration; it was never a factory default.
// A project created against an empty template gets stages: [], which the
// queue reads as "no unchecked stage" -> complete -> never nags. That is
// D128's blank-project behaviour, already shipped and known good.
const SEED_STAGES = [];

/** Seed a brand-new workspace by EXPLICIT id — never through ACTIVE_WS,
 *  because createDependentWorkspace seeds a board the user is not looking at
 *  and must not have to shuffle the active board to do it. Called only after
 *  the workspace and first member documents exist, so a batch is safe here;
 *  see the warning on createPersonalWorkspace for why it is not safe one
 *  step earlier. */
async function seedWorkspace(wsId) {
  const tiers = collection(db, "workspaces", wsId, "tiers");
  const setting = w => doc(db, "workspaces", wsId, "settings", w);
  const batch = writeBatch(db);
  for (const t of SEED_TIERS) batch.set(doc(tiers), t);
  batch.set(setting("config"), {
    carryoverWriteHour: 9,      // D14 — carryover lands at 9 AM
    pollIntervalMinutes: 60,    // still the AUTHORITATIVE copy until item 7
    sleepStart: 22,             // 10 PM
    sleepEnd: 6,                // 6 AM
    deadlineHour: 16,           // D51 — computed deadlines are "by 4 PM"
    decisionThresholdDays: 2,   // D52 — decision modal fires at >=2 days overdue
    clearDeckThreshold: 0.6     // D85 — least-done -> most-done flips at 60%
  });
  batch.set(setting("stageTemplate"), { stages: SEED_STAGES });   // E16: []
  await batch.commit();
}

// ============================================================
// HOUSES AND KEYS — membership, boards, and dependent workspaces
// (E5, E32, E33, E34)
//
// The whole permission model is two words. OWNER holds the deed: only an
// owner hands out and takes back keys. MEMBER holds a key: editors may move
// things, viewers may only look (and cheer — the activity clause in the
// rules lets a viewer react and nothing else).
//
// Everything Jake described is that model pointed in one of two directions:
//   · An ADULT holds their own deed and invites others in.  (Katie, colleagues)
//   · A DEPENDENT lives in a house an adult holds the deed to. (Nico, students)
// There is no third mechanism and no special child code path — a dependent
// workspace is an ordinary workspace whose resident is not its owner.
//
// IMPORTANT, and it is a property rather than a feature: a shared board is
// ONE SET OF DOCUMENTS, not a copy. Two people watching the same workspace
// are watching the same documents, so a completion lands on both screens
// within a second and there is nothing to reconcile, ever.
// ============================================================

/** Every board this user holds a key to. Drives the switcher.
 *
 *  A collectionGroup query over members, filtered to documents whose id is
 *  this user's own email. It needs the collection-group clause added to
 *  firestore.rules 1.1.0, and a COLLECTION-GROUP INDEX on members.email —
 *  Firestore emits a one-click "create index" link in the browser console
 *  the first time this runs, and until that index exists the listener
 *  errors rather than returning nothing. Expect it once; it takes a minute.
 *
 *  Workspace documents are cached by id: the membership snapshot re-fires
 *  whenever a role changes, and re-reading every board's document each time
 *  would turn a rename into N reads for no reason. */
const _wsCache = new Map();
export function subscribeMyWorkspaces(cb) {
  const q = query(collectionGroup(db, "members"), where("email", "==", ME));
  return onSnapshot(q, async snap => {
    const rows = snap.docs.map(d => ({
      wsId: d.ref.parent.parent.id,
      role: d.data().role || "viewer",
      hidden: d.data().hidden === true,
      minor: d.data().minor === true
    }));
    const out = [];
    for (const r of rows) {
      if (!_wsCache.has(r.wsId)) {
        try {
          const w = await getDoc(doc(db, "workspaces", r.wsId));
          if (w.exists()) _wsCache.set(r.wsId, w.data());
        } catch { /* a board we cannot read is a board we do not list */ }
      }
      const w = _wsCache.get(r.wsId);
      if (w) out.push({ id: r.wsId, ...w, myRole: r.role, hidden: r.hidden, minor: r.minor });
    }
    // Your own house first, then alphabetical — so the switcher never
    // reorders under you when somebody else renames their board.
    out.sort((a, b) =>
      (a.ownerEmail === ME ? 0 : 1) - (b.ownerEmail === ME ? 0 : 1) ||
      String(a.name || "").localeCompare(String(b.name || "")));
    cb(out);
  },
  // onSnapshot's THIRD argument. Without it a listener failure is an uncaught
  // async error: forty lines of Firestore internals in the console and no
  // sentence anybody can act on. This one has a known, expected failure —
  // the collection-group index does not exist until somebody creates it —
  // so it says exactly that, and reports an empty board list rather than
  // leaving the switcher showing whatever it last saw.
  err => {
    const needsIndex = String(err?.code || "").includes("failed-precondition");
    console.error(
      needsIndex
        ? "[store] the board list needs a one-time Firestore index that does " +
          "not exist yet: collection group 'members', field 'email', " +
          "Ascending. Firebase console -> Firestore -> Indexes -> Exemptions " +
          "-> Add exemption. Until then you can use your own board normally; " +
          "you just cannot see or switch to others. (SETUP-2.0.md Part 5b.)"
        : "[store] the board list listener failed:",
      err);
    cb([]);
  });
}

/** Forget a cached workspace document — call after renaming one. */
export function forgetWorkspaceCache(wsId) { _wsCache.delete(wsId); }

/** The board currently being viewed: name, colour, kind, ownerEmail. */
export function subscribeWorkspaceDoc(cb) {
  return onSnapshot(wsRef(), snap => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));
}

/** Who else holds a key to the board being viewed. */
export function subscribeMembers(cb) {
  return onSnapshot(col("members"), snap =>
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

/** Rename / recolour a board. Owner-role only, enforced by the rules. */
export async function saveWorkspace(wsId, fields) {
  await updateDoc(doc(db, "workspaces", wsId), fields);
  _wsCache.delete(wsId);
}

/** Hand someone a key. There is deliberately NO accept/decline step: the
 *  board simply appears in their switcher, and `hidden` lets them tuck it
 *  away. An invitation flow would be three screens and a pending state to
 *  serve a household and some colleagues who asked each other first. */
export function addMember(wsId, email, role = "editor", extra = {}) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) throw new Error("addMember: an email is required");
  return setDoc(doc(db, "workspaces", wsId, "members", e), {
    email: e, role, addedBy: whoami(), addedAt: Date.now(),
    displayName: "", hidden: false, ...extra
  });
}

/** Take a key back. */
export function removeMember(wsId, email) {
  return deleteDoc(doc(db, "workspaces", wsId, "members", String(email).toLowerCase()));
}

/** Change what a key opens. Cannot be used on yourself — the rules refuse a
 *  self-role-change, which is what stops an editor promoting themselves. */
export function setMemberRole(wsId, email, role) {
  return updateDoc(doc(db, "workspaces", wsId, "members", String(email).toLowerCase()), { role });
}

/**
 * E32 — a DEPENDENT workspace: a house an adult holds the deed to, for
 * somebody who lives in it but does not own it.
 *
 * The creator is ownerEmail, which the rules lock permanently. On a personal
 * workspace that permanence was a caveat worth writing down; here it IS the
 * feature — it is what a child cannot revoke.
 *
 * `coOwnerEmail` (Katie) gets role "owner": full use, plus the ability to add
 * and remove members, which is what "we can both toggle over to his screen"
 * needs. She does not get to delete the workspace outright — that stays with
 * ownerEmail — and since deleting a board today would orphan its
 * subcollections rather than clean them up, nobody should be doing it anyway.
 *
 * The resident gets role "editor" plus minor:true. Editor because it is HIS
 * list and he must be able to work it; minor because E33's rules clause
 * reads that flag to refuse both self-removal and self-unflagging.
 *
 * ORDER, and it is the same trap as createPersonalWorkspace: the workspace
 * document and the FIRST member document cannot share a batch, because the
 * members rule does get() on a workspace that would not exist yet. Once the
 * creator's own key exists, everything after it may batch.
 */
export async function createDependentWorkspace({ name, minorEmail, coOwnerEmail = null }) {
  const resident = String(minorEmail || "").trim().toLowerCase();
  if (!resident) throw new Error("createDependentWorkspace: the resident's email is required");
  if (resident === ME) throw new Error("createDependentWorkspace: you cannot be your own dependent");

  const ref = doc(collection(db, "workspaces"));
  const now = Date.now();

  await setDoc(ref, {
    name: (name || resident.split("@")[0]).trim(),
    kind: "dependent",              // advisory: drives UI, never read by rules
    ownerEmail: ME,                 // the deed. Permanent, and here that is the point.
    createdAt: now, createdBy: ME,
    color: pickWorkspaceColor(resident),
    nextPollAt: 0,
    pollIntervalMinutes: 60
  });

  await setDoc(doc(db, "workspaces", ref.id, "members", ME), {
    email: ME, role: "owner", addedBy: ME, addedAt: now,
    displayName: "", hidden: false
  });

  const batch = writeBatch(db);
  const co = String(coOwnerEmail || "").trim().toLowerCase();
  if (co && co !== ME) {
    batch.set(doc(db, "workspaces", ref.id, "members", co), {
      email: co, role: "owner", addedBy: ME, addedAt: now,
      displayName: "", hidden: false
    });
  }
  batch.set(doc(db, "workspaces", ref.id, "members", resident), {
    email: resident, role: "editor", addedBy: ME, addedAt: now,
    displayName: "", hidden: false,
    minor: true                     // E33 — the flag the rules read
  });
  await batch.commit();

  await seedWorkspace(ref.id);
  return ref.id;
}

// ---------- Live subscriptions ----------
// Each returns an unsubscribe function; callback receives an array of
// {id, ...data} (or a single object for config).

export function subscribeTiers(cb) {
  return onSnapshot(col("tiers"), snap => {
    const tiers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    tiers.sort((a, b) => a.rank - b.rank);
    cb(tiers);
  });
}

// ---------- D139: BOUNDED TASK WINDOW (Option A) ----------
// The census (D136) showed tasks as the largest UNBOUNDED collection: every
// completed task lingered in the live subscription forever, so a boot re-read
// the whole archive just to draw today. Jake's rule (2026-07-24): delete
// NOTHING — reflections will look back years — but only READ history when
// something actually needs it.
//
// So the always-on listener carries only what the live surfaces can show
// without paging into the past:
//   · every ACTIVE task            (completedAt == null)
//   · recently COMPLETED tasks      (completedAt >= the window floor)
// and the deep past is fetched on demand by the week view (fetchCompletedTasks).
//
// TWO listeners, not one OR-query: `== null` and `>= floor` on the same field
// can't be a single Firestore query, and an or()/composite over a null-equality
// plus a range invites index and null-sort surprises on a file we cannot
// runtime-test here. Two single-field listeners are trivially indexed and
// behave predictably. They are mutually exclusive (null is never >= a number),
// so the union needs no real dedup — but we key by id anyway, defensively.
export const COMPLETED_WINDOW_DAYS = 30;

// Floor is start-of-local-day minus the window, computed ONCE at subscribe so
// a long-running wall doesn't re-query as the clock ticks. On any reload
// (D130 refreshes ~daily) it resets; the practical drift is a few days wider,
// which is harmless — it only ever means "slightly more already-cached history".
function completedWindowFloor() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime() - COMPLETED_WINDOW_DAYS * 86400000;
}
let _liveFloor = null;
/** The timestamp below which completed tasks are NOT in the live set — the
 *  week view uses this to decide when a past week needs a history fetch. */
export function liveCompletedCutoff() {
  return _liveFloor ?? completedWindowFloor();
}

export function subscribeTasks(cb) {
  _liveFloor = completedWindowFloor();
  const active = new Map();   // completedAt == null
  const recent = new Map();   // completedAt >= floor
  let activeReady = false, recentReady = false;

  // Emit the union on every snapshot from either listener. Before BOTH have
  // delivered once we still emit — a half-set for a few ms is no worse than
  // the old single listener's boot, and render() is a snapshot handler that
  // expects to run repeatedly (D101).
  const emit = () => {
    const byId = new Map(recent);        // recent first…
    for (const [id, t] of active) byId.set(id, t);  // …active wins on the impossible clash
    cb([...byId.values()]);
  };

  const unsubActive = onSnapshot(
    query(col("tasks"), where("completedAt", "==", null)),
    snap => {
      active.clear();
      snap.docs.forEach(d => active.set(d.id, { id: d.id, ...d.data() }));
      activeReady = true;
      emit();
    }
  );
  const unsubRecent = onSnapshot(
    query(col("tasks"), where("completedAt", ">=", _liveFloor)),
    snap => {
      recent.clear();
      snap.docs.forEach(d => recent.set(d.id, { id: d.id, ...d.data() }));
      recentReady = true;
      emit();
    }
  );

  // One unsub that tears down both, so app.js's S.unsubs teardown is unchanged.
  return () => { unsubActive(); unsubRecent(); };
}

/**
 * D139 — one-shot fetch of completed tasks whose completion falls in
 * [startMs, endMs). Used by the week view when it pages to a week that
 * begins before the live window floor. Billed only when actually called,
 * and the caller caches by week so re-paging is free.
 */
export async function fetchCompletedTasks(startMs, endMs) {
  const q = query(
    col("tasks"),
    where("completedAt", ">=", startMs),
    where("completedAt", "<", endMs)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeEvents(cb) {
  // Phase 1: eventsCache is empty until pollCalendars ships (HANDOFF §5 build
  // order, phase 3). The code path is live so the queue logic never changes.
  return onSnapshot(col("eventsCache"), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeConfig(cb) {
  return onSnapshot(settingsRef("config"), snap => {
    cb(snap.exists() ? snap.data() : null);
  });
}

// ---------- Task CRUD ----------

export async function addTask({ title, tierId, dueAt, escalation, notes = "", projectId = null, estimateMinutes = null, recurrence = null }) {
  return addDoc(col("tasks"), {
    title, tierId, dueAt, escalation, notes,
    projectId,
    estimateMinutes,          // D100 — null = unestimated, NOT zero
    recurrence,               // D111 — {every, unit, anchor:"done"|"due"} or null; the Christmas cactus
    spawnedNextAt: null,      // D111 — set once the next occurrence exists; makes re-checks spawn-safe

    completedAt: null,
    completedBy: null,        // E9 — who checked it off; null while incomplete
    assignedTo: null,         // E9/§4.5 — whose board this shows on in a shared
                              // workspace. Field ships now, UI waits (E28).
    parentTaskId: null,
    offsetDays: null,
    mirroredGcalEventId: null,
    createdBy: whoami(),
    createdAt: Date.now()
  });
}

export async function addFollowUp(parentTaskId, { title, offsetDays, tierId }) {
  return addDoc(col("tasks"), {
    title, tierId,
    dueAt: null,               // materializes on parent completion (D4)
    escalation: { every: 1, unit: "hours" },
    projectId: null,
    completedAt: null,
    completedBy: null,        // E9
    assignedTo: null,         // E9/§4.5
    parentTaskId, offsetDays,
    mirroredGcalEventId: null,
    createdBy: whoami(),
    createdAt: Date.now()
  });
}

/**
 * Toggle completion. On completion, materialize any waiting follow-ups (D4):
 * child.dueAt = completedAt + offsetDays days (same clock time as completion).
 * On un-completion, children that were materialized are NOT rewound —
 * simplest honest behavior; revisit if it ever bites.
 */
export async function setTaskDone(taskId, done) {
  const now = Date.now();
  // E9 — completedAt has no actor, and §7.2 is right that the day a tier is
  // shared, Reflection starts counting a teammate's wins as yours. Writing the
  // actor at the moment of completion is the whole fix, and it is one key.
  await updateDoc(doc(col("tasks"), taskId), {
    completedAt: done ? now : null,
    completedBy: done ? whoami() : null
  });
  if (!done) return;
  const q = query(col("tasks"), where("parentTaskId", "==", taskId));
  const kids = await getDocs(q);
  const batch = writeBatch(db);
  let any = false;
  kids.forEach(k => {
    const d = k.data();
    if (d.dueAt == null && !d.completedAt) {
      batch.update(k.ref, { dueAt: now + (d.offsetDays || 0) * 24 * 60 * 60 * 1000 });
      any = true;
    }
  });
  if (any) await batch.commit();

  // D111 — the Christmas cactus. A checked-off recurring task materializes
  // its NEXT occurrence: a brand-new independent task (same title, tier,
  // escalation, notes, project, estimate — and the recurrence itself; the
  // cactus keeps needing water). Anchor "done" (the default) = you just
  // watered it, so the interval starts NOW; anchor "due" = the schedule is
  // the schedule, interval starts from the printed due time (which can
  // land the next one already overdue — that's honesty, not a bug).
  // spawnedNextAt is the double-spawn guard: check → spawn → un-check →
  // re-check must NOT plant a second cactus. Un-checking does NOT delete
  // the spawn — simplest honest behavior, same words as follow-ups above;
  // revisit if it ever bites. Escalation (D3) is untouched: it nags THIS
  // instance; recurrence only sets the next one's due.
  const snap = await getDoc(doc(col("tasks"), taskId));
  const t = snap.exists() ? snap.data() : null;
  if (t?.recurrence?.every && !t.spawnedNextAt) {
    const r = t.recurrence;
    const base = (r.anchor === "due" && t.dueAt != null) ? t.dueAt : now;
    await addDoc(col("tasks"), {
      title: t.title, tierId: t.tierId,
      dueAt: addInterval(base, r.every, r.unit),
      escalation: t.escalation || { every: 1, unit: "hours" },
      notes: t.notes || "",
      projectId: t.projectId ?? null,
      estimateMinutes: t.estimateMinutes ?? null,
      recurrence: r,
      spawnedNextAt: null,
      completedAt: null, completedBy: null, assignedTo: null,
      parentTaskId: null, offsetDays: null,
      mirroredGcalEventId: null,
      createdBy: whoami(),
      createdAt: now
    });
    await updateDoc(doc(col("tasks"), taskId), { spawnedNextAt: now });
  }
}

// D111 — interval math for recurrence. Fixed units are plain milliseconds;
// calendar units step via addMonthsStore in month quanta (months=1,
// years=12, decades=120, centuries=1200) so Jan-31 + 1 month = Feb-28/29,
// never Mar-3. addMonthsStore is a VERBATIM copy of queue.js's addMonths —
// duplicated on purpose to keep this module free of app-layer imports; the
// ship-check asserts the two bodies are character-identical (D98's parity
// answer, mechanized).
const REC_FIXED_MS = { minutes: 60000, hours: 3600000, days: 86400000, weeks: 7 * 86400000 };
const REC_MONTH_QUANTA = { months: 1, years: 12, decades: 120, centuries: 1200 };
function addMonthsStore(ts, n) {
  const d = new Date(ts);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, maxDay));
  return d.getTime();
}
export function addInterval(ts, every, unit) {
  const e = Math.max(1, every || 1);
  if (REC_MONTH_QUANTA[unit]) return addMonthsStore(ts, REC_MONTH_QUANTA[unit] * e);
  return ts + (REC_FIXED_MS[unit] || REC_FIXED_MS.days) * e;
}

/**
 * D53: pull a parent's materialized follow-ups back to "Waiting on…".
 * Any incomplete child that HAS a dueAt was materialized by a completion
 * (follow-ups are always born with dueAt:null) — reset those to null.
 * Completed children are left alone: they really happened.
 */
export async function rewindFollowUps(parentTaskId) {
  const q = query(col("tasks"), where("parentTaskId", "==", parentTaskId));
  const kids = await getDocs(q);
  const batch = writeBatch(db);
  let any = false;
  kids.forEach(k => {
    const d = k.data();
    if (d.dueAt != null && !d.completedAt) {
      batch.update(k.ref, { dueAt: null });
      any = true;
    }
  });
  if (any) await batch.commit();
}

export function deleteTask(taskId) {
  return deleteDoc(doc(col("tasks"), taskId));
}

/** Edit any task fields (title, tierId, dueAt, escalation, offsetDays...). */
/**
 * D95 — a due-date change is a RESCHEDULE, and the app remembers it.
 *   firstDueAt      — what she originally committed to
 *   rescheduleCount — how many times it moved since
 * Jake: "if she reschedules something 5 times, that's worthy of looking
 * at the _why_." Until now a reschedule overwrote dueAt and erased its
 * own evidence — the exact thing worth reflecting on.
 *
 * CENTRALISED HERE, not at the call sites, so every path that ever moves
 * a date is counted for free: the due dialog (D84), the decision modal's
 * 🕐 next-working-day, shelving to Waiting, and the drag-to-reschedule
 * that isn't built yet. A future caller cannot forget to count.
 *
 * NO MIGRATION, NO BACKFILL BUTTON. `firstDueAt ?? dueAt` at read time is
 * the retroactive answer: for a task predating this field, its current due
 * IS its first KNOWN due — honest, and costs zero writes to Katie's live
 * data. Jake asked whether we could backfill; the fallback IS the backfill.
 *
 * Escalation does NOT come through here (it only re-times the queue's
 * display slot, never dueAt), so nagging can't inflate the count. Only a
 * human moving a date does.
 */
export async function updateTask(taskId, fields) {
  const ref = doc(col("tasks"), taskId);
  if (!("dueAt" in fields)) return updateDoc(ref, fields);   // nothing to count

  const snap = await getDoc(ref);
  const cur = snap.exists() ? snap.data() : {};
  const patch = { ...fields };
  // You can only MOVE a commitment that existed. cur.dueAt == null means
  // this is the FIRST date this task ever had (born in Waiting, or picked
  // back up off the shelf) — that's scheduling, not rescheduling, and
  // counting it would inflate the number with a non-event. The count's
  // whole worth is that a 5 means something.
  if (cur.dueAt != null && cur.dueAt !== fields.dueAt) {   // a no-op save isn't a move either
    if (cur.firstDueAt == null) patch.firstDueAt = cur.dueAt;
    patch.rescheduleCount = (cur.rescheduleCount || 0) + 1;
  }
  return updateDoc(ref, patch);
}

/** D95 — read a task's original commitment. The ?? IS the backfill. */
export function taskFirstDue(t) { return t?.firstDueAt ?? t?.dueAt ?? null; }

// ---------- Projects & pipeline stages ----------

// ---------- D112: billable sessions (the paper replacement) ----------
// Katie's projects are FIXED-PRICE against assumed hours; the point of this
// ledger is next year's ask, not payroll. Sessions are {projectId, start,
// end|null}; at most one open (end:null) session exists at a time — the
// clockIn batch closes whatever is open in the same commit that opens the
// new one, so the 9-project shuffle is one tap and can never double-run.
export function subscribeSessions(cb) {
  return onSnapshot(col("sessions"), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

/** Close whatever is open at `at`, open projectId at `at` — one commit.
 *  D116: returns everything undo needs — the ids it closed, the id and
 *  body of the session it opened, and the boundary. */
export async function clockIn(projectId, at = Date.now()) {
  const open = await getDocs(query(col("sessions"), where("end", "==", null)));
  const batch = writeBatch(db);
  const closedIds = [];
  open.forEach(s => { closedIds.push(s.id); batch.update(s.ref, { end: Math.max(at, s.data().start) }); });
  const ref = doc(col("sessions"));
  const body = {
    projectId, start: at, end: null,
    createdBy: whoami(), createdAt: Date.now()
  };
  batch.set(ref, body);
  await batch.commit();
  return { newId: ref.id, body, closedIds, at };
}

/** End the open session (whichever project holds it) at `at`, clamped so a
 *  backdated end can never precede its own start. */
export async function clockOut(at = Date.now()) {
  const open = await getDocs(query(col("sessions"), where("end", "==", null)));
  const batch = writeBatch(db);
  const closed = [];
  open.forEach(s => { closed.push({ id: s.id, end: Math.max(at, s.data().start) }); batch.update(s.ref, { end: Math.max(at, s.data().start) }); });
  if (closed.length) await batch.commit();
  return closed;   // D116: [{id, end}] so undo can reopen and redo can re-close
}

/** D112 — the forgot-to-clock-in eraser: a manual, backdated session. If
 *  the OPEN session started before this one, it truncates where this one
 *  starts (honest boundaries: she stopped that work when she started this).
 *  A session that began INSIDE the manual window is left alone — v1 keeps
 *  overlap surgery simple; revisit if it ever bites. */
export async function logSession(projectId, start, end) {
  const open = await getDocs(query(col("sessions"), where("end", "==", null)));
  const batch = writeBatch(db);
  const truncatedIds = [];
  open.forEach(s => { if (s.data().start < start) { truncatedIds.push(s.id); batch.update(s.ref, { end: start }); } });
  const ref = doc(col("sessions"));
  const body = {
    projectId, start, end,
    createdBy: whoami(), createdAt: Date.now()
  };
  batch.set(ref, body);
  await batch.commit();
  return { newId: ref.id, body, truncatedIds, start };   // D116
}

export function deleteSession(sessionId) {
  return deleteDoc(doc(col("sessions"), sessionId));
}

/** D116 — set (or null-out, i.e. reopen) a session's end. Undo machinery. */
export function setSessionEnd(sessionId, end) {
  return updateDoc(doc(col("sessions"), sessionId), { end });
}

/** D116 — resurrect a deleted doc at its ORIGINAL id, so references
 *  (parentTaskId chains, session ledgers) keep pointing at the truth. */
export function restoreDoc(collName, id, data) {
  return setDoc(doc(col(collName), id), data);
}

export function subscribeProjects(cb) {
  return onSnapshot(col("projects"), snap => {
    const projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    projects.sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
    cb(projects);
  });
}

export function subscribeStageTemplate(cb) {
  return onSnapshot(settingsRef("stageTemplate"), snap => {
    cb(snap.exists() ? (snap.data().stages || []) : []);
  });
}

export function saveStageTemplate(stages) {
  return setDoc(settingsRef("stageTemplate"), { stages });
}

// D124 — the project-type LIBRARY. A single settings doc holds named types,
// each with its own stage pipeline; the existing stageTemplate stays the
// implicit "Default" (no migration, no risk to live projects). The rules
// wildcard already covers settings docs — no console re-paste.
export function subscribeProjectTypes(cb) {
  return onSnapshot(settingsRef("projectTypes"), snap => {
    cb(snap.exists() ? (snap.data().types || []) : []);
  });
}

export function saveProjectTypes(types) {
  return setDoc(settingsRef("projectTypes"), { types });
}

/** New project snapshots the current template into its own editable stages. */
export async function addProject({ name, color, startDate, endDate, tierId, workload = 2 }) {
  const tmplSnap = await getDoc(settingsRef("stageTemplate"));
  const template = tmplSnap.exists() ? (tmplSnap.data().stages || []) : [];
  const legacy = { before: ["before", "start"], during: ["after", "start"], after: ["after", "end"] };
  const stages = template.map(s => {
    const [dir, anc] = s.direction && s.anchor ? [s.direction, s.anchor] : (legacy[s.phase] || legacy.during);
    return { name: s.name, direction: dir, anchor: anc, offsetDays: s.offsetDays || 0, completedAt: null, dueAt: null };
  });
  return addDoc(col("projects"), {
    name, color, startDate, endDate, tierId, workload, stages,
    stretchUntilDone: false, completedAt: null, completedBy: null,   // E9
    createdBy: whoami(),
    createdAt: Date.now()
  });
}

/**
 * D59: create a project with an EXPLICIT stage array (used by
 * duplicate-for-next-year — the caller passes the source project's
 * pipeline with completedAt/dueAt already reset, so the template is
 * NOT consulted and one-off stage surgery survives the duplication).
 */
export function addProjectWithStages({ name, color, startDate, endDate, tierId, workload = 2, stages = [] }) {
  return addDoc(col("projects"), {
    name, color, startDate, endDate, tierId, workload, stages,
    stretchUntilDone: false, completedAt: null, completedBy: null,   // E9
    createdBy: whoami(),
    createdAt: Date.now()
  });
}

export function deleteProject(projectId) {
  return deleteDoc(doc(col("projects"), projectId));
}

/** Edit project fields (name, color, tierId, startDate, endDate). Stage
 *  activations are COMPUTED from dates, so moving a project reflows its
 *  pipeline automatically — no stage cleanup needed. */
export function updateProject(projectId, fields) {
  return updateDoc(doc(col("projects"), projectId), fields);
}

/**
 * Set/unset completion on one stage. Returns the updated stages array so the
 * caller can detect project completion (all stages done) for celebration level 3.
 */
export async function setStageDone(projectId, stageIndex, done) {
  const ref = doc(col("projects"), projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const stages = (snap.data().stages || []).map(s => ({ ...s }));
  if (!stages[stageIndex]) return null;
  stages[stageIndex].completedAt = done ? Date.now() : null;
  stages[stageIndex].completedBy = done ? whoami() : null;      // E9
  const allDone = stages.length > 0 && stages.every(s => s.completedAt);
  await updateDoc(ref, {
    stages,
    completedAt: allDone ? Date.now() : null,
    completedBy: allDone ? whoami() : null                       // E9
  });
  // D109 — a stage may carry `hurrah: true` (the designated climax; at most
  // one per project by editor convention, absent on stages that aren't it).
  // The caller decides the celebration level from these two facts:
  // publishing is the party, follow-up is paperwork.
  return {
    stages, allDone,
    hurrah: !!stages[stageIndex].hurrah,
    projectHasHurrah: stages.some(s => s.hurrah)
  };
}

/** Replace a project's entire stage array (rename/reorder/add/remove,
 *  D42). Caller is responsible for preserving completedAt/dueAt on
 *  surviving stages. Auto-recomputes project completion. */
export async function setProjectStages(projectId, stages) {
  const allDone = stages.length > 0 && stages.every(s => s.completedAt);
  return updateDoc(doc(col("projects"), projectId), {
    stages,
    completedAt: allDone ? Date.now() : null,
    completedBy: allDone ? whoami() : null                       // E9
  });
}

export async function setStageDue(projectId, stageIndex, dueAt) {
  const ref = doc(col("projects"), projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const stages = (snap.data().stages || []).map(s => ({ ...s }));
  if (!stages[stageIndex]) return;
  stages[stageIndex].dueAt = dueAt; // null clears
  await updateDoc(ref, { stages });
}

// ---------- Tier CRUD (settings) ----------

export function saveTier(tierId, data) {
  if (tierId) return updateDoc(doc(col("tiers"), tierId), data);
  return addDoc(col("tiers"), data);
}

export function deleteTier(tierId) {
  return deleteDoc(doc(col("tiers"), tierId));
}

// ---------- Config ----------

export async function saveConfig(data) {
  await setDoc(settingsRef("config"), data, { merge: true });
  // E14 — the poll's claim query reads pollIntervalMinutes off the WORKSPACE
  // document, because a query cannot reach into a subcollection to sort by a
  // field. The settings form still edits settings/config, so the value is
  // written to both rather than left to drift: a UI that edits a field the
  // engine never reads is a setting that silently does nothing.
  const mins = Number(data?.pollIntervalMinutes);
  if (mins > 0) {
    try { await updateDoc(wsRef(), { pollIntervalMinutes: mins }); }
    catch (err) { console.warn("[store] could not update the workspace poll interval (a viewer cannot):", err); }
  }
}
