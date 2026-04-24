/**
 * ring-slinky.js - Page init for the Ring Slinky animated loader.
 *
 * Single entry point:
 *   initRingSlinky(stageId, controlsId)
 *     -> populates a stage container with rings AND wires up a controls
 *        panel that mutates the live :root CSS custom properties.
 *
 * --------------------------------------------------------------------
 * Originally derived from a CSS loader by NlghtM4re on Uiverse.io
 * Source: https://github.com/uiverse-io/galaxy/blob/main/loaders/NlghtM4re_ordinary-mouse-17.html
 * MIT License — Copyright (c) 2023 Uiverse.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
 * --------------------------------------------------------------------
 */

const RING_COUNT_DEFAULT = 21;

// Module-scoped so the count survives navigation away and back, the same
// way the :root CSS variables survive.
let currentCount = RING_COUNT_DEFAULT;

function populateStage(container, count) {
  container.classList.add('ring-slinky-stage');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const r = document.createElement('div');
    r.className = 'ring';
    r.style.setProperty('--i', i);
    container.appendChild(r);
  }
}

export function initRingSlinky(stageId, controlsId) {
  const stage = document.getElementById(stageId);
  const controls = document.getElementById(controlsId);
  if (!stage || !controls) {
    console.warn('[ring-slinky] Containers not found');
    return;
  }

  populateStage(stage, currentCount);

  controls.classList.add('ring-slinky-controls');
  controls.innerHTML = `
    <label>Rings    <input data-knob="count"   type="range" min="3"  max="40">   <output data-out="count"></output></label>
    <label>Tilt     <input data-knob="tilt"    type="range" min="0"  max="89">   <output data-out="tilt"></output></label>
    <label>Lift     <input data-knob="lift"    type="range" min="0"  max="80">   <output data-out="lift"></output></label>
    <label>Stagger  <input data-knob="stagger" type="range" min="0"  max="300">  <output data-out="stagger"></output></label>
    <label>Hue      <input data-knob="hue"     type="range" min="0"  max="720">  <output data-out="hue"></output></label>
    <label>Perspective <input data-knob="perspective" type="range" min="0" max="4000" step="50"> <output data-out="perspective"></output></label>
    <label>Color    <input data-knob="color"   type="color"></label>
  `;

  const out = (key) => controls.querySelector(`[data-out="${key}"]`);
  const rootStyle = document.documentElement.style;
  const rootComputed = getComputedStyle(document.documentElement);
  const readNum = (prop, fallback) => {
    const v = parseFloat(rootComputed.getPropertyValue(prop));
    return Number.isFinite(v) ? v : fallback;
  };

  // Read current values from :root so the panel reflects whatever the
  // user last set, not just the SCSS defaults.
  const tilt    = readNum('--ring-slinky-tilt',      70);
  const lift    = readNum('--ring-slinky-lift', 15);
  const stagger = Math.round(readNum('--ring-slinky-stagger', 0.08) * 1000);
  const hue     = readNum('--ring-slinky-hue-sweep', 360);
  const color   = (rootComputed.getPropertyValue('--ring-slinky-color') || '#00ff0d').trim();
  // Perspective is special: 'none' (the Uiverse default) means orthographic,
  // anything else is a px length. Map 'none' -> 0 on the slider.
  const perspectiveRaw = (rootComputed.getPropertyValue('--ring-slinky-perspective') || 'none').trim();
  const perspective = perspectiveRaw === 'none' ? 0 : (parseFloat(perspectiveRaw) || 0);

  controls.querySelector('[data-knob="count"]').value = currentCount;
  out('count').textContent = currentCount;
  controls.querySelector('[data-knob="tilt"]').value = tilt;
  out('tilt').textContent = tilt + '\u00B0';
  controls.querySelector('[data-knob="lift"]').value = lift;
  out('lift').textContent = lift + 'vmin';
  controls.querySelector('[data-knob="stagger"]').value = stagger;
  out('stagger').textContent = stagger + 'ms';
  controls.querySelector('[data-knob="hue"]').value = hue;
  out('hue').textContent = hue + '\u00B0';
  controls.querySelector('[data-knob="perspective"]').value = perspective;
  out('perspective').textContent = perspective === 0 ? 'off' : perspective + 'px';
  controls.querySelector('[data-knob="color"]').value = color;

  controls.querySelector('[data-knob="count"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    currentCount = v;
    out('count').textContent = v;
    populateStage(stage, v);
  });
  controls.querySelector('[data-knob="tilt"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('tilt').textContent = v + '\u00B0';
    rootStyle.setProperty('--ring-slinky-tilt', v + 'deg');
  });
  controls.querySelector('[data-knob="lift"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('lift').textContent = v + 'vmin';
    rootStyle.setProperty('--ring-slinky-lift', v + 'vmin');
  });
  controls.querySelector('[data-knob="stagger"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('stagger').textContent = v + 'ms';
    rootStyle.setProperty('--ring-slinky-stagger', (v / 1000) + 's');
  });
  controls.querySelector('[data-knob="hue"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('hue').textContent = v + '\u00B0';
    rootStyle.setProperty('--ring-slinky-hue-sweep', v + 'deg');
  });
  controls.querySelector('[data-knob="perspective"]').addEventListener('input', (e) => {
    const v = +e.target.value;
    out('perspective').textContent = v === 0 ? 'off' : v + 'px';
    rootStyle.setProperty('--ring-slinky-perspective', v === 0 ? 'none' : v + 'px');
  });
  controls.querySelector('[data-knob="color"]').addEventListener('input', (e) => {
    rootStyle.setProperty('--ring-slinky-color', e.target.value);
  });
}
