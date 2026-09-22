// ============================================================
// browser-test/fake/auth.js — Version 1.0.0
//
// Signs in as katie@example.com, email verified, 50ms after load. A fresh
// account each boot: store.js creates the personal board and default tiers
// exactly as it does for a real first sign-in.
// ============================================================

export function getAuth() { return {}; }
export class GoogleAuthProvider { setCustomParameters() {} }
export const signInWithPopup = async () => ({});
export const signOut = async () => {};
export function onAuthStateChanged(_a, cb) {
  setTimeout(() => cb({ email: "katie@example.com", emailVerified: true, displayName: "Katie", uid: "k" }), 50);
  return () => {};
}
