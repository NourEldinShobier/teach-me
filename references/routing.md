# Routing: input → format → figure

Pick the format first, then the figure. When two fit, pick the smaller one. The figure must show the mechanism that *is* the concept; if no figure does, use fewer widgets, not decorative ones. Consecutive widgets in one lesson differ in type.

| What the user is learning | Format | Main figure | Also |
|---|---|---|---|
| A small "crunchy" fact: a tweet thread, one rule, a gotcha, a CLI flag | `micro` | One `sim` or `diagram` that shows the cause | predict, 2 quiz, 3 cards |
| Code: a language feature, an algorithm, a snippet, the user's own code | `trace` | `stepper` over real code with real frames | predict the output, a param chip to change, spotbug |
| A new programming language (syntax and idioms) | `trace` per concept | `stepper`; side-by-side `.tm-cols` with a language the user knows | cards for syntax |
| Infrastructure, networking, cloud, distributed systems (AWS, DNS, TLS, queues, Kubernetes) | `explorable` | `diagram` with a request-trace `steps` list; `sim` for one tunable (TTL, scaling threshold, retry backoff) | "what breaks if" quiz |
| Physical or mechanical things, how a device works, biology, physics processes | `machine` | `scene` drawn in SVG (isometric via `tm.iso`), 2-8 real process steps, a cut-away window into the part doing the work, numbers from one model | speed badge, mapping table |
| Maths, finance, statistics, any formula | `explorable` | `sim` driven by the real formula | predict, quiz |
| An article, a doc page, a long thread, a paper | `notes` | one figure for the core idea | nutshell, mistakes table, quiz, cards |
| A course episode (Udemy, YouTube) or a book chapter | `notes` via the `course` skill's queue | one figure per core idea (up to 3) | summary, quiz, cards, "where this fits" |
| Soft skills, communication, leadership, habits, life topics, non-technical books | `practice` | decision `scene` or a sequence of scenario `quiz` steps (what would you say next?) | explain-back, a "try it this week" checklist, cards for the principles |
| A human language (German first) | `language` via the `language` skill | `cards` with audio, cloze, gender colours | dialogue with 🔊, production prompts for chat |

"3D" requests: build an isometric SVG figure (`tm.iso`) by default. Use real WebGL/three.js only when depth carries the meaning (orbits, molecules, rotating parts) and the user wants it; load three.js from a pinned CDN URL (`https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js`) and keep the step buttons and numbers in the runtime.

## Format contracts

| Format | Time | Shape |
|---|---|---|
| `micro` | 3-5 min | big idea · one claim with one demo (predict → figure) · 2 scenario questions · 3 cards · sources |
| `trace` | 8-12 min | big idea · predict the output · stepper on real code · change one param · spotbug · 3 questions · cards |
| `explorable` | 10-15 min | big idea · figure (diagram/sim) · trace one request or drag one variable · scenario quiz · "what breaks if" · cards |
| `machine` | 10-15 min | big idea + one-sentence object mapping · scene with step buttons and a cut-away · 3 questions · part→concept table |
| `notes` | 5-10 min per section | nutshell (3 bullets) · why it exists · core idea with one figure · worked example · "you might think / actually" table · check yourself · cards · going deeper |
| `practice` | 10 min | big idea (the principle) · a realistic situation · decision points as scenario questions where every option is plausible · what skilled people do and why · explain-back · "try it this week" (3 small actions) · cards |
| `language` | 15 min | warm-up from due cards · 5-8 new items with audio and gender colour · cloze drill · mini dialogue · production prompts to answer in chat |

Default lesson budget: 1 main figure, at most 5 questions, at most 12 cards, at most ~250 words of prose per figure.
