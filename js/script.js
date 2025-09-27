// Global script for functionality that doesn't fit into ES modules
// or needs to be accessible from HTML directly

// Force a reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  document.body.style.display = "none"; // Temporarily hide body
  document.body.offsetHeight; // Trigger reflow
  document.body.style.display = ""; // Restore body display

  // Apply initial corner rounding
  updateCornerRounding();
  
  // Hide borders and dimensions by default
  const siteContainer = document.querySelector(".site-container");
  if (siteContainer && !siteContainer.classList.contains("borders-hidden")) {
    siteContainer.classList.add("borders-hidden");
    
    // Hide all dimension elements
    document.querySelectorAll('[id$="-dimensions"]').forEach((el) => {
      el.style.display = "none";
    });
    
    // Hide dimension containers
    document.querySelectorAll(".dimension-container").forEach((el) => {
      el.style.display = "none";
    });
  }
});

// Function to toggle borders for debugging
function toggleBorders() {
  const siteContainer = document.querySelector(".site-container");
  siteContainer.classList.toggle("borders-hidden");

  const isHidden = siteContainer.classList.contains("borders-hidden");
  
  // Toggle borders on all 3D components
  if (window.threedComponents) {
    window.threedComponents.forEach(component => {
      if (component.toggleDebugBorders) {
        component.toggleDebugBorders(!isHidden);
      }
    });
  }

  // Select all dimension elements throughout the document
  document.querySelectorAll('[id$="-dimensions"]').forEach((el) => {
    el.style.display = isHidden ? "none" : "";
  });

  // Also select dimension containers
  document.querySelectorAll(".dimension-container").forEach((el) => {
    el.style.display = isHidden ? "none" : "";
  });
}

// Function to update corner rounding based on screen width
function updateCornerRounding() {
  const siteContainer = document.querySelector(".site-container");
  const collapseBreakpoint = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--collapse-breakpoint"
    )
  );

  if (window.innerWidth > collapseBreakpoint) {
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
