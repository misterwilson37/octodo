// ============================================================
// Tentacalendar — celebrate.js
// Version 0.2.0 — THE TICKER TAPE PARADE (D121, Katie's request verbatim:
// "A ticker tape parade!"). Level 3 is rebuilt as a real parade: ~6
// seconds of fluttering paper raining the full width of the glass (new
// "tape" particle — paper physics: terminal velocity, sinusoidal sway,
// tumble-scale flutter), party cannons crossing from the corners, a
// 14-rocket fireworks barrage, Katie's wave (kept — it's hers), and a
// giant gold banner carrying the PROJECT'S NAME (z-index 99: above the
// night face at 98, UNDER the confetti canvas at 100, so the paper falls
// in front of the words — that's what makes it a parade). The banner div
// lives on document.body, outside #drift-wrap, per D37's standing rule.
// celebrate() gains an optional third arg {name} — old two-arg calls are
// untouched. Levels 1 and 2 are deliberately UNCHANGED: the parade is
// big because they stayed small. Particle cap at 1500 so a 4K wall
// never chokes.
// ------------------------------------------------------------
// Version 0.1.1 (adds version export)
// The dopamine engine. celebrate(level):
//   1 = task done (confetti pop)
//   2 = project stage done (double burst + streamers)
//   3 = PROJECT COMPLETE (the parade)
// Variants are randomized so it never gets stale.
// ============================================================

export const CELEBRATE_VERSION = "0.2.0";

let canvas = null, ctx = null, parts = [], raf = null;

const PALETTES = [
  ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#b197fc"], // tier ROYGBIV
  ["#4dd0c4", "#80e8de", "#b2f5ee", "#e6fffa", "#ffd43b"],            // ocean + gold
  ["#ff8787", "#ffc078", "#8ce99a", "#74c0fc", "#e599f7"],            // pastel pop
  ["#ffd700", "#ffec99", "#fff3bf", "#ffffff"]                        // gold rush
];
// The parade's paper mix: every tier color + the gold rush. A ticker tape
// parade is not tasteful; it is everything at once.
const PARADE_MIX = [...PALETTES[0], ...PALETTES[3]];

const MAX_PARTS = 1500; // 4K wall guardrail — spawns past this are skipped

function ensureCanvas() {
  if (canvas) return;
  canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:100;";
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
}
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function spawnBurst(x, y, count, palette, speed = 7) {
  if (parts.length > MAX_PARTS) return;
  for (let i = 0; i < count; i++) {
    const ang = rand(0, Math.PI * 2);
    const v = rand(speed * 0.3, speed);
    parts.push({
      x, y,
      vx: Math.cos(ang) * v,
      vy: Math.sin(ang) * v - 2,
      g: 0.18,
      life: rand(50, 90),
      size: rand(3, 7),
      color: pick(palette),
      shape: pick(["rect", "circle"]),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.25, 0.25)
    });
  }
}

function spawnStreamers(palette) {
  if (parts.length > MAX_PARTS) return;
  for (let i = 0; i < 26; i++) {
    parts.push({
      x: rand(0, canvas.width), y: -10,
      vx: rand(-1, 1), vy: rand(2, 4.5),
      g: 0.02, life: rand(120, 200),
      size: rand(6, 11), color: pick(palette),
      shape: "ribbon", rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3)
    });
  }
}

function spawnRocket(palette) {
  const x = rand(canvas.width * 0.15, canvas.width * 0.85);
  parts.push({
    x, y: canvas.height + 10,
    vx: rand(-0.6, 0.6), vy: rand(-13, -10.5),
    g: 0.16, life: rand(55, 75),
    size: 3.5, color: pick(palette),
    shape: "circle", rocket: true, palette,
    rot: 0, vr: 0
  });
}

/** D121 — ticker tape: long paper strips falling the full width of the
 *  screen. Paper physics, not confetti physics: gravity capped at a
 *  terminal velocity, a per-strip sinusoidal sway, and a tumble rendered
 *  as a width-scale on the strip (the cheap fake of a sheet turning over
 *  in the air). Long lives — a parade is minutes of paper, not a pop. */
function spawnTape(count, palette) {
  if (parts.length > MAX_PARTS) return;
  for (let i = 0; i < count; i++) {
    parts.push({
      x: rand(-20, canvas.width + 20), y: rand(-90, -10),
      vx: rand(-0.4, 0.4), vy: rand(0.8, 2.0),
      g: 0.02, life: rand(380, 560),
      w: rand(4, 8), len: rand(14, 30),
      color: pick(palette), shape: "tape",
      rot: rand(0, Math.PI * 2), vr: rand(-0.12, 0.12),
      phase: rand(0, Math.PI * 2), sway: rand(0.04, 0.11), amp: rand(0.8, 2.4)
    });
  }
}

/** D121 — party cannon: a directional cone burst (angle in canvas space —
 *  y grows DOWNWARD, so "up and to the right" is a negative-sin angle). */
function spawnCone(x, y, angle, spread, count, palette, speed = 11) {
  if (parts.length > MAX_PARTS) return;
  for (let i = 0; i < count; i++) {
    const a = angle + rand(-spread, spread);
    const v = rand(speed * 0.45, speed);
    parts.push({
      x, y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      g: 0.16, life: rand(60, 110),
      size: rand(4, 8), color: pick(palette),
      shape: pick(["rect", "circle", "ribbon"]),
      rot: rand(0, Math.PI * 2), vr: rand(-0.3, 0.3)
    });
  }
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.vy += p.g;
    if (p.shape === "tape") {
      if (p.vy > 2.8) p.vy = 2.8;          // paper terminal velocity
      p.phase += p.sway;
      p.x += p.vx + Math.sin(p.phase) * p.amp * 0.5;
    } else {
      p.x += p.vx;
    }
    p.y += p.vy;
    p.rot += p.vr;
    p.life--;
    if (p.rocket && (p.vy > -1.5 || p.life <= 0)) {
      spawnBurst(p.x, p.y, 55, p.palette, 6);
      parts.splice(i, 1);
      continue;
    }
    if (p.life <= 0 || p.y > canvas.height + 20) {
      parts.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "ribbon") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2.2);
    } else if (p.shape === "tape") {
      // fake the sheet turning over: its apparent width follows the sway
      ctx.scale(Math.max(0.25, Math.abs(Math.sin(p.phase))), 1);
      ctx.fillRect(-p.w / 2, -p.len / 2, p.w, p.len);
    } else {
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : (ctx.clearRect(0, 0, canvas.width, canvas.height), null);
}

function kick() {
  if (!raf) raf = requestAnimationFrame(loop);
}

/** Sweep Katie's wave across the whole screen (CSS-driven). */
function wave() {
  document.body.classList.remove("celebration-wave");
  void document.body.offsetWidth; // restart animation
  document.body.classList.add("celebration-wave");
  setTimeout(() => document.body.classList.remove("celebration-wave"), 2000);
}

/** D121 — the parade banner: the project's name, huge and gold, center
 *  glass. Lives on document.body (OUTSIDE #drift-wrap, D37) at z-index 99
 *  via CSS — above the screen-rest night face (98), UNDER the confetti
 *  canvas (100) so the paper falls in front of the words. Same
 *  remove/reflow/add restart trick as the wave. */
function paradeBanner(text) {
  let el = document.getElementById("parade-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "parade-banner";
    const span = document.createElement("span");
    span.className = "parade-text";
    el.appendChild(span);
    document.body.appendChild(el);
  }
  el.querySelector(".parade-text").textContent = `🎉 ${text} 🎉`;
  el.classList.remove("parade-on");
  void el.offsetWidth; // restart animation
  el.classList.add("parade-on");
  clearTimeout(el._paradeT);
  el._paradeT = setTimeout(() => el.classList.remove("parade-on"), 5400);
}

/**
 * @param {1|2|3} level
 * @param {{x?:number, y?:number}} at  optional origin (e.g., the checkbox that was clicked)
 * @param {{name?:string}} opts        optional — level 3 puts the name on the banner
 */
export function celebrate(level = 1, at = {}, opts = {}) {
  ensureCanvas();
  const palette = pick(PALETTES);
  const x = at.x ?? canvas.width / 2;
  const y = at.y ?? canvas.height / 2;

  if (level === 1) {
    const variant = pick(["pop", "double", "shower"]);
    if (variant === "pop") spawnBurst(x, y, 34, palette);
    else if (variant === "double") { spawnBurst(x, y, 24, palette); setTimeout(() => { spawnBurst(x + rand(-80, 80), y + rand(-60, 20), 24, palette); kick(); }, 140); }
    else { spawnBurst(x, y, 20, palette, 5); spawnStreamers(palette); }
  } else if (level === 2) {
    spawnBurst(x, y, 60, palette, 8);
    spawnStreamers(palette);
    setTimeout(() => { spawnBurst(rand(canvas.width * .2, canvas.width * .8), rand(canvas.height * .2, canvas.height * .5), 45, palette); kick(); }, 200);
  } else {
    // PROJECT COMPLETE — THE TICKER TAPE PARADE (D121). Full send.
    wave();
    paradeBanner(opts.name || "PROJECT COMPLETE!");
    // Opening salvo: party cannons crossing from the bottom corners…
    spawnCone(-10, canvas.height * 0.95, -Math.PI / 3.4, 0.3, 70, pick(PALETTES));
    spawnCone(canvas.width + 10, canvas.height * 0.95, Math.PI + Math.PI / 3.4, 0.3, 70, pick(PALETTES));
    // …and a second, flatter volley from mid-height.
    setTimeout(() => {
      spawnCone(-10, canvas.height * 0.6, -Math.PI / 5, 0.28, 55, pick(PALETTES));
      spawnCone(canvas.width + 10, canvas.height * 0.6, Math.PI + Math.PI / 5, 0.28, 55, pick(PALETTES));
      kick();
    }, 650);
    // Fireworks barrage: 14 rockets across ~4.5 seconds.
    for (let i = 0; i < 14; i++) setTimeout(() => { spawnRocket(pick(PALETTES)); kick(); }, 200 + i * 320);
    // And the tape. Six seconds of paper, the whole width of the glass.
    spawnTape(36, PARADE_MIX);
    const stopAt = Date.now() + 6000;
    const rain = setInterval(() => {
      if (Date.now() > stopAt) { clearInterval(rain); return; }
      spawnTape(20, PARADE_MIX);
      kick();
    }, 220);
    spawnStreamers(palette);
  }
  kick();
}
