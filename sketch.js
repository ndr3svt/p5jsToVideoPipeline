/*
Forum des Fondations — generative layout (p5.js)

Palette
Grau:  #d3ccc7  (211,204,199)
Rot:   #fe7e72  (254,126,114)
Gelb:  #e9fe6d  (233,254,109)

Notes
- Uses Canvas2D gradients (fast) via drawingContext.
- All circles start perfectly in-phase, then slowly drift out, then return to phase.
*/

let img;

const P = {
  gray: [211, 204, 199],
  red: [254, 126, 114],
  yellow: [233, 254, 109],
};

const L = {
  w: 1920,
  h: 1080,
  pad: 32,
  grayW: 232,
  redW: 464,
  bigR: 232,     // for the two huge center circles
};

let timeSec = 0;

// Circle groups
let leftSmall = [];
let rightSmall = [];
let leftBig = [];
let rightBig = [];
let centerBig = [];
let ellipseYScale = 1;

let stripeOuterColor = null;
let stripeInnerColor = null;

function preload() {
  // comment this out if you don't have the file
  img = loadImage("/text.png");
}

function setup() {
  createCanvas(L.w, L.h);
  pixelDensity(1);

  // Panel x positions
  const leftGrayX = L.pad;
  const leftRedX = L.pad + L.grayW;

  const rightGrayX = width - L.pad - L.grayW;
  const rightRedX = width - L.pad - L.grayW - L.redW;

  // ----- SMALL circles: fill the gray panels (2 cols x 8 rows) -----
  // Design note: these are intentionally a bit taller than wide (ellipse),
  // so their height matches the panel height / rows.
  const smallCols = 2;
  const smallRows = 8;
  const grayPanelH = height - 2 * L.pad;
  const smallStepX = L.grayW / smallCols;
  const smallStepY = grayPanelH / smallRows;
  ellipseYScale = smallStepY / smallStepX || 1;

  leftSmall = makeGridEllipses({
    x0: leftGrayX,
    y0: L.pad,
    cols: smallCols,
    rows: smallRows,
    stepX: smallStepX,
    stepY: smallStepY,
    rx: smallStepX / 2,
    ry: smallStepY / 2,
    invertChecker: true,
    idxStart: 0,
  });

  rightSmall = mirrorX(leftSmall).map(c => ({
    ...c,
    invert: !c.invert, // inverted checker pattern on the right
  }));

  // ----- BIG circles: fill the red stripes (2 cols x 5 rows) -----
  // Each red stripe is 464px wide; with 2 columns, each circle diameter is 232 (r=116).
  const bigCols = 2;
  const bigRows = 4;
  const bigDStripe = L.redW / bigCols; // 232
  const bigRx = bigDStripe / 2;              // 116 (width 232)
  const bigRy = bigRx * ellipseYScale;       // 127 (height 254)
  const bigStepX = bigDStripe;
  const bigStepY = bigRy * 2; // touch vertically (no gaps / no overlap)
  const bigY0 = (height - bigRows * bigStepY) / 2; // equal margin top/bottom

  leftBig = makeGridEllipses({
    x0: leftRedX,
    y0: bigY0,
    cols: bigCols,
    rows: bigRows,
    stepX: bigStepX,
    stepY: bigStepY,
    rx: bigRx,
    ry: bigRy,
    invertChecker: true, // intercalated gradient directions
    idxStart: leftSmall.length,
  });

  rightBig = mirrorX(leftBig).map(c => ({
    ...c,
    idx: c.idx + leftBig.length +250, // keep unique indices
  }));

  // ----- CENTER huge circles (top and bottom) -----
  // Center column width is: grayW + redW + redW + grayW = 232+464+464+232 = 1392
  // But easiest: just use canvas center x.
  const cx = width / 2;
  const centerRy = 507 / 2; // 464w x 507h
  centerBig = [
    { x: cx, y: centerRy, r: L.bigR, ry: centerRy, invert: false, idx: rightBig[rightBig.length - 1].idx + 1, scheme: "yellow" },
    { x: cx, y: height - centerRy, r: L.bigR, ry: centerRy, invert: true, idx: rightBig[rightBig.length - 1].idx + 2, scheme: "yellow" },
  ];
}

function draw() {
  background(...P.yellow);
  timeSec = frameCount / 60;

  // Background crossfade (slow, springy loop)
  const bgT = springPingPong01(timeSec, 14.0, 0.06);
  stripeOuterColor = lerpRGB(P.red, P.gray, bgT);
  stripeInnerColor = lerpRGB(P.gray, P.red, bgT);

  drawBackground();

  // Gradient rotation (180°) in accelerating chains per sector
  drawGradientCircleGroup(leftSmall, timeSec, { period: 6.5, chain: 0.55, accel: 0.62 }, stripeOuterColor, stripeInnerColor);
  drawGradientCircleGroup(rightSmall, timeSec, { period: 6.5, chain: 0.55, accel: 0.62 }, stripeOuterColor, stripeInnerColor);

  drawBigStripeGroup(leftBig, timeSec, { period: 7.2, chain: 0.58, accel: 0.60 }, stripeInnerColor, stripeOuterColor);
  drawBigStripeGroup(rightBig, timeSec, { period: 7.2, chain: 0.58, accel: 0.60 }, stripeInnerColor, stripeOuterColor);

  drawCenterGroup(centerBig, timeSec, { period: 8.4, chain: 0.45, accel: 0.70 });

  // Text overlay
  if (img) image(img, 742, 480);
}

// ----------------------------
// Background panels
// ----------------------------
function drawBackground() {
  noStroke();

  // left outer stripe (swap colors with inner stripe)
  fill(...stripeOuterColor);
  rect(L.pad, L.pad, L.grayW, height - 2 * L.pad);

  // left inner stripe (swap colors with outer stripe)
  fill(...stripeInnerColor);
  rect(L.pad + L.grayW, 0, L.redW, height);

  // right outer stripe (swap colors with inner stripe)
  fill(...stripeOuterColor);
  rect(width - L.pad - L.grayW, L.pad, L.grayW, height - 2 * L.pad);

  // right inner stripe (swap colors with outer stripe)
  fill(...stripeInnerColor);
  rect(width - L.pad - L.grayW - L.redW, 0, L.redW, height);
}

// ----------------------------
// Group draw helpers
// ----------------------------
function drawGradientCircleGroup(circles, time, anim, cA, cB) {
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const isEllipse = typeof c.rx === "number" && typeof c.ry === "number";
    const rx = isEllipse ? c.rx : c.r;
    const ry = isEllipse ? c.ry : c.r;

    const angle = chainRotateAngle(time, anim, i, circles.length, HALF_PI);

    gradEllipse({
      x: c.x,
      y: c.y,
      rx,
      ry,
      cA,
      cB,
      angle,
      invert: !!c.invert,
    });
  }
}

function drawBigStripeGroup(circles, time, anim, cA, cB) {
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const rx = typeof c.rx === "number" ? c.rx : c.r;
    const ry = typeof c.ry === "number" ? c.ry : rx * ellipseYScale;
    const angle = chainRotateAngle(time, anim, i, circles.length, HALF_PI);

    gradEllipse({
      x: c.x,
      y: c.y,
      rx,
      ry,
      cA,
      cB,
      angle,
      invert: !!c.invert,
    });
  }
}

function drawCenterGroup(circles, time, anim) {
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const rx = c.r;
    const ry = typeof c.ry === "number" ? c.ry : rx * ellipseYScale;
    const angle = chainRotateAngle(time, anim, i, circles.length, HALF_PI);

    gradEllipse({
      x: c.x,
      y: c.y,
      rx,
      ry,
      cA: P.yellow,
      cB: P.gray,
      angle,
      invert: !c.invert,
    });
  }
}

// ----------------------------
// Grid + mirror
// ----------------------------
function makeGridCircles({
  x0, y0,
  cols, rows,
  stepX, stepY,
  r,
  invertChecker = true,
  idxStart = 0,
}) {
  const out = [];
  let idx = idxStart;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out.push({
        x: x0 + i * stepX + r,
        y: y0 + j * stepY + r,
        r,
        invert: invertChecker ? ((i + j) % 2 === 1) : false,
        idx: idx++,
      });
    }
  }
  return out;
}

function makeGridEllipses({
  x0, y0,
  cols, rows,
  stepX, stepY,
  rx, ry,
  invertChecker = true,
  idxStart = 0,
}) {
  const out = [];
  let idx = idxStart;

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      out.push({
        x: x0 + i * stepX + rx,
        y: y0 + j * stepY + ry,
        rx,
        ry,
        invert: invertChecker ? ((i + j) % 2 === 1) : false,
        idx: idx++,
      });
    }
  }
  return out;
}

function mirrorX(circles) {
  return circles.map(c => ({ ...c, x: width - c.x }));
}

// ----------------------------
// Gradient circle (fast, clipped)
// ----------------------------
function gradCircle({ x, y, r, cA, cB, angle = HALF_PI, invert = false }) {
  gradEllipse({ x, y, rx: r, ry: r, cA, cB, angle, invert });
}

function gradEllipse({ x, y, rx, ry, cA, cB, angle = HALF_PI, invert = false }) {
  const ctx = drawingContext;
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  const d = Math.max(rx, ry);
  const dx = cos(angle);
  const dy = sin(angle);
  const x0 = x - dx * d;
  const y0 = y - dy * d;
  const x1 = x + dx * d;
  const y1 = y + dy * d;

  const g = ctx.createLinearGradient(x0, y0, x1, y1);

  const a = `rgb(${cA[0]},${cA[1]},${cA[2]})`;
  const b = `rgb(${cB[0]},${cB[1]},${cB[2]})`;

  if (!invert) {
    g.addColorStop(0, a);
    g.addColorStop(1, b);
  } else {
    g.addColorStop(0, b);
    g.addColorStop(1, a);
  }

  ctx.fillStyle = g;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);

  ctx.restore();
}

// ----------------------------
// Animation helpers
// ----------------------------
function clamp01(x) {
  return max(0, min(1, x));
}

function lerpRGB(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

// 0..1..0 loop with a subtle springy wobble (clamped)
function springPingPong01(time, periodSec, wobble = 0.06) {
  const u = (time / periodSec) % 1;
  const base = 0.5 - 0.5 * cos(TWO_PI * u); // 0..1..0
  const w = wobble * sin(TWO_PI * u * 2) * (1 - abs(2 * base - 1));
  return clamp01(base + w);
}

function easeOutBack(t, s = 1.15) {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

// Returns gradient angle that rotates 180° (π) with a springy, accelerating chain.
function chainRotateAngle(time, anim, index, total, baseAngle = HALF_PI) {
  const period = anim.period ?? 7.0;
  const chain = anim.chain ?? 0.55; // 0..1 portion reserved for stagger
  const accel = anim.accel ?? 0.62; // <1 => accelerating spacing

  const cyc = (time / period) % 1;
  const forward = cyc < 0.5;
  const u = forward ? cyc * 2 : (1 - cyc) * 2; // 0..1 each half-cycle
  const dir = forward ? 1 : -1;

  const n = max(1, total);
  const order = n === 1 ? 0 : index / (n - 1);
  const delay = pow(order, accel) * chain;
  const local = clamp01((u - delay) / max(1e-6, 1 - chain));
  const p = easeOutBack(local, 1.12);

  return baseAngle + dir * PI * p;
}
