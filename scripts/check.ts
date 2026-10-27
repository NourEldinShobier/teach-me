#!/usr/bin/env bun
// Critic for a built Teach Me lesson. Static checks always; browser checks when Chrome or Edge is found.
// Narrow checks run at 500px: headless Chrome on Windows will not open a narrower window.
// Usage: bun check.ts <lesson.html> [--no-browser] [--shots <dir>]
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const noBrowser = args.includes("--no-browser");
const shotsIdx = args.indexOf("--shots");
const shots = shotsIdx >= 0 ? args[shotsIdx + 1] : undefined;
const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--shots");
if (!file || !existsSync(file)) { console.error("usage: bun check.ts <lesson.html> [--no-browser] [--shots dir]"); process.exit(2); }

const html = readFileSync(file, "utf8");
const problems: string[] = [], warnings: string[] = [], notes: string[] = [];
const err = (m: string) => problems.push(m), warn = (m: string) => warnings.push(m);
const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, "x").trim();
const words = (s: string) => strip(s).split(/\s+/).filter(Boolean).length;

/* ---- page structure ---- */
const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? "";
if (!title) err("missing <title>");
else if (words(title) > 6) warn(`<title> "${title}" is long; use a 2-4 word name`);
const h1 = (html.match(/<h1[\s>]/g) || []).length;
if (h1 !== 1) err(`expected exactly one <h1>, found ${h1}`);
if (!/class="tm-bigidea"/.test(html)) err("missing the big idea block (.tm-bigidea)");
else {
  const idea = html.match(/class="tm-bigidea"[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1] ?? "";
  if (words(idea) > 24) warn(`big idea is ${words(idea)} words; keep it at 20 or fewer`);
}
if (!/<meta name="tm-lesson"/.test(html)) warn('missing <meta name="tm-lesson">; progress keys fall back to the title');
const sources = html.match(/class="tm-sources"[\s\S]*?<\/footer>/)?.[0] ?? "";
if (!sources) err("missing sources footer (.tm-sources)");
else if (!/href="https?:\/\//.test(sources)) err("sources footer has no http(s) link");
if (/data-tm-inline/.test(html)) err("data-tm-inline still present: run build.ts first");
const ALLOW = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net\/npm|unpkg\.com)\/.+@?\d/;
for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="(https?:[^"]+)"/g))
  if (!/<a\b/.test(m[0]) && !ALLOW.test(m[1])) err(`external resource not allowed or not version-pinned: ${m[1]}`);
if (/\son(click|load|input|change)=/i.test(html)) warn("inline event handler attributes found; wire events in scripts");

/* ---- components ---- */
type Cfg = Record<string, any>;
const comps: { kind: string; cfg: Cfg | null }[] = [];
// Only scan the lesson body; inlined runtime code also contains data-tm="..." strings.
const body = (html.match(/<main[\s\S]*<\/main>/)?.[0] ?? html).replace(/<script>[\s\S]*?<\/script>/g, "");
for (const m of body.matchAll(/data-tm="(\w+)"[^>]*>\s*(?:<script type="application\/json">([\s\S]*?)<\/script>)?/g)) {
  let cfg: Cfg | null = {};
  if (m[2] != null) { try { cfg = JSON.parse(m[2]); } catch (e) { err(`${m[1]}: config JSON does not parse (${(e as Error).message})`); cfg = null; } }
  comps.push({ kind: m[1], cfg });
}
const count = (k: string) => comps.filter((c) => c.kind === k).length;
const interactive = comps.filter((c) => !["ask", "save"].includes(c.kind));
if (!interactive.length) err("no interactive component; every lesson needs at least one");
const quizzes = comps.filter((c) => (c.kind === "quiz" || c.kind === "predict") && c.cfg);
if (count("quiz") > 6) warn(`${count("quiz")} quizzes; keep 3 to 5`);
if (!count("ask")) warn('missing the "ask your agent" box (data-tm="ask")');

for (const { kind, cfg } of quizzes) {
  const c = cfg!; const q = strip(c.q ?? "").slice(0, 60);
  if (!Array.isArray(c.options) || c.options.length < 2) { err(`${kind} "${q}": needs 2+ options`); continue; }
  if (kind === "quiz" && (typeof c.answer !== "number" || c.answer < 0 || c.answer >= c.options.length)) err(`quiz "${q}": answer index out of range`);
  const wc = c.options.map(words), cc = c.options.map((o: string) => strip(o).length);
  if (kind === "quiz" && new Set(wc).size > 1) err(`quiz "${q}": options differ in word count (${wc.join("/")}); make them equal`);
  if (kind === "quiz" && Math.max(...cc) > Math.min(...cc) * 1.35 + 4) warn(`quiz "${q}": option lengths ${cc.join("/")} chars differ a lot; the longest often gives the answer away`);
  if (c.options.some((o: string) => /\b(all|none) of the above\b/i.test(o))) err(`${kind} "${q}": no "all/none of the above"`);
  if (kind === "quiz" && (!Array.isArray(c.why) || c.why.filter(Boolean).length < c.options.length)) warn(`quiz "${q}": give every option a "why" so wrong answers teach`);
  if (/\b(what is|define|definition of|which term)\b/i.test(q)) warn(`quiz "${q}": looks like a definition question; test a scenario instead`);
}
for (const { cfg } of comps.filter((c) => c.kind === "stepper" && c.cfg)) {
  const c = cfg!; const lines = String(c.code ?? "").replace(/\n$/, "").split("\n").length;
  if (!c.code) err("stepper: missing code");
  if (c.frames) {
    c.frames.forEach((f: any, i: number) => { if (f.line < 1 || f.line > lines) err(`stepper frame ${i + 1}: line ${f.line} is outside the code (1-${lines})`); });
    if (c.frames.length > 40) warn(`stepper: ${c.frames.length} frames; keep 40 or fewer`);
    if (c.expectStdout != null) {
      const got = c.frames.map((f: any) => f.out ?? "").join("");
      if (got !== c.expectStdout) err(`stepper: frame output ${JSON.stringify(got.slice(0, 80))} does not match expectStdout ${JSON.stringify(String(c.expectStdout).slice(0, 80))}`);
    } else if (!c.hand) warn("stepper: no expectStdout; record the real program's output so the trace can be checked");
  } else if (!c.trace) err("stepper: needs frames or a trace function name");
}
for (const { cfg } of comps.filter((c) => (c.kind === "scene" || c.kind === "diagram") && c.cfg)) {
  const steps = cfg!.steps || [];
  if (steps.length > 8) warn(`${cfg!.title ?? "figure"}: ${steps.length} steps; keep 2-8`);
}
for (const { cfg } of comps.filter((c) => c.kind === "diagram" && c.cfg)) {
  const c = cfg!; const ids = new Set((c.nodes || []).map((n: any) => n.id));
  if ((c.nodes || []).length > 12) warn(`diagram "${c.title}": ${c.nodes.length} nodes; budget is 9-12`);
  for (const e of c.edges || []) if (!ids.has(e.from) || !ids.has(e.to)) err(`diagram "${c.title}": edge ${e.from}->${e.to} names a missing node`);
  for (const s of c.steps || []) for (const id of [...(s.path || []), ...(s.nodes || [])]) if (!ids.has(id)) err(`diagram "${c.title}": step names missing node "${id}"`);
  const cells = new Set<string>();
  for (const n of c.nodes || []) { const k = n.col + "," + n.row; if (cells.has(k)) err(`diagram "${c.title}": two nodes share cell ${k}`); cells.add(k); }
}
for (const { cfg } of comps.filter((c) => c.kind === "cards" && c.cfg)) {
  const c = cfg!;
  if (String(c.lang ?? "").startsWith("de") && c.cards?.some((k: any) => !k.verified)) warn(`cards "${c.deck}": German cards without "verified": true (check gender/plural against a dictionary)`);
}

/* ---- writing budget ---- */
const main = html.match(/<main[\s\S]*<\/main>/)?.[0] ?? html;
const prose = [...main.replace(/<script[\s\S]*?<\/script>/g, "").matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1])).filter((t) => t.length > 40);
for (const p of prose) {
  const sentences = p.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/).filter((s) => s.trim());
  if (sentences.length > 3) warn(`paragraph has ${sentences.length} sentences (max 3): "${p.slice(0, 70)}…"`);
  const long = sentences.find((s) => words(s) > 32);
  if (long) warn(`sentence over 32 words: "${long.slice(0, 70)}…"`);
}
const proseWords = prose.reduce((s, p) => s + words(p), 0);
notes.push(`${interactive.length} interactive components, ${quizzes.length} questions, ${proseWords} words of prose`);
if (proseWords > 220 * Math.max(1, interactive.length)) warn(`${proseWords} words of prose for ${interactive.length} interactive parts; cut text or add a visual`);

/* ---- browser pass: headless Chrome/Edge, runtime self-report via ?check=1 ---- */
const BROWSERS = [
  process.env.TM_BROWSER,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
].filter(Boolean) as string[];
const browser = BROWSERS.find((b) => existsSync(b));

async function run(cmd: string[]) {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const timer = setTimeout(() => p.kill(), 45000);
  const out = await new Response(p.stdout).text(); await p.exited; clearTimeout(timer);
  return out;
}
const base = ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "--allow-file-access-from-files", "--virtual-time-budget=6000"];

if (!noBrowser && browser) {
  const url = pathToFileURL(resolve(file)).href;
  for (const [w, theme] of [[1280, "light"], [500, "dark"]] as const) {
    const dom = await run([browser, ...base, `--window-size=${w},1600`, "--dump-dom", `${url}?check=1&theme=${theme}&auto=0`]);
    const raw = dom.match(/<pre id="tm-check"[^>]*>([\s\S]*?)<\/pre>/)?.[1];
    if (!raw) { err(`browser ${w}px: no self-report (page script crashed or tm.js missing)`); continue; }
    const r = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    if (r.ready < r.components) err(`browser ${w}px: ${r.components - r.ready} of ${r.components} components failed to mount`);
    for (const e of r.errors) err(`browser ${w}px: ${e}`);
    if (r.overflowX) err(`browser ${w}px: horizontal page scroll${r.wide.length ? " (" + r.wide.join(", ") + ")" : ""}`);
    if (w === 1280) {
      for (const s of r.scans) {
        if (s.error) continue;
        for (const j of s.jumps) err(`figure ${s.id}: motion jump at t=${j.t}s (${Math.round(j.d)}px change vs neighbours); make the move continuous`);
        notes.push(`figure ${s.id}: scrubbed ${s.frames} frames, ${s.tracked} tracked parts, ${s.jumps.length} jumps`);
      }
      for (const s of r.stdout) if (s.expect != null && !s.ok) err(`stepper ${s.id}: live trace prints ${JSON.stringify(String(s.got).slice(0, 60))}, expected ${JSON.stringify(String(s.expect).slice(0, 60))}`);
    }
  }
  if (shots) {
    mkdirSync(shots, { recursive: true });
    for (const [name, w, q] of [["desktop-light", 1280, "theme=light"], ["narrow-dark", 500, "theme=dark"]] as const) {
      const out = join(resolve(shots), name + ".png");
      await run([browser, ...base, `--window-size=${w},1800`, `--screenshot=${out}`, `${url}?${q}&auto=0`]);
      notes.push("screenshot " + out);
    }
  }
} else if (!noBrowser) warnings.push("no Chrome or Edge found (set TM_BROWSER); browser checks skipped, do them with a browser tool");

/* ---- report ---- */
for (const n of notes) console.log("·", n);
for (const w of warnings) console.log("warn:", w);
for (const p of problems) console.log("FAIL:", p);
console.log(problems.length ? `check failed: ${problems.length} problem(s), ${warnings.length} warning(s)` : `check passed: 0 problems, ${warnings.length} warning(s)`);
process.exit(problems.length ? 1 : 0);
