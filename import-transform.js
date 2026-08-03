// ============================================================
// Tentacalendar — import-transform.js
// Version 1.0.2 — the 1.x → 2.0 (Octodo) migration transform.
//
// 1.0.2 — the synthesised project type now carries an `id`. Without one it
//         produced a document app.js could not save at all: SAVE-1.
//
// 1.0.1 — COMMENT ONLY; NO CODE CHANGED. The 2026-08-02 audit read
//         defaultAnswers() as dead and had deleted it before a repo-wide
//         re-check found the caller: rules-test/import.test.mjs, which drives
//         this module headlessly and is the one consumer with no DOM. It is
//         restored with a warning on it, because the next reader will run the
//         same grep and reach the same wrong answer. See HANDOFF §0r.
//
// WHY THIS IS A SEPARATE FILE. import.html cannot be tested. It needs a
// browser, a signed-in Google account, and a live Firestore, which means the
// only way to exercise it is to run it for real on the one board that must
// not be got wrong. So everything that DECIDES anything lives here, as pure
// functions over plain objects, and import.html is reduced to a form and a
// batch writer. rules-test/import.test.mjs runs these same functions against
// the emulator with a real export file.
//
// TWO RULES FOR EDITING THIS FILE:
//   1. NOTHING here may touch Firestore, the DOM, or the clock except through
//      the `now` argument. A pure transform is one you can test.
//   2. NEVER write `undefined` into a document. Firestore rejects it, and a
//      1.x export is full of absent fields — five of the task fields are
//      missing on more than half the documents. Every optional field gets an
//      explicit `?? null` or `?? ""`.
//
// WHAT 1.x DOES NOT HAVE, and what this does about it:
//   · ROLES. 1.x has a flat `memberEmails` array; everyone in it is equal.
//     2.0 has owner/editor/helper/viewer. The importer ASKS.
//   · completedBy. 1.x recorded WHEN something was finished, never WHO.
//     Those fields are written as null rather than guessed. store.js 0.22.0
//     is explicit that inventing evidence is worse than recording none, and
//     a two-person board makes "probably the owner" a coin flip.
//   · A NAMED default pipeline. 1.x has one anonymous stageTemplate; 2.0's
//     Pipeline tab is a library of named ones. The importer offers to name it,
//     which is the difference between a usable tab and an empty one.
//   · gcalAuth. 2.0 anchor tiers carry it; 1.x tiers do not. Defaulted to
//     "service" to match SEED_TIERS.
//   · per-user tier ranks (E7). 1.x rank lives on the shared tier document.
//     2.0 ALSO keeps it there, but each person's own ordering lives on their
//     profile under the COMPOSITE key `${wsId}:${tierId}` — not the bare
//     tierId. Getting that key wrong yields an ordering that silently never
//     loads.
//
// WHAT IT DELIBERATELY DOES NOT MIGRATE:
//   · eventsCache. Every document in it is derived from Google Calendar and
//     the poll rebuilds it within the hour. Copying it moves stale events
//     onto a fresh board and makes the first sync ambiguous. Default: skip.
//   · Calendar PERMISSIONS. The export carries calendar IDs; the sharing
//     grant that makes them work lives in Google Calendar, and 2.0 runs under
//     a DIFFERENT service account. No importer can do this. It is the first
//     thing in the post-import checklist and the most likely thing to be
//     forgotten, because the tiers will import perfectly and stay empty.
// ============================================================

export const TRANSFORM_VERSION = "1.0.2";

export const ROLES = ["owner", "editor", "helper", "viewer"];

/** Collections a 1.x export is expected to carry. `settings` is a collection
 *  of three differently-shaped documents, not one document, which is why it
 *  cannot be validated as a single shape. */
export const KNOWN_COLLECTIONS = ["tiers", "tasks", "projects", "sessions", "eventsCache", "settings"];

// ------------------------------------------------------------
// 1. VALIDATE — read the whole file and report everything wrong with it
//    before a single document is written.
//
// This exists because of a smart quote. A 1.x export that has been hand-edited
// to redact client names can arrive with U+201C in place of a quote mark, and
// then JSON.parse dies partway through. An importer that streams would write
// the documents before the break and report success. So: parse everything,
// check everything, write nothing until it is all clean.
// ------------------------------------------------------------

/**
 * @returns {{ok: boolean, errors: string[], warnings: string[], notes: string[],
 *             counts: object, findings: object}}
 */
export function validateExport(data) {
  const errors = [], warnings = [], notes = [];
  const findings = {
    openSessions: [],        // clocked in and never stopped
    orphanSessions: [],      // point at a project that no longer exists
    orphanTasks: [],         // point at a tier that no longer exists
    orphanParents: [],       // parentTaskId chain pointing at a deleted task
    orphanProjects: [],      // point at a tier that no longer exists
    emptyAnchorTiers: [],    // kind:"anchor" with no gcalCalendarId — will never fill
    divergedProjects: 0,     // stage list differs from the template
    unknownCollections: []
  };

  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["That file did not parse as JSON at all."], warnings, notes, counts: {}, findings };
  }
  if (!data.exportVersion) errors.push("No `exportVersion` — this does not look like a Tentacalendar export.");
  if (!data.workspace) errors.push("No `workspace` object.");
  if (!data.collections || typeof data.collections !== "object") errors.push("No `collections` object.");
  if (errors.length) return { ok: false, errors, warnings, notes, counts: {}, findings };

  const C = data.collections;
  const counts = {};
  for (const name of KNOWN_COLLECTIONS) {
    if (!Array.isArray(C[name])) { warnings.push(`Collection \`${name}\` is missing — importing nothing for it.`); counts[name] = 0; }
    else counts[name] = C[name].length;
  }
  for (const name of Object.keys(C)) {
    if (!KNOWN_COLLECTIONS.includes(name)) {
      findings.unknownCollections.push(name);
      warnings.push(`Collection \`${name}\` is not one this importer knows. It will NOT be imported. Nothing is lost from the source — but if it matters, stop and say so.`);
    }
  }

  const tiers = new Map((C.tiers || []).map(t => [t.id, t]));
  const projects = new Map((C.projects || []).map(p => [p.id, p]));
  const tasks = new Map((C.tasks || []).map(t => [t.id, t]));

  // Every document needs an id, or it cannot be written at a stable path and
  // every reference to it breaks.
  for (const name of KNOWN_COLLECTIONS) {
    for (const [i, row] of (C[name] || []).entries()) {
      if (!row || typeof row !== "object") { errors.push(`${name}[${i}] is not an object.`); continue; }
      if (!row.id) errors.push(`${name}[${i}] has no \`id\`.`);
    }
  }

  for (const t of tasks.values()) {
    if (!tiers.has(t.tierId)) findings.orphanTasks.push(t.id);
    if (t.parentTaskId && !tasks.has(t.parentTaskId)) findings.orphanParents.push(t.id);
  }
  for (const p of projects.values()) {
    if (!tiers.has(p.tierId)) findings.orphanProjects.push(p.id);
  }
  for (const s of (C.sessions || [])) {
    if (!projects.has(s.projectId)) findings.orphanSessions.push(s.id);
    if (s.end === null || s.end === undefined) findings.openSessions.push(s.id);
  }
  for (const t of tiers.values()) {
    if (t.kind === "anchor" && !t.gcalCalendarId) findings.emptyAnchorTiers.push(t.id);
  }

  const tmplLen = (C.settings || []).find(s => s.id === "stageTemplate")?.stages?.length ?? null;
  if (tmplLen !== null) {
    findings.divergedProjects = [...projects.values()].filter(p => (p.stages || []).length !== tmplLen).length;
    if (findings.divergedProjects) {
      notes.push(`${findings.divergedProjects} of ${projects.size} projects have a stage list that differs from the template. Those are hand-edits and they travel intact — each project carries its own copy.`);
    }
  }

  const members = data.workspace.memberEmails || [];
  if (!members.length) warnings.push("The source workspace lists no members. Only the signed-in account will get a key.");

  if (findings.openSessions.length) notes.push(`${findings.openSessions.length} clock(s) are still running.`);
  if (findings.orphanSessions.length) notes.push(`${findings.orphanSessions.length} session(s) point at a project that no longer exists.`);
  if (findings.orphanTasks.length) errors.push(`${findings.orphanTasks.length} task(s) point at a tier that no longer exists. They would be invisible on the new board. Fix the source or say to drop them.`);
  if (findings.orphanProjects.length) errors.push(`${findings.orphanProjects.length} project(s) point at a tier that no longer exists.`);

  return { ok: errors.length === 0, errors, warnings, notes, counts, findings };
}

// ------------------------------------------------------------
// 2. THE INTERVIEW — the questions, derived from the file.
//
// Built from the data rather than hardcoded, so this works for the next
// person's export and not only for the one it was written against. A question
// whose condition is absent is not asked: an export with no open clocks never
// sees the open-clock question.
// ------------------------------------------------------------

export function buildInterview(data, signedInEmail, v = null) {
  const val = v || validateExport(data);
  const ws = data.workspace || {};
  const me = (signedInEmail || "").toLowerCase();
  const others = (ws.memberEmails || []).map(e => e.toLowerCase()).filter(e => e !== me);
  const tiers = new Map((data.collections.tiers || []).map(t => [t.id, t]));
  const projects = new Map((data.collections.projects || []).map(p => [p.id, p]));
  const q = [];

  q.push({
    id: "boardName", kind: "text",
    label: "What should this board be called?",
    help: "It is the name in the board switcher. You can rename it later.",
    default: ws.name || "Tentacalendar"
  });

  for (const email of others) {
    q.push({
      id: `role:${email}`, kind: "choice",
      label: `What key should ${email} hold?`,
      help: "1.x had no roles — everyone in the member list was equal, so this has to be decided now. Co-owner can hand out keys and change board settings. Can edit changes the setup. Can help works the lists but cannot change the setup. Can view only looks. ⚠️ Only an owner can write the board document, so anything that touches board settings needs Co-owner.",
      options: [
        { value: "owner",  label: "Co-owner" },
        { value: "editor", label: "Can edit" },
        { value: "helper", label: "Can help" },
        { value: "viewer", label: "Can view" }
      ],
      default: "editor"
    });
  }

  const tmpl = (data.collections.settings || []).find(s => s.id === "stageTemplate");
  if (tmpl?.stages?.length) {
    q.push({
      id: "pipelineName", kind: "text",
      label: `Name your ${tmpl.stages.length}-stage default project layout`,
      help: "1.x had one unnamed default. 2.0 keeps a LIBRARY of named layouts you pick from when starting a project. Naming it here puts yours in the library instead of leaving the Pipeline tab empty. Leave blank to skip — the default still works either way.",
      default: "Default",
      optional: true
    });
  }

  if (val.findings.openSessions.length) {
    const names = val.findings.openSessions
      .map(id => (data.collections.sessions || []).find(s => s.id === id))
      .map(s => projects.get(s?.projectId)?.name || "an unknown project");
    q.push({
      id: "openClocks", kind: "choice",
      label: `${val.findings.openSessions.length} clock(s) are still running — on ${names.join(", ")}. What should happen to them?`,
      help: "Leaving them open means you are still clocked in on the new board, which is truthful if you are. Stopping them closes the session at the moment of import.",
      options: [
        { value: "keep", label: "Leave running" },
        { value: "stop", label: "Stop at import time" }
      ],
      default: "keep"
    });
  }

  if (val.findings.orphanSessions.length) {
    q.push({
      id: "orphanSessions", kind: "choice",
      label: `${val.findings.orphanSessions.length} session(s) point at a project that no longer exists. Import them?`,
      help: "They are unreachable either way — the project they belong to was deleted. Importing them puts time in your log that nothing can display.",
      options: [
        { value: "skip", label: "Skip them (recommended)" },
        { value: "keep", label: "Import anyway" }
      ],
      default: "skip"
    });
  }

  if (val.findings.emptyAnchorTiers.length) {
    const names = val.findings.emptyAnchorTiers.map(id => tiers.get(id)?.name || id);
    q.push({
      id: "emptyAnchors", kind: "choice",
      label: `${names.join(", ")} ${names.length === 1 ? "is a calendar tier" : "are calendar tiers"} with no calendar attached. Keep or convert?`,
      help: "A calendar tier with no calendar id imports fine and then stays permanently empty, because there is nothing for the poll to read. Converting it to an ordinary task tier lets you put tasks in it. Either is reversible in Settings.",
      options: [
        { value: "anchor", label: "Keep as calendar tier" },
        { value: "task",   label: "Convert to task tier" }
      ],
      default: "anchor"
    });
  }

  if ((data.collections.eventsCache || []).length) {
    q.push({
      id: "eventsCache", kind: "choice",
      label: `Import the ${data.collections.eventsCache.length} cached calendar events?`,
      help: "These are not yours — they are a copy of Google Calendar that the hourly poll rebuilds by itself. Skipping means your calendar tiers are empty until the first poll runs, which is also the moment you would find out whether the calendar re-share worked.",
      options: [
        { value: "skip", label: "Skip — let the poll rebuild them (recommended)" },
        { value: "keep", label: "Import the cache too" }
      ],
      default: "skip"
    });
  }

  return q;
}

/**
 * Fill in every default, so a caller can preview without answering anything.
 *
 * ⚠️ NOT DEAD, AND IT LOOKS DEAD. `import.html` never calls this — it renders
 * each question with its default pre-selected and reads the live form back
 * through its own `readAnswers()`. The caller is `rules-test/import.test.mjs`,
 * which drives the whole transform headlessly against the emulator and has no
 * DOM to read. A grep across the app files alone reports zero callers; the
 * 2026-08-02 audit made exactly that mistake and nearly deleted it.
 */
export function defaultAnswers(questions) {
  const a = {};
  for (const q of questions) a[q.id] = q.default;
  return a;
}

// ------------------------------------------------------------
// 3. THE PLAN — turn export + answers into an explicit list of writes.
//
// Returns paths and documents, not Firestore calls, so a test can assert on
// them and a UI can show them before anything happens. import.html's only job
// after this is to commit the list in order.
// ------------------------------------------------------------

const clean = v => (v === undefined ? null : v);

export function buildPlan(data, answers, ctx) {
  const { wsId, me, now } = ctx;
  if (!wsId) throw new Error("buildPlan needs a wsId");
  if (!me) throw new Error("buildPlan needs the signed-in email");
  const owner = me.toLowerCase();
  const C = data.collections;
  const ws = data.workspace || {};
  const writes = [];
  const skipped = { eventsCache: 0, orphanSessions: 0 };
  const config = (C.settings || []).find(s => s.id === "config") || {};

  // -- the board itself. ownerEmail MUST be the signed-in account: the rules
  // lock it at creation and it is the root of every later permission check.
  // createdAt/createdBy are preserved because they are history, not identity.
  writes.push({
    path: [wsId], collection: "workspaces",
    doc: {
      name: answers.boardName || ws.name || "Imported board",
      kind: "personal",
      ownerEmail: owner,
      createdAt: clean(ws.createdAt) ?? now,
      createdBy: clean(ws.createdBy) ?? owner,
      color: "#4dd0c4",
      nextPollAt: 0,                                    // 0 = never polled; first run claims it
      pollIntervalMinutes: Number(config.pollIntervalMinutes) || 60,   // E14/item 7 — the claim query sorts on THIS copy
      importedFrom: clean(data.sourceProject) ?? null,
      importedAt: now
    }
  });

  // -- keys. The owner's own key first; the rules read this document to
  // authorise everything that follows.
  writes.push({ path: [wsId, "members", owner], doc: { email: owner, role: "owner", addedBy: owner, addedAt: now } });
  for (const [k, role] of Object.entries(answers)) {
    if (!k.startsWith("role:")) continue;
    const email = k.slice(5).toLowerCase();
    if (email === owner) continue;
    writes.push({ path: [wsId, "members", email], doc: { email, role, addedBy: owner, addedAt: now } });
  }

  // -- tiers. Ids preserved, because every task, project and cached event
  // references them by id.
  for (const t of (C.tiers || [])) {
    const isEmptyAnchor = t.kind === "anchor" && !t.gcalCalendarId;
    const kind = (isEmptyAnchor && answers.emptyAnchors === "task") ? "task" : t.kind;
    const doc = {
      name: clean(t.name), rank: clean(t.rank), color: clean(t.color),
      kind,
      midnightCarryover: t.midnightCarryover ?? false,
      timeless: t.timeless ?? false,                              // D126 — predates the migration
      allowedDays: t.allowedDays ?? [0, 1, 2, 3, 4, 5, 6],
      gcalCalendarId: t.gcalCalendarId ?? ""
    };
    if (kind === "anchor") {
      doc.defaultLeadWindowMinutes = t.defaultLeadWindowMinutes ?? 30;
      doc.gcalAuth = t.gcalAuth ?? "service";                     // 2.0 field; 1.x has none
    }
    writes.push({ path: [wsId, "tiers", t.id], doc });
  }

  // -- tasks. E9 adds completedBy and assignedTo. completedBy is NULL even on
  // finished tasks: 1.x recorded when, never who, and on a two-person board a
  // guess is a coin flip. store.js 0.22.0 — record evidence, never invent it.
  for (const t of (C.tasks || [])) {
    writes.push({
      path: [wsId, "tasks", t.id],
      doc: {
        title: clean(t.title), tierId: clean(t.tierId),
        dueAt: clean(t.dueAt),
        escalation: t.escalation ?? { every: 1, unit: "hours" },
        notes: t.notes ?? "",
        projectId: t.projectId ?? null,
        estimateMinutes: t.estimateMinutes ?? null,
        recurrence: t.recurrence ?? null,
        spawnedNextAt: t.spawnedNextAt ?? null,
        firstDueAt: t.firstDueAt ?? null,
        rescheduleCount: t.rescheduleCount ?? 0,
        completedAt: t.completedAt ?? null,
        completedBy: null,                       // E9 — unknowable from 1.x
        assignedTo: null,                        // E9/§4.5 — field ships, UI waits (E28)
        parentTaskId: t.parentTaskId ?? null,
        offsetDays: t.offsetDays ?? null,
        mirroredGcalEventId: null,               // the mirror is per-project; re-mirroring is 2.0's job
        createdBy: clean(t.createdBy) ?? owner,
        createdAt: clean(t.createdAt) ?? now
      }
    });
  }

  // -- projects. workload defaults to 2 (one of Katie's 17 predates the field).
  // Each stage gains completedBy, keeping completedAt as recorded.
  for (const p of (C.projects || [])) {
    writes.push({
      path: [wsId, "projects", p.id],
      doc: {
        name: clean(p.name), tierId: clean(p.tierId), color: clean(p.color),
        workload: p.workload ?? 2,                    // legacy fallback
        startDate: p.startDate ?? null,
        endDate: p.endDate ?? null,
        stretchUntilDone: p.stretchUntilDone ?? false,
        completedAt: p.completedAt ?? null,
        completedBy: null,                            // E9
        stages: (p.stages || []).map(s => ({
          name: clean(s.name),
          anchor: s.anchor ?? "start",
          direction: s.direction ?? "none",
          offsetDays: s.offsetDays ?? 0,
          dueAt: s.dueAt ?? null,
          completedAt: s.completedAt ?? null,
          completedBy: null,                          // E9 — per stage
          ...(s.hurrah ? { hurrah: true } : {})       // 🎆 only where it was set
        })),
        createdBy: clean(p.createdBy) ?? owner,
        createdAt: clean(p.createdAt) ?? now
      }
    });
  }

  // -- sessions, honouring the two answers about them.
  const projectIds = new Set((C.projects || []).map(p => p.id));
  for (const s of (C.sessions || [])) {
    const orphan = !projectIds.has(s.projectId);
    if (orphan && answers.orphanSessions !== "keep") { skipped.orphanSessions++; continue; }
    const open = s.end === null || s.end === undefined;
    writes.push({
      path: [wsId, "sessions", s.id],
      doc: {
        projectId: clean(s.projectId),
        start: clean(s.start),
        end: open ? (answers.openClocks === "stop" ? now : null) : clean(s.end),
        createdBy: clean(s.createdBy) ?? owner,
        createdAt: clean(s.createdAt) ?? now
      }
    });
  }

  // -- settings. Three documents, three different shapes.
  const { id: _c, ...cfg } = config;
  writes.push({ path: [wsId, "settings", "config"], doc: cfg });

  const tmpl = (C.settings || []).find(s => s.id === "stageTemplate");
  writes.push({ path: [wsId, "settings", "stageTemplate"], doc: { stages: tmpl?.stages ?? [] } });

  // The named-pipeline question: 1.x's anonymous template becomes an entry in
  // 2.0's library, so the Pipeline tab has something in it on day one.
  const existingTypes = (C.settings || []).find(s => s.id === "projectTypes")?.types ?? [];
  const types = [...existingTypes];
  const name = (answers.pipelineName || "").trim();
  if (name && tmpl?.stages?.length && !types.some(t => t.name === name)) {
    // ⚠️ 1.0.2 — THE `id` IS NOT OPTIONAL AND ITS ABSENCE WAS SAVE-1.
    // Every project type the app mints carries a `pt_…` id. This one did not,
    // and app.js's Settings draft copied `id: undefined` into the document it
    // writes on EVERY settings save — which setDoc refuses outright. Katie hit
    // it on her first hour on 2.0 and it took two days to find, because the
    // failure surfaced in the tier tab and originated here.
    // It was also silently unusable: the New Project selector renders
    // `value="undefined"` and matches nothing when picked.
    // ⚠️ Same format as app.js's newTypeId(). If that changes, change this.
    // (`isDefault` is written for provenance and read by nobody today; app.js
    // drops it on the first save. Left in deliberately as a breadcrumb.)
    const id = "pt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    types.push({ id, name, stages: tmpl.stages, isDefault: true });
  }
  writes.push({ path: [wsId, "settings", "projectTypes"], doc: { types } });

  if (answers.eventsCache === "keep") {
    for (const e of (C.eventsCache || [])) {
      const { id, ...rest } = e;
      writes.push({ path: [wsId, "eventsCache", id], doc: rest });
    }
  } else {
    skipped.eventsCache = (C.eventsCache || []).length;
  }

  // -- the importer's own profile. homeWorkspaceId is what sign-in lands on;
  // tierRanks is E7's per-user ordering, keyed `${wsId}:${tierId}` — NOT the
  // bare tierId. A bare key produces an ordering that never loads and no error.
  const tierRanks = {};
  for (const t of (C.tiers || [])) if (t.rank != null) tierRanks[`${wsId}:${t.id}`] = t.rank;
  writes.push({
    path: ["users", owner], collection: "root",
    doc: { homeWorkspaceId: wsId, tierRanks }, merge: true
  });

  return { writes, skipped, total: writes.length };
}

/** Post-import checklist. Not cosmetic: the calendar re-shares are the only
 *  part of this migration no code can perform, and the tiers import perfectly
 *  whether or not they happen. */
export function postImportChecklist(data, answers) {
  const C = data.collections;
  const config = (C.settings || []).find(s => s.id === "config") || {};
  const out = [];
  const inbound = (C.tiers || []).filter(t => t.gcalCalendarId);
  if (inbound.length) {
    out.push(`Re-share ${inbound.length === 1 ? "the calendar" : `all ${inbound.length} calendars`} feeding your calendar tiers with the NEW project's service account (read access). 2.0 runs under a different service account, so the old grant does not carry over.`);
  }
  if (config.mirrorCalendarId) {
    out.push("Re-share the outbound mirror calendar with the NEW service account, with WRITE access, or nothing will be mirrored to it.");
  }
  if (answers.eventsCache !== "keep") {
    out.push("Your calendar tiers will be EMPTY until the first poll runs. That is expected — and it is also the test of whether the re-share above worked.");
  }
  out.push("Check the version badge, then open Settings and confirm your tiers, their working days, and your project layout came across.");
  if (answers.openClocks === "keep") out.push("You are still clocked in — the running session came across open.");
  return out;
}
