# Lesson components (runtime API)

A lesson is one HTML file built from `templates/shell.html`. The runtime (`templates/tm.css`, `templates/tm.js`) holds all interactivity, storage and checks. You write content, JSON configs and, for custom figures, a small pure model. Never edit or re-implement the runtime inside a lesson.

Each component is an element with `data-tm="<name>"` whose first child is `<script type="application/json">{…}</script>`. Strings in configs may contain inline HTML (`<code>`, `<b>`). Never put the text `</script>` inside a config; write `&lt;/script&gt;`.

Copy the worked examples in `templates/examples/` before writing from scratch.

Styling follows shadcn/ui and is built in; for figure colours, icons and motion see `design.md`.

## Page frame (static, no JS)

| Markup | Use |
|---|---|
| `<meta name="tm-lesson" content="slug">` | Progress key. Required. |
| `<meta name="tm-format" content="micro">` | Shown in the library. |
| `<meta name="description" content="…">` | The big idea; shown in the library. |
| `.tm-top` with `.tm-kicker` and `button[data-tm-theme]` | Top bar with time estimate and theme toggle. |
| `section.tm-bigidea` | `<strong>The big idea</strong><p>≤20 words</p><p class="tm-win">You will be able to: …</p>` |
| `.tm-callout`, `.tm-callout.tm-warn` | Aside or warning box. |
| `table.tm-table` | Mapping tables, "you might think / actually" mistakes tables. |
| `.tm-cols` | Responsive columns for side-by-side comparisons. |
| `<span class="tm-term" data-def="…">term</span>` | Glossary tooltip on hover and focus. |
| `<span data-say="de-DE">Guten Morgen</span>` | Adds a 🔊 button (Web Speech API, click only, Shift+click slow). Optional `data-say-text`. |
| `.g-m` `.g-f` `.g-n` | German gender colours (der / die / das). |
| `footer.tm-sources` | `<b>Read next:</b>` one primary source, then an `<ol>` of every source. Required. |
| `.tm-reveal[hidden]` right after a `predict` | Unhidden after the learner commits a guess; players inside start. |

## scene: step buttons for any process (machines, flows, timelines)

```html
<div data-tm="scene"><script type="application/json">{
  "name": "espresso", "title": "Pulling a shot", "fig": 1, "mode": "manual",
  "steps": [
    {"label": "Grind 18 g", "hint": "Burrs crush beans into …", "dur": 1.4, "seconds": 8, "sound": "grrrr", "soundAt": {"x": 20, "y": 30}},
    {"label": "Pull the lever", "hint": "…", "dur": 6.5, "seconds": 27, "hold": 0.5}
  ]
}</script></div>
<script>
tm.scene('espresso', {
  setup(stage, { svg, iso, h }) {            // build the drawing once; return refs
    const s = svg('svg', { viewBox: '0 0 600 400', class: 'tm-svg' }, stage);
    const lever = svg('path', { d: '…', class: 'ink', 'data-track': '' }, s);
    return { lever };
  },
  frame(refs, i, p) {                         // PURE: draw state from (step i, progress p 0..1). i = -1 is "at rest".
    const st = model(i, p);                   // one model drives drawing, chips and hints
    refs.lever.setAttribute('transform', `rotate(${st.angle} 300 120)`);
    return { chips: [{ k: 'pressure', v: st.bar.toFixed(1) + ' bar', hot: i === 1 }], hint: undefined, sound: undefined };
  }
});
</script>
```

- `dur` is playback seconds; `seconds` is real-world seconds. The runtime shows a speed badge (×4, ×1/20) computed from both.
- Manual mode (default): only the next step button is live and pulses. Auto mode plays every step on a loop. The choice is remembered.
- `frame` must not keep state between calls: the critic replays any time `t` via `tm.seek(t)` and scrubs at 0.1 s to find jumps. Mark moving parts with `data-track`.
- Interpolate continuously (`tm.lerp`, `tm.ease`) for any move longer than 1 s. Never swap between pre-drawn poses.
- Helpers on `tm`: `svg(tag, attrs, parent)`, `h(tag, attrs, ...kids)`, `iso(x, y, z) → [sx, sy]` (isometric projection), `lerp`, `ease`, `clamp`.
- 2 to 8 steps. Each step is a real process step with a verb label.

## diagram: boxes and arrows with a request trace (infra, networks, data flow)

```json
{"title": "…", "fig": 2,
 "nodes": [{"id": "alb", "label": "Load balancer", "sub": "ALB", "col": 1, "row": 0, "tip": "Two sentences max."}],
 "zones": [{"label": "VPC 10.0.0.0/16", "nodes": ["alb", "ec2a"]}],
 "edges": [{"from": "user", "to": "alb", "label": "HTTPS"}],
 "steps": [{"label": "DNS lookup", "hint": "…", "path": ["user", "dns"], "nodes": ["dns"], "chips": [{"k": "TTL", "v": "300 s"}], "dur": 1.6}]}
```

- Layout is a grid: `col` and `row` are integers, one node per cell. Budget: 9 to 12 nodes, 12 arrows.
- Optional `tone` on a node or zone (`blue violet emerald amber cyan rose`) groups parts by meaning; without it nodes are tinted by column.
- A step's `path` animates a packet along existing edges (either direction). `nodes` lights boxes without a packet.
- Clicking a node shows its `tip`. Without `steps`, the diagram is static and explorable by clicking.
- For many-node architecture or editorial diagrams, delegate (see `engines.md`).

## stepper: auto-playing code with variables and output

```json
{"title": "…", "lang": "python", "code": "total = 0\nfor n in range({{limit}}):\n    total += n\nprint(total)\n",
 "frames": [{"line": 1, "vars": {"total": 0}, "note": "…"}, {"line": 4, "vars": {"total": 3}, "out": "3\n", "note": "…"}],
 "expectStdout": "3\n", "autoplay": true, "stepMs": 900,
 "params": [{"id": "limit", "label": "limit", "value": 3}], "trace": "sumTrace"}
```

- Frames come from running the real program (see `engines.md`), never from imagination. `expectStdout` is the real program's output; the critic fails if the frames' `out` joined together differs.
- `{{name}}` in `code` is replaced with the param value. To let the learner change a param and re-run live, register a JS port of the program that returns frames: `tm.trace('sumTrace', (params) => ({ frames }))`. Keep the port line-for-line faithful and check it against the real run for the default params.
- Plays automatically when scrolled into view (set `"autoplay": false` when a `predict` comes first). Controls: reset, step back, play/pause, step, scrubber, speed. Arrow keys and Space work when the card is focused.
- Up to 40 frames. Changed variables flash.

## sim: one variable, live result

```json
{"name": "ttl", "title": "…", "hint": "Drag the TTL.",
 "inputs": [{"id": "ttl", "label": "TTL", "min": 0, "max": 3600, "step": 60, "value": 300, "unit": "s"},
            {"id": "mode", "label": "Record", "options": ["A", "CNAME"], "value": "A"},
            {"id": "url", "label": "Link", "type": "text", "value": "logo.svg"}]}
```

```js
tm.sim('ttl', {
  setup(stage, { svg }) { /* draw once */ return refs; },
  update(refs, values) { /* pure: values -> drawing */ return { chips: [{ k: 'cache hits', v: '92%' }], hint: '…' }; }
});
```

One variable per sim. The readout names the term the lesson teaches. Prefer real computation (the actual `URL` API, the real formula) over made-up numbers.

## predict and quiz

```json
{"q": "Scenario … what happens?", "options": ["…", "…", "…"], "answer": 1,
 "why": ["why option 0 is wrong", "why option 1 is right", "…"], "explain": "shown after a right answer or the second try",
 "shuffle": true, "reveal": "#optional-selector"}
```

- `quiz`: options are shuffled (stable per question). Wrong answers explain themselves; a second try is allowed; no score is shown.
- `predict`: the learner locks in a guess before seeing the demo; the next `.tm-reveal` (or `reveal` selector) opens and its players start. `answer` may be omitted when any guess is fine.
- Every option has the same word count (the critic fails otherwise) and similar length. No "all/none of the above". Test application: scenarios, debugging, "what happens next", never definitions.

## spotbug

```json
{"q": "This prints 0. Click the line that causes it.", "code": "…", "bug": 3, "why": "…", "wrong": {"1": "This line is fine because …"}}
```

## cards: flashcards with spaced repetition

```json
{"deck": "aws-vpc", "title": "Keep it", "lang": "de-DE",
 "cards": [{"front": "der Hund", "back": "the dog · pl. die Hunde", "note": "masculine", "say": "der Hund", "verified": true},
           {"front": "Ich gehe {{c1::zum}} Arzt.", "back": ""}]}
```

- Flip with click or Space, grade Again/Hard/Good/Easy (keys 1-4). Scheduling is SM-2 style and stored per card in the browser. "Export TSV" downloads an Anki-importable file.
- `{{c1::…}}` makes a cloze card. `lang` adds a 🔊 button on the back.
- German cards need `"verified": true` after checking gender and plural in a dictionary.
- 3 to 12 cards per lesson. One fact per card.

## explain, ask, save

- `explain`: `{"prompt": "Explain why … in two sentences."}` A textarea saved locally with a "Copy for Claude" button. Never graded in the page.
- `ask`: `{"prompts": ["…", "…", "…"]}` Three ready prompts the learner can copy to their agent. Required on every lesson.
- `save`: no config. "Copy my progress for Claude", download progress JSON, reset.

## Test hooks

`?step=N` opens figures at step N, `?auto=0|1` forces the mode, `?theme=dark`, `?reduced=1`, `?check=1` writes a self-report to `#tm-check` (used by `scripts/check.ts`). In the console: `tm.seek(t, playerIndex)`, `tm.scan(playerIndex)` (jump detection), `tm.progress`, `tm.errors`.
