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

// Center big circles: set start/end Y positions here (pixels).
// Leave as `null` to use the computed defaults.
const CENTER_POS = {
  // top: { y0: 350, y1: 280 },
  // bottom: { y0: 730, y1: 800 },
   top: { y0: 280, y1: 540 },
  bottom: { y0: 800, y1: 540 },
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

let isPaused = false;

function preload() {
  // comment this out if you don't have the file
  img = loadImage("/text.png");
}

function setup() {
  createCanvas(L.w, L.h);
  pixelDensity(1);
  frameRate(60);
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
  const cy = height / 2;
  const centerTopY0 = CENTER_POS.top.y0 ?? (cy - centerRy);
  const centerTopY1 = CENTER_POS.top.y1 ?? cy;
  const centerBotY0 = CENTER_POS.bottom.y0 ?? (cy + centerRy);
  const centerBotY1 = CENTER_POS.bottom.y1 ?? cy;
  centerBig = [
    { x: cx, y: centerTopY0, y0: centerTopY0, y1: centerTopY1, r: L.bigR, ry: centerRy, invert: false, idx: rightBig[rightBig.length - 1].idx + 1, scheme: "yellow" },
    { x: cx, y: centerBotY0, y0: centerBotY0, y1: centerBotY1, r: L.bigR, ry: centerRy, invert: true, idx: rightBig[rightBig.length - 1].idx + 2, scheme: "yellow" },
  ];
}

function keyPressed() {
  if (key === "p" || key === "P") {
    isPaused = !isPaused;
    if (isPaused) noLoop();
    else loop();
  }
}

let waitTime = 30;
function draw() {
  background(...P.yellow);
  timeSec = frameCount / 60;

  // Shared timing
  const STEP_PERIOD_SEC = 3.5; // seconds per step

  // Background crossfade (slow, springy loop)
  const bgT = springPingPong01(timeSec, STEP_PERIOD_SEC * 4, 0.06); // 4 steps per full 0..1..0 loop
  stripeOuterColor = lerpRGB(P.red, P.gray, bgT);
  stripeInnerColor = lerpRGB(P.gray, P.red, bgT);

  drawBackground();

  // Step animation timing (shared "beat" for everything below)
  const step = stepSpring(timeSec, STEP_PERIOD_SEC, 0.58, 0);
  const leftAngle = HALF_PI + HALF_PI * step.total;  // +90° per step (clockwise in screen coords)
  const rightAngle = HALF_PI - HALF_PI * step.total; // -90° per step (counter-clockwise)

  // Circles keep fixed gradients (no stripe-color crossfade)
  drawGradientCircleGroup(leftSmall, leftAngle, P.red, P.gray);
  drawGradientCircleGroup(rightSmall, rightAngle, P.red, P.gray);

  drawBigStripeGroup(leftBig, leftAngle, P.gray, P.red);
  drawBigStripeGroup(rightBig, rightAngle, P.gray, P.red);

  // Center circles: gradients static, centers "gravitate" in/out on each step

  drawCenterGroup(centerBig, step);
  
  // Text overlay
  if (img) image(img, 742, 480);

  textSize(24);
  text("timeSec: " + timeSec.toFixed(2), 10, 20);
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
function drawGradientCircleGroup(circles, angle, cA, cB) {
  for (const c of circles) {
    const isEllipse = typeof c.rx === "number" && typeof c.ry === "number";
    const rx = isEllipse ? c.rx : c.r;
    const ry = isEllipse ? c.ry : c.r;

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

function drawBigStripeGroup(circles, angle, cA, cB) {
  for (const c of circles) {
    const rx = typeof c.rx === "number" ? c.rx : c.r;
    const ry = typeof c.ry === "number" ? c.ry : rx * ellipseYScale;

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

function drawCenterGroup(circles, step) {
  const p = step.step % 2 === 0 ? step.p : 1 - step.p; // in -> hold -> out -> hold ...

  for (const c of circles) {
    const rx = c.r;
    const ry = typeof c.ry === "number" ? c.ry : rx * ellipseYScale;
    const y0 = typeof c.y0 === "number" ? c.y0 : c.y;
    const y1 = typeof c.y1 === "number" ? c.y1 : y0;
    const y = lerp(y0, y1, p);

    gradEllipse({
      x: c.x,
      y,
      rx,
      ry,
      cA: P.yellow,
      cB: P.gray,
      angle: HALF_PI,
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
  const y0 = y - dy * d*0.7;
  const x1 = x + dx * d;
  const y1 = y + dy * d*0.7;

  const g = ctx.createLinearGradient(x0, y0, x1, y1);

  const a = cssColor(cA);
  const b = cssColor(cB);

  if (!invert) {
    g.addColorStop(0, a);
    g.addColorStop(1, b);
  } else {
    g.addColorStop(0, b);
    g.addColorStop(1, a);
  }

  ctx.fillStyle = g;
  // ctx.globalAlpha = mouseX / width;
  ctx.fillRect(x - rx, y - ry, rx * 2, ry * 2);

  ctx.restore();
  // ctx.globalAlpha = 1;
}

// ----------------------------
// Animation helpers
// ----------------------------
function cssColor(c) {
  if (Array.isArray(c)) {
    const r = c[0] ?? 0;
    const g = c[1] ?? 0;
    const b = c[2] ?? 0;
    const a = c[3];
    if (typeof a === "number") {
      const alpha = a <= 1 ? a : a / 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return `rgb(${r},${g},${b})`;
  }
  if (typeof c === "string") return c;
  if (c && typeof c === "object" && Array.isArray(c.levels)) {
    return cssColor(c.levels);
  }
  return "rgba(0,0,0,0)";
}

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

function stepSpringV2(time, periodSec, moveFrac = 0.58, back = 1.12, useSpring = true) {
  const step = floor(time / periodSec);
  const t = (time / periodSec) % 1;

  if (t >= moveFrac) {
    return { step, p: 1, total: step + 1 };
  }

  const u = t / max(1e-6, moveFrac);
  let p;
  if (useSpring) {
    p = easeOutBack(u, back);
  } else {
    p = u;
  }
  return { step, p, total: step + p };
}

function stepSpring(time, periodSec, moveFrac = 0.58, back = 1.12) {
  const step = floor(time / periodSec);
  const t = (time / periodSec) % 1;

  if (t >= moveFrac) {
    return { step, p: 1, total: step + 1 };
  }

  const u = t / max(1e-6, moveFrac);
  const p = easeOutBack(u, back);
  return { step, p, total: step + p };
}
