# Design rules (shadcn/ui look)

The runtime (`templates/tm.css`, `tm.js`) already styles every component like shadcn/ui (zinc theme, new-york-v4): Tabs-style Manual/Auto switch, outline and primary buttons, badges, Slider, Select, RadioGroup-style quiz options, Alert-style callouts, Tooltip glossary terms, lucide icons. Lessons get this for free. These rules keep custom figures and lesson markup consistent with it.

## Colour: tokens only

Use CSS variables in figures and lesson styles, never hex values (except `#fff` text on a filled bar). Both themes then work with no extra code.

| Token | Use for |
|---|---|
| `--ink` | text, outlines of real objects |
| `--muted` | secondary labels, axes, captions |
| `--line` | borders, gridlines, inactive arrows |
| `--soft` | surfaces, bands, zones, empty tracks |
| `--panel` | box fills (cards, nodes) |
| `--primary` / `--primary-fg` | the one main action; filled pills |
| `--accent` / `--accent-soft` | the thing that is moving or active right now (one per figure) |
| `--good` / `--good-soft` | works, OK, passed |
| `--bad` / `--bad-soft` | breaks, ALARM, wrong |
| `--warn` / `--warn-soft` | caution, approximate numbers |

Mix with `color-mix(in oklch, var(--accent) 40%, transparent)` for tints. One accent colour per figure; everything else is zinc.

## Shapes and type in SVG

- Strokes 1.2-1.6 px; corner radius 6-8 for boxes, 3-5 for bars, 999 for pills.
- Flat fills, no gradients or glows. A soft `drop-shadow(0 1px 1px rgb(0 0 0 / .05))` on raised boxes is the most depth allowed.
- Text: classes `lbl` (13 px, medium) and `sub` (11 px, muted). Weights 400-600. Numbers in readouts use `font-variant-numeric: tabular-nums`.
- Labels never overlap lines or other labels: move a value inside its bar (white) when it sits within ~7 % of a threshold line; put line labels where the data is low.

## Icons

Use `tm.icon(name)` (lucide: `play`, `pause`, `prev`, `next`, `reset`, `volume`, `copy`, `sun`, `moon`, `auto`) for any control. No emoji or Unicode glyphs (▶ ↺ 🔊) as buttons.

## Motion

- Easing `var(--ease)` (`cubic-bezier(.4,0,.2,1)`); UI transitions 150-250 ms; figure moves follow the step's `dur`.
- Animate opacity, transform, colour and length. Never animate layout (width of a card, page height).
- Fade things in over at least 0.2 of a step; don't pop them.
- `prefers-reduced-motion` turns off UI animation; figures jump to each step's end state, which must read on its own.

## Layout and copy

- A figure card holds: head (Fig n · title · controls), hint line, stage, chips. Don't add more chrome.
- Chips are `key value` pairs; mark at most one or two `hot` per frame.
- Hints are one or two sentences; bold only the term being taught.
- Check both themes: `?theme=light` and `?theme=dark`.

## Colour layer

Pages are not all white. Colour comes from three places, all automatic:
- **Card tones** by kind: figures blue, code violet, sims cyan, quizzes amber, flashcards emerald. The card head, figure badge, hint bar, step numbers, slider and hot chips take the card's tone. Override with `data-tone="blue|violet|emerald|amber|rose|cyan"` on the mount element when a lesson has a reason (e.g. rose for a failure demo).
- **Dark ink panels** for code, spot-the-bug and `pre`, so each page mixes light cards, black panels and colour.
- **Diagram nodes** are tinted by column; set `tone` on a node or zone to group by meaning instead (e.g. all CloudWatch parts violet, AWS compute blue). The packet is rose.

Mix colours with `color-mix(in oklab, …)`, never `in oklch`: oklch mixes with white or grey swing the hue toward pink.
- Labels that sit over lines, water or bars: add `class="halo"` to the `<text>` for a panel-coloured outline. Never on text over light shapes (it smears in dark mode).

## Width and phones

- Every block in `main.tm` fills the content column (max 960px). Never put a `max-width` on paragraphs, callouts, cards or inner widgets; mismatched widths look broken. `check.ts` fails any top-level block narrower than the column.
- Draw SVG figures at their real size: text 11px or more in viewBox units, and a viewBox width of 560–760. On phones (≤720px) the runtime keeps each `.tm-stage` figure at its drawn size and lets it scroll sideways instead of shrinking. Don't fight this with fixed widths.
- `check.ts` fails if any figure text renders under 9.5px at 1280px or 500px; fix it by raising the font size, not by shrinking the figure.
- Build layouts with flex/grid that wrap; no fixed pixel widths on containers. Check the 500px screenshot every time.
