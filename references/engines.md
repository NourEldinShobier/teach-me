# Building figures

## Model first, drawing second

For any figure with numbers or motion, write the model as a pure function before drawing anything:

```js
// model(i, p): step index (-1 = rest) and progress 0..1 -> every number the figure shows
const model = (i, p) => {
  const shot = i < 3 ? 0 : i > 3 ? 27 : 27 * p;               // seconds, real time
  return { shot, grams: 36 * clamp((shot - 5.4) / 21.6, 0, 1), bar: i === 3 ? lerp(9, 6, p) : 0 };
};
```

The drawing, the chips and the hint all read `model(i, p)`. Put the numbers' sources in the lesson footer. When you are not sure a number is real, say so in the hint or a callout and name where it came from. Log a one-line self-check in a comment (`// check: shot 27.0 s, first drops 5.4 s, yield 36 g`).

## stepper frames come from a real run

1. Write the exact program shown in the lesson.
2. Run it and capture stdout. That string is `expectStdout`.
3. Produce frames by tracing the real run, not by imagining it:
   - **JavaScript/TypeScript**: copy the program into a scratch file, add a `trace(line, vars)` call after each statement, run it with `bun`, print the frames as JSON.
   - **Python**: run under `sys.settrace` in a scratch script that records `(lineno, f_locals)` for the target frame and captures stdout per line. (Python is fine in the scratch dir; the plugin itself ships none.)
   - **Other languages**: add print-tracing (`TRACE line=… x=…`) to a scratch copy, run it, convert the lines to frames.
4. Keep frames to the lines that teach (≤ 40). Each frame: `line` (1-based in the shown code), `vars` (only the ones that matter), `out` (stdout produced at this step), `note` (one short sentence: what just happened and why).
5. If you hand-write frames (a language you can't run here), set `"hand": true` and still give the program's real output in `expectStdout` if you can run it anywhere; otherwise say in a callout that the trace was not machine-checked.

For live parameter chips, port the program to a JS `tm.trace()` function that emits the same frames, and confirm it reproduces the real run for the default params.

## machine figures (SVG, isometric)

- Draw a real, recognisable object made of many small parts (bolts, gauges, labels, a tray), not a generic box. One bold colour per object, three tones per colour (top lightest, sides darker), dark ink outlines ~1.2 px, short warm shadows. Use `tm.iso(x, y, z)` to place points.
- Cut a window into the part doing the work so cause and result are visible together (the spring and the water in the group head; the packet inside the router).
- Labels light up while their part works. Every dial and label sits on a face nothing else hides.
- Handwritten sound words on actions (`"sound": "psssh"` on a step) are optional and good for kids.
- Size: 40-80 parts by default. Bigger only if the user asks.
- If the `anatomy` skill (wheresryan22/anatomy) is installed, the user may prefer it for a showpiece machine; Teach Me's `scene` is for figures that serve a lesson.
- If the `hairline-create` skill is installed and the user wants a pointer-reactive isometric line figure, use it and embed its HTML with `<iframe srcdoc>` or inline it.

## diagrams for architecture and infra

- The built-in `diagram` covers up to ~12 nodes with a request trace. Use AWS service names as labels with generic shapes; don't ship official icons.
- For bigger architecture maps, sequence diagrams, ERDs or timelines, delegate when installed:
  - `archify`: explorable HTML architecture, sequence, data-flow, ERD and timeline diagrams. Generate it as its own file next to the lesson and link it, or embed with an `<iframe>`.
  - `diagram-design`: editorial SVG diagrams in many types. Inline the SVG in a `.tm-card`.
  - If neither is installed, split the system into two built-in diagrams instead.

## Motion rules

- Moves longer than 1 s are continuous interpolations. Never step through pre-drawn poses.
- `frame(i, p)` is pure. Things that disappear (opacity 0) and reappear elsewhere are cuts, not jumps; anything visible must move smoothly.
- Respect reduced motion: the runtime jumps to each step's end state; make sure end states read on their own.
- A speed badge appears when a step's `seconds` and `dur` differ: a 27 s shot shown in 6.5 s reads ×4; an 800 rpm engine slowed down reads ×1/20.
