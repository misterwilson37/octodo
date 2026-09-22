// ============================================================
// browser-test/harness.mjs — Version 1.0.0
//
// Boots the REAL index.html in headless Chrome with the three Firebase
// modules swapped for fake/ (request interception; CORS header included, or
// Chrome refuses the module). Collects page errors, console errors and every
// alert/confirm/prompt; `answers` queues replies to prompts.
//
// boot({ tz, width, height, mobile }) → { page, close }. Dismisses the
// first-run welcome splash, which otherwise sits over every real click.
// ============================================================

import path from "node:path";
import puppeteer from "puppeteer-core";
import http from "node:http";
import { readFileSync, existsSync, readdirSync } from "node:fs";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.ROOT || path.resolve(HERE, "..");
const MIME = { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]) === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(8765);
function findChrome() {
  const homes = [process.env.HOME, "/home/claude", "/root"].filter(Boolean);
  for (const h of homes) {
    const base = path.join(h, ".cache/puppeteer/chrome");
    if (existsSync(base)) for (const v of readdirSync(base)) {
      const p = path.join(base, v, "chrome-linux64/chrome");
      if (existsSync(p)) return p;
    }
  }
  throw new Error("No Chrome found — set CHROME=/path/to/chrome");
}
export const errors = [];
export const dialogs = [];
export const answers = [];   // queued answers for prompt()/confirm(); default accept
export async function boot({ tz = "America/Chicago", width = 1400, height = 900, mobile = false, seed = null } = {}) {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || findChrome(),
    args: ["--no-sandbox"], env: { ...process.env, TZ: tz } });
  const page = await browser.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile });
  await page.setRequestInterception(true);
  page.on("request", r => {
    const u = r.url();
    const m = /firebasejs\/[\d.]+\/firebase-(app|auth|firestore)\.js/.exec(u);
    if (m) return r.respond({ contentType: "text/javascript", headers: { "Access-Control-Allow-Origin": "*" }, body: readFileSync(path.join(HERE, "fake", `${m[1]}.js`)) });
    if (u.startsWith("http://localhost:8765")) return r.continue();
    return r.respond({ status: 404, body: "" });
  });
  page.on("dialog", async d => { dialogs.push(`${d.type()}: ${d.message()}`); const a = answers.shift();
    if (a === false) await d.dismiss(); else await d.accept(typeof a === "string" ? a : undefined); });
  page.on("pageerror", e => errors.push("PAGEERROR " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE " + m.text()); });
  if (seed) await page.evaluateOnNewDocument(seed);
  await page.goto("http://localhost:8765/index.html", { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 2500));
  if (await page.evaluate(() => !document.querySelector("#welcome-splash")?.hidden)) {
    await page.click("#splash-skip"); await new Promise(r => setTimeout(r, 300));
  }
  return { browser, page, close: async () => { await browser.close(); srv.close(); } };
}
