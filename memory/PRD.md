# Sur Detective — PRD

## Original Problem Statement
A daily song-guessing game for Indian listeners (Heardle-style, detective-noir + Bollywood record-sleeve theme). Each day everyone gets the same song, identified from an audio clip starting at 1s and growing with each wrong guess (6 attempts). Faster recognition = higher score. Results share as a spoiler-free emoji grid. Framed as detective "cases" / "verdicts" / "case file". Songs come from pre-stored iTunes preview URLs; never calls a music API at runtime. Closed academic prototype.

## User Choices
- Anonymous play — progress & stats in browser localStorage
- Scoring: fewer attempts = higher + daily streak bonus
- Strict daily puzzle (same for everyone) + archive of past cases to replay
- Guessing via multiple-choice suspects each round
- Admin screen to add songs; seeded from a 26-song CSV of real iTunes preview URLs

## Architecture
- **Backend** (FastAPI + MongoDB, `/app/backend/server.py`): deterministic daily puzzle (IST, LAUNCH 2026-01-01), song CRUD, CSV import, guess validation & reveal server-side (answer hidden until solved/failed).
- **Frontend** (React, mobile-first max-w-md): PuzzlePage (waveform hero + suspects), VerdictScreen (stamp + share grid), ArchivePage, StatsPage, AdminPage. localStorage for progress/streak/stats.
- Palette & typography per design_guidelines.json (near-monochrome, gold as scarce accent; Barlow Condensed / Outfit / JetBrains Mono).

## Personas
- Primary: Indian Gen Z / young millennials (18-28), heavy streamers, Wordle-familiar.
- Secondary: nostalgia listeners (28-45) recognising 90s/2000s Bollywood.

## Implemented (2026-08-07)
- Daily Case screen: gold reveal waveform + playhead glow, HTML5 clip playback capped at unlocked seconds [1,2,4,7,11,16], 6 MCQ suspects, accuse/skip, attempt tracker.
- Server-side guess validation + reveal; puzzle stored once generated (stable options).
- Verdict screen: SOLVED / COLD CASE stamp, score, streak, spoiler-free emoji share grid + native/clipboard share.
- Archive of past cases with per-case status; Stats (played, win%, streaks, solve distribution).
- Admin: song list, add/delete, CSV bulk import (upsert by title+artist).
- 26 songs seeded from user CSV. Tested end-to-end: 100% backend, 100% frontend.

## Backlog
- P1: Difficulty-aware distractor selection tuning; countdown-to-next-case timer on verdict.
- P2: Admin auth gate before any real deploy; edit-song UI; batch distractor query ($sample) as catalog grows.
- P2: PWA/installable; richer waveform generated from real audio peaks.
