// Global script for functionality that doesn't fit into ES modules
// or needs to be accessible from HTML directly

// Force a reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  document.body.style.display = "none"; // Temporarily hide body
  document.body.offsetHeight; // Trigger reflow
  document.body.style.display = ""; // Restore body display
});

// Function to toggle borders for debugging
function toggleBorders() {
  document.querySelector(".site-container").classList.toggle("borders-hidden");

  // Find all elements containing dimension text
  const dimensionElements = document.querySelectorAll('[id$="-dimensions"]');
  dimensionElements.forEach((element) => {
    element.style.display = element.style.display === "none" ? "" : "none";
  });
}

// Expose to global scope for inline event handlers
window.toggleBorders = toggleBorders;
