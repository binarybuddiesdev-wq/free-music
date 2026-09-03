import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Deterministic value-noise fBm with longitude wrap (seamless)        */
/* ------------------------------------------------------------------ */

function vhash(ix: number, iy: number, seed: number): number {
  const h = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453;
  return h - Math.floor(h);
}

function vnoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const wrap = (ix: number) => ((ix % period) + period) % period;
  const a = vhash(wrap(xi), yi, seed);
  const b = vhash(wrap(xi + 1), yi, seed);
  const c = vhash(wrap(xi), yi + 1, seed);
  const d = vhash(wrap(xi + 1), yi + 1, seed);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** fBm sampled on a fx×fy integer lattice over (u,v)∈[0,1] — wraps in u. */
function fbm(u: number, v: number, fx: number, fy: number, seed: number, oct = 5): number {
  let amp = 0.5;
  let sum = 0;
  let norm = 0;
  let px = fx;
  let py = fy;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(u * px, v * py, px, seed + i * 37.17);
    norm += amp;
    amp *= 0.5;
    px *= 2;
    py *= 2;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

type RGB = [number, number, number];

function hexRGB(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => x / 255) as RGB;
}

function mix3(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/* ------------------------------------------------------------------ */
/* Canvas builders                                                     */
/* ------------------------------------------------------------------ */

type Painter = (u: number, v: number, out: RGB) => void;

function buildCanvas(w: number, h: number, painter: Painter, alpha?: (u: number, v: number) => number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const out: RGB = [0, 0, 0];
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      painter(u, v, out);
      const i = (y * w + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, out[0] * 255));
      img.data[i + 1] = Math.max(0, Math.min(255, out[1] * 255));
      img.data[i + 2] = Math.max(0, Math.min(255, out[2] * 255));
      img.data[i + 3] = alpha ? Math.max(0, Math.min(255, alpha(u, v) * 255)) : 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function canvasTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/* Craters: shared list so color + bump match */
type Crater = { x: number; y: number; r: number };

function craterList(seed: number, count: number, minR: number, maxR: number): Crater[] {
  const out: Crater[] = [];
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    out.push({
      x: rnd(),
      y: 0.12 + rnd() * 0.76,
      r: minR + rnd() * (maxR - minR),
    });
  }
  return out;
}

function paintCratersColor(ctx: CanvasRenderingContext2D, craters: Crater[], w: number, h: number, strength: number) {
  for (const c of craters) {
    const px = c.x * w;
    const py = c.y * h;
    const pr = c.r * w;
    // dark floor
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, `rgba(0,0,0,${0.34 * strength})`);
    g.addColorStop(0.75, `rgba(0,0,0,${0.16 * strength})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    // bright rim
    ctx.strokeStyle = `rgba(255,255,240,${0.16 * strength})`;
    ctx.lineWidth = Math.max(0.7, pr * 0.14);
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintCratersBump(ctx: CanvasRenderingContext2D, craters: Crater[], w: number, h: number) {
  for (const c of craters) {
    const px = c.x * w;
    const py = c.y * h;
    const pr = c.r * w;
    const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.7, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = Math.max(0.7, pr * 0.14);
    ctx.beginPath();
    ctx.arc(px, py, pr * 0.92, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/* ------------------------------------------------------------------ */
/* Planet painters (colors sampled from NASA imagery)                  */
/* ------------------------------------------------------------------ */

const C = {
  mercuryA: hexRGB("#8f8b85"), mercuryB: hexRGB("#5f5b56"), mercuryC: hexRGB("#b5b1aa"),
  venusA: hexRGB("#c9973f"), venusB: hexRGB("#f3e6c2"), venusC: hexRGB("#a87b35"),
  oceanDeep: hexRGB("#0b2d5c"), oceanShallow: hexRGB("#2d6ca4"),
  landGreen: hexRGB("#3d6b35"), landTan: hexRGB("#b9a05f"), rock: hexRGB("#8a7a62"),
  snow: hexRGB("#f0f4f8"), cloud: hexRGB("#ffffff"),
  marsA: hexRGB("#a34a26"), marsB: hexRGB("#d18a5f"), marsDark: hexRGB("#5f2e18"), marsCap: hexRGB("#ece8e0"),
  jupZone: hexRGB("#e6d9be"), jupBelt: hexRGB("#c9a97e"), jupDark: hexRGB("#8a5a3d"), jupPole: hexRGB("#a8a294"), grs: hexRGB("#c25a33"), grsEdge: hexRGB("#d98a6a"),
  satA: hexRGB("#cfb387"), satB: hexRGB("#ead9b6"), satPole: hexRGB("#b8ad96"),
  uraA: hexRGB("#b8e0e3"), uraPole: hexRGB("#d4eef0"),
  nepA: hexRGB("#2848a8"), nepB: hexRGB("#3d68d4"), nepSpot: hexRGB("#1c2f7a"), nepCloud: hexRGB("#dce8ff"),
  plutoA: hexRGB("#7c4a2c"), plutoB: hexRGB("#d8bc94"), plutoDark: hexRGB("#4a2618"), plutoHeart: hexRGB("#efe3d0"),
  moonA: hexRGB("#b8b6b2"), moonB: hexRGB("#8a8884"), moonMaria: hexRGB("#5e5c58"),
};

function mercuryPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 8, v * 4, 8, 4, 11, 5);
  const base = mix3(C.mercuryB, C.mercuryC, n);
  const m = fbm(u * 3, v * 2, 3, 2, 14, 3);
  const col = m < 0.42 ? mix3(base, C.mercuryB, (0.42 - m) * 2.4) : base;
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function venusPainter(u: number, v: number, out: RGB) {
  const swirl = fbm(u * 6, v * 3, 6, 3, 12, 5);
  const y = v + (swirl - 0.5) * 0.16;
  const s = Math.sin(y * Math.PI * 7 + fbm(u * 5, v * 2, 5, 2, 13, 4) * 2.4) * 0.5 + 0.5;
  let col = mix3(C.venusA, C.venusB, s);
  col = mix3(col, C.venusC, smoothstep(0.75, 1.0, fbm(u * 4, v * 5, 4, 5, 15, 4)) * 0.4);
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function earthPainter(u: number, v: number, out: RGB) {
  const lat = Math.abs(v - 0.5) * 2;
  const wx = fbm(u * 3, v * 1.5, 3, 2, 7, 4);
  const wy = fbm(u * 2, v * 1, 2, 1, 9, 4);
  const e = fbm(u * 5 + wx * 0.6, v * 2.5 + wy * 0.6, 5, 3, 3, 6);

  let col: RGB;
  const land = e > 0.535;
  if (land) {
    const m = fbm(u * 7, v * 3.5, 7, 4, 13, 5);
    col = mix3(C.landGreen, C.landTan, m);
    if (e > 0.6) col = mix3(col, C.rock, smoothstep(0.6, 0.66, e));
    if (e > 0.67) col = mix3(col, C.snow, smoothstep(0.67, 0.72, e));
    col = mix3(col, hexRGB("#8a8a70"), lat * lat * 0.55);
  } else {
    const depth = smoothstep(0.535, 0.3, e);
    col = mix3(C.oceanShallow, C.oceanDeep, depth);
  }
  if (lat > 0.83 + fbm(u * 6, v * 3, 6, 3, 17, 3) * 0.06) col = mix3(col, C.snow, 0.9);

  const cl = fbm(u * 6, v * 2.4, 6, 3, 21, 5);
  if (cl > 0.6) col = mix3(col, C.cloud, Math.min(1, (cl - 0.6) * 2.6));

  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function marsPainter(u: number, v: number, out: RGB) {
  const lat = Math.abs(v - 0.5) * 2;
  const n = fbm(u * 6, v * 3, 6, 3, 5, 6);
  let col = mix3(C.marsA, C.marsB, n);
  const dark = fbm(u * 3, v * 1.5, 3, 2, 8, 3);
  if (dark < 0.42) col = mix3(col, C.marsDark, Math.min(1, (0.42 - dark) * 3));
  const northCap = v < 0.09 + fbm(u * 8, v * 4, 8, 4, 18, 3) * 0.05;
  const southCap = v > 0.93 - fbm(u * 8, v * 4, 8, 4, 19, 3) * 0.03;
  if (northCap || southCap) col = mix3(col, C.marsCap, 0.92);
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function jupiterPainter(u: number, v: number, out: RGB) {
  const lat = Math.abs(v - 0.5) * 2;
  const turb = fbm(u * 7, v * 10, 7, 10, 1, 5);
  const y = v + (turb - 0.5) * 0.045;
  const s = Math.sin(y * Math.PI * 11 + fbm(u * 4, v * 8, 4, 8, 2, 4) * 1.6) * 0.5 + 0.5;
  let col = mix3(C.jupBelt, C.jupZone, s);
  if (s < 0.32) col = mix3(col, C.jupDark, smoothstep(0.32, 0.1, s) * 0.85);
  col = mix3(col, C.jupPole, smoothstep(0.72, 0.95, lat) * 0.7);

  // Great Red Spot — southern hemisphere, ellipse with swirl
  let du = Math.abs(u - 0.72);
  du = Math.min(du, 1 - du);
  const dv = (v - 0.635) / 0.052;
  const d = (du / 0.075) ** 2 + dv * dv;
  if (d < 1.25) {
    const swirl = fbm(du * 30 + 3, dv * 10, 8, 4, 31, 4);
    col = mix3(col, C.grs, smoothstep(1.25, 0.7, d));
    col = mix3(col, C.grsEdge, swirl * smoothstep(0.6, 1.25, d));
  }
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function saturnPainter(u: number, v: number, out: RGB) {
  const lat = Math.abs(v - 0.5) * 2;
  const turb = fbm(u * 5, v * 6, 5, 6, 4, 4);
  const y = v + (turb - 0.5) * 0.02;
  const s = Math.sin(y * Math.PI * 9) * 0.5 + 0.5;
  let col = mix3(C.satA, C.satB, s);
  col = mix3(col, C.satPole, smoothstep(0.7, 0.95, lat) * 0.6);
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function uranusPainter(u: number, v: number, out: RGB) {
  const s = Math.sin(v * Math.PI * 5) * 0.5 + 0.5;
  let col = mix3(C.uraA, hexRGB("#a8d4d8"), s * 0.25);
  // south pole (visible, sunlit cap) brighter
  col = mix3(col, C.uraPole, smoothstep(0.45, 0.0, v) * 0.5);
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function neptunePainter(u: number, v: number, out: RGB) {
  const turb = fbm(u * 5, v * 6, 5, 6, 6, 4);
  const y = v + (turb - 0.5) * 0.02;
  const s = Math.sin(y * Math.PI * 7) * 0.5 + 0.5;
  let col = mix3(C.nepA, C.nepB, s);
  // Great Dark Spot
  let du = Math.abs(u - 0.3); du = Math.min(du, 1 - du);
  const dv = (v - 0.42) / 0.06;
  const d = (du / 0.07) ** 2 + dv * dv;
  if (d < 1.2) col = mix3(col, C.nepSpot, smoothstep(1.2, 0.6, d) * 0.85);
  // bright cirrus streaks
  const c = fbm(u * 9, v * 3, 9, 3, 26, 4);
  if (c > 0.66) col = mix3(col, C.nepCloud, Math.min(1, (c - 0.66) * 4));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function plutoPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 5, v * 2.5, 5, 3, 33, 5);
  let col = mix3(C.plutoA, C.plutoB, n);
  const macula = fbm(u * 3, v * 2, 3, 2, 34, 3);
  if (macula < 0.4 && v > 0.3 && v < 0.75) col = mix3(col, C.plutoDark, Math.min(1, (0.4 - macula) * 3.5));
  // Tombaugh Regio — the heart
  const du = Math.abs(u - 0.55); const wrapped = Math.min(du, 1 - du);
  const d = (wrapped / 0.16) ** 2 + ((v - 0.55) / 0.2) ** 2;
  if (d < 1) col = mix3(col, C.plutoHeart, smoothstep(1, 0.5, d));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function moonPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 6, v * 3, 6, 3, 41, 5);
  let col = mix3(C.moonB, C.moonA, n);
  const maria = fbm(u * 3, v * 2, 3, 2, 42, 3);
  if (maria < 0.4) col = mix3(col, C.moonMaria, Math.min(1, (0.4 - maria) * 3));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

/* --- Galilean / Titan / Triton painters --- */

function ioPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 6, v * 3, 6, 3, 61, 5);
  let col = mix3(hexRGB("#d8c060"), hexRGB("#f0e8a8"), n);
  const volcano = fbm(u * 10, v * 5, 10, 5, 62, 4);
  if (volcano < 0.32) col = mix3(col, hexRGB("#3a2410"), Math.min(1, (0.32 - volcano) * 4));
  if (volcano > 0.72) col = mix3(col, hexRGB("#e05818"), Math.min(1, (volcano - 0.72) * 3));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function europaPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 4, v * 2, 4, 2, 71, 4);
  let col = mix3(hexRGB("#c8bfae"), hexRGB("#e8e2d4"), n);
  // lineae — red-brown cracks
  const crack = Math.abs(fbm(u * 3, v * 1.5, 3, 2, 72, 5) - 0.5);
  if (crack < 0.045) col = mix3(col, hexRGB("#8a5a42"), 0.7 * (1 - crack / 0.045));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function ganymedePainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 5, v * 2.5, 5, 3, 81, 5);
  let col = mix3(hexRGB("#7a7468"), hexRGB("#b0a898"), n);
  const groove = fbm(u * 8, v * 4, 8, 4, 82, 4);
  if (groove > 0.62) col = mix3(col, hexRGB("#d0c8b8"), Math.min(1, (groove - 0.62) * 3));
  if (groove < 0.35) col = mix3(col, hexRGB("#4a463e"), Math.min(1, (0.35 - groove) * 2.5));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function callistoPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 6, v * 3, 6, 3, 91, 5);
  let col = mix3(hexRGB("#4a443c"), hexRGB("#8a8074"), n);
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function titanPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 3, v * 1.5, 3, 2, 101, 4);
  let col = mix3(hexRGB("#b8842a"), hexRGB("#e8b85a"), n);
  const dark = fbm(u * 5, v * 2.5, 5, 3, 102, 4);
  if (dark < 0.4) col = mix3(col, hexRGB("#6a4a18"), Math.min(1, (0.4 - dark) * 2.5));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function tritonPainter(u: number, v: number, out: RGB) {
  const n = fbm(u * 4, v * 2, 4, 2, 111, 5);
  let col = mix3(hexRGB("#c8b8b0"), hexRGB("#e8dcd8"), n);
  // cantaloupe terrain + pinkish south cap
  const cap = smoothstep(0.45, 0.0, v);
  col = mix3(col, hexRGB("#e8b8a8"), cap * 0.55);
  const cant = fbm(u * 12, v * 6, 12, 6, 112, 4);
  if (cant < 0.38 && v < 0.5) col = mix3(col, hexRGB("#a89890"), Math.min(1, (0.38 - cant) * 3));
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

/* ------------------------------------------------------------------ */
/* Ring textures (radial)                                              */
/* ------------------------------------------------------------------ */

function saturnRingAlpha(r: number): number {
  if (r < 0.04 || r > 0.98) return 0;
  let a = 0.85;
  const bandN = vnoise(r * 60, 0.5, 60, 51);
  a *= 0.55 + bandN * 0.45;
  if (r < 0.22) a *= 0.45;              // C ring, translucent
  if (r > 0.58 && r < 0.66) a *= 0.06; // Cassini division
  if (r > 0.86 && r < 0.875) a *= 0.15; // Encke gap
  a *= smoothstep(0.04, 0.12, r) * smoothstep(0.98, 0.92, r);
  return a;
}

function saturnRingColor(r: number, out: RGB) {
  const n = fbm(r * 8, 0.5, 8, 1, 52, 4);
  const col = mix3(hexRGB("#b8a888"), hexRGB("#e8dcc0"), n);
  out[0] = col[0]; out[1] = col[1]; out[2] = col[2];
}

function uranusRingAlpha(r: number): number {
  if (r < 0.55 || r > 0.95) return 0;
  let a = 0;
  if (r > 0.72 && r < 0.76) a = 0.3;
  if (r > 0.86 && r < 0.9) a = 0.45;
  if (r > 0.93 && r < 0.95) a = 0.6;
  return a;
}

/* ------------------------------------------------------------------ */
/* Public API — cached                                                 */
/* ------------------------------------------------------------------ */

export type BodyTextures = { map: THREE.Texture; bump?: THREE.Texture };

const cache = new Map<string, BodyTextures>();
const ringCache = new Map<string, THREE.Texture>();

function crateredBody(
  key: string,
  base: (u: number, v: number, out: RGB) => void,
  craterSeed: number,
  craterCount: number,
  craterMin: number,
  craterMax: number,
  w: number,
  h: number,
  bumpStrength: number
): BodyTextures {
  const hit = cache.get(key);
  if (hit) return hit;

  const colorCanvas = buildCanvas(w, h, base);
  const cctx = colorCanvas.getContext("2d")!;
  const craters = craterList(craterSeed, craterCount, craterMin, craterMax);
  paintCratersColor(cctx, craters, w, h, 1);

  const bumpCanvas = buildCanvas(w, h, (u, v, out) => {
    const n = fbm(u * 8, v * 4, 8, 4, craterSeed + 5, 4);
    const g = 0.4 + n * 0.2;
    out[0] = g; out[1] = g; out[2] = g;
  });
  paintCratersBump(bumpCanvas.getContext("2d")!, craters, w, h);

  void bumpStrength;
  const res = {
    map: canvasTexture(colorCanvas, true),
    bump: canvasTexture(bumpCanvas, false),
  };
  cache.set(key, res);
  return res;
}

export function getPlanetTextures(kind: string): BodyTextures {
  switch (kind) {
    case "mercury":
      return crateredBody("mercury", mercuryPainter, 7, 170, 0.004, 0.03, 1024, 512, 1);
    case "venus": {
      if (cache.has("venus")) return cache.get("venus")!;
      const res = { map: canvasTexture(buildCanvas(768, 384, venusPainter), true) };
      cache.set("venus", res);
      return res;
    }
    case "earth": {
      if (cache.has("earth")) return cache.get("earth")!;
      const res = { map: canvasTexture(buildCanvas(1024, 512, earthPainter), true) };
      cache.set("earth", res);
      return res;
    }
    case "mars":
      return crateredBody("mars", marsPainter, 9, 40, 0.003, 0.015, 1024, 512, 0.6);
    case "jupiter": {
      if (cache.has("jupiter")) return cache.get("jupiter")!;
      const res = { map: canvasTexture(buildCanvas(1024, 512, jupiterPainter), true) };
      cache.set("jupiter", res);
      return res;
    }
    case "saturn": {
      if (cache.has("saturn")) return cache.get("saturn")!;
      const res = { map: canvasTexture(buildCanvas(1024, 512, saturnPainter), true) };
      cache.set("saturn", res);
      return res;
    }
    case "uranus": {
      if (cache.has("uranus")) return cache.get("uranus")!;
      const res = { map: canvasTexture(buildCanvas(512, 256, uranusPainter), true) };
      cache.set("uranus", res);
      return res;
    }
    case "neptune": {
      if (cache.has("neptune")) return cache.get("neptune")!;
      const res = { map: canvasTexture(buildCanvas(512, 256, neptunePainter), true) };
      cache.set("neptune", res);
      return res;
    }
    case "pluto": {
      if (cache.has("pluto")) return cache.get("pluto")!;
      const res = { map: canvasTexture(buildCanvas(512, 256, plutoPainter), true) };
      cache.set("pluto", res);
      return res;
    }
    case "moon":
      return crateredBody("moon", moonPainter, 13, 150, 0.005, 0.035, 512, 256, 1);
    case "io": {
      if (cache.has("io")) return cache.get("io")!;
      const res = { map: canvasTexture(buildCanvas(384, 192, ioPainter), true) };
      cache.set("io", res);
      return res;
    }
    case "europa": {
      if (cache.has("europa")) return cache.get("europa")!;
      const res = { map: canvasTexture(buildCanvas(384, 192, europaPainter), true) };
      cache.set("europa", res);
      return res;
    }
    case "ganymede": {
      if (cache.has("ganymede")) return cache.get("ganymede")!;
      const res = { map: canvasTexture(buildCanvas(384, 192, ganymedePainter), true) };
      cache.set("ganymede", res);
      return res;
    }
    case "callisto": {
      if (cache.has("callisto")) return cache.get("callisto")!;
      const res = { map: canvasTexture(buildCanvas(384, 192, callistoPainter), true) };
      cache.set("callisto", res);
      return res;
    }
    case "titan": {
      if (cache.has("titan")) return cache.get("titan")!;
      const res = { map: canvasTexture(buildCanvas(384, 192, titanPainter), true) };
      cache.set("titan", res);
      return res;
    }
    case "triton": {
      if (cache.has("triton")) return cache.get("triton")!;
      const res = { map: canvasTexture(buildCanvas(384, 192, tritonPainter), true) };
      cache.set("triton", res);
      return res;
    }
    default: {
      if (cache.has(kind)) return cache.get(kind)!;
      const res = { map: canvasTexture(buildCanvas(256, 128, moonPainter), true) };
      cache.set(kind, res);
      return res;
    }
  }
}

export function getRingTexture(kind: "saturn" | "uranus"): THREE.Texture {
  const hit = ringCache.get(kind);
  if (hit) return hit;
  const W = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = 8;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, 8);
  const out: RGB = [0, 0, 0];
  for (let x = 0; x < W; x++) {
    const r = x / (W - 1);
    if (kind === "saturn") saturnRingColor(r, out);
    else {
      const g = hexRGB("#9aa8a8");
      out[0] = g[0]; out[1] = g[1]; out[2] = g[2];
    }
    const a = kind === "saturn" ? saturnRingAlpha(r) : uranusRingAlpha(r);
    for (let y = 0; y < 8; y++) {
      const i = (y * W + x) * 4;
      img.data[i] = out[0] * 255;
      img.data[i + 1] = out[1] * 255;
      img.data[i + 2] = out[2] * 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  ringCache.set(kind, tex);
  return tex;
}
