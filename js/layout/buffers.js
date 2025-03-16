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

      // Update bottom buffer height after side buffer width changes
      updateBottomBufferHeight();
    });
  });

  // Create ResizeObserver to sync navbar height with bottom buffer
  const navbarResizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      // Update bottom buffer height when navbar changes
      updateBottomBufferHeight();

      // Update bottom buffer dimensions display if it exists
      updateBottomBufferDimensions();
    });
  });

  // Function to update bottom buffer height based on comparing navbar height and buffer width
  function updateBottomBufferHeight() {
    const navbar = document.querySelector(".nav-bar");
    const navbarHeight = navbar ? navbar.offsetHeight : 0;

    // Get the navbar container 1 width
    const navbarBuffer1 = document.querySelector(
      ".nav-bar .nav-container:nth-child(1)"
    );
    const bufferWidth = navbarBuffer1
      ? navbarBuffer1.offsetWidth
      : navbarHeight;

    // Use the smaller value between navbar height and buffer width
    const bottomBufferHeight = Math.min(navbarHeight, bufferWidth);

    // Set CSS variable for navbar height (which controls bottom buffer height)
    document.documentElement.style.setProperty(
      "--navbar-height",
      `${bottomBufferHeight}px`
    );
  }

  // Function to update bottom buffer dimensions display
  function updateBottomBufferDimensions() {
    const bottomBufferDimensions = document.getElementById(
      "bottom-buffer-dimensions"
    );
    if (bottomBufferDimensions) {
      const bottomBufferBar = document.querySelector(".bottom-buffer-bar");
      if (bottomBufferBar) {
        const width = bottomBufferBar.offsetWidth;
        const height = bottomBufferBar.offsetHeight;
        bottomBufferDimensions.textContent = `${width}px x ${height}px`;
      }
    }
  }

  // Start observing content buffers
  const contentBuffers = document.querySelectorAll(
    ".content-wrapper .content-buffer"
  );
  contentBuffers.forEach((buffer) => bufferResizeObserver.observe(buffer));

  // Start observing navbar for height changes
  const navbar = document.querySelector(".nav-bar");
  if (navbar) {
    navbarResizeObserver.observe(navbar);
  }

  // Initial setup
  updateBottomBufferHeight();
  updateBottomBufferDimensions();
}
