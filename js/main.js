// js/main.js
import { initRouter } from "./navigation/router.js";
import { initBuffers } from "./layout/buffers.js";
import { updateDimensions } from "./layout/dimensions.js"; // Changed from initDimensions to updateDimensions
import { initializeNavbar } from "./navigation/navbar.js";

// Initialize all modules when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initRouter(); // This already loads home page
  initBuffers();
  updateDimensions(); // Changed from initDimensions to updateDimensions
  initializeNavbar();
});
