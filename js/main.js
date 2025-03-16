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

  // Add a resize listener for dimension updates
  window.addEventListener("resize", updateDimensions);
});

// Force reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  updateDimensions();
});

// Update dimensions when a page loads
document.addEventListener("pageLoaded", updateDimensions);
