// Global script for functionality that doesn't fit into ES modules
// or needs to be accessible from HTML directly

// Force a reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  document.body.style.display = "none"; // Temporarily hide body
  document.body.offsetHeight; // Trigger reflow
  document.body.style.display = ""; // Restore body display

  // Apply initial corner rounding
  updateCornerRounding();
});

// Function to toggle borders for debugging
function toggleBorders() {
  document.querySelector(".site-container").classList.toggle("borders-hidden");

  // Find all elements containing dimension text (including home-dimensions)
  const dimensionElements = document.querySelectorAll('[id$="-dimensions"]');
  dimensionElements.forEach((element) => {
    element.style.display = element.style.display === "none" ? "" : "none";
  });
}

// Function to update corner rounding based on screen width
function updateCornerRounding() {
  const siteContainer = document.querySelector(".site-container");
  if (window.innerWidth > 800) {
    // Same breakpoint used for collapsed navbar
    siteContainer.classList.add("round-bottom");
  } else {
    siteContainer.classList.remove("round-bottom");
  }
}

// Update corner rounding when window is resized
window.addEventListener("resize", updateCornerRounding);

// Expose to global scope for inline event handlers
window.toggleBorders = toggleBorders;
