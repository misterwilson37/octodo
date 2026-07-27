// ============================================================
// Tentacalendar — config.js  (2.0 / OCTODO LINE)
// Version 1.0.0 — the only hand-edited file (D26), now with two fewer
// things in it than 1.x had.
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

export const CONFIG_VERSION = "1.0.0";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCLfoNFU0PB38xDIX_l3l47KXjLSgKv2fQ",
  authDomain: "fantasktic-octodo.firebaseapp.com",
  projectId: "fantasktic-octodo",
  storageBucket: "fantasktic-octodo.firebasestorage.app",
  messagingSenderId: "470873844999",
  appId: "1:470873844999:web:3abbbe071b2c87e64529a2"
};
