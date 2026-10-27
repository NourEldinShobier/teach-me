---
name: language
description: Human-language study mode (German first, any language works) - placement, themed vocabulary and grammar lessons with audio and gender colours, spaced-repetition flashcards, production practice and roleplay in chat with minimal corrections, and an error log that brings mistakes back until fixed.
disable-model-invocation: true
argument-hint: "Language and goal, e.g. 'German A2, ordering at a restaurant'"
---

# Teach Me: language study

`<plugin>` is the folder two levels above this skill's base directory. Read `<plugin>/references/language.md` before the first lesson. Lessons use the Teach Me runtime and build steps from `<plugin>/skills/learn/SKILL.md` (steps 5-7), with the `language` format.

## Workspace

Use the current folder if it has `MISSION.md`, else `~/TeachMe/<language>/` (create it). Files: `MISSION.md` (goal, level, deadline), `NOTES.md` (preferences, topics done), `errors.json`, `lessons/`, `review.src.html` (all decks).

## Session flow

1. **First time**: offer one small task right away that works at any level (introduce yourself in 2 sentences). From the answer and one or two follow-ups, estimate the CEFR level; offer a placement page (`quiz` items from A1 to C1) if they want precision. Write `MISSION.md`.
2. **Every session opens with a board** in chat: cards due, the up-to-5 most frequent error rules from `errors.json`, and a callback quoting one of the learner's own earlier sentences, fixed.
3. **Lesson page** for the session's theme (`language` format in `<plugin>/references/routing.md`): 5-8 new items with audio, gender colour and plural; a cloze drill; a short dialogue with 🔊 per line; 2 scenario questions; cards. Explanations in English for A1-A2, simple target language from B1.
4. **Production in chat**: ask the learner to write or say sentences using today's items. Correct with a self-repair cue first ("check the article after *mit*"), then minimal correction: their sentence, the fixed sentence, the rule in one line. Never invent errors; leave style alone below B2.
5. **Roleplay** on request: stay in the scene with no corrections, then a short debrief listing at most three fixes.
6. **Error log**: store each mistake by rule key (`"mit + dative"`, `"verb second"`, `"die Hunde plural"`) with the learner's sentence and date in `errors.json`. Bring a rule back in new sentences until the learner gets it right unaided on a later day, then mark it fixed.

## Correctness

Check every noun's gender and plural and every irregular verb's forms against a dictionary you fetch (Wiktionary, DWDS, Duden) before it goes on a card; set `"verified": true` only then. If you can't check, keep the card but say so in its `note`.
