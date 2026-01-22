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
  smallStep: 116,
  smallR: 58,
  bigR: 232,     // for the two huge center circles
};

let timeSec = 0;

// Circle groups
let leftSmall = [];
let rightSmall = [];
let leftBig = [];
let rightBig = [];
let centerBig = [];

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

  // ----- SMALL circles: fill the gray panels (2 cols x 9 rows) -----
  // y0=pad so the top starts inside the panel; step=116; r=58
  leftSmall = makeGridCircles({
    x0: leftGrayX,
    y0: L.pad,
    cols: 2,
    rows: 8,
    stepX: L.smallStep,
    stepY: L.smallStep,
    r: L.smallR,
    invertChecker: true,
    idxStart: 0,
  });

  rightSmall = mirrorX(leftSmall).map(c => ({
    ...c,
    invert: !c.invert, // inverted checker pattern on the right
  }));

  // ----- BIG circles: fill the red stripes (2 cols x 5 rows), radius 232 (diameter 464) -----
  // This makes 2 columns that exactly match 464 width (touching).
  // 5 rows fits 1080 height with overflow — we center them vertically by shifting y0.
  const bigRStripe = 232;
  const bigStepX = bigRStripe * 2; // 464
  const bigStepY = bigRStripe * 2; // 464

  // Put 3 rows instead of 5 for a cleaner fit (top/middle/bottom).
  // If you REALLY want 5 rows, set rows: 5 and y0: -something.
  leftBig = makeGridCircles({
    x0: leftRedX,
    y0: 0,
    cols: 2,
    rows: 3,
    stepX: bigStepX,
    stepY: bigStepY,
    r: bigRStripe,
    invertChecker: false,
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
  centerBig = [
    { x: cx, y: 232, r: L.bigR, invert: false, idx: rightBig[rightBig.length - 1].idx + 1, scheme: "yellow" },
    { x: cx, y: height - 232, r: L.bigR, invert: true, idx: rightBig[rightBig.length - 1].idx + 2, scheme: "yellow" },
  ];
}

function draw() {
  background(...P.yellow);
  drawBackground();

  timeSec += 1 / 60;

  // Sync -> drift -> sync envelope
  const cycle = 18.0;          // seconds for full 0→1→0 cycle
  const env = envelope01(timeSec, cycle);

  // Motion tuning
  const spreadSmall = 0.38;    // how far phases diverge at peak
  const spreadBig = 0.10;
  const spreadCenter = 0.08;

  const freqSmall = 0.10;      // gentle float
  const freqBig = 0.07;
  const freqCenter = 0.05;

  const ampSmall = 18;
  const ampBig = 10;
  const ampCenter = 22;

  // Draw groups
  drawGradientCircleGroup(leftSmall, env, spreadSmall, freqSmall, ampSmall, "redGray");
  drawGradientCircleGroup(rightSmall, env, spreadSmall, freqSmall, ampSmall, "redGray");

  // Big circles in red stripes (subtle gradient or solid)
  drawBigStripeGroup(leftBig, env, spreadBig, freqBig, ampBig);
  drawBigStripeGroup(rightBig, env, spreadBig, freqBig, ampBig);

  // Center huge circles (yellow/gray gradients)
  drawCenterGroup(centerBig, env, spreadCenter, freqCenter, ampCenter);

  // Text overlay
  if (img) image(img, 742, 480);
}

// ----------------------------
// Background panels
// ----------------------------
function drawBackground() {
  noStroke();

  // left gray panel
  fill(...P.gray);
  rect(L.pad, L.pad, L.grayW, height - 2 * L.pad);

  // left red stripe
  fill(...P.red);
  rect(L.pad + L.grayW, 0, L.redW, height);

  // right gray panel
  fill(...P.gray);
  rect(width - L.pad - L.grayW, L.pad, L.grayW, height - 2 * L.pad);

  // right red stripe
  fill(...P.red);
  rect(width - L.pad - L.grayW - L.redW, 0, L.redW, height);
}

// ----------------------------
// Group draw helpers
// ----------------------------
function drawGradientCircleGroup(circles, env, spread, freq, amp, scheme) {
  for (const c of circles) {
    const phase = env * spread * c.idx; // 0 at start/end => all in sync
    const yOff = springy(timeSec, freq, phase) * amp;
    const drift = springy(timeSec, freq * 0.8, phase + 1.3) * (amp * 0.6);

    if (scheme === "redGray") {
      gradCircle({
        x: c.x,
        y: c.y + yOff,
        r: c.r,
        cA: P.red,
        cB: P.gray,
        vertical: true,
        invert: c.invert,
        drift,
      });
    }
  }
}

function drawBigStripeGroup(circles, env, spread, freq, amp) {
  for (const c of circles) {
    const phase = env * spread * c.idx;
    const yOff = springy(timeSec, freq, phase) * amp;
    const drift = springy(timeSec, freq * 0.7, phase + 0.8) * (amp * 0.4);

    // subtle gradient across big circles (red -> slightly darker red-ish / gray-ish)
    // You can switch to solid by replacing with fill+circle.
    gradCircle({
      x: c.x,
      y: c.y + yOff,
      r: c.r,
      cA: P.red,
      cB: [220, 80, 70], // slightly deeper red (still in palette range)
      vertical: true,
      invert: false,
      drift,
    });
  }
}

function drawCenterGroup(circles, env, spread, freq, amp) {
  for (const c of circles) {
    const phase = env * spread * c.idx;
    const yOff = springy(timeSec, freq, phase) * amp;
    const drift = springy(timeSec, freq * 0.6, phase + 1.1) * (amp * 0.5);

    gradCircle({
      x: c.x,
      y: c.y + yOff,
      r: c.r,
      cA: P.yellow,
      cB: P.gray,
      vertical: true,
      invert: c.invert,
      drift,
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

function mirrorX(circles) {
  return circles.map(c => ({ ...c, x: width - c.x }));
}

// ----------------------------
// Gradient circle (fast, clipped)
// ----------------------------
function gradCircle({ x, y, r, cA, cB, vertical = true, invert = false, drift = 0 }) {
  const ctx = drawingContext;
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2);
  ctx.clip();

  // Gradient anchored to the shape (moves with it)
  const x0 = vertical ? x : x - r + drift;
  const y0 = vertical ? y - r + drift : y;
  const x1 = vertical ? x : x + r + drift;
  const y1 = vertical ? y + r + drift : y;

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
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  ctx.restore();
}

// ----------------------------
// In-phase -> out-of-phase -> in-phase envelope
// ----------------------------
function envelope01(time, cycleSec) {
  const u = (time / cycleSec) % 1;      // 0..1
  return 0.5 - 0.5 * cos(TWO_PI * u);   // 0..1..0
}

// Soft spring-like oscillator (stable + elegant)
function springy(time, freq, phase) {
  const a = sin(TWO_PI * freq * time + phase);
  const b = 0.35 * sin(TWO_PI * (freq * 2.0) * time + phase * 1.6);

  // smooth turning points
  const u = (a + 1) * 0.5;
  const eased = u * u * (3 - 2 * u);

  return (eased * 2 - 1) + b;
}
