// ============================================================
// browser-test/fake/firestore.js — Version 1.0.0
//
// An IN-MEMORY FIRESTORE, served in place of gstatic's firebase-firestore.js
// so the real app boots, signs in and writes with no network and no
// emulator. Only the surface store.js imports: doc, collection,
// collectionGroup, query/where (==, in, array-contains, !=), getDoc(s),
// setDoc (merge), addDoc, updateDoc (dotted keys, deleteField), deleteDoc,
// writeBatch, onSnapshot, serverTimestamp.
//
// ⚠️ NOT A RULES TEST. Every write is allowed. rules-test/ is for rules.
// ⚠️ It lives in the PAGE (window.__fs), so a page.reload() empties it.
// ⚠️ It DOES reject `undefined` field values, like the real one — that is
//    SAVE-1's failure mode, and a fake that accepted it would hide the next.
// ============================================================

const store = (window.__fs = window.__fs || new Map());   // path -> data
const listeners = new Set();
let seq = 0;
const autoId = () => "id" + (++seq).toString(36) + Math.random().toString(36).slice(2, 6);
const DELETE = { __delete: true };
export const deleteField = () => DELETE;
export const serverTimestamp = () => Date.now();
export function getFirestore() { return { __db: true }; }

function mkDoc(path) {
  const segs = path.split("/");
  return { __kind: "doc", path, id: segs[segs.length - 1],
    get parent() { return mkCol(segs.slice(0, -1).join("/")); } };
}
function mkCol(path) {
  const segs = path.split("/");
  return { __kind: "col", path, id: segs[segs.length - 1],
    get parent() { return segs.length > 1 ? mkDoc(segs.slice(0, -1).join("/")) : null; } };
}
export function doc(base, ...segs) {
  if (base.__kind === "col") return mkDoc(base.path + "/" + (segs.length ? segs.join("/") : autoId()));
  if (base.__kind === "doc") return mkDoc(base.path + "/" + segs.join("/"));
  return mkDoc(segs.join("/"));
}
export function collection(base, ...segs) {
  if (base.__kind === "doc") return mkCol(base.path + "/" + segs.join("/"));
  return mkCol(segs.join("/"));
}
export function collectionGroup(_db, name) { return { __kind: "group", name }; }
export function where(field, op, value) { return { field, op, value }; }
export function query(ref, ...cons) { return { __kind: "query", ref, cons }; }

const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
function snapDoc(path) {
  const d = store.get(path);
  return { id: path.split("/").pop(), ref: mkDoc(path), exists: () => d !== undefined,
           data: () => clone(d), metadata: { fromCache: false } };
}
function matches(path, q) {
  const segs = path.split("/");
  const r = q.__kind === "query" ? q.ref : q;
  if (r.__kind === "group") { if (segs[segs.length - 2] !== r.name) return false; }
  else if (segs.slice(0, -1).join("/") !== r.path) return false;
  const d = store.get(path);
  for (const c of (q.cons || [])) {
    const v = c.field.split(".").reduce((o, k) => o?.[k], d);
    if (c.op === "==" && v !== c.value) return false;
    if (c.op === "in" && !c.value.includes(v)) return false;
    if (c.op === "array-contains" && !(Array.isArray(v) && v.includes(c.value))) return false;
    if (c.op === "!=" && v === c.value) return false;
  }
  return true;
}
function runQuery(q) {
  const docs = [...store.keys()].filter(p => matches(p, q)).map(snapDoc);
  return { docs, size: docs.length, empty: !docs.length, forEach: f => docs.forEach(f),
           metadata: { fromCache: false }, docChanges: () => [] };
}
export async function getDoc(ref) { return snapDoc(ref.path); }
export async function getDocs(q) { return runQuery(q); }
function notify() { for (const l of listeners) queueMicrotask(l); }
function applyFields(target, fields) {
  for (const [k, v] of Object.entries(fields)) {
    const keys = k.split(".");
    let o = target;
    for (const kk of keys.slice(0, -1)) o = (o[kk] = o[kk] && typeof o[kk] === "object" ? o[kk] : {});
    if (v === DELETE) delete o[keys[keys.length - 1]];
    else o[keys[keys.length - 1]] = clone(v);
  }
}
function checkUndefined(data, where) {
  const walk = (v, p) => {
    if (v === undefined) throw Object.assign(new Error(`Unsupported field value: undefined (${where} ${p})`), { code: "invalid-argument" });
    if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, p + "." + k);
  };
  walk(data, "");
}
function _set(ref, data, opts) {
  checkUndefined(data, ref.path);
  if (opts?.merge && store.has(ref.path)) { const cur = store.get(ref.path); applyFields(cur, data); }
  else { const d = {}; applyFields(d, data); store.set(ref.path, d); }
}
function _update(ref, fields) {
  checkUndefined(fields, ref.path);
  if (!store.has(ref.path)) throw Object.assign(new Error("No document to update: " + ref.path), { code: "not-found" });
  applyFields(store.get(ref.path), fields);
}
export async function setDoc(ref, data, opts) { _set(ref, data, opts); notify(); }
export async function addDoc(col, data) { const r = doc(col); _set(r, data); notify(); return r; }
export async function updateDoc(ref, fields) { _update(ref, fields); notify(); }
export async function deleteDoc(ref) { store.delete(ref.path); notify(); }
export function writeBatch() {
  const ops = [];
  return { set: (r, d, o) => ops.push(() => _set(r, d, o)), update: (r, f) => ops.push(() => _update(r, f)),
           delete: r => ops.push(() => store.delete(r.path)),
           commit: async () => { ops.forEach(f => f()); notify(); } };
}
export function onSnapshot(target, cb, errCb) {
  let last = null;
  const fire = () => {
    try {
      const snap = target.__kind === "doc" ? snapDoc(target.path) : runQuery(target);
      const sig = JSON.stringify(target.__kind === "doc" ? store.get(target.path) ?? null
        : snap.docs.map(d => [d.id, store.get(d.ref.path)]));
      if (sig === last) return;
      last = sig; cb(snap);
    } catch (e) { errCb ? errCb(e) : console.error(e); }
  };
  listeners.add(fire); queueMicrotask(fire);
  return () => listeners.delete(fire);
}
window.__fsNotify = notify;
