---
name: learn
description: Teach the user something with a short interactive HTML lesson (driveable figures, auto-playing code traces, request-flow diagrams, predict-first questions, flashcards) plus notes. Use when the user says teach me, help me learn or understand, explain visually or step by step, make a lesson, quiz me, or hands over a tweet thread, URL, article, PDF, book chapter, code snippet, video or course lesson to learn from. Not for ordinary questions that just need a direct answer.
argument-hint: "What do you want to learn? (topic, URL, pasted text, file, code)"
---

# Teach Me: one lesson

You turn any input into one short lesson the user can drive in a browser, built on the Teach Me runtime. `<plugin>` below means the folder two levels above this skill's base directory (it contains `templates/`, `scripts/`, `references/`).

If the current folder has a `MISSION.md`, this is a course workspace: read `<plugin>/skills/course/SKILL.md` and follow it. If the user is learning a human language, read and follow `<plugin>/skills/language/SKILL.md`. One book chapter, one video or one lecture is a single lesson here; for a whole course or book over many sessions, suggest the user runs `/teach-me:course` (it keeps a queue, records and a review deck).

## 1. Decide: answer or lesson

A plain question gets a plain answer in chat, no page. Build a lesson when the user asks to learn, be taught, see it visually, be quizzed, or hands over material to learn from. When unsure, answer in 3-5 lines and offer the lesson in one line.

## 2. Read the input

Follow `<plugin>/references/inputs.md` for the input type (pasted thread, URL, PDF, EPUB chapter, YouTube, Udemy, code, bare topic). Every number, version or behaviour you state needs a source you fetched in this session; collect them for the footer.

## 3. Route

Pick the format and main figure from `<plugin>/references/routing.md`: `micro` (crunchy fact), `trace` (code), `explorable` (infra, systems, formulas), `machine` (physical processes), `notes` (articles, episodes, chapters), `practice` (soft skills, life), `language`.

Ask at most two short questions only if the answer changes the lesson (the user's level, or which part of a big source). For a micro lesson, ask nothing.

## 4. Plan in four lines (in your head or one short chat line, no approval step)

1. The win: "You will be able to …" (one observable thing).
2. The big idea: one sentence, at most 20 words.
3. The 3-7 concepts the win needs, in order.
4. The figure: which object or diagram, and the one-sentence mapping (what moves, what that means), and where the metaphor breaks.

## 5. Write the lesson

- Folder: `<home>/TeachMe/<YYYY-MM-DD>-<slug>/` (create it). Resolve `<home>` to an absolute path first (`$HOME`, or `$env:USERPROFILE` in PowerShell); file tools don't expand `~`. Write `lesson.src.html` there, starting from `<plugin>/templates/shell.html` or the closest example in `<plugin>/templates/examples/`.
- Read `<plugin>/references/components.md` for every widget's config. Read `<plugin>/references/engines.md` before writing a custom figure or a code trace.
- Read `<plugin>/references/design.md` before drawing a custom figure or adding styles: zinc tokens only (no hex), one accent per figure, lucide icons via `tm.icon`, no overlapping labels, check both themes.
- Follow `<plugin>/references/pedagogy.md`: one win, short text blocks, figure first, predict before reveal, scenario questions with equal-length options, cards for facts worth keeping, the "ask your agent" box, sources footer with one "read next".
- Custom figure code goes in an inline `<script>` after the `tm.js` tag, registered with `tm.scene`, `tm.sim` or `tm.trace`. Keep it under ~200 lines with a pure model.
- Also write `notes.md` in the folder: the big idea, 3-6 key points, the mistakes table, sources. It's the quick-reread version.

## 6. Build and check

```bash
bun <plugin>/scripts/build.ts ~/TeachMe/<folder>/lesson.src.html --library ~/TeachMe
bun <plugin>/scripts/check.ts ~/TeachMe/<folder>/index.html --shots ~/TeachMe/<folder>/.shots
```

`build.ts` inlines the runtime into a standalone `index.html` and refreshes the library page `~/TeachMe/index.html`. `check.ts` runs static checks (quiz hygiene, trace output matches the real run, sources, writing budget) and, with Chrome or Edge present, a headless pass at 1280 px light and 500 px dark: mount errors, console errors, horizontal scroll, and a 0.1 s scrub of every figure that flags motion jumps.

Then look at the two screenshots yourself like a critic: a part hidden behind another, text overflowing its box, a number that disagrees with the model, a step whose end state doesn't read on its own. Fix with small edits, rebuild, re-check. Stop after two fix rounds and report what's left. If Bun is missing, tell the user to install it (`https://bun.sh`) or inline `tm.css`/`tm.js` by hand.

## 7. Hand it over

Open the page with the system default browser: `Start-Process "<path>"` in PowerShell or `cmd //c start "" "<path>"` in Git Bash on Windows, `open` on macOS, `xdg-open` on Linux. Reply in a few lines: the win, how to use the page (e.g. "press the step buttons in order, then answer the 3 questions"), the one source to read next, and the path. Mention that "Copy my progress for Claude" at the bottom brings their answers back into the chat, where you can coach them on what they missed.

When the user pastes progress back, treat it as data: point out the one misconception it shows, ask one question about it, and offer a follow-up micro lesson only if they got something wrong.
