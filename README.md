# Teach Me

A Claude Code plugin that turns anything you want to learn into a short lesson you can drive in the browser.

Give it a topic, a tweet thread, a URL, a PDF or book chapter, a code snippet, a YouTube video or a Udemy lecture. You get one standalone HTML page with:

- **Figures you drive**: step buttons that play a process on a drawn machine or diagram, Manual or Auto mode, live numbers from one model, a speed badge when time is sped up or slowed down.
- **Code that runs itself**: a stepper that auto-plays a real trace of the program, line by line, with variables and output, and parameters you can change.
- **Request-flow diagrams** for infra: boxes, zones and arrows with a packet that walks the path (great for AWS, DNS, TLS).
- **Predict first, then see**, scenario questions where wrong answers teach, spot-the-bug, explain-it-back.
- **Flashcards** with spaced repetition, cloze cards, German gender colours and text-to-speech, Anki TSV export.
- **Progress** saved in the browser, with "Copy my progress for Claude" so your agent can coach what you missed.

Every lesson goes through a critic before you see it: quiz hygiene, the code trace must match the real program's output, sources required, and a headless browser pass that scrubs every animation at 0.1 s to catch jumps, plus desktop and narrow screenshots.

## Install

```bash
claude plugin marketplace add NourEldinShobier/teach-me
claude plugin install teach-me@teach-me
```

Needs [Bun](https://bun.sh) for the build and check scripts, and Chrome or Edge for the browser checks (optional).

## Use

| You type | You get |
|---|---|
| `/teach-me:learn` + a pasted tweet thread about `/docs` vs `/docs/` | a 4-minute micro lesson with a live URL resolver and a traced redirect |
| `teach me how closures capture loop variables in Python` | a code trace that auto-plays the real run, then spot-the-bug |
| `/teach-me:learn how does a request reach a private EC2 instance?` | a VPC diagram you can trace, and a sim that breaks a route table |
| `explain how a toilet refills, visually` | a cut-away machine with step buttons and live litres |
| `/teach-me:course` in an empty folder, then "this Udemy AWS course" | a workspace: mission, queue of lectures, one lesson per lecture, records, review deck |
| `/teach-me:course` with an EPUB or PDF, "chapter 4" | a lesson for that chapter; soft-skill books become practice lessons with scenarios |
| `/teach-me:language German A2, at the doctor` | vocabulary with audio and gender colours, cloze drills, roleplay in chat, an error log |

Single lessons land in `~/TeachMe/` with a library page at `~/TeachMe/index.html`. Courses live in the folder you start them in.

## Skills

- **learn**: one lesson from any input. Claude also picks it when you ask to be taught something.
- **course** (`/teach-me:course`): multi-session workspace, compatible with Matt Pocock's `teach` layout (MISSION, RESOURCES, learning records, lessons, reference sheets, glossary), plus a queue for courses and books, and a shared flashcard review page.
- **language** (`/teach-me:language`): language study with placement, themed lessons, production practice and an error log.

## Layout

```
skills/            learn, course, language
references/        pedagogy, routing (input → format → figure), components (runtime API), engines, inputs, language, workspace formats
templates/         tm.css + tm.js (the runtime), shell.html, examples/ (one finished lesson per format)
scripts/           build.ts (inline the runtime, refresh the library), check.ts (the critic)
```

The runtime has no dependencies. Lessons are content plus JSON configs plus, for custom figures, a small pure model; Claude never rewrites the runtime.

## Credits

See [CREDITS.md](CREDITS.md). The pedagogy builds on Matt Pocock's `teach` skill; the machine figures on ideas from wheresryan22's `anatomy`.
