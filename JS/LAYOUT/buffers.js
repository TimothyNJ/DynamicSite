export function initializeBuffers() {
  // Create ResizeObserver to sync buffer widths (content drives navbar)
  const bufferResizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const leftContentBuffer = document.querySelector(
        ".content-wrapper .content-buffer:first-child"
      );
      const rightContentBuffer = document.querySelector(
        ".content-wrapper .content-buffer:last-child"
      );
      const navbarBuffer1 = document.querySelector(
        ".nav-bar .nav-container:nth-child(1)"
      );
      const navbarBuffer5 = document.querySelector(
        ".nav-bar .nav-container:nth-child(5)"
      );

      if (leftContentBuffer && navbarBuffer1) {
        navbarBuffer1.style.width = getComputedStyle(leftContentBuffer).width;
      }
      if (rightContentBuffer && navbarBuffer5) {
        navbarBuffer5.style.width = getComputedStyle(rightContentBuffer).width;
      }
    });
  });

  // Start observing content buffers
  const contentBuffers = document.querySelectorAll(
    ".content-wrapper .content-buffer"
  );
  contentBuffers.forEach((buffer) => bufferResizeObserver.observe(buffer));
}
