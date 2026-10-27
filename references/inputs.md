# Reading the input

Normalize every input to: title, source URL or file, kind, language, and a list of sections (heading + text, with timestamps for video). Keep raw source text in the lesson folder's `sources/` (never published, never committed).

## Pasted text, tweet threads, chat logs

Split on numbering and reply boundaries; drop engagement counts, "Translated from …" banners and t.co links; keep handles for attribution. Replies often disagree or are wrong: pick the claims that hold, verify them against a primary source, and use the wrong ones as quiz distractors or a "you might think" row. Never scrape X; work from what was pasted.

## Web pages and docs

Read with the available browser or fetch tool (BrowserOS neo `read`, deepseek `fetch`, WebFetch). Prefer the canonical docs page over blog posts. Note the page date and product version.

## PDFs and books

- PDF: read the outline/table of contents first (`anthropic-skills:pdf` if installed, else the Read tool with page ranges). Read only the chapter asked for.
- EPUB: it is a zip. Extract to a scratch folder (`tar -xf book.epub -C <dir>` works on Windows 10+, macOS and Linux), read `META-INF/container.xml` → the OPF file → the spine order, then read the chapter's XHTML files.
- A whole book is a course: use the `course` skill and queue one chapter (or one section of a long chapter) per lesson.
- Teach the author's argument faithfully and cite page or section numbers. Mark your own additions as such. Don't reproduce long passages: quote at most a sentence or two.
- Soft-skill and life books: the lesson is the `practice` format. The win is a behaviour the learner can try this week, not a summary.

## YouTube

```bash
yt-dlp --skip-download --write-subs --write-auto-subs --sub-langs "en.*,de.*" --sub-format vtt -o "sources/%(id)s.%(ext)s" <url>
yt-dlp -J --skip-download <url>   # chapters, title, duration
```

Prefer manual subtitles over auto. Clean VTT: drop cue numbers and timing lines, strip `<c>` and `<00:00:01.000>` tags, collapse the rolling duplicate lines auto-captions produce. Split by chapters when present. If yt-dlp fails (bot check, TLS interception) and the `watch` skill is installed, use it; otherwise ask the user to paste the transcript.

## Udemy (the user's own purchased courses)

Only through the user's already signed-in browser tab (BrowserOS neo `evaluate`/`run`, or Claude in Chrome `javascript_tool`). Captions and curriculum only: never download video, never bypass DRM, never store credentials, one lecture at a time with pauses.

1. Open the course player in the signed-in browser. The course id is in `document.querySelector('[data-module-id="course-taking"]').dataset.moduleArgs` (JSON, `courseId`) or in the page URL/API calls.
2. Curriculum (same-origin fetch from that tab):
   `/api-2.0/courses/{courseId}/subscriber-curriculum-items/?curriculum_types=chapter,lecture,quiz&page_size=1000&fields[lecture]=title,object_index,asset&fields[chapter]=title,object_index`
3. Captions for one lecture:
   `/api-2.0/users/me/subscribed-courses/{courseId}/lectures/{lectureId}/?fields[lecture]=asset&fields[asset]=captions`
   Take the caption whose `locale_id` matches (e.g. `en_US`), fetch its `url` at once (signed, expires), clean the VTT as above.
4. Fallback: open the lecture, open the "Transcript" panel in the player and read its text.
5. Store the transcript in the workspace's `sources/` (git-ignored). Lessons paraphrase and explain; they don't republish the transcript.

These endpoints are undocumented and can change. If a call fails, fall back to the transcript panel and tell the user.

## Code, repos, the user's own project

Read the files. Run snippets to get real output (see `engines.md`). For "learn by doing", leave one `TODO(human)` in a scratch copy with Context / Task / Guidance, and wait for the user.

## Topic only ("teach me how DNS works")

Search, then read 1 to 3 primary sources (official docs, RFCs, standards, textbooks by known authors). Put them in the sources footer. If sources disagree, say so in the lesson.
