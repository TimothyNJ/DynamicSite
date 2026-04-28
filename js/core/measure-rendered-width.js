// js/core/measure-rendered-width.js
//
// Shared utility for measuring the rendered offsetWidth of multiple
// element variants without affecting the visible page. Mirrors the
// pattern used historically by handleCollapsedNavbar() in
// js/layout/dimensions.js: build candidate elements, append them to a
// hidden off-screen container, read offsetWidth, take the max.
//
// The cloning/factory step is left to the caller so this utility stays
// agnostic about whether you're measuring buttons, list rows, table
// cells, or anything else. The only thing it does is the temp-container
// plumbing and the max/min tracking.
//
// Consumers:
//   - list_floating_label_component_engine: sizing the field to fit the
//     longest item in the dropdown
//   - (eventually) handleCollapsedNavbar: sizing the button row to the
//     widest button. Not yet refactored — the existing inline code keeps
//     working; this utility is the cleaner pattern to migrate to when
//     there's appetite for the cleanup pass.
//
// Usage:
//
//   import { measureRenderedWidths } from '../core/measure-rendered-width.js';
//
//   const { maxWidth, minWidth } = measureRenderedWidths(
//     items,
//     (item) => {
//       const el = document.createElement('span');
//       el.textContent = item;
//       el.style.font = '...';  // whatever styles affect rendering
//       return el;
//     }
//   );

/**
 * Measure the rendered offsetWidth of every element produced by
 * factoryFn(item) for each item in `items`. Each produced element is
 * appended to an off-screen container so the browser computes its real
 * layout (font, padding, border) without touching the visible page.
 *
 * @param {Iterable} items   - Anything iterable; each value is passed to factoryFn.
 * @param {Function} factoryFn - Called once per item: (item) => HTMLElement
 *                               The returned element is what gets measured.
 * @returns {{maxWidth: number, minWidth: number}}
 *          maxWidth = largest offsetWidth across all produced elements
 *          minWidth = smallest offsetWidth (0 if items is empty)
 */
export function measureRenderedWidths(items, factoryFn) {
  const tempContainer = document.createElement('div');
  // Same off-screen technique handleCollapsedNavbar uses: out of view,
  // out of flow, but still in the DOM so layout is computed.
  tempContainer.style.cssText =
    'position: absolute; left: -9999px; top: 0; visibility: hidden;';
  document.body.appendChild(tempContainer);

  let maxWidth = 0;
  let minWidth = Infinity;

  try {
    for (const item of items) {
      const el = factoryFn(item);
      if (!el) continue;
      tempContainer.appendChild(el);
      const w = el.offsetWidth;
      if (w > maxWidth) maxWidth = w;
      if (w < minWidth) minWidth = w;
    }
  } finally {
    // Always clean up, even if factoryFn throws.
    if (tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
  }

  return {
    maxWidth,
    minWidth: minWidth === Infinity ? 0 : minWidth,
  };
}
