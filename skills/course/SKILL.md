---
name: course
description: Start or continue a multi-session learning workspace in the current folder - a mission, vetted resources, learning records, numbered interactive lessons, reference sheets, a glossary, flashcard review, and a queue for working through a course (Udemy, YouTube playlist) or a book chapter by chapter.
disable-model-invocation: true
argument-hint: "Topic, course URL, book file, or 'next'"
---

# Teach Me: course workspace

The user wants to learn something over many sessions. The current folder is the workspace. Workspace paths resolve from the current folder; `<plugin>` is the folder two levels above this skill's base directory. Lessons use the Teach Me runtime and the `learn` skill's steps 2-6 (`<plugin>/skills/learn/SKILL.md`).

The layout follows Matt Pocock's `teach` skill (MIT), so either tool works in the same folder.

```
MISSION.md            why the user is learning this          <plugin>/references/workspace/MISSION-FORMAT.md
RESOURCES.md          vetted sources: knowledge, communities, gaps   RESOURCES-FORMAT.md
GLOSSARY.md           terms the user has used correctly       GLOSSARY-FORMAT.md
NOTES.md              the user's preferences, your working notes, metaphors already used
learning-records/     0001-slug.md: evidence of what they know   LEARNING-RECORD-FORMAT.md
lessons/              0001-slug.src.html -> 0001-slug.html (+ notes)
reference/            cheat sheets: compressed, printable, revisited often
queue.json            episodes or chapters to work through
review.src.html       all flashcards across lessons, due first
sources/              raw transcripts and chapter text (add to .gitignore)
```

## Every session

1. **Read the state**: `MISSION.md`, `NOTES.md`, the newest learning records, `queue.json`. If there's no `MISSION.md`, interview the user first (why, what success looks like, deadline, current level, constraints) and write it in the format file's shape. Changing the mission later needs the user's confirmation and a learning record.
2. **Resources**: until `RESOURCES.md` has a few high-trust entries, finding them is the priority (official docs, standard textbooks, the course itself, one or two communities for wisdom). Prune ruthlessly.
3. **Warm-up**: open with two retrieval questions in chat from earlier lessons (not today's material). Mention how many flashcards are due and offer `review.html`.
4. **Pick the lesson**: the user's request, else the next `queued` item, else the most useful thing in their zone of proximal development given the records and the mission.
5. **Teach one thing**: build `lessons/NNNN-slug.src.html` (next number), following the `learn` skill steps 2-6, but build into the workspace: `bun <plugin>/scripts/build.ts lessons/NNNN-slug.src.html` then `bun <plugin>/scripts/check.ts lessons/NNNN-slug.html`. Link the previous and next lessons and the relevant reference sheet. Reuse the glossary's terms exactly. Don't reuse a metaphor listed in `NOTES.md`; add the new one there.
6. **Close**: update the queue, add the lesson's cards to `review.src.html` (one `cards` component per deck, same `deck` and card ids as the lesson so schedules carry over) and rebuild it. Every third lesson, or when asked, distill a reference sheet into `reference/`.
7. **Records**: when the user pastes progress from a lesson or shows understanding in chat, write records only for evidence (see `<plugin>/references/pedagogy.md`). Promote glossary terms the user used correctly.

## Working through a course or a book

`queue.json`:

```json
{"source": {"kind": "udemy|youtube|book", "title": "…", "url": "…", "file": "…", "courseId": "…"},
 "items": [{"id": "lecture-or-chapter-id", "title": "…", "section": "…", "status": "queued|taught|skipped", "lesson": "lessons/0004-….html"}]}
```

- **Build the queue once** from the curriculum or table of contents (`<plugin>/references/inputs.md`: Udemy curriculum endpoint, `yt-dlp -J` for a playlist, PDF outline or EPUB spine). Skip intros, outros, promos and quizzes by default; ask once if unsure.
- **One item per lesson.** Fetch only that episode's captions or that chapter's text, when you teach it. Never pre-fetch a whole course.
- **"next"** means the next `queued` item. The user can also name an item or a range ("lectures 12-14 as one lesson", "only chapter 3, section 2").
- Episode or chapter lessons use the `notes` format (technical) or the `practice` format (soft skills, life, non-fiction): a short readable summary in the user's terms, the core idea as a figure, what the instructor or author stresses, common mistakes, a quiz and cards. Add "where this fits" linking to earlier lessons. For AWS-style courses, prefer a `diagram` with a request trace and a "what breaks if" question; note exam-relevant facts in a callout when the course targets a certification.
- Cite the lecture or chapter (title, number, timestamp or page) in the sources footer. Paraphrase; never paste transcripts or long passages into lessons.

## Teach-back sessions

When the user says "test me" or "let me explain": they explain first in chat; you find the one or two smallest gaps, ask a question about each (Socratic), and give the answer after two tries. Record their own wording when they get it.
