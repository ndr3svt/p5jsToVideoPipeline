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

  // left outer stripe (swap colors with inner stripe)
  fill(...P.red);
  rect(L.pad, L.pad, L.grayW, height - 2 * L.pad);

  // left inner stripe (swap colors with outer stripe)
  fill(...P.gray);
  rect(L.pad + L.grayW, 0, L.redW, height);

  // right outer stripe (swap colors with inner stripe)
  fill(...P.red);
  rect(width - L.pad - L.grayW, L.pad, L.grayW, height - 2 * L.pad);

  // right inner stripe (swap colors with outer stripe)
  fill(...P.gray);
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
      const isEllipse = typeof c.rx === "number" && typeof c.ry === "number";
      const draw = isEllipse ? gradEllipse : gradCircle;

      draw({
        x: c.x,
        y: c.y + yOff,
        ...(isEllipse ? { rx: c.rx, ry: c.ry } : { r: c.r }),
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

    // Inner stripe circles: gradient from stripe bg (gray) to other stripe bg (red/orange).
    const rx = typeof c.rx === "number" ? c.rx : c.r;
    const ry = typeof c.ry === "number" ? c.ry : rx * ellipseYScale;
    gradEllipse({
      x: c.x,
      y: c.y + yOff,
      rx,
      ry,
      cA: P.gray,
      cB: P.red,
      vertical: true,
      invert: !!c.invert,
      drift,
    });
  }
}

function drawCenterGroup(circles, env, spread, freq, amp) {
  for (const c of circles) {
    const phase = env * spread * c.idx;
    const yOff = springy(timeSec, freq, phase) * amp;
    const drift = springy(timeSec, freq * 0.6, phase + 1.1) * (amp * 0.5);

    const rx = c.r;
    const ry = typeof c.ry === "number" ? c.ry : rx * ellipseYScale;
    gradEllipse({
      x: c.x,
      y: c.y + yOff,
      rx,
      ry,
      cA: P.yellow,
      cB: P.gray,
      vertical: true,
      invert: !c.invert,
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

function gradEllipse({ x, y, rx, ry, cA, cB, vertical = true, invert = false, drift = 0 }) {
  const ctx = drawingContext;
  ctx.save();

  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  // Gradient anchored to the shape (moves with it)
  const x0 = vertical ? x : x - rx + drift;
  const y0 = vertical ? y - ry + drift : y;
  const x1 = vertical ? x : x + rx + drift;
  const y1 = vertical ? y + ry + drift : y;

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
