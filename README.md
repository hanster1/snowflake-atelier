# Snowflake Atelier ❄

A cut-paper fractal game for kids and adults. You're apprentice to a winter paper-artist, cutting ice-paper step by step to learn self-similarity, iteration and recursion. Along the way you learn the Koch snowflake's endless edge (×4/3 every step) inside a limited area, plus the anti-snowflake, angle and square variants, Sierpinski and Cantor.

**Play:** https://snowflake-atelier-spencer-73ef.vercel.app

- 5 chapters, 20 commissions (all unlocked), a Studio sandbox and a Gallery
- Exact geometry in code (`src/fractal.ts`) and a Canvas 2D renderer (`src/render.ts`)
- An adaptive WebAudio score (`src/audio.ts`)
- Docs: [STORY](STORY.md) · [LEVELS](LEVELS.md) · [AUDIO](AUDIO.md) · [VISUAL](VISUAL.md)

```bash
npm install
npm run dev          # http://127.0.0.1:5191
npm run test:unit    # geometry + level facts
npm test             # headless playthrough of every level (desktop + phone)
node scripts/shots.mjs docs/screenshots
```

Deep links: `?level=3-2`, `#studio`, `?q=low|high`.
