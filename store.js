// ============================================================
// Tentacalendar — store.js  (2.0 / OCTODO LINE)
// Version 0.21.2 — SIGN IN AS SOMEBODY ELSE. Jake, testing with Nico:
// "Signs out, but can't sign in as anyone else in Safari. It just remembers
// what google account is logged into Google."
//
// Not Safari remembering, and not a bug in signOut: signInWithPopup with a
// bare provider asks Google for "the signed-in user", and where that is
// unambiguous Google answers instantly WITHOUT drawing a chooser. One
// account on the device therefore means one account in this app, forever,
// with no visible way to say otherwise. `prompt: "select_account"` makes it
// ask every time.
//
// ⚠️ THIS IS A TESTING BLOCKER AS MUCH AS A FEATURE. Every second-person
// smoke test (IU, IX-b, IZ, JA) needs two accounts in one browser, so
// without this the shared-tier work cannot be checked by one person at one
// desk — which is the only way it CAN be checked right now.
//
// (prev) Version 0.21.1 — WHOSE ORDER YOU SEE WHEN VISITING. Jake: "Visiting her
// should give me a taste of EXACTLY what she looks at — zero differences.
// Otherwise I wouldn't have an honest picture of her load."
//
// 0.21.0 got that right for a person's OWN tiers and wrong for the SHARED
// one, and the shared one is the case he was asking about. A tier document's
// `rank` is written by whoever has setup rights, so on a personal board it is
// reliably the owner's opinion — but BOTH people write a shared tier's
// document, and the last save wins. Visiting Katie could therefore have shown
// Family at Jake's rank, sitting in the middle of her board looking like her
// judgement about her own week.
//
// FIXED by putting each person's ordering of a shared tier on THEIR OWN
// MEMBER ROW in that shared workspace. No rules change: a member row is
// readable by everyone holding a key to the same workspace and writable only
// by its own subject, which is exactly the shape this needs and is already
// what the rules say. users/{email}.tierRanks stays the authority for YOUR
// view (E7); the member row exists purely to be read by somebody else, which
// is a thing a private profile can never be.
//
// And the person whose order you see when visiting is the RESIDENT, not the
// deed-holder — on a dependent board (E32) those differ, and it is the
// child's day that makes his board honest. See viewerEmail() and rankFor().
//
// (prev) Version 0.21.0 — ITEM 5: SHARED TIERS. This file now reads from SEVERAL
// workspaces at once and writes to whichever one a document actually lives
// on, and app.js's 6,500 lines still believe there is exactly one board.
// That is E30 being spent a second time, and it is the whole point.
//
// FOUR NEW IDEAS, in the order you need them:
//
//   1. THE MERGE SET. Every subscription below fans out across a LIST of
//      workspaces instead of one. The list is the active board plus every
//      `kind:"shared"` workspace that belongs in this view — see mergeSet()
//      for the rule, which is Jake's and not the one originally designed.
//
//   2. THE OWNERSHIP MAP (`_where`). Merged snapshots record which board
//      each document came from, so a later write can be aimed at it.
//      ⚠️ IT IS NEVER PRUNED. A deleted document keeps its entry, because
//      restoreDoc resurrects by id and would otherwise put it back on the
//      wrong board. Tombstones are the feature; a few thousand string pairs
//      is not a memory problem.
//
//   3. PER-USER TIER RANK (E7). users/{me}.tierRanks maps "wsId:tierId" to
//      a number, and subscribeTiers overlays it onto `rank` before app.js
//      sees it. So app.js:6391 and queue.js:486 keep reading `.rank` and
//      never learn it stopped being a property of the document.
//
//   4. SHARE / UNSHARE = A MOVE, AT THE SAME DOCUMENT IDS. shareTier lifts
//      a tier and everything pointing at it into a new shared workspace;
//      unshareTier brings it home. Ids are PRESERVED, which is what keeps
//      parentTaskId chains, projectId references and the merged view's
//      uniqueness intact. COPY, VERIFY, THEN DELETE — a failure anywhere
//      leaves duplicates, which are visible and recoverable, and never
//      leaves a hole, which is not (Principle 3).
//
// (prev) Version 0.20.1 — repin to config 1.2.0 (it now carries CALENDAR_ROBOT).
// (prev) Version 0.20.0 — item 7 support. nextPollAt is now a NUMBER (0 = never
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

import { FIREBASE_CONFIG } from "./config.js?v=1.2.0";

export const STORE_VERSION = "0.21.2";

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
/** The board this user's own key opens — users/{me}.homeWorkspaceId. The
 *  merge rule below needs to know when you are standing in your own house. */
let HOME_WS = null;
/** E7 — this user's cross-workspace tier ordering: "wsId:tierId" -> rank.
 *  The ONLY place a user's opinion about tier order lives. Kept live by
 *  subscribeMyProfile so a change on one device reorders the other. */
let TIER_RANKS = {};

/** The workspace every subscription and write below is scoped to. */
export function activeWorkspaceId() { return ACTIVE_WS; }
/** The signed-in user's lowercased email — the id used for users/ and members/. */
export function currentEmail() { return ME; }
/** This user's own board, regardless of which one they are looking at. */
export function homeWorkspaceId() { return HOME_WS; }

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
  // The old board's member list is not the new board's, and the merge rule
  // reads it. Clearing rather than keeping means the first paint of a new
  // board merges too LITTLE and then grows, which is the safe direction:
  // showing somebody else's tier for a beat is the failure mode worth
  // avoiding (subscribeBoard's own comment makes the same argument).
  _activeMembers = new Set();
  refreshMerge();
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

// ============================================================
// THE MERGE SET (item 5)
//
// ⚠️ THE RULE IS JAKE'S AND IT IS NOT THE OBVIOUS ONE. The first design
// said shared tiers merge into your HOME board only, so visiting somebody
// meant seeing strictly their world. He corrected it, and the correction is
// better:
//
//   "If I'm sharing with a colleague and [I'm] in her house, then I won't
//    see that tier — I'm in her house, after all — but I don't want OUR
//    shared tier to disappear just because I'm in her house."
//
// So: A SHARED TIER FOLLOWS YOU INTO A HOUSE WHERE SOMEBODY WHO LIVES THERE
// ALSO HOLDS A KEY TO IT. In Katie's house, Family merges (she is in it) and
// the school tier you share with a colleague does not (she is not). In your
// own house everything you hold merges, including things nobody else on your
// board can see — which is why "my own house" is a separate arm of the test
// rather than a special case of it.
//
// Every input to this is readable: you may list the members of any workspace
// you are a member of (rules: `match /members/{email} { allow read: if
// canRead(wsId) }`), and both workspaces qualify — the shared one and the one
// you are looking at. Nothing here needs a rules change.
// ============================================================

/** Shared workspaces this user holds a key to: wsId -> {doc, members:Set}. */
const _shared = new Map();
/** Emails holding a key to the board currently being VIEWED. */
let _activeMembers = new Set();
/** Who the board being viewed BELONGS to, and who LIVES in it. On a personal
 *  board those are the same person; on a dependent board (E32) they are not,
 *  and it is the resident's day you are looking at, not the deed-holder's. */
let _activeOwner = null;
let _activeMinor = null;
/** The workspaces every subscription below currently fans out across. */
let MERGE = [];

function mergeSet() {
  const out = [ACTIVE_WS];
  if (!ACTIVE_WS) return out;
  const atHome = ACTIVE_WS === HOME_WS;
  for (const [wsId, s] of _shared) {
    if (wsId === ACTIVE_WS || s.hidden) continue;
    // In my own house: everything I hold.
    // Anywhere else: only what somebody who lives HERE also holds.
    const shares = atHome || [..._activeMembers].some(e => e !== ME && s.members.has(e));
    if (shares) out.push(wsId);
  }
  return out;
}

/** Recompute the merge set; rebind every live fan-out if it actually moved. */
function refreshMerge() {
  const next = mergeSet();
  if (next.length === MERGE.length && next.every((w, i) => w === MERGE[i])) return false;
  MERGE = next;
  for (const f of _fanouts) f.bind();
  return true;
}

/** The boards currently merged into the view. Exposed for the version
 *  tooltip and for diagnostics; nothing in app.js needs to act on it. */
export function mergedWorkspaceIds() { return [...MERGE]; }

// ---------- Which board does this document live on? ----------
// Populated by the merged snapshots themselves, so it is always a fact
// rather than a guess.
//
// ⚠️ NEVER PRUNED, DELIBERATELY. When a document is deleted its snapshot
// drops out, but restoreDoc (D116's undo) resurrects it AT ITS ORIGINAL ID
// and has to put it back on the board it came from. An entry that vanished
// with the document would send the resurrection to the active board instead
// — silently, and only for shared tiers, which is the worst kind of bug to
// go looking for. The map is a tombstone register; that is its job.
const _where = {
  tiers: new Map(), tasks: new Map(), projects: new Map(),
  sessions: new Map(), eventsCache: new Map()
};
function noteWhere(coll, id, wsId) { _where[coll]?.set(id, wsId); }
/** The board a document lives on, or the active board if we've never seen it
 *  (a brand-new document, or one created in this same tick). */
function wsOf(coll, id) { return _where[coll]?.get(id) || ws(); }

const colIn = (wsId, name) => collection(db, "workspaces", wsId, name);
/** A routed document reference: the id decides the board, not ACTIVE_WS. */
const docIn = (coll, id) => doc(db, "workspaces", wsOf(coll, id), coll, id);
/** The board a TIER lives on — the resolver for anything created against a
 *  tier (tasks, projects), which is what makes a shared tier hold its own. */
const wsOfTier = tierId => _where.tiers.get(tierId) || ws();

// ---------- Fan-out ----------
// One logical subscription, N Firestore listeners, one merged emit. The
// shape is subscribeTasks's own trick from 0.17.0 (two listeners, one
// composite unsub) raised one dimension.
const _fanouts = new Set();

/**
 * @param coll   which ownership map to stamp
 * @param build  (wsId, rows => void) => unsub[]   — listeners for ONE board
 * @param emit   (mergedRows) => void
 */
function fanout(coll, build, emit) {
  let unsubs = [];
  const buckets = new Map();
  const flush = () => {
    const byId = new Map();
    for (const wsId of MERGE) for (const r of (buckets.get(wsId) || [])) byId.set(r.id, r);
    emit([...byId.values()]);
  };
  const bind = () => {
    unsubs.forEach(u => u());
    unsubs = [];
    buckets.clear();
    for (const wsId of MERGE) {
      if (!wsId) continue;
      unsubs.push(...build(wsId, rows => {
        for (const r of rows) noteWhere(coll, r.id, wsId);
        buckets.set(wsId, rows);
        flush();
      }));
    }
    flush();
  };
  const entry = { bind, flush };
  _fanouts.add(entry);
  bind();
  return () => { _fanouts.delete(entry); unsubs.forEach(u => u()); };
}

/** Re-emit from the buckets already held, without touching any listener.
 *  A change of WHOSE ORDER we are showing changes no document — it changes
 *  how the same documents are sorted — so rebinding would be a round trip to
 *  Firestore to learn nothing. */
function renotifyAll() { for (const f of _fanouts) f.flush(); }

/**
 * ⚠️ WHOSE DAY AM I LOOKING AT? Jake, 2026-07-28: "Visiting her should give
 * me a taste of EXACTLY what she looks at — zero differences. Otherwise I
 * wouldn't have an honest picture of her load."
 *
 * On your own board that is you. On somebody else's it is the person who
 * LIVES there, which is not always the person who holds the deed: a
 * dependent board (E32) is owned by a parent and inhabited by a child, and
 * it is the child's ordering that makes his board honest. The minor flag is
 * already the marker for exactly that relationship, so it is read first.
 */
function viewerEmail() {
  if (!ACTIVE_WS || ACTIVE_WS === HOME_WS) return ME;
  return _activeMinor || _activeOwner || ME;
}

/** onSnapshot with an error handler that says something actionable. Every
 *  fanned-out listener uses it, because a merged view that silently loses
 *  one board looks like missing data rather than a failure (0.19.2's lesson,
 *  which was exactly this shape one level down). */
function watchCol(ref, cb, label) {
  return onSnapshot(ref, cb, err => {
    console.error(`[store] the ${label} listener failed on a merged board:`, err);
  });
}

// ---------- Auth + workspace bootstrap ----------

/**
 * E17 — "signed in with nowhere to go" is a REAL SCREEN, not silence.
 * 1.x signed non-allowlisted users straight back out, which is what Nico got:
 * the login screen again, and the only explanation in a console he would never
 * open. So watchAuth now has a THIRD callback. onBlocked(reason, user, err)
 * fires with reason "unverified" or "error"; app.js draws a sentence for each.
 * Passing it is optional so the signature stays backward-compatible (E30).
 */
/** Everything the previous signed-in user left behind. Sign-out on a shared
 *  device is the ONLY place two accounts meet in one page, and a stale
 *  ownership map would route the second person's writes onto the first
 *  person's boards. Cheap to clear, expensive to have missed. */
function resetMergeState() {
  ACTIVE_WS = null; ME = null; HOME_WS = null;
  MERGE = []; _activeMembers = new Set();
  _shared.clear(); _wsCache.clear();
  TIER_RANKS = {};
  for (const m of Object.values(_where)) m.clear();
}

export function watchAuth(onIn, onOut, onBlocked) {
  onAuthStateChanged(auth, async user => {
    if (!user) { resetMergeState(); return onOut(); }
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
      // ⚠️ BEFORE onIn. app.js subscribes the moment this returns, and a
      // fan-out binding against an EMPTY merge set creates no listeners and
      // emits nothing — an app that boots blank and fills in a beat later
      // once some other snapshot happens to refresh the set. Seeding it here
      // means the first bind already has the active board in it.
      refreshMerge();
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

  // HOME_WS and the rank map are read here rather than lazily, because the
  // merge rule (mergeSet) needs to know whether the board being opened is
  // this user's own — and it needs to know it BEFORE the first subscription,
  // or the first paint merges the wrong set and then corrects itself.
  if (usnap.exists()) {
    HOME_WS = usnap.data().homeWorkspaceId || null;
    TIER_RANKS = usnap.data().tierRanks || {};
  }

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
    HOME_WS = dependent.wsId;
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

  HOME_WS = ref.id;
  return ref.id;
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  // Always draw the chooser. Without this, a device with exactly one Google
  // account signs straight back into it and "Sign out" looks broken.
  provider.setCustomParameters({ prompt: "select_account" });
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
    const seenShared = new Set();
    for (const r of rows) {
      if (!_wsCache.has(r.wsId)) {
        try {
          const w = await getDoc(doc(db, "workspaces", r.wsId));
          if (w.exists()) _wsCache.set(r.wsId, w.data());
        } catch { /* a board we cannot read is a board we do not list */ }
      }
      const w = _wsCache.get(r.wsId);
      if (!w) continue;

      // §6.2 — A SHARED TIER MERGES INTO YOUR QUEUE; A SHARED BOARD IS ONE
      // YOU SWITCH TO. So a kind:"shared" workspace is deliberately NOT a
      // switcher entry: it has no dashboard of its own to visit, it is one
      // tier that turns up inside boards you already use. Listing it would
      // offer a door into a house with one room in it.
      if (w.kind === "shared") {
        seenShared.add(r.wsId);
        trackShared(r.wsId, { ...w, myRole: r.role, hidden: r.hidden });
        continue;
      }
      out.push({ id: r.wsId, ...w, myRole: r.role, hidden: r.hidden, minor: r.minor });
    }
    // A key taken back has to stop merging, not just stop being listed.
    for (const wsId of [..._shared.keys()]) if (!seenShared.has(wsId)) untrackShared(wsId);
    refreshMerge();
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

/**
 * Start (or refresh) watching a shared workspace.
 *
 * The member list is LIVE rather than fetched once, because it is an input
 * to the merge rule: the moment Katie is added to a shared tier, that tier
 * has to start appearing when you visit her board — and the moment she is
 * removed it has to stop. A one-shot read would make that correct only until
 * somebody changed something.
 */
function trackShared(wsId, wsDoc) {
  const prev = _shared.get(wsId);
  if (prev) {
    prev.doc = wsDoc;
    prev.hidden = wsDoc.hidden === true;
    return;
  }
  const entry = {
    doc: wsDoc,
    hidden: wsDoc.hidden === true,
    members: new Set(),
    // email -> { tierId: rank }. EVERY member's ordering of this shared tier,
    // which is the whole reason it is stored here rather than only on the
    // user profile: users/{email} is readable by nobody but its owner, so a
    // rank kept only there can never make a VISITED board honest. A member
    // row is readable by everyone who holds a key to the same workspace, and
    // writable only by its own subject — the rules already say so, and no
    // clause had to change.
    ranks: new Map(),
    unsub: null
  };
  _shared.set(wsId, entry);
  entry.unsub = watchCol(colIn(wsId, "members"), snap => {
    entry.members = new Set(snap.docs.map(d => d.id));
    entry.ranks = new Map(snap.docs.map(d => [d.id, d.data().tierRanks || {}]));
    refreshMerge();
    renotifyAll();     // membership did not have to move for an ORDER to
  }, `shared board ${wsId} member`);
}

function untrackShared(wsId) {
  const e = _shared.get(wsId);
  if (!e) return;
  if (e.unsub) e.unsub();
  _shared.delete(wsId);
}

/** Every shared tier this user holds a key to, for the sharing UI. Carries
 *  the merge verdict so the tier editor can say "shared, and showing here"
 *  versus "shared, and not on this board" without recomputing the rule. */
export function sharedWorkspaces() {
  return [..._shared.entries()].map(([id, e]) => ({
    id,
    ...e.doc,
    members: [...e.members],
    merged: MERGE.includes(id)
  }));
}

/** The board currently being viewed: name, colour, kind, ownerEmail. */
export function subscribeWorkspaceDoc(cb) {
  return onSnapshot(wsRef(), snap => {
    const w = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    _activeOwner = (w?.ownerEmail || "").toLowerCase() || null;
    renotifyAll();     // whose order we show may have just changed
    cb(w);
  });
}

/** Who else holds a key to the board being viewed.
 *
 *  Doubles as the merge rule's second input — "somebody who lives HERE" is
 *  exactly this list. Deliberately the same listener rather than a private
 *  one beside it: two subscriptions to the same query is two things that can
 *  disagree about who is in the room. */
export function subscribeMembers(cb) {
  return watchCol(col("members"), snap => {
    _activeMembers = new Set(snap.docs.map(d => d.id));
    _activeMinor = snap.docs.find(d => d.data().minor === true)?.id || null;
    refreshMerge();
    renotifyAll();
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, "member");
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

// ============================================================
// SHARE A TIER / TAKE IT BACK  (E6, E8, item 5)
//
// E6: "a shared tier is a small shared workspace." There is no per-tier
// permission anywhere and there must not be — E1 makes isolation a property
// of the PATH, and a tier that stayed on your board while somebody else read
// it would be a field-level boundary wearing a path-level app's clothes.
//
// So sharing MOVES the tier and everything pointing at it into a workspace
// of its own, and both people hold keys to that workspace. Unsharing moves
// it back. One mechanism, two directions, same as houses and keys.
//
// ⚠️ THREE PROPERTIES THIS DEPENDS ON. Change any of them and re-read this.
//
//   1. DOCUMENT IDS ARE PRESERVED. Not cosmetic: parentTaskId chains,
//      projectId references and the sessions ledger all point BY ID, and the
//      merged view keys by id too. A move that reassigned ids would sever
//      every follow-up chain in the tier and silently orphan its time.
//      setDoc-at-a-known-id is already proven here — it is what restoreDoc
//      has done since D116.
//
//   2. COPY, VERIFY, THEN DELETE. Never the other order. A failure part-way
//      leaves DUPLICATES, which are recoverable and — because the merged
//      view keys by id — not even visible. A delete-first failure leaves a
//      HOLE, which is not recoverable and is exactly what Principle 3 says
//      must never happen.
//
//   3. UNSHARE IS ALSO THE REPAIR TOOL. If a share dies half-way, the
//      originals are still on your board and a half-populated shared
//      workspace exists; unshareTier brings back whatever made it across and
//      removes the workspace. That is the whole reason it ships in the same
//      increment rather than "later".
//
// eventsCache is NOT moved: it is a cache the hourly poll rebuilds from the
// tier's own gcalCalendarId, so the entries are deleted from the source and
// regenerate on the other side within the hour. Moving a cache is how a
// cache becomes a second source of truth.
// ============================================================

const BATCH_LIMIT = 400;   // Firestore's hard limit is 500; leave headroom.

/** Commit an array of {ref, data} as create-writes, in bounded batches. */
async function writeAll(items) {
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const it of items.slice(i, i + BATCH_LIMIT)) batch.set(it.ref, it.data);
    await batch.commit();
  }
}

/** Delete an array of refs, in bounded batches. */
async function deleteAll(refs) {
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref);
    await batch.commit();
  }
}

/** Everything that travels with a tier, read from one board. */
async function collectTier(wsId, tierId) {
  const [tierSnap, taskSnap, projSnap, sessSnap, evSnap] = await Promise.all([
    getDoc(doc(db, "workspaces", wsId, "tiers", tierId)),
    getDocs(query(colIn(wsId, "tasks"), where("tierId", "==", tierId))),
    getDocs(query(colIn(wsId, "projects"), where("tierId", "==", tierId))),
    getDocs(colIn(wsId, "sessions")),
    getDocs(query(colIn(wsId, "eventsCache"), where("tierId", "==", tierId)))
  ]);
  const projectIds = new Set(projSnap.docs.map(d => d.id));
  // Sessions are matched client-side rather than by an `in` query: the whole
  // collection is small (§5c), and `in` caps at 30 values, so a project-heavy
  // tier would have needed chunking for no benefit.
  const sessions = sessSnap.docs.filter(d => projectIds.has(d.data().projectId));
  return { tier: tierSnap, tasks: taskSnap.docs, projects: projSnap.docs, sessions, events: evSnap.docs };
}

/** Move a tier and its contents from one board to another, ids intact. */
async function moveTier(fromWs, toWs, tierId, tierPatch = {}) {
  const got = await collectTier(fromWs, tierId);
  if (!got.tier.exists()) throw new Error("that tier no longer exists");

  const writes = [
    { ref: doc(db, "workspaces", toWs, "tiers", tierId), data: { ...got.tier.data(), ...tierPatch } },
    ...got.tasks.map(d => ({ ref: doc(db, "workspaces", toWs, "tasks", d.id), data: d.data() })),
    ...got.projects.map(d => ({ ref: doc(db, "workspaces", toWs, "projects", d.id), data: d.data() })),
    ...got.sessions.map(d => ({ ref: doc(db, "workspaces", toWs, "sessions", d.id), data: d.data() }))
  ];
  await writeAll(writes);

  // VERIFY BEFORE DELETING. Counting the destination is a weak check and an
  // honest one: it proves the writes landed and were not silently refused,
  // which is the failure this ordering exists to survive.
  const landed = await collectTier(toWs, tierId);
  const expected = 1 + got.tasks.length + got.projects.length + got.sessions.length;
  const actual = (landed.tier.exists() ? 1 : 0) + landed.tasks.length
               + landed.projects.length + landed.sessions.length;
  if (actual < expected) {
    throw new Error(
      `only ${actual} of ${expected} documents arrived — NOTHING has been deleted, ` +
      `so your tier is still where it was. Undo the share to clear up.`);
  }

  try {
    await deleteAll([
      ...got.sessions.map(d => d.ref),
      ...got.projects.map(d => d.ref),
      ...got.tasks.map(d => d.ref),
      ...got.events.map(d => d.ref),        // a cache; the poll rebuilds it
      got.tier.ref
    ]);
  } catch (err) {
    // The copies landed and the originals could not be removed — almost
    // always because the mover is a helper on the source board, which the
    // rules let create but not delete. Nothing is LOST, and the merged view
    // keys by id so it does not even look doubled. Say what state it is in
    // and name the way out, rather than surfacing a bare permission error
    // after a successful copy, which reads like the whole thing failed.
    console.error("[store] copied, but could not clear the originals:", err);
    throw new Error(
      "The tier was copied but the originals could not be removed — you may " +
      "not have permission to delete on that board. Nothing was lost. Undo " +
      "the share to put it back exactly as it was.");
  }

  // The ownership map is a fact about where documents live, and they have
  // just moved. Writes queued between here and the next snapshot would
  // otherwise be aimed at a board that no longer holds them.
  noteWhere("tiers", tierId, toWs);
  for (const d of got.tasks) noteWhere("tasks", d.id, toWs);
  for (const d of got.projects) noteWhere("projects", d.id, toWs);
  for (const d of got.sessions) noteWhere("sessions", d.id, toWs);
  return expected;
}

/**
 * Share a tier: lift it into a workspace of its own and hand out keys.
 *
 * E8 — NO ROLE PICKER, and it writes `editor`. Jake: "It's my damn app. If
 * you're going to look at one another's shit, then you should share in the
 * work that goes into it." The `role` field is still stored, so the door
 * exists in the data if a viewer-only tier is ever wanted; it is simply not
 * drawn on the wall. Note that editor is SAFE here in a way it is not on a
 * whole board: the only gcalCalendarId an editor can repoint is this one
 * tier's, because that is the only tier in the workspace.
 */
export async function shareTier(tierId, emails = []) {
  const from = wsOf("tiers", tierId);
  const tierSnap = await getDoc(doc(db, "workspaces", from, "tiers", tierId));
  if (!tierSnap.exists()) throw new Error("that tier no longer exists");
  if (_shared.has(from)) throw new Error("that tier is already shared");

  const now = Date.now();
  const ref = doc(collection(db, "workspaces"));

  // Same load-bearing order as createPersonalWorkspace: the workspace
  // document and the FIRST member document cannot share a batch, because the
  // members rule does get() on a workspace that would not exist yet.
  await setDoc(ref, {
    name: tierSnap.data().name || "Shared",
    kind: "shared",
    ownerEmail: ME,
    createdAt: now, createdBy: ME,
    color: tierSnap.data().color || pickWorkspaceColor(tierId),
    nextPollAt: 0,
    pollIntervalMinutes: 60
  });
  await setDoc(doc(db, "workspaces", ref.id, "members", ME), {
    email: ME, role: "owner", addedBy: ME, addedAt: now,
    displayName: "", hidden: false
  });

  const batch = writeBatch(db);
  for (const raw of emails) {
    const e = String(raw || "").trim().toLowerCase();
    if (!e || e === ME) continue;
    batch.set(doc(db, "workspaces", ref.id, "members", e), {
      email: e, role: "editor", addedBy: ME, addedAt: now,
      displayName: "", hidden: false
    });
  }
  // A shared workspace gets its own settings/config because the hourly
  // function reads carryoverWriteHour and mirrorCalendarId from there. A
  // shared tier that could not carry over would be a quieter tier than the
  // one it replaced, which nobody asked for.
  batch.set(doc(db, "workspaces", ref.id, "settings", "config"), {
    carryoverWriteHour: 9, pollIntervalMinutes: 60,
    sleepStart: 22, sleepEnd: 6, deadlineHour: 16,
    decisionThresholdDays: 2, clearDeckThreshold: 0.6
  });
  await batch.commit();

  const moved = await moveTier(from, ref.id, tierId);
  return { wsId: ref.id, moved };
}

/**
 * Take a shared tier back onto a board you own. The mirror image of the
 * above, and the repair path for a share that failed part-way.
 *
 * The shared workspace document itself is deleted last and only if the move
 * emptied it. A board that still holds something is left standing — deleting
 * a workspace does not cascade to its subcollections, so removing one with
 * documents still inside would orphan them where nothing can ever reach them
 * again. That is the one shape Principle 3 cannot tolerate.
 */
export async function unshareTier(tierId, toWs = null) {
  const from = wsOf("tiers", tierId);
  if (!_shared.has(from)) throw new Error("that tier is not shared");
  const dest = toWs || HOME_WS || ACTIVE_WS;
  if (!dest) throw new Error("no board to bring it back to");
  if (dest === from) throw new Error("a shared tier cannot be brought back to itself");

  const moved = await moveTier(from, dest, tierId);

  const leftovers = await Promise.all(
    ["tiers", "tasks", "projects", "sessions"].map(c => getDocs(colIn(from, c))));
  if (leftovers.every(s => s.empty)) {
    // eventsCache is swept rather than counted. It is a cache the hourly
    // poll writes on its own schedule, so it can appear in a shared board
    // AFTER the tier left — and a workspace document deleted over the top of
    // it would orphan documents at a path nothing can ever reach again.
    // Deleting a workspace does not cascade; that is the one shape
    // Principle 3 cannot tolerate.
    const [members, cached] = await Promise.all([
      getDocs(colIn(from, "members")),
      getDocs(colIn(from, "eventsCache"))
    ]);
    await deleteAll([
      ...cached.docs.map(d => d.ref),
      ...members.docs.map(d => d.ref),
      doc(db, "workspaces", from, "settings", "config"),
      doc(db, "workspaces", from)
    ]);
    untrackShared(from);
    refreshMerge();
  } else {
    console.warn(
      `[store] shared board ${from} still holds documents, so it was left in ` +
      `place rather than orphaning them. Nothing is lost; it simply has no ` +
      `tier in it until you look.`);
  }
  return { movedTo: dest, moved };
}

// ---------- Live subscriptions ----------
// Each returns an unsubscribe function; callback receives an array of
// {id, ...data} (or a single object for config).

/**
 * Tiers, merged across every board in the view, with E7's per-user rank
 * overlaid onto `rank` before app.js sees anything.
 *
 * ⚠️ THE OVERLAY IS WHY app.js DID NOT HAVE TO CHANGE. app.js:6391 writes
 * `.rank`, app.js:2069 reads it to decide whether hiding a tier deserves a
 * confirm, queue.js:486 breaks D43's ties with it, and two <select> builders
 * print it. All five keep working on a field that stopped being a property
 * of the document, because the substitution happens here.
 *
 * WHOSE ORDER YOU SEE, stated plainly because it is a real limitation and
 * not a bug to be found later:
 *
 *   · ON YOUR OWN BOARD your tierRanks order everything — your tiers and
 *     every shared tier merged into the view. That is E7 and it is the half
 *     Jake asked for ("I'll see it at my priority in my house").
 *   · VISITING SOMEBODY ELSE'S BOARD you see DOCUMENT ranks. Not a choice:
 *     `users/{email}` is `allow read, write: if signedIn() && email == me()`,
 *     so Katie's ordering is unreadable to anyone but Katie, correctly. The
 *     honest approximation is the tier document's own rank — and because
 *     saveTier writes rank back to the document wherever the writer has
 *     setup rights, that value tracks the board owner's opinion on their own
 *     board. Visiting Katie shows Katie's order because Katie set it.
 *
 * A tier absent from the map keeps its document rank rather than sorting to
 * zero, so a newly shared tier lands where its owner put it instead of
 * silently claiming the top of your day (§4.2).
 */
export function subscribeTiers(cb) {
  return fanout("tiers",
    (wsId, push) => [watchCol(colIn(wsId, "tiers"), snap =>
      push(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        wsId,                                   // which house this tier is in
        shared: _shared.has(wsId)               // …and whether that house is shared
      }))), "tier")],
    tiers => {
      const viewer = viewerEmail();
      const ranked = tiers.map(t => {
        const r = rankFor(t, viewer);
        return (r == null) ? t : { ...t, rank: r };
      });
      ranked.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
      cb(ranked);
    });
}

/**
 * The one function that answers "what number does this tier wear right now."
 * Everything about whose day you are looking at is decided here.
 *
 *   YOUR OWN BOARD — your profile map, for every tier in the view, yours and
 *   shared alike. That is E7.
 *
 *   VISITING — the RESIDENT's ordering, so the board is an honest picture of
 *   their load and not a picture of yours:
 *     · their own tiers already carry it, because the tier document's rank is
 *       written by whoever has setup rights and on a personal board that is
 *       one person;
 *     · a SHARED tier does not, because you BOTH write that document and the
 *       last save wins. Their rank comes off their member row in the shared
 *       workspace, which is readable by everyone holding that tier and
 *       writable only by its subject.
 *
 * Falls through to the document rank whenever nobody has expressed an
 * opinion, so a newly shared tier lands where its owner put it rather than
 * silently claiming the top of somebody's day (§4.2).
 */
function rankFor(tier, viewer) {
  if (viewer === ME && ACTIVE_WS === HOME_WS) {
    const mine = TIER_RANKS[`${tier.wsId}:${tier.id}`];
    if (mine != null) return mine;
    return null;
  }
  const shared = _shared.get(tier.wsId);
  if (shared) {
    const theirs = shared.ranks.get(viewer)?.[tier.id];
    if (theirs != null) return theirs;
  }
  return null;   // the document's own rank stands
}

/** E7 — record this user's opinion of where a tier belongs in THEIR day.
 *  Written to the profile always; mirrored onto the document only where the
 *  writer has setup rights, because the document rank is what a visitor and
 *  a brand-new member see. One authority, one documented fallback. */
/**
 * Mirror this user's rank for a SHARED tier onto their own member row, so
 * that somebody visiting their board sees their number rather than whoever
 * saved the tier document last.
 *
 * A mirror, not a second authority — the same shape saveConfig already uses
 * to put pollIntervalMinutes where the poll can query it. The profile map
 * stays the truth for YOUR view; this copy exists purely to be READ BY
 * SOMEBODY ELSE, which is a thing the profile map can never be.
 *
 * Only shared workspaces. On a personal board the tier document's own rank
 * already carries the owner's opinion, because they are the only person who
 * can write it.
 */
async function noteSharedRank(wsId, tierId, rank) {
  if (!ME || rank == null || !_shared.has(wsId)) return;
  try {
    await updateDoc(doc(db, "workspaces", wsId, "members", ME),
      { [`tierRanks.${tierId}`]: rank });
  } catch (err) {
    // Never fatal: your own ordering was already saved to your profile above.
    // All that is lost is other people seeing it, on a board you may not
    // have been allowed to write anyway.
    console.warn("[store] could not publish your order for this shared tier:", err);
  }
}

async function noteTierRank(wsId, tierId, rank) {
  if (!ME || rank == null) return;
  const key = `${wsId}:${tierId}`;
  if (TIER_RANKS[key] === rank) return;
  TIER_RANKS[key] = rank;
  try {
    await setDoc(doc(db, "users", ME), { tierRanks: { [key]: rank } }, { merge: true });
  } catch (err) {
    console.warn("[store] could not save your tier order:", err);
  }
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

// ITEM 5: this is now TWO listeners PER MERGED BOARD, still one callback.
// The per-board pair keeps D139's bounded window exactly as it was — the
// window is a property of what a screen can show, not of how many boards
// feed it — and the fan-out merges the pairs.
export function subscribeTasks(cb) {
  _liveFloor = completedWindowFloor();
  return fanout("tasks",
    (wsId, push) => {
      const active = new Map();   // completedAt == null
      const recent = new Map();   // completedAt >= floor
      // Emit the union on every snapshot from either listener. Before BOTH
      // have delivered once we still emit — a half-set for a few ms is no
      // worse than the old single listener's boot, and render() is a
      // snapshot handler that expects to run repeatedly (D101).
      const emit = () => {
        const byId = new Map(recent);                   // recent first…
        for (const [id, t] of active) byId.set(id, t);  // …active wins on the impossible clash
        push([...byId.values()]);
      };
      return [
        watchCol(query(colIn(wsId, "tasks"), where("completedAt", "==", null)), snap => {
          active.clear();
          snap.docs.forEach(d => active.set(d.id, { id: d.id, ...d.data() }));
          emit();
        }, "active task"),
        watchCol(query(colIn(wsId, "tasks"), where("completedAt", ">=", _liveFloor)), snap => {
          recent.clear();
          snap.docs.forEach(d => recent.set(d.id, { id: d.id, ...d.data() }));
          emit();
        }, "recent task")
      ];
    },
    cb);
}

/**
 * D139 — one-shot fetch of completed tasks whose completion falls in
 * [startMs, endMs). Used by the week view when it pages to a week that
 * begins before the live window floor. Billed only when actually called,
 * and the caller caches by week so re-paging is free.
 */
export async function fetchCompletedTasks(startMs, endMs) {
  // ITEM 5 — the deep past is merged too, or a shared tier's history would
  // vanish the moment the week view paged behind the live window. One query
  // per merged board, in parallel; ownership is stamped on the way through
  // so a task fetched from history can still be written to.
  const per = await Promise.all(MERGE.filter(Boolean).map(async wsId => {
    const snap = await getDocs(query(
      colIn(wsId, "tasks"),
      where("completedAt", ">=", startMs),
      where("completedAt", "<", endMs)
    ));
    return snap.docs.map(d => {
      noteWhere("tasks", d.id, wsId);
      return { id: d.id, ...d.data() };
    });
  }));
  return per.flat();
}

export function subscribeEvents(cb) {
  // Phase 1: eventsCache is empty until pollCalendars ships (HANDOFF §5 build
  // order, phase 3). The code path is live so the queue logic never changes.
  return fanout("eventsCache",
    (wsId, push) => [watchCol(colIn(wsId, "eventsCache"), snap =>
      push(snap.docs.map(d => ({ id: d.id, ...d.data() }))), "calendar event")],
    cb);
}

export function subscribeConfig(cb) {
  return onSnapshot(settingsRef("config"), snap => {
    cb(snap.exists() ? snap.data() : null);
  });
}

// ---------- Task CRUD ----------

// ITEM 5 — THE TIER DECIDES THE BOARD. A task typed into the shared Family
// tier has to land in the Family workspace, or it is invisible to the person
// you shared it with and the whole feature is a lie. wsOfTier is the routing
// rule for everything born against a tier.
export async function addTask({ title, tierId, dueAt, escalation, notes = "", projectId = null, estimateMinutes = null, recurrence = null }) {
  return addDoc(colIn(wsOfTier(tierId), "tasks"), {
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
  // The follow-up joins its PARENT, not the active board — a chain split
  // across two workspaces would break rewindFollowUps' single query.
  return addDoc(colIn(wsOf("tasks", parentTaskId), "tasks"), {
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
  const home = wsOf("tasks", taskId);
  await updateDoc(docIn("tasks", taskId), {
    completedAt: done ? now : null,
    completedBy: done ? whoami() : null
  });
  if (!done) return;
  const q = query(colIn(home, "tasks"), where("parentTaskId", "==", taskId));
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
  const snap = await getDoc(docIn("tasks", taskId));
  const t = snap.exists() ? snap.data() : null;
  if (t?.recurrence?.every && !t.spawnedNextAt) {
    const r = t.recurrence;
    const base = (r.anchor === "due" && t.dueAt != null) ? t.dueAt : now;
    await addDoc(colIn(home, "tasks"), {
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
    await updateDoc(docIn("tasks", taskId), { spawnedNextAt: now });
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
  const q = query(colIn(wsOf("tasks", parentTaskId), "tasks"),
                  where("parentTaskId", "==", parentTaskId));
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
  return deleteDoc(docIn("tasks", taskId));
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
  const ref = docIn("tasks", taskId);
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
// D112's ledger follows its projects. A project that moves into a shared
// tier keeps its clocked time, and the Time Report keeps totalling it,
// because the sessions merge alongside the projects they point at.
export function subscribeSessions(cb) {
  return fanout("sessions",
    (wsId, push) => [watchCol(colIn(wsId, "sessions"), snap =>
      push(snap.docs.map(d => ({ id: d.id, ...d.data() }))), "session")],
    cb);
}

/** Close whatever is open at `at`, open projectId at `at` — one commit.
 *  D116: returns everything undo needs — the ids it closed, the id and
 *  body of the session it opened, and the boundary. */
// ⚠️ ITEM 5 — "AT MOST ONE OPEN SESSION" IS NOW A CROSS-BOARD INVARIANT.
// D112's whole guarantee is that clocking into a project closes whatever was
// running, in the same commit, so the 9-project shuffle can never double-run.
// The moment a project can live on a shared board, an open session can too —
// and a query scoped to the active board would have found nothing, opened a
// second session, and quietly billed two projects at once. openSessions()
// sweeps every merged board; writeBatch spans them all in one commit.
async function openSessions() {
  const per = await Promise.all(MERGE.filter(Boolean).map(async wsId => {
    const snap = await getDocs(query(colIn(wsId, "sessions"), where("end", "==", null)));
    snap.docs.forEach(d => noteWhere("sessions", d.id, wsId));
    return snap.docs;
  }));
  return per.flat();
}

export async function clockIn(projectId, at = Date.now()) {
  const open = await openSessions();
  const batch = writeBatch(db);
  const closedIds = [];
  open.forEach(s => { closedIds.push(s.id); batch.update(s.ref, { end: Math.max(at, s.data().start) }); });
  // The ledger follows its project, so a shared project's time is visible to
  // everybody who holds that tier.
  const ref = doc(colIn(wsOf("projects", projectId), "sessions"));
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
  const open = await openSessions();
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
  const open = await openSessions();
  const batch = writeBatch(db);
  const truncatedIds = [];
  open.forEach(s => { if (s.data().start < start) { truncatedIds.push(s.id); batch.update(s.ref, { end: start }); } });
  const ref = doc(colIn(wsOf("projects", projectId), "sessions"));
  const body = {
    projectId, start, end,
    createdBy: whoami(), createdAt: Date.now()
  };
  batch.set(ref, body);
  await batch.commit();
  return { newId: ref.id, body, truncatedIds, start };   // D116
}

export function deleteSession(sessionId) {
  return deleteDoc(docIn("sessions", sessionId));
}

/** D116 — set (or null-out, i.e. reopen) a session's end. Undo machinery. */
export function setSessionEnd(sessionId, end) {
  return updateDoc(docIn("sessions", sessionId), { end });
}

/** D116 — resurrect a deleted doc at its ORIGINAL id, so references
 *  (parentTaskId chains, session ledgers) keep pointing at the truth. */
export function restoreDoc(collName, id, data) {
  // ⚠️ THIS is why _where is never pruned. The document is already gone, so
  // its snapshot has dropped out — and without a tombstone the resurrection
  // would land on the ACTIVE board instead of the one it was deleted from.
  // Undoing a delete on a shared tier would silently move the task to your
  // own board and look, to the other person, like it never came back.
  return setDoc(docIn(collName, id), data);
}

export function subscribeProjects(cb) {
  return fanout("projects",
    (wsId, push) => [watchCol(colIn(wsId, "projects"), snap =>
      push(snap.docs.map(d => ({ id: d.id, ...d.data() }))), "project")],
    projects => {
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
  return addDoc(colIn(wsOfTier(tierId), "projects"), {
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
  return addDoc(colIn(wsOfTier(tierId), "projects"), {
    name, color, startDate, endDate, tierId, workload, stages,
    stretchUntilDone: false, completedAt: null, completedBy: null,   // E9
    createdBy: whoami(),
    createdAt: Date.now()
  });
}

export function deleteProject(projectId) {
  return deleteDoc(docIn("projects", projectId));
}

/** Edit project fields (name, color, tierId, startDate, endDate). Stage
 *  activations are COMPUTED from dates, so moving a project reflows its
 *  pipeline automatically — no stage cleanup needed. */
export function updateProject(projectId, fields) {
  return updateDoc(docIn("projects", projectId), fields);
}

/**
 * Set/unset completion on one stage. Returns the updated stages array so the
 * caller can detect project completion (all stages done) for celebration level 3.
 */
export async function setStageDone(projectId, stageIndex, done) {
  const ref = docIn("projects", projectId);
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
  return updateDoc(docIn("projects", projectId), {
    stages,
    completedAt: allDone ? Date.now() : null,
    completedBy: allDone ? whoami() : null                       // E9
  });
}

export async function setStageDue(projectId, stageIndex, dueAt) {
  const ref = docIn("projects", projectId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const stages = (snap.data().stages || []).map(s => ({ ...s }));
  if (!stages[stageIndex]) return;
  stages[stageIndex].dueAt = dueAt; // null clears
  await updateDoc(ref, { stages });
}

// ---------- Tier CRUD (settings) ----------

/**
 * Save a tier. E7 splits what this used to do in one write:
 *
 *   · `rank` is YOUR opinion and goes to users/{me}.tierRanks.
 *   · everything else is the tier itself and goes to the document.
 *   · `rank` ALSO goes to the document where you have setup rights, because
 *     the document rank is what a VISITOR and a brand-new member see. It is
 *     a documented fallback, not a second authority — see subscribeTiers.
 *
 * A viewer or helper on a shared tier can still reorder it in their own day:
 * the profile write is theirs and the document write is allowed to fail.
 */
export async function saveTier(tierId, data) {
  const { rank, ...rest } = data || {};
  if (!tierId) {
    // Born on the board you are looking at. Sharing it is a separate,
    // deliberate act (shareTier) rather than a property of creation.
    const ref = await addDoc(colIn(ws(), "tiers"), { ...rest, rank });
    noteWhere("tiers", ref.id, ws());
    await noteTierRank(ws(), ref.id, rank);
    return ref;
  }
  const home = wsOf("tiers", tierId);
  await noteTierRank(home, tierId, rank);
  await noteSharedRank(home, tierId, rank);
  try {
    await updateDoc(docIn("tiers", tierId), { ...rest, rank });
  } catch (err) {
    // Expected for a helper/viewer on somebody else's tier. Their own order
    // was already saved above, which is the part that belongs to them.
    console.warn("[store] tier saved to your own ordering only (no setup rights here):", err);
  }
}

export function deleteTier(tierId) {
  return deleteDoc(docIn("tiers", tierId));
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
