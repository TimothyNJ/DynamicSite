/**
 * magic-rings.js - Page init for the Magic Rings animated loader.
 *
 * Mechanism
 * ---------
 * Every ring travels on its own circular orbit in the stage plane.
 * The orbits are sized the same (--magic-rings-orbit-radius), but each
 * orbit's CENTRE is chosen so that at exactly t = 0.5 the ring passes
 * through its assigned point on the target shape's outline. Phases are
 * spread around the cycle via the golden angle so that at any other
 * time the rings look scattered. The shape only "resolves" for a single
 * instant per cycle — a simultaneous whoosh-through, not a held pose.
 *
 * Geometry, per ring i:
 *   P_i   = target outline point (stage-plane, vmin)
 *   phi_i = i * 2π / φ²  (golden angle)
 *   C_i   = P_i − r · (cos phi_i, sin phi_i)
 *   pos(t) = C_i + r · (cos(phi_i + 2π(t − 0.5)),
 *                        sin(phi_i + 2π(t − 0.5)))
 *
 * The per-ring @keyframes are sampled (KEYFRAME_STEPS + 1 stops) and
 * written into a single <style> tag injected at buildStage().
 *
 * Single entry point:
 *   initMagicRings(stageId, controlsId)
 *
 * --------------------------------------------------------------------
 * Shape of origin: the Slinky Rings loader (styles/_slinky_rings.scss,
 * js/backgrounds/slinky-rings.js), itself derived from a CSS loader by
 * NlghtM4re on Uiverse.io (MIT). Magic Rings keeps the ring primitive
 * and 3D tilt aesthetic but replaces the synchronous oscillation with
 * per-ring orbits that converge to a shape for one instant per cycle.
 * --------------------------------------------------------------------
 */

const RING_COUNT_DEFAULT = 21;
const KEYFRAME_STEPS     = 60;        // sample density along each orbit
const GOLDEN_ANGLE       = Math.PI * (3 - Math.sqrt(5));

// Module-scoped so knobs survive navigation away and back, the same
// way the :root CSS variables do.
let currentCount = RING_COUNT_DEFAULT;

// ============================================================
// Geometry helpers
// ============================================================

function readNum(computed, prop, fallback) {
  const v = parseFloat(computed.getPropertyValue(prop));
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Target shape: circle of given radius, sampled to `count` points.
 * This is the "verification shape" — trivially recognisable, so we
 * can tell whether the mechanism works before moving on to numerals.
 */
function shapeCircle(count, radius) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count;
    pts.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) });
  }
  return pts;
}

/**
 * Build a @keyframes rule that walks one ring around its circular
 * orbit, arriving at `pose` at exactly t = 0.5.
 */
function buildOrbitKeyframes(name, pose, orbitRadius, phi) {
  const cx = pose.x - orbitRadius * Math.cos(phi);
  const cy = pose.y - orbitRadius * Math.sin(phi);
  let css = `@keyframes ${name} {\n`;
  for (let k = 0; k <= KEYFRAME_STEPS; k++) {
    const t     = k / KEYFRAME_STEPS;
    const angle = phi + 2 * Math.PI * (t - 0.5);
    const x     = cx + orbitRadius * Math.cos(angle);
    const y     = cy + orbitRadius * Math.sin(angle);
    const pct   = (t * 100).toFixed(3);
    css += `  ${pct}% { translate: ${x.toFixed(3)}vmin ${y.toFixed(3)}vmin; }\n`;
  }
  css += `}\n`;
  return css;
}

/**
 * (Re)build the stage: create ring elements, generate per-ring orbit
 * keyframes, inject them into a single <style> tag. Called on init and
 * whenever a geometry knob (count, shape radius, orbit radius) changes.
 */
function buildStage(container, count) {
  container.classList.add('magic-rings-stage');
  container.innerHTML = '';

  const computed    = getComputedStyle(document.documentElement);
  const shapeRadius = readNum(computed, '--magic-rings-shape-radius', 15);
  const orbitRadius = readNum(computed, '--magic-rings-orbit-radius', 12);
  const pose        = shapeCircle(count, shapeRadius);

  // Replace previous keyframes (if any) so old orbits don't linger.
  const existing = document.getElementById('magic-rings-keyframes');
  if (existing) existing.remove();

  const styleTag = document.createElement('style');
  styleTag.id = 'magic-rings-keyframes';

  let allCss = '';
  for (let i = 0; i < count; i++) {
    const r = document.createElement('div');
    r.className = 'ring';
    r.style.setProperty('--i', i);

    const name = `magic-rings-orbit-${i}`;
    const phi  = (i * GOLDEN_ANGLE) % (2 * Math.PI);
    allCss += buildOrbitKeyframes(name, pose[i], orbitRadius, phi);

    r.style.animationName = name;
    container.appendChild(r);
  }

  styleTag.textContent = allCss;
  document.head.appendChild(styleTag);
}

// ============================================================
// Entry point
// ============================================================

export function initMagicRings(stageId, controlsId) {
  const stage    = document.getElementById(stageId);
  const controls = document.getElementById(controlsId);
  if (!stage || !controls) {
    console.warn('[magic-rings] Containers not found');
    return;
  }

  buildStage(stage, currentCount);

  controls.classList.add('magic-rings-controls');
  controls.innerHTML = `
    <label>Rings       <input data-knob="count"       type="range" min="3"  max="60">   <output data-out="count"></output></label>
    <label>Tilt        <input data-knob="tilt"        type="range" min="0"  max="89">   <output data-out="tilt"></output></label>
    <label>Shape       <input data-knob="shape"       type="range" min="0"  max="30">   <output data-out="shape"></output></label>
    <label>Orbit       <input data-knob="orbit"       type="range" min="0"  max="30">   <output data-out="orbit"></output></label>
    <label>Hue         <input data-knob="hue"         type="range" min="0"  max="720">  <output data-out="hue"></output></label>
    <label>Perspective <input data-knob="perspective" type="range" min="0"  max="4000" step="50"> <output data-out="perspective"></output></label>
    <label>Color       <input data-knob="color"       type="color"></label>
  `;

  const out = (key) => controls.querySelector(`[data-out="${key}"]`);
  const rootStyle    = document.documentElement.style;
  const rootComputed = getComputedStyle(document.documentElement);

  // Read current values from :root so the panel reflects whatever the
  // user last set, not just the SCSS defaults.
  const tilt        = readNum(rootComputed, '--magic-rings-tilt',         70);
  const shapeRadius = readNum(rootComputed, '--magic-rings-shape-radius', 15);
  const orbitRadius = readNum(rootComputed, '--magic-rings-orbit-radius', 12);
  const hue         = readNum(rootComputed, '--magic-rings-hue-sweep',    360);
  const color       = (rootComputed.getPropertyValue('--magic-rings-color') || '#00ff0d').trim();
  // Perspective is special: 'none' means orthographic; anything else is
  // a px length. Map 'none' -> 0 on the slider.
  const perspectiveRaw = (rootComputed.getPropertyValue('--magic-rings-perspective') || 'none').trim();
  const perspective    = perspectiveRaw === 'none' ? 0 : (parseFloat(perspectiveRaw) || 0);

  controls.querySelector('[data-knob="count"]').value = currentCount;
  out('count').textContent = currentCount;
  controls.querySelector('[data-knob="tilt"]').value = tilt;
  out('tilt').textContent = tilt + '\u00B0';
  controls.querySelector('[data-knob="shape"]').value = shapeRadius;
  out('shape').textContent = shapeRadius + 'vmin';
  controls.querySelector('[data-knob="orbit"]').value = orbitRadius;
  out('orbit').textContent = orbitRadius + 'vmin';
  controls.querySelector('[data-knob="hue"]').value = hue;
  out('hue').textContent = hue + '\u00B0';
  controls.querySelector('[data-knob="perspective"]').value = perspective;
  out('perspective').textContent = perspective === 0 ? 'off' : perspective + 'px';
  controls.querySelector('[data-knob="color"]').value = color;

  // ---- Geometry knobs: must regenerate orbit keyframes. ----
  controls.querySelector('[data-knob="count"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    currentCount = v;
    out('count').textContent = v;
    buildStage(stage, v);
  });
  controls.querySelector('[data-knob="shape"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('shape').textContent = v + 'vmin';
    rootStyle.setProperty('--magic-rings-shape-radius', v + 'vmin');
    buildStage(stage, currentCount);
  });
  controls.querySelector('[data-knob="orbit"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('orbit').textContent = v + 'vmin';
    rootStyle.setProperty('--magic-rings-orbit-radius', v + 'vmin');
    buildStage(stage, currentCount);
  });

  // ---- Purely visual knobs: just write the :root var. ----
  controls.querySelector('[data-knob="tilt"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('tilt').textContent = v + '\u00B0';
    rootStyle.setProperty('--magic-rings-tilt', v + 'deg');
  });
  controls.querySelector('[data-knob="hue"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('hue').textContent = v + '\u00B0';
    rootStyle.setProperty('--magic-rings-hue-sweep', v + 'deg');
  });
  controls.querySelector('[data-knob="perspective"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('perspective').textContent = v === 0 ? 'off' : v + 'px';
    rootStyle.setProperty('--magic-rings-perspective', v === 0 ? 'none' : v + 'px');
  });
  controls.querySelector('[data-knob="color"]').addEventListener('input', (e) => {
    rootStyle.setProperty('--magic-rings-color', e.target.value);
  });
}
