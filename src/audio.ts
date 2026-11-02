// Adaptive WebAudio score: music box + celesta over a soft wind bed, paper snips as sound effects.
// Layers thicken with the current step; harmony brightens per chapter.
const SCALES = [
  [62, 64, 65, 69, 71, 74, 76, 77, 81], // D dorian-ish
  [62, 64, 66, 69, 71, 74, 76, 78, 81], // D lydian, brighter
  [60, 62, 64, 67, 69, 72, 74, 76, 79], // C major pentatonic
  [57, 59, 60, 64, 66, 69, 71, 72, 76], // A dorian, cooler
  [61, 63, 66, 68, 70, 73, 75, 78, 80], // F# pentatonic, shimmering
];
const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);

export class Score {
  ctx: AudioContext | null = null;
  master!: GainNode; music!: GainNode; sfx!: GainNode; windGain!: GainNode; windFilter!: BiquadFilterNode;
  muted = false; depth = 0; chapter = 1; private timer = 0; private step = 0; private nextTime = 0;

  start() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.8;
    const verb = this.makeReverb(ctx);
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain(); this.music.gain.value = 0.5;
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.7;
    const wet = ctx.createGain(); wet.gain.value = 0.45;
    this.music.connect(this.master); this.music.connect(verb); verb.connect(wet).connect(this.master);
    this.sfx.connect(this.master); this.sfx.connect(verb);
    // wind bed: looping filtered noise with a slow gust LFO
    const noise = ctx.createBufferSource(); noise.buffer = this.noiseBuf(ctx, 4); noise.loop = true;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = 'bandpass'; this.windFilter.frequency.value = 500; this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.05;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lfoG = ctx.createGain(); lfoG.gain.value = 260;
    lfo.connect(lfoG).connect(this.windFilter.frequency); lfo.start();
    noise.connect(this.windFilter).connect(this.windGain).connect(this.master); noise.start();
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }
  setMuted(m: boolean) { this.muted = m; if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.1); }
  setState(depth: number, chapter: number) {
    this.depth = depth; this.chapter = chapter;
    if (this.ctx) this.windGain.gain.setTargetAtTime(0.03 + Math.min(depth, 6) * 0.012, this.ctx.currentTime, 1.5);
  }
  private noiseBuf(ctx: AudioContext, sec: number) {
    const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate); const d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  private makeReverb(ctx: AudioContext) {
    const c = ctx.createConvolver(); const len = ctx.sampleRate * 3.2; const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6; }
    c.buffer = b; return c;
  }
  private schedule() {
    const ctx = this.ctx!; if (!ctx || ctx.state !== 'running') return;
    const beat = 60 / (66 + this.chapter * 3) / 2; // eighth notes, gently faster each chapter
    while (this.nextTime < ctx.currentTime + 0.2) { this.playStep(this.nextTime, this.step++); this.nextTime += beat; }
  }
  private playStep(t: number, s: number) {
    const sc = SCALES[(this.chapter - 1) % SCALES.length];
    const bar = Math.floor(s / 8) % 4; const pos = s % 8;
    const roots = [0, 3, 1, 4];
    // music box arpeggio: always present but sparse at low depth
    const pattern = [0, 2, 4, 2, 5, 4, 2, 4];
    const density = 0.45 + Math.min(this.depth, 6) * 0.09;
    if (pos % 2 === 0 || this.rand(s) < density) this.musicBox(t, mtof(sc[(roots[bar] + pattern[pos]) % sc.length] + 12), 0.12);
    // celesta melody joins from step 2
    if (this.depth >= 2 && pos === 0) this.celesta(t, mtof(sc[(roots[bar] + 4 + (s >> 3) % 3) % sc.length] + 12), 0.08);
    if (this.depth >= 4 && pos === 5) this.celesta(t, mtof(sc[(roots[bar] + 6) % sc.length] + 24), 0.04);
    // low glass drone on bar start
    if (pos === 0) this.pad(t, mtof(sc[roots[bar]] - 12), 0.05);
  }
  private rand(s: number) { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); }
  private musicBox(t: number, f: number, v: number) {
    const ctx = this.ctx!;
    for (const [mul, amp, dec] of [[1, 1, 1.4], [3.01, 0.25, 0.4], [5.98, 0.1, 0.2]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * amp, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(this.music); o.start(t); o.stop(t + dec + 0.05);
    }
  }
  private celesta(t: number, f: number, v: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 4;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    const g2 = ctx.createGain(); g2.gain.value = 0.15;
    o.connect(g); o2.connect(g2).connect(g); g.connect(this.music);
    o.start(t); o2.start(t); o.stop(t + 2.3); o2.stop(t + 2.3);
  }
  private pad(t: number, f: number, v: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 4.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    for (const d of [-4, 4]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + 4.6); }
    lp.connect(g).connect(this.music);
  }
  /** Paper snip: two short filtered noise clicks (blades closing). Finer pieces = higher snip. */
  snip(depth: number) {
    const ctx = this.ctx; if (!ctx) return;
    const t = ctx.currentTime;
    const n = Math.min(1 + depth, 5);
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.07 + Math.random() * 0.02;
      const src = ctx.createBufferSource(); src.buffer = this.noiseBuf(ctx, 0.08);
      const bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 2500 + depth * 600;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.5, tt); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.06);
      src.connect(bp).connect(g).connect(this.sfx); src.start(tt);
    }
    this.musicBox(t + 0.05, mtof(74 + depth * 2), 0.06);
  }
  tape() { const ctx = this.ctx; if (!ctx) return; this.celesta(ctx.currentTime, mtof(62), 0.06); }
  chime(ok: boolean) {
    const ctx = this.ctx; if (!ctx) return; const t = ctx.currentTime;
    const sc = SCALES[(this.chapter - 1) % SCALES.length];
    const notes = ok ? [0, 2, 4, 7] : [3, 1];
    notes.forEach((d, i) => this.celesta(t + i * 0.12, mtof(sc[d % sc.length] + (d >= sc.length ? 12 : 0) + 12), 0.1));
  }
  tick() { const ctx = this.ctx; if (!ctx) return; this.musicBox(ctx.currentTime, mtof(86), 0.04); }
  stop() { clearInterval(this.timer); }
}
