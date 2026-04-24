/**
 * slinky-sleeve.js - Page init for the Slinky Sleeve animated loader.
 *
 * Mechanism
 * ---------
 * Same oscillation as Slinky Rings (symmetric sinusoidal, staggered per
 * ring). Difference: each ring's outline is an SVG <path> that morphs
 * every frame based on the ring's current Y. When a ring is above or
 * below the target object (a boxy capital "I" centred at stage centre),
 * the path is a plain circle sized by ring index. When the ring enters
 * the object's vertical extent, the path morphs into the horizontal
 * cross-section of the I at that height — a wide rectangle through the
 * top/bottom bars, a narrow rectangle through the stem. A small fade
 * zone at the top and bottom edges of the I smoothly interpolates from
 * circle to sleeve so rings don't pop.
 *
 * Single entry point:
 *   initSlinkySleeve(stageId, controlsId)
 *
 * Unlike Slinky Rings and Magic Rings, motion is driven by a
 * requestAnimationFrame loop (CSS can't animate path outlines of
 * non-convex shapes). The loop auto-stops when the stage leaves the
 * DOM so navigating away doesn't leak cycles.
 *
 * Shape of origin: Slinky Rings (styles/_slinky_rings.scss,
 * js/backgrounds/slinky-rings.js), which descends from NlghtM4re's
 * Uiverse.io loader (MIT).
 */

const COUNT_DEFAULT     = 21;
const PERIMETER_SAMPLES = 32;   // vertices per shape; higher = smoother, more CPU

// Module-scoped so knobs survive navigation away and back, the same way
// the :root CSS variables do.
let currentCount = COUNT_DEFAULT;
let rafHandle   = null;
let startTime   = 0;
let rings       = [];   // [{ div, path, i }]

// ============================================================
// DOM construction
// ============================================================

function populateStage(container, count) {
  container.classList.add('slinky-sleeve-stage');
  container.innerHTML = '';
  rings = [];
  const SVG_NS = 'http://www.w3.org/2000/svg';
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'ring';
    div.style.setProperty('--i', i);
    // Nudge each ring a hair in Z so z-fighting between overlapping sleeves
    // (when rings cluster) is deterministic rather than flickery.
    div.style.zIndex = i;

    const svg = document.createElementNS(SVG_NS, 'svg');
    // 60vmin box matches the ring div size; path coords are in vmin, so
    // a point at (10, 0) in path coords lands 10vmin right of the div
    // centre on screen (before 3D tilt).
    svg.setAttribute('viewBox', '-30 -30 60 60');

    const path = document.createElementNS(SVG_NS, 'path');
    svg.appendChild(path);
    div.appendChild(svg);
    container.appendChild(div);
    rings.push({ div, path, i });
  }
}

// ============================================================
// Geometry helpers
// ============================================================

function readNum(computed, prop, fallback) {
  const v = parseFloat(computed.getPropertyValue(prop));
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Sample a circle of radius r at PERIMETER_SAMPLES equally-spaced angles,
 * starting at (r, 0) and walking CCW. This start + direction must match
 * rectPath() exactly so the two shapes can morph vertex-by-vertex without
 * shearing.
 */
function circlePath(r) {
  const pts = new Array(PERIMETER_SAMPLES);
  for (let k = 0; k < PERIMETER_SAMPLES; k++) {
    const a = (2 * Math.PI * k) / PERIMETER_SAMPLES;
    pts[k] = [r * Math.cos(a), r * Math.sin(a)];
  }
  return pts;
}

/**
 * Sample a W × D rectangle at PERIMETER_SAMPLES equally-spaced perimeter
 * positions, starting at (W/2, 0) walking CCW. See note on circlePath —
 * the start vertex and direction have to match for clean morphing.
 */
function rectPath(w, d) {
  const W = w, D = d;
  const perim = 2 * (W + D);
  const step  = perim / PERIMETER_SAMPLES;
  const pts   = new Array(PERIMETER_SAMPLES);
  for (let k = 0; k < PERIMETER_SAMPLES; k++) {
    const s = k * step;   // arc length from (W/2, 0)
    let x, y;
    if      (s < D / 2)                     { x = W / 2;             y = s; }
    else if (s < D / 2 + W)                 { x = W / 2 - (s - D / 2); y = D / 2; }
    else if (s < D / 2 + W + D)             { x = -W / 2;             y = D / 2 - (s - D / 2 - W); }
    else if (s < D / 2 + W + D + W)         { x = -W / 2 + (s - D / 2 - W - D); y = -D / 2; }
    else                                    { x = W / 2;             y = -D / 2 + (s - D / 2 - W - D - W); }
    pts[k] = [x, y];
  }
  return pts;
}

function lerpPaths(p1, p2, t) {
  const pts = new Array(PERIMETER_SAMPLES);
  for (let k = 0; k < PERIMETER_SAMPLES; k++) {
    pts[k] = [
      p1[k][0] * (1 - t) + p2[k][0] * t,
      p1[k][1] * (1 - t) + p2[k][1] * t,
    ];
  }
  return pts;
}

function pathD(pts) {
  let d = `M ${pts[0][0].toFixed(3)} ${pts[0][1].toFixed(3)}`;
  for (let k = 1; k < pts.length; k++) {
    d += ` L ${pts[k][0].toFixed(3)} ${pts[k][1].toFixed(3)}`;
  }
  d += ' Z';
  return d;
}

/**
 * Shape a ring at current screen-Y y (vmin, +y = downward). Returns
 * an array of PERIMETER_SAMPLES [x, y] points in the ring's local
 * (pre-tilt) 2D frame.
 *
 * Regions, by |y| relative to the I's half-height:
 *   |y| ≥ halfH + fade           → pure circle at ringRadius
 *   halfH - fade ≤ |y| < ..fade  → interpolate circle ↔ sleeve
 *   |y| < halfH - fade           → sleeve cross-section at y
 *
 * Inside the sleeve, the bar-vs-stem transition is sharp (boxy I).
 */
function computeShape(y, p) {
  const halfH = p.iHeight / 2;
  const absY  = Math.abs(y);

  // Outside I extent + fade → pure circle.
  if (absY >= halfH + p.fade) return circlePath(p.ringRadius);

  // Pick the sleeve cross-section at y: bar zone if near the ends,
  // stem zone in the middle.
  const sectionWidth = (yy) => {
    const absYY = Math.abs(yy);
    return (absYY >= halfH - p.barHeight) ? p.barWidth : p.stemWidth;
  };

  // Fully inside → exact sleeve cross-section, no interpolation.
  if (absY <= halfH - p.fade) {
    return rectPath(sectionWidth(y), p.depth);
  }

  // Fade zone → lerp circle ↔ sleeve. The sleeve shape at the fade
  // zone is whichever section the NEAREST I-interior edge has (which
  // is always a bar at the top and bottom, since the bars sit at the
  // extremes of the I's vertical extent).
  const sleeve = rectPath(p.barWidth, p.depth);
  const circle = circlePath(p.ringRadius);
  // t = 1 at absY = halfH - fade (fully sleeve),
  // t = 0 at absY = halfH + fade (fully circle).
  const t = (halfH + p.fade - absY) / (2 * p.fade);
  return lerpPaths(circle, sleeve, t);
}

// ============================================================
// rAF loop
// ============================================================

function tick(now) {
  // Auto-stop when the stage has been torn down by navigation.
  if (!rings.length || !rings[0].div.isConnected) {
    rafHandle = null;
    return;
  }

  // Read live var values once per frame so slider changes take effect
  // immediately. 21 rings × shared reads = negligible.
  const computed  = getComputedStyle(document.documentElement);
  const durationS = readNum(computed, '--slinky-sleeve-duration',   3);
  const staggerS  = readNum(computed, '--slinky-sleeve-stagger',    0.08);
  const lift      = readNum(computed, '--slinky-sleeve-lift',       15);
  const step      = readNum(computed, '--slinky-sleeve-step',       2.5);
  const iHeight   = readNum(computed, '--slinky-sleeve-i-height',   15);
  const barWidth  = readNum(computed, '--slinky-sleeve-i-bar-width',10);
  const barHeight = readNum(computed, '--slinky-sleeve-i-bar-height',3);
  const stemWidth = readNum(computed, '--slinky-sleeve-i-stem-width',3.5);
  const depth     = readNum(computed, '--slinky-sleeve-i-depth',    6);
  const fade      = readNum(computed, '--slinky-sleeve-i-fade',     1);

  const durationMs = durationS * 1000;
  const staggerMs  = staggerS  * 1000;

  if (!startTime) startTime = now;
  const t = now - startTime;

  for (const ring of rings) {
    // Match Slinky Rings keyframe timing: Y = 0 at phase 0, rises to
    // -lift at phase π/2 (ceiling), back to 0 at π, +lift at 3π/2
    // (floor), 0 at 2π. Staggered per ring index.
    const phase = ((t - ring.i * staggerMs) / durationMs) * 2 * Math.PI;
    const y     = -lift * Math.sin(phase);

    // Circle-state radius grows with ring index, matching Slinky Rings'
    // width: calc(var(--i) * var(--slinky-rings-step)) (= diameter), so
    // radius is i*step/2.
    const ringRadius = ring.i * step / 2;

    const pts = computeShape(y, {
      iHeight, barWidth, barHeight, stemWidth, depth, fade, ringRadius,
    });

    // Whole ring div translates vertically on screen by y vmin.
    ring.div.style.translate = `0 ${y.toFixed(3)}vmin`;
    ring.path.setAttribute('d', pathD(pts));
  }

  rafHandle = requestAnimationFrame(tick);
}

function startLoop() {
  if (rafHandle != null) cancelAnimationFrame(rafHandle);
  startTime = 0;
  // Honour prefers-reduced-motion by freezing at t=0 (no animation loop,
  // but still render the initial frame so the stage isn't empty).
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    tick(performance.now());
    if (rafHandle != null) { cancelAnimationFrame(rafHandle); rafHandle = null; }
    return;
  }
  rafHandle = requestAnimationFrame(tick);
}

// ============================================================
// Entry point
// ============================================================

export function initSlinkySleeve(stageId, controlsId) {
  const stage    = document.getElementById(stageId);
  const controls = document.getElementById(controlsId);
  if (!stage || !controls) {
    console.warn('[slinky-sleeve] Containers not found');
    return;
  }

  populateStage(stage, currentCount);
  startLoop();

  controls.classList.add('slinky-sleeve-controls');
  controls.innerHTML = `
    <label>Rings       <input data-knob="count"       type="range" min="3"  max="60">   <output data-out="count"></output></label>
    <label>Tilt        <input data-knob="tilt"        type="range" min="0"  max="89">   <output data-out="tilt"></output></label>
    <label>Lift        <input data-knob="lift"        type="range" min="0"  max="30">   <output data-out="lift"></output></label>
    <label>Stagger     <input data-knob="stagger"     type="range" min="0"  max="300">  <output data-out="stagger"></output></label>
    <label>Hue         <input data-knob="hue"         type="range" min="0"  max="720">  <output data-out="hue"></output></label>
    <label>Perspective <input data-knob="perspective" type="range" min="0"  max="4000" step="50"> <output data-out="perspective"></output></label>
    <label>Color       <input data-knob="color"       type="color"></label>
    <label>I Height    <input data-knob="iHeight"     type="range" min="1"  max="40"    step="0.5"> <output data-out="iHeight"></output></label>
    <label>Bar W       <input data-knob="barWidth"    type="range" min="1"  max="30"    step="0.5"> <output data-out="barWidth"></output></label>
    <label>Bar H       <input data-knob="barHeight"   type="range" min="0.5" max="15"   step="0.5"> <output data-out="barHeight"></output></label>
    <label>Stem W      <input data-knob="stemWidth"   type="range" min="0.5" max="20"   step="0.5"> <output data-out="stemWidth"></output></label>
    <label>Depth       <input data-knob="depth"       type="range" min="0.5" max="20"   step="0.5"> <output data-out="depth"></output></label>
    <label>Fade        <input data-knob="fade"        type="range" min="0"   max="5"    step="0.1"> <output data-out="fade"></output></label>
  `;

  const out = (key) => controls.querySelector(`[data-out="${key}"]`);
  const rootStyle    = document.documentElement.style;
  const rootComputed = getComputedStyle(document.documentElement);

  // Read current values from :root so the panel reflects whatever the
  // user last set, not just the SCSS defaults.
  const tilt         = readNum(rootComputed, '--slinky-sleeve-tilt',         70);
  const lift         = readNum(rootComputed, '--slinky-sleeve-lift',         15);
  const stagger      = Math.round(readNum(rootComputed, '--slinky-sleeve-stagger', 0.08) * 1000);
  const hue          = readNum(rootComputed, '--slinky-sleeve-hue-sweep',    360);
  const color        = (rootComputed.getPropertyValue('--slinky-sleeve-color') || '#00ff0d').trim();
  const perspectiveRaw = (rootComputed.getPropertyValue('--slinky-sleeve-perspective') || 'none').trim();
  const perspective  = perspectiveRaw === 'none' ? 0 : (parseFloat(perspectiveRaw) || 0);
  const iHeight      = readNum(rootComputed, '--slinky-sleeve-i-height',     15);
  const barWidth     = readNum(rootComputed, '--slinky-sleeve-i-bar-width',  10);
  const barHeight    = readNum(rootComputed, '--slinky-sleeve-i-bar-height', 3);
  const stemWidth    = readNum(rootComputed, '--slinky-sleeve-i-stem-width', 3.5);
  const depth        = readNum(rootComputed, '--slinky-sleeve-i-depth',      6);
  const fade         = readNum(rootComputed, '--slinky-sleeve-i-fade',       1);

  const set = (k, v, txt) => {
    controls.querySelector(`[data-knob="${k}"]`).value = v;
    out(k).textContent = txt;
  };

  set('count',       currentCount, currentCount);
  set('tilt',        tilt,         tilt + '\u00B0');
  set('lift',        lift,         lift + 'vmin');
  set('stagger',     stagger,      stagger + 'ms');
  set('hue',         hue,          hue + '\u00B0');
  set('perspective', perspective,  perspective === 0 ? 'off' : perspective + 'px');
  controls.querySelector('[data-knob="color"]').value = color;
  set('iHeight',     iHeight,      iHeight + 'vmin');
  set('barWidth',    barWidth,     barWidth + 'vmin');
  set('barHeight',   barHeight,    barHeight + 'vmin');
  set('stemWidth',   stemWidth,    stemWidth + 'vmin');
  set('depth',       depth,        depth + 'vmin');
  set('fade',        fade,         fade + 'vmin');

  // ---- Geometry knob: rebuild the ring DOM. ----
  controls.querySelector('[data-knob="count"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    currentCount = v;
    out('count').textContent = v;
    populateStage(stage, v);
    startLoop();
  });

  // ---- CSS-var knobs: just write the var; rAF picks it up next frame. ----
  const bindVar = (knob, cssVar, unit, fmt) => {
    controls.querySelector(`[data-knob="${knob}"]`).addEventListener('input', (e) => {
      const v = +e.target.value;
      out(knob).textContent = fmt ? fmt(v) : v + unit;
      rootStyle.setProperty(cssVar, v + unit);
    });
  };

  bindVar('tilt',      '--slinky-sleeve-tilt',         'deg', (v) => v + '\u00B0');
  bindVar('lift',      '--slinky-sleeve-lift',         'vmin');
  bindVar('hue',       '--slinky-sleeve-hue-sweep',    'deg', (v) => v + '\u00B0');
  bindVar('iHeight',   '--slinky-sleeve-i-height',     'vmin');
  bindVar('barWidth',  '--slinky-sleeve-i-bar-width',  'vmin');
  bindVar('barHeight', '--slinky-sleeve-i-bar-height', 'vmin');
  bindVar('stemWidth', '--slinky-sleeve-i-stem-width', 'vmin');
  bindVar('depth',     '--slinky-sleeve-i-depth',      'vmin');
  bindVar('fade',      '--slinky-sleeve-i-fade',       'vmin');

  // Stagger is special: slider is ms, var is seconds.
  controls.querySelector('[data-knob="stagger"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('stagger').textContent = v + 'ms';
    rootStyle.setProperty('--slinky-sleeve-stagger', (v / 1000) + 's');
  });

  // Perspective is special: 0 = 'none' (orthographic).
  controls.querySelector('[data-knob="perspective"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('perspective').textContent = v === 0 ? 'off' : v + 'px';
    rootStyle.setProperty('--slinky-sleeve-perspective', v === 0 ? 'none' : v + 'px');
  });

  controls.querySelector('[data-knob="color"]').addEventListener('input', (e) => {
    rootStyle.setProperty('--slinky-sleeve-color', e.target.value);
  });
}
