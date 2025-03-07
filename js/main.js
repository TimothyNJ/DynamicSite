// js/main.js
import { initRouter } from "./navigation/router.js";
import { initBuffers } from "./layout/buffers.js";
import { initDimensions } from "./layout/dimensions.js";
import { initNavbar } from "./navigation/navbar.js";

// Initialize all modules when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  initRouter();
  initBuffers();
  initDimensions();
  initNavbar();
});
