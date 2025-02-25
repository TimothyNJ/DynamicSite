import { initializeBuffers } from "./layout/buffers.js";
import { initializeNavbar } from "./navigation/navbar.js";
import { switchPage } from "./navigation/router.js";
import { updateDimensions } from "./layout/dimensions.js";

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initializeBuffers();
  initializeNavbar();
  switchPage("Home"); // Load initial page
});

// Force reflow and update dimensions on load
window.addEventListener("load", () => {
  document.body.style.display = "none";
  document.body.offsetHeight;
  document.body.style.display = "";
  updateDimensions();
});

// Handle window resize
window.addEventListener("resize", updateDimensions);
