# Audio (WebAudio, no samples)

All sound is synthesised in `src/audio.ts`. It starts on the first tap or key press (browser rule), and ♪ mutes it.

- **Music box**: sine plus inharmonic partials (×3.01, ×5.98) with a fast decay, playing an 8-step arpeggio over a 4-bar root cycle.
- **Celesta**: triangle plus a ×4 sine bell, 2.2 s decay. It joins at step ≥2, and a high counter-line joins at step ≥4.
- **Glass drone**: two detuned saws through a 900 Hz low-pass, swelling on each bar.
- **Wind**: looped brown-ish noise through a band-pass swept by a 0.07 Hz LFO. Gusts get louder as the flake gets deeper.
- **Reverb**: a generated 3.2 s convolution tail.

**Adaptive rules**: note density rises with depth (45% → 99%). Each chapter has its own mode (D dorian → D lydian → C pentatonic → A dorian → F♯ pentatonic) and tempo (69→81 bpm).

**SFX**: *snip* is 1–5 short high-passed noise clicks (more and higher for finer cuts) plus a tick. *Tape back* is a low celesta note. *Accepted* is a rising 4-note celesta chime, and *not yet* is a falling 2-note one.
