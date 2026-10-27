#!/usr/bin/env bun
// Inline tm.css, tm.js and any data-tm-inline files into one standalone HTML page.
// Usage: bun build.ts <lesson.src.html> [--out <file>] [--library <dir>]
//        bun build.ts --library <dir>        (only rebuild the library index)
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const TEMPLATES = resolve(import.meta.dir, "../templates");
const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const outArg = flag("--out");
const library = flag("--library");
const src = args[0];

function find(ref: string, from: string): string {
  for (const p of [resolve(from, ref), join(TEMPLATES, basename(ref))]) if (existsSync(p)) return p;
  throw new Error(`cannot find ${ref} (looked next to the lesson and in ${TEMPLATES})`);
}

export function build(file: string, out?: string): string {
  const dir = dirname(resolve(file));
  let html = readFileSync(file, "utf8");
  html = html.replace(/<link\b[^>]*\bhref="([^"]+)"[^>]*\bdata-tm-inline[^>]*>/g, (_, href) =>
    `<style>\n${readFileSync(find(href, dir), "utf8")}\n</style>`);
  html = html.replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*\bdata-tm-inline[^>]*>\s*<\/script>/g, (_, s) =>
    `<script>\n${readFileSync(find(s, dir), "utf8").replace(/<\/script/gi, "<\\/script")}\n</script>`);
  if (/data-tm-inline/.test(html)) throw new Error("a data-tm-inline tag was not inlined; use <link href=...> or <script src=...></script>");
  const target = out ?? join(dir, basename(file).replace(/\.src\.html$/, ".html").replace(/^lesson\.html$/, "index.html"));
  if (resolve(target) === resolve(file)) throw new Error("output would overwrite the source; name the source *.src.html or pass --out");
  writeFileSync(target, html);
  return target;
}

const meta = (html: string, name: string) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1] ?? "";
const unesc = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function buildLibrary(root: string): string {
  const rows = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "index.html")))
    .map((d) => {
      const f = join(root, d.name, "index.html"), html = readFileSync(f, "utf8");
      return { href: `${d.name}/index.html`, title: unesc(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? d.name),
        idea: unesc(meta(html, "description")), format: meta(html, "tm-format") || "lesson", mtime: statSync(f).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);
  const css = readFileSync(join(TEMPLATES, "tm.css"), "utf8");
  const cards = rows.map((r) => `<a class="tm-card lib" href="${r.href}"><span class="tm-badge">${esc(r.format)}</span><h3>${esc(r.title)}</h3><p>${esc(r.idea)}</p><small>${new Date(r.mtime).toLocaleDateString()}</small></a>`).join("\n");
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Teach Me Library</title><style>${css}
.lib{display:block;padding:16px 18px;text-decoration:none;color:inherit;margin:0}.lib:hover{border-color:var(--accent)}.lib h3{margin:8px 0 4px}.lib p{margin:0 0 6px;color:var(--muted);font-size:15px}.lib small{color:var(--muted)}
.libgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}</style></head>
<body><main class="tm"><div class="tm-top"><span class="tm-kicker">Teach Me</span><span class="tm-sp"></span><span>${rows.length} lessons</span></div><h1>Library</h1>
<div class="libgrid">${cards || "<p>No lessons yet.</p>"}</div></main></body></html>`;
  const target = join(root, "index.html");
  writeFileSync(target, page);
  return target;
}

if (import.meta.main) {
  try {
    if (src) console.log("built " + build(src, outArg));
    if (library) console.log("library " + buildLibrary(library));
    if (!src && !library) { console.error("usage: bun build.ts <lesson.src.html> [--out file] [--library dir]"); process.exit(2); }
  } catch (e) { console.error("build failed: " + (e as Error).message); process.exit(1); }
}
