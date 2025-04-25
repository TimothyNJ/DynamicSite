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
});

// Force reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  updateDimensions();
});

// Update dimensions when a page loads
document.addEventListener("pageLoaded", updateDimensions);

// Export a method to get the active theme
export function getActiveTheme() {
  const theme = document.body.getAttribute("data-theme") || "light";
  return theme;
}

// Add a way to check if we're on the settings page
export function isSettingsPage() {
  return window.location.hash === "#settings";
}
