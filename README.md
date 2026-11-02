# Snowflake Atelier ❄

A paper-snowflake puzzle game. Fold the paper (half, quarters, sixths, eighths or twelfths), snip notches, scoops, slots, tips and self-similar Koch cuts into the folded wedge's edges, then unfold it and match Madame Isolde's target snowflake. Along the way you learn mirror lines, rotational symmetry, six-fold snow crystals, self-similarity and the Koch snowflake's endless edge.

**Play:** https://snowflake-atelier-spencer-73ef.vercel.app

- 4 chapters, 12 levels (all unlocked), scored by how closely your cut-away paper matches the target (pass at 88–90%), free retries and a hint overlay
- Exact geometry in code (`src/paper.ts`: wedge, cut polygons, mirror unfolding, match score; `src/fractal.ts`: Koch shapes for the backdrop)
- A WebAudio score with paper-snip sounds (`src/audio.ts`)
- Screenshots: `node scripts/shots.mjs <outdir>` against the dev server

```bash
npm install
npm run dev          # http://127.0.0.1:5191
npm run test:unit    # geometry + level facts
npm test             # headless playthrough of every level (desktop + phone)
node scripts/shots.mjs docs/screenshots
```

Deep links: `?level=3-2`, `#studio`, `?q=low|high`.
