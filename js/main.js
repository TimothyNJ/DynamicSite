// js/main.js
import { initRouter } from "./navigation/router.js";
import { initializeBuffers } from "./layout/buffers.js";
import { updateDimensions } from "./layout/dimensions.js";
import { initializeNavbar } from "./navigation/navbar.js";

// Initialize all modules when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize buffer resizing
  initializeBuffers();

  // Set up navigation and routing
  initRouter();

  // Initialize navbar with collapsible menu
  initializeNavbar();

  // Update dimensions for responsive layout
  updateDimensions();

  // Apply saved theme preference if it exists
  const savedTheme = localStorage.getItem("userThemePreference");
  if (savedTheme) {
    document.body.setAttribute(
      "data-theme",
      savedTheme === "system"
        ? window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : savedTheme
    );

    // Apply appropriate background
    if (
      savedTheme === "dark" ||
      (savedTheme === "system" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.body.style.backgroundImage =
        "linear-gradient(-25deg, var(--dark-page-start) 0%, var(--dark-page-end) 100%)";
    } else {
      document.body.style.backgroundImage =
        "linear-gradient(-25deg, var(--light-page-start) 0%, var(--light-page-end) 100%)";
    }
  }

  // Add a resize listener for dimension updates
  window.addEventListener("resize", updateDimensions);

  // Initialize clock selector when we're on the settings page
  if (window.location.hash === "#settings" && window.clockSelector) {
    window.clockSelector.init();
  }
});

// Force reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  updateDimensions();
});

// Update dimensions when a page loads
document.addEventListener("pageLoaded", (event) => {
  updateDimensions();

  // If we switched to the settings page, make sure clock displays are updated
  if (event.detail && event.detail.pageName === "settings") {
    // Start a recurring interval to update the clock display
    if (
      window.clockSelector &&
      typeof window.clockSelector.updateClockDisplays === "function"
    ) {
      window.clockSelector.updateClockDisplays();
    }
  }
});
