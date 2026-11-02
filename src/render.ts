import { cantor, kochPolygon, sierpinski, measure, type Pt, type Rule } from './fractal';

export interface Quality { dpr: number; flakes: number; texture: boolean; layers: number }
export function pickQuality(): Quality {
  const q = new URLSearchParams(location.search).get('q');
  const small = Math.min(innerWidth, innerHeight) < 600 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
  const low = q === 'low' || (q !== 'high' && small);
  return low ? { dpr: Math.min(devicePixelRatio, 2), flakes: 26, texture: false, layers: 2 }
             : { dpr: Math.min(devicePixelRatio, 2), flakes: 70, texture: true, layers: 3 };
}

function rng(seed: number) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

interface Flake { x: number; y: number; r: number; vy: number; vx: number; rot: number; vr: number; a: number }

export class Stage {
  ctx: CanvasRenderingContext2D; bg: HTMLCanvasElement; paper: CanvasPattern | null = null;
  w = 0; h = 0; flakes: Flake[] = []; flakePath: Path2D;
  rule: Rule = { kind: 'koch', angle: 60, inward: false }; depth = 0; growT = 1; growStart = 0;
  focusX = 0.5; cache = new Map<string, Pt[]>(); celebrate = 0; reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  constructor(public canvas: HTMLCanvasElement, public q: Quality) {
    this.ctx = canvas.getContext('2d')!;
    this.bg = document.createElement('canvas');
    const fp = new Path2D(); const k = kochPolygon({ kind: 'koch', angle: 60, inward: false }, 2);
    k.forEach(([x, y], i) => (i ? fp.lineTo(x, y) : fp.moveTo(x, y))); fp.closePath(); this.flakePath = fp;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  resize() {
    const r = this.canvas.getBoundingClientRect(); if (!r.width) return;
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.round(r.width * this.q.dpr); this.canvas.height = Math.round(r.height * this.q.dpr);
    this.buildBackground();
    const rand = rng(7); this.flakes = [];
    for (let i = 0; i < this.q.flakes; i++) this.flakes.push({ x: rand() * this.w, y: rand() * this.h, r: 1.5 + rand() * 5, vy: 6 + rand() * 16, vx: -4 + rand() * 8, rot: rand() * 6, vr: -0.4 + rand() * 0.8, a: 0.15 + rand() * 0.5 });
  }
  setShape(rule: Rule, depth: number, animate: boolean) {
    const grew = depth > this.depth && rule.kind === this.rule.kind;
    this.rule = { ...rule }; this.depth = depth;
    this.growT = animate && grew && !this.reduced ? 0 : 1; this.growStart = performance.now();
  }
  private poly(rule: Rule, depth: number, t: number): Pt[] {
    if (t < 1) return kochPolygon(rule, depth, t);
    const key = `${rule.kind}${rule.angle}${rule.inward}${depth}`;
    let p = this.cache.get(key); if (!p) { p = kochPolygon(rule, depth); this.cache.set(key, p); }
    return p;
  }
  private buildBackground() {
    const { w, h } = this; const d = this.q.dpr;
    this.bg.width = Math.round(w * d); this.bg.height = Math.round(h * d);
    const c = this.bg.getContext('2d')!; c.scale(d, d);
    const g = c.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    g.addColorStop(0, '#2b3f7a'); g.addColorStop(0.55, '#16224b'); g.addColorStop(1, '#0a1029');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const rand = rng(42);
    // layered paper doilies: real Koch / anti-Koch shapes cut from darker paper
    const doily = (x: number, y: number, R: number, depth: number, inward: boolean, col: string, rot: number) => {
      const p = kochPolygon({ kind: 'koch', angle: 60, inward }, depth);
      c.save(); c.translate(x, y); c.rotate(rot);
      c.shadowColor = 'rgba(0,0,10,.55)'; c.shadowBlur = 18; c.shadowOffsetY = 6;
      c.beginPath(); p.forEach(([px, py], i) => (i ? c.lineTo(px * R, py * R) : c.moveTo(px * R, py * R))); c.closePath();
      c.fillStyle = col; c.fill(); c.restore();
    };
    const m = Math.min(w, h);
    for (let i = 0; i < this.q.layers * 4; i++) {
      const side = i % 4; const R = m * (0.16 + rand() * 0.22);
      const x = side < 2 ? (side ? w + R * 0.25 : -R * 0.25) + (rand() - 0.5) * R : rand() * w;
      const y = side < 2 ? rand() * h : (side === 2 ? -R * 0.3 : h + R * 0.3);
      const shade = 30 + Math.floor(rand() * 26);
      doily(x, y, R, 3 + (i % 2), i % 3 === 1, `rgb(${shade - 8},${shade + 6},${shade + 50})`, rand() * 2);
    }
    // scalloped paper hills at the bottom (3 layers)
    for (let L = 0; L < 3; L++) {
      const base = h * (0.86 + L * 0.05);
      c.save(); c.shadowColor = 'rgba(0,0,10,.5)'; c.shadowBlur = 14; c.shadowOffsetY = -3;
      c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w + 40; x += 40) c.quadraticCurveTo(x + 20, base - 18 - rand() * 12, x + 40, base);
      c.lineTo(w, h); c.closePath(); const s = 22 + L * 10;
      c.fillStyle = `rgb(${s},${s + 14},${s + 52})`; c.fill(); c.restore();
    }
    if (this.q.texture) {
      // paper fibre: fine noise
      const id = c.getImageData(0, 0, this.bg.width, this.bg.height); const px = id.data;
      for (let i = 0; i < px.length; i += 4) { const n = (rand() - 0.5) * 14; px[i] += n; px[i + 1] += n; px[i + 2] += n; }
      c.putImageData(id, 0, 0);
    }
    // vignette
    const v = c.createRadialGradient(w / 2, h / 2, m * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,12,.55)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }
  frame(now: number, dt: number) {
    const c = this.ctx; const { w, h } = this; const d = this.q.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(this.bg, 0, 0); c.setTransform(d, 0, 0, d, 0, 0);
    if (this.growT < 1) this.growT = Math.min(1, (now - this.growStart) / 520);
    const t = 1 - (1 - this.growT) ** 3;
    const cx = w * this.focusX, cy = h * 0.5, R = Math.min(w, h) * (this.focusX === 0.5 ? 0.36 : 0.4);
    // halo
    const glow = 0.18 + this.celebrate * 0.4;
    const hg = c.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.5);
    hg.addColorStop(0, `rgba(170,210,255,${glow})`); hg.addColorStop(1, 'rgba(170,210,255,0)');
    c.fillStyle = hg; c.fillRect(0, 0, w, h);
    // dotted bounding circle
    c.save(); c.setLineDash([2, 7]); c.lineWidth = 1.2; c.strokeStyle = 'rgba(200,215,240,.55)';
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.setLineDash([1, 10]); c.strokeStyle = 'rgba(200,215,240,.25)'; c.beginPath(); c.arc(cx, cy, R * 1.12, 0, Math.PI * 2); c.stroke(); c.restore();
    const rot = this.reduced ? 0 : Math.sin(now / 9000) * 0.03;
    if (this.rule.kind === 'sierpinski') this.drawSierpinski(c, cx, cy, R, rot, t);
    else if (this.rule.kind === 'cantor') this.drawCantor(c, cx, cy, R, t);
    else this.drawKoch(c, cx, cy, R, rot, t, now);
    // drifting paper snow
    for (const f of this.flakes) {
      if (!this.reduced) { f.y += f.vy * dt; f.x += f.vx * dt + Math.sin(now / 1500 + f.r) * 0.2; f.rot += f.vr * dt; }
      if (f.y > h + 10) { f.y = -10; f.x = Math.random() * w; }
      c.save(); c.translate(f.x, f.y); c.rotate(f.rot); c.scale(f.r, f.r); c.globalAlpha = f.a; c.fillStyle = '#dfe9ff'; c.fill(this.flakePath); c.restore();
    }
    this.celebrate = Math.max(0, this.celebrate - dt * 0.6);
  }
  private paperFill(c: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
    const g = c.createRadialGradient(cx - R * 0.2, cy - R * 0.3, R * 0.05, cx, cy, R * 1.05);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#dbe9fb'); g.addColorStop(1, '#9fbfe6'); return g;
  }
  private trace(c: CanvasRenderingContext2D, p: Pt[], cx: number, cy: number, R: number, rot: number) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    c.beginPath(); p.forEach(([x, y], i) => { const X = cx + (x * cs - y * sn) * R, Y = cy + (x * sn + y * cs) * R; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath();
  }
  private drawKoch(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, rot: number, t: number, now: number) {
    const p = this.poly(this.rule, this.depth, t);
    // fit: classic outward Koch fits the circle exactly; other rules are scaled to fit too
    let mr = 1; for (const [x, y] of p) mr = Math.max(mr, Math.hypot(x, y));
    const S = R / mr;
    // one sheet of backing paper, lifted: soft shadow + a thin darker rim
    c.save(); this.trace(c, p, cx + 3, cy + 7, S, rot); c.fillStyle = 'rgba(10,16,48,.75)'; c.shadowColor = 'rgba(0,0,15,.7)'; c.shadowBlur = 28; c.fill(); c.restore();
    c.save(); this.trace(c, p, cx, cy, S, rot);
    const g = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    g.addColorStop(0, 'rgba(246,250,255,.97)'); g.addColorStop(0.5, 'rgba(206,224,248,.94)'); g.addColorStop(1, 'rgba(150,182,226,.94)');
    c.fillStyle = g; c.fill();
    c.clip();
    // fold creases: six radial folds, each one a light edge beside a shadow edge
    for (let i = 0; i < 6; i++) {
      const a = rot - Math.PI / 2 + (i * Math.PI) / 3; const ex = cx + Math.cos(a) * R * 1.1, ey = cy + Math.sin(a) * R * 1.1;
      const half = c.createLinearGradient(cx, cy, ex, ey); half.addColorStop(0, 'rgba(90,120,180,.0)'); half.addColorStop(1, 'rgba(90,120,180,.16)');
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); const a2 = a + Math.PI / 6; c.lineTo(cx + Math.cos(a2) * R * 1.1, cy + Math.sin(a2) * R * 1.1); c.closePath();
      c.fillStyle = half; c.fill();
      c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke();
    }
    // embossed echoes: the same exact curve, scaled down — self-similarity made visible
    for (const [sc, al] of [[0.66, 0.5], [0.42, 0.42], [0.24, 0.35]] as const) {
      c.lineWidth = 1.4; c.strokeStyle = `rgba(255,255,255,${al})`; this.trace(c, p, cx - 0.6, cy - 0.6, S * sc, rot); c.stroke();
      c.lineWidth = 1; c.strokeStyle = `rgba(70,100,160,${al * 0.7})`; this.trace(c, p, cx + 0.8, cy + 0.8, S * sc, rot); c.stroke();
    }
    // sparkle near the light
    const sp = c.createRadialGradient(cx - R * 0.25, cy - R * 0.3, 0, cx - R * 0.25, cy - R * 0.3, R * 0.6);
    sp.addColorStop(0, 'rgba(255,255,255,.55)'); sp.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = sp; c.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    c.restore();
    c.save(); this.trace(c, p, cx, cy, S, rot); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.9)'; c.stroke();
    // golden measuring thread, running around the edge
    c.lineWidth = 1.6; c.strokeStyle = '#f2b544'; c.shadowColor = 'rgba(255,190,80,.9)'; c.shadowBlur = 6;
    c.setLineDash([R * 0.9, R * 0.25]); c.lineDashOffset = -now / 20; c.globalAlpha = 0.9; c.stroke(); c.restore();
  }
  private drawSierpinski(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, rot: number, t: number) {
    // backing triangle (the paper that was removed shows through as dark)
    const base = sierpinski(0)[0];
    c.save(); this.trace(c, base, cx + 4, cy + 6, R, rot); c.fillStyle = 'rgba(30,44,96,.9)'; c.shadowColor = 'rgba(0,0,15,.6)'; c.shadowBlur = 18; c.fill(); c.restore();
    c.save(); c.globalAlpha = 1 - 0.25 * (1 - t); c.fillStyle = this.paperFill(c, cx, cy, R);
    c.beginPath();
    for (const tri of sierpinski(this.depth)) {
      const cs = Math.cos(rot), sn = Math.sin(rot);
      tri.forEach(([x, y], i) => { const X = cx + (x * cs - y * sn) * R, Y = cy + (x * sn + y * cs) * R; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.closePath();
    }
    c.fill(); c.lineWidth = this.depth > 5 ? 0.6 : 1.2; c.strokeStyle = 'rgba(242,181,68,.8)'; c.stroke(); c.restore();
  }
  private drawCantor(c: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number) {
    const W = R * 1.7, x0 = cx - W / 2, rows = this.depth + 1, gap = Math.min(R * 0.26, (R * 1.5) / rows), hgt = gap * 0.55;
    const y0 = cy - (rows * gap) / 2;
    // a silk hanging rod with the ribbon pinned to it
    c.save(); c.strokeStyle = 'rgba(214,224,240,.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0 - 14, y0 - 16); c.lineTo(x0 + W + 14, y0 - 16); c.stroke();
    c.fillStyle = '#f2b544'; for (const x of [x0 - 14, x0 + W + 14]) { c.beginPath(); c.arc(x, y0 - 16, 5, 0, 7); c.fill(); } c.restore();
    for (let d = 0; d <= this.depth; d++) {
      const cur = d === this.depth; const a = cur ? t : 1; const y = y0 + d * gap;
      // the removed middle thirds: dashed ghost outlines where the scissors went
      if (d > 0) for (const [s, e] of cantor(d - 1)) {
        const L = (e - s) * W; const gx = x0 + s * W + L / 3;
        c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(185,198,221,.35)'; c.lineWidth = 1; c.strokeRect(gx, y, L / 3, hgt); c.restore();
      }
      for (const [s, e] of cantor(d)) {
        const X = x0 + s * W, L = Math.max(0.8, (e - s) * W), n = Math.min(hgt * 0.3, L * 0.25);
        c.save(); c.shadowColor = 'rgba(0,0,15,.6)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
        c.fillStyle = cur ? this.paperFill(c, cx, cy, R) : 'rgba(160,190,232,.62)'; c.globalAlpha = cur ? 0.4 + 0.6 * a : 0.85;
        // swallowtail ribbon: notched at both ends
        c.beginPath(); c.moveTo(X, y); c.lineTo(X + L, y); c.lineTo(X + L - n, y + hgt / 2); c.lineTo(X + L, y + hgt); c.lineTo(X, y + hgt); c.lineTo(X + n, y + hgt / 2); c.closePath(); c.fill();
        c.restore();
        if (L > 6) { c.save(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(X + n, y + 2.5); c.lineTo(X + L - n, y + 2.5); c.stroke(); c.restore(); }
        if (cur) { c.fillStyle = '#f2b544'; c.fillRect(X, y + hgt + 3, L, 2); }
      }
    }
  }
}

/** The thread ledger: one row per step, a mini flake and a golden thread whose length is the true perimeter. */
export function drawLedger(cv: HTMLCanvasElement, rule: Rule, depth: number, maxShown = 6) {
  const r = cv.getBoundingClientRect(); const d = Math.min(devicePixelRatio, 2);
  cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d);
  const c = cv.getContext('2d')!; c.scale(d, d); const w = r.width, h = r.height;
  const first = Math.max(0, depth - maxShown + 1), rows = depth - first + 1, rh = Math.min(34, h / Math.max(rows, 4));
  const unit = (w - 70) * 0.55; // length of the step-0 thread in px
  for (let i = 0; i < rows; i++) {
    const n = first + i; const y = 6 + i * rh + rh / 2; const L = unit * measure(rule, n).perimeter;
    c.fillStyle = n === depth ? '#f6d48c' : '#aebfdf'; c.font = '600 12px "Cormorant Garamond", Georgia, serif'; c.fillText(String(n), 4, y + 4);
    // mini shape
    c.save(); c.translate(30, y); const s = rh * 0.4;
    if (rule.kind === 'koch' || rule.kind === 'quad') {
      const p = kochPolygon(rule, Math.min(n, 4)); let mr = 1; p.forEach(([x, yy]) => (mr = Math.max(mr, Math.hypot(x, yy))));
      c.beginPath(); p.forEach(([x, yy], j) => (j ? c.lineTo((x / mr) * s, (yy / mr) * s) : c.moveTo((x / mr) * s, (yy / mr) * s))); c.closePath(); c.fillStyle = '#d8e6fa'; c.fill();
    } else if (rule.kind === 'sierpinski') {
      c.beginPath(); for (const tri of sierpinski(Math.min(n, 5))) { tri.forEach(([x, yy], j) => (j ? c.lineTo(x * s, yy * s) : c.moveTo(x * s, yy * s))); c.closePath(); } c.fillStyle = '#d8e6fa'; c.fill();
    } else { for (const [a, b] of cantor(Math.min(n, 6))) { c.fillStyle = '#d8e6fa'; c.fillRect(-s + a * 2 * s, -2, Math.max(0.5, (b - a) * 2 * s), 4); } }
    c.restore();
    // golden thread: meander back and forth when longer than the row
    const x0 = 56, W = w - x0 - 8; c.save(); c.strokeStyle = '#f2b544'; c.lineWidth = n === depth ? 1.8 : 1.1; c.globalAlpha = n === depth ? 1 : 0.6;
    c.beginPath(); c.moveTo(x0, y); let left = L, x = x0, dir = 1, k = 0;
    const amp = rh * 0.32;
    while (left > 0 && k < 400) { const run = Math.min(left, W); const steps = Math.max(2, Math.ceil(run / 6));
      for (let j = 1; j <= steps; j++) { const xx = x + (dir * run * j) / steps; const yy = y + Math.sin((xx + k * 37) / 9) * (k ? amp : amp * 0.25) * (k % 2 ? -1 : 1) * 0.6; c.lineTo(xx, yy); }
      x += dir * run; left -= run; dir = -dir; k++; }
    c.stroke(); c.restore();
  }
}
