// js/main.js
import { initRouter } from "./navigation/router.js";
import { initBuffers } from "./layout/buffers.js";
import { initDimensions } from "./layout/dimensions.js";
import { initializeNavbar } from "./navigation/navbar.js"; // Changed function name

// Initialize all modules when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initRouter(); // This already loads home page
  initBuffers();
  initDimensions();
  initializeNavbar(); // Changed function name
});
