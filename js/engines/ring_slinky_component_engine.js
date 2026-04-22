/**
 * ring_slinky_component_engine - Animated stack of pulsing 3D rings
 *
 * Visual primitive: a stack of concentric rings tilted in 3D, rising and
 * falling in sequence with a hue-rotation sweep. Each instance is fully
 * self-contained — its CSS custom properties are scoped to its own stage
 * element so multiple loaders can coexist on the same page with different
 * configurations.
 *
 * Public API:
 *   new ring_slinky_component_engine(options, handler)
 *   .init()        -> boolean
 *   .destroy()     -> void
 *   .setCount(n)
 *   .setTilt(deg)
 *   .setLift(vmin)        // positive number; rendered as -Nvmin
 *   .setStagger(ms)
 *   .setHueSweep(deg)
 *   .setColor(cssColor)
 *
 * Configuration options (all optional, with defaults matching the original
 * Uiverse loader):
 *   containerId   string  — id of the element to render into (required)
 *   stageClass    string  — extra class to add to the stage element
 *   count         number  = 21
 *   tilt          number  = 70    (deg)
 *   lift          number  = 50    (vmin; written to CSS as -Nvmin)
 *   stagger       number  = 80    (ms; written to CSS as Ns)
 *   duration      number  = 3     (s)
 *   hueSweep      number  = 180   (deg)
 *   color         string  = '#00c8ff'
 *   thickness     string  = '0.9vmin'
 *   step          string  = '2.5vmin'
 *   glow          string  = 'rgb(124, 124, 124)'
 *   perspective   string  = '1200px'
 *
 * The `handler` argument is unused for this engine but is accepted to keep
 * a consistent constructor shape with the other component engines in the
 * factory.
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

class ring_slinky_component_engine {
  constructor(options = {}, handler = null) {
    this.options = options;
    this.handler = handler;
    this.containerId = options.containerId;
    this.stageClass = options.stageClass || '';

    // Resolved configuration with defaults
    this.config = {
      count:       Number.isFinite(options.count)     ? options.count     : 21,
      tilt:        Number.isFinite(options.tilt)      ? options.tilt      : 70,
      lift:        Number.isFinite(options.lift)      ? options.lift      : 50,
      stagger:     Number.isFinite(options.stagger)   ? options.stagger   : 80,
      duration:    Number.isFinite(options.duration)  ? options.duration  : 3,
      hueSweep:    Number.isFinite(options.hueSweep)  ? options.hueSweep  : 180,
      color:       options.color       || '#00c8ff',
      thickness:   options.thickness   || '0.9vmin',
      step:        options.step        || '2.5vmin',
      glow:        options.glow        || 'rgb(124, 124, 124)',
      perspective: options.perspective || '1200px'
    };

    this.container = null;
    this.stageElement = null;
  }

  /**
   * Build the stage and inject the rings into the configured container.
   * Returns true on success, false if the container is missing.
   */
  init() {
    if (!this.containerId) {
      console.error('[ring_slinky_component_engine] No containerId supplied');
      return false;
    }

    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`[ring_slinky_component_engine] Container '${this.containerId}' not found`);
      return false;
    }

    // Wrap in a stage element so per-instance CSS custom properties live
    // on a real DOM node — no global pollution, no inter-instance fighting.
    const stage = document.createElement('div');
    stage.className = ['ring-pulse-stage', this.stageClass].filter(Boolean).join(' ');
    this.container.appendChild(stage);
    this.stageElement = stage;

    this.applyAllProps();
    this.rebuildRings(this.config.count);

    return true;
  }

  /**
   * Apply every configured custom property to the stage element.
   * Called once during init; individual setters maintain the values after that.
   */
  applyAllProps() {
    if (!this.stageElement) return;
    const s = this.stageElement.style;
    s.setProperty('--ring-count',      this.config.count);
    s.setProperty('--ring-step',       this.config.step);
    s.setProperty('--ring-stagger',    (this.config.stagger / 1000) + 's');
    s.setProperty('--ring-duration',   this.config.duration + 's');
    s.setProperty('--ring-tilt',       this.config.tilt + 'deg');
    s.setProperty('--ring-lift',       '-' + this.config.lift + 'vmin');
    s.setProperty('--ring-thickness',  this.config.thickness);
    s.setProperty('--ring-color',      this.config.color);
    s.setProperty('--ring-glow',       this.config.glow);
    s.setProperty('--ring-hue-sweep',  this.config.hueSweep + 'deg');
    s.setProperty('--ring-perspective', this.config.perspective);
  }

  /**
   * Replace the ring DOM with `count` freshly-numbered ring divs.
   */
  rebuildRings(count) {
    if (!this.stageElement) return;
    const rings = Array.from({ length: count }, (_, i) => {
      const r = document.createElement('div');
      r.className = 'ring';
      r.style.setProperty('--i', i);
      return r;
    });
    this.stageElement.replaceChildren(...rings);
  }

  // ----- Per-instance setters -----

  setCount(count) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    this.config.count = n;
    if (this.stageElement) {
      this.stageElement.style.setProperty('--ring-count', n);
      this.rebuildRings(n);
    }
  }

  setTilt(deg) {
    const v = Number(deg);
    if (!Number.isFinite(v)) return;
    this.config.tilt = v;
    if (this.stageElement) {
      this.stageElement.style.setProperty('--ring-tilt', v + 'deg');
    }
  }

  /**
   * Pass a positive vmin number; the engine writes it to CSS as a negative
   * translation so rings rise upward.
   */
  setLift(vmin) {
    const v = Number(vmin);
    if (!Number.isFinite(v)) return;
    this.config.lift = v;
    if (this.stageElement) {
      this.stageElement.style.setProperty('--ring-lift', '-' + v + 'vmin');
    }
  }

  setStagger(ms) {
    const v = Number(ms);
    if (!Number.isFinite(v)) return;
    this.config.stagger = v;
    if (this.stageElement) {
      this.stageElement.style.setProperty('--ring-stagger', (v / 1000) + 's');
    }
  }

  setHueSweep(deg) {
    const v = Number(deg);
    if (!Number.isFinite(v)) return;
    this.config.hueSweep = v;
    if (this.stageElement) {
      this.stageElement.style.setProperty('--ring-hue-sweep', v + 'deg');
    }
  }

  setColor(color) {
    if (!color) return;
    this.config.color = color;
    if (this.stageElement) {
      this.stageElement.style.setProperty('--ring-color', color);
    }
  }

  /**
   * Cleanup: remove the stage from the DOM and clear references.
   */
  destroy() {
    if (this.stageElement && this.stageElement.parentNode) {
      this.stageElement.parentNode.removeChild(this.stageElement);
    }
    this.stageElement = null;
    this.container = null;
  }
}

export { ring_slinky_component_engine };
