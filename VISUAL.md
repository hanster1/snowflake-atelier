# Visual direction: layered winter paper

Playbook: **Anthropic canvas-design**, with the philosophy "Simplicity of form. Precision of hand. Wonder in iteration." The mood reference is the concept poster (indigo, ice blue, silver, amber).

- **Palette**: ink `#0f1736`, indigo `#1b2a5c`, ice `#dbe9fb`, silver `#b9c6dd`, and a single amber accent `#f2b544`, used only for the golden thread and the "accepted" moments.
- **Type**: Cinzel (poster capitals) for titles, labels and buttons, and Cormorant Garamond (italic for voice) for story text.
- **Paper**: the background is layered cut paper. Darker Koch and anti-Koch doilies (real geometry) sit at the edges, three scalloped paper hills sit at the bottom, and fibre noise and a vignette are added on the high tier.
- **The flake**: ice-paper with a gradient, lifted off a soft shadow sheet, with six fold creases. Embossed echoes of the same curve at 66/42/24% scale make self-similarity visible. A white cut edge has the animated golden thread running around it, and a dotted circle marks the boundary it never leaves.
- **Cut animation**: new bumps grow from flat to full height over 0.5 s (ease-out). Reduced motion turns it off.
- **Thread ledger**: one row per step, with a mini flake and a golden thread drawn at its true relative length. It meanders back and forth once it's longer than the row, echoing the poster.
- **Rule: geometry is never an image.** Every flake, doily, thumbnail and falling snowflake comes from `src/fractal.ts`.
- **Quality tiers**: phones and `?q=low` get 26 snowflakes, no fibre texture and 2 doily layers. Desktop gets 70 snowflakes, texture and 3 layers. `?q=high` forces the high tier.
- **Layout**: desktop puts the stage on the left with a 400 px atelier panel. At ≤820 px the stage takes the top 42% and the panel scrolls below, with a sticky Cut/Present bar.
