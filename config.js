// ============================================================
// Tentacalendar — config.js  (2.0 / OCTODO LINE)
// Version 1.2.0 — the only hand-edited file (D26). Two fewer things in it
// than 1.x had, and one new one: CALENDAR_ROBOT (E39), the address every
// user shares their Google Calendar with.
//
// WHAT LEFT, AND WHY IT MATTERS:
//
//   ALLOWED_EMAILS is GONE. 1.x kept a two-address allowlist here and a
//   matching pair in firestore.rules, and store.js signed out anyone else.
//   firestore-2.0.rules 1.0.0 removed the allowlist entirely: anyone with a
//   verified Google account may sign in and create their OWN workspace, and
//   what stops them reaching yours is that it is not on their path (E1).
//   Re-adding a client-side list here would be theatre — the browser holds
//   this file, so a list in it protects nothing. The rules are the security.
//
//   WORKSPACE_ID is GONE. D12 built exactly one workspace called "primary"
//   and that was right for two people sharing a life. 2.0 resolves the
//   workspace per user at sign-in (store.js: resolveWorkspace), so there is
//   no longer a constant to be wrong about.
//
// The Firebase block below is an IDENTIFIER, NOT A SECRET. Every browser
// that loads the app downloads it; it has to be public to work at all. Same
// as 1.x (D79 addendum 2). Do not "protect" it by reverting to placeholders
// — that only breaks the deploy.
//
// Values from SETUP-2.0.md Part 4, verified green by smoke.html 2026-07-26.
// ============================================================

export const CONFIG_VERSION = "1.2.0";

// ============================================================
// THE CALENDAR ROBOT (E39) — fill this in after SETUP-PHASE3-2.0 Part 3.
//
// Every user who wants their Google Calendar pulled in shares it with
// this address. It is the Cloud Run service's own service account, and
// it is an ADDRESS YOU SHARE THINGS WITH — not a secret, and not a
// credential. It has to be visible to users or they cannot share with it.
//
// Until it is filled in, the app SAYS SO rather than showing a blank
// box, because a wizard that silently asks you to share with nothing is
// worse than no wizard.
// ============================================================
export const CALENDAR_ROBOT = "470873844999-compute@developer.gserviceaccount.com";


export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLfoNFU0PB38xDIX_l3l47KXjLSgKv2fQ",
  authDomain: "fantasktic-octodo.firebaseapp.com",
  projectId: "fantasktic-octodo",
  storageBucket: "fantasktic-octodo.firebasestorage.app",
  messagingSenderId: "470873844999",
  appId: "1:470873844999:web:3abbbe071b2c87e64529a2"
};
