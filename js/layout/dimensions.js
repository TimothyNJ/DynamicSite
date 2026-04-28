// js/layout/dimensions.js
import { measureRenderedWidths } from '../core/measure-rendered-width.js';

export function updateDimensions() {
  updateNavbarDimensions();
  updateContentDimensions();
  updateBufferDimensions();
  handleCollapsedNavbar();
  
  // After updating dimensions, check if they should be hidden
  const siteContainer = document.querySelector(".site-container");
  if (siteContainer && siteContainer.classList.contains("borders-hidden")) {
    // Hide all dimension elements
    document.querySelectorAll('[id$="-dimensions"]').forEach((el) => {
      el.style.display = "none";
    });
    
    // Hide dimension containers
    document.querySelectorAll(".dimension-container").forEach((el) => {
      el.style.display = "none";
    });
  }
}

function updateNavbarDimensions() {
  const navbar3 = document.querySelector(
    ".nav-bar .nav-container:nth-child(3)"
  );
  const navbar3Dimensions = document.getElementById("navbar3-dimensions");

  if (navbar3 && navbar3Dimensions) {
    const navbar3Width = navbar3.offsetWidth;
    const navbar3Height = navbar3.offsetHeight;
    navbar3Dimensions.textContent = `${navbar3Width}px x ${navbar3Height}px`;
  }

  // Update navbar height CSS variable
  const navbar = document.querySelector(".nav-bar");
  if (navbar) {
    const navbarHeight = navbar.offsetHeight;
    document.documentElement.style.setProperty(
      "--navbar-height",
      `${navbarHeight}px`
    );
  }
}

function updateContentDimensions() {
  const contentContainer = document.querySelector(".content-container");
  const homeDimensions = document.getElementById("home-dimensions");

  if (contentContainer && homeDimensions) {
    const containerWidth = contentContainer.offsetWidth;
    const containerHeight = contentContainer.offsetHeight;
    homeDimensions.textContent = `${containerWidth}px x ${containerHeight}px`;
  }
}

function updateBufferDimensions() {
  // Get Navbar Buffer 1 dimensions
  const navbarBuffer1 = document.querySelector(
    ".nav-bar .nav-container:nth-child(1)"
  );
  const navbarBuffer1Dimensions = document.getElementById(
    "navbar-buffer1-dimensions"
  );
  if (navbarBuffer1 && navbarBuffer1Dimensions) {
    const buffer1Width = navbarBuffer1.offsetWidth;
    const buffer1Height = navbarBuffer1.offsetHeight;
    navbarBuffer1Dimensions.textContent = `${buffer1Width}px x ${buffer1Height}px`;
  }

  // Get Navbar Buffer 5 dimensions
  const navbarBuffer5 = document.querySelector(
    ".nav-bar .nav-container:nth-child(5)"
  );
  const navbarBuffer5Dimensions = document.getElementById(
    "navbar-buffer5-dimensions"
  );
  if (navbarBuffer5 && navbarBuffer5Dimensions) {
    const buffer5Width = navbarBuffer5.offsetWidth;
    const buffer5Height = navbarBuffer5.offsetHeight;
    navbarBuffer5Dimensions.textContent = `${buffer5Width}px x ${buffer5Height}px`;
  }

  // Get Content Buffer dimensions
  const contentBuffer = document.querySelector(".content-buffer");
  const contentBufferDimensions = document.getElementById(
    "content-buffer-dimensions"
  );
  if (contentBuffer && contentBufferDimensions) {
    const bufferWidth = contentBuffer.offsetWidth;
    const bufferHeight = contentBuffer.offsetHeight;
    contentBufferDimensions.textContent = `${bufferWidth}px x ${bufferHeight}px`;
  }

  // Get Bottom Buffer dimensions
  const bottomBuffer = document.querySelector(".bottom-buffer-bar");
  const bottomBufferDimensions = document.getElementById(
    "bottom-buffer-dimensions"
  );
  if (bottomBuffer && bottomBufferDimensions) {
    const bufferWidth = bottomBuffer.offsetWidth;
    const bufferHeight = bottomBuffer.offsetHeight;
    bottomBufferDimensions.textContent = `${bufferWidth}px x ${bufferHeight}px`;
  }
}

function handleCollapsedNavbar() {
  const navbar4 = document.querySelector(
    ".nav-bar .nav-container:nth-child(4)"
  );
  const navbar = document.querySelector(".nav-bar");
  const collapsedButton = navbar4.querySelector(".collapsed-navbar");

  if (!collapsedButton) return;

  // Get collapse breakpoint from CSS variable
  const collapseBreakpoint = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--collapse-breakpoint"
    )
  );

  // Check if collapsed button is displayed (which happens on smaller screens)
  const isCollapsedButtonVisible =
    window.getComputedStyle(collapsedButton).display !== "none";

  if (window.innerWidth > collapseBreakpoint) {
    const collapsedMenu = document.querySelector(".collapsed-menu");
    if (collapsedMenu) {
      collapsedMenu.style.display = "none";
    }
  }

  if (isCollapsedButtonVisible) {
    // Off-screen clone-and-measure delegated to the shared utility in
    // js/core/measure-rendered-width.js. Same pattern as before — clone
    // each button, give it display:block + .active class so it renders
    // at its full visible width, measure offsetWidth — but the temp-
    // container plumbing is now centralized so this function and the
    // list_floating_label_component_engine call the same code path.
    const cloneForMeasure = (button) => {
      const clone = button.cloneNode(true);
      clone.style.display = "block";
      clone.classList.add("active");
      return clone;
    };

    // Measure the collapsed navbar button on its own (it's added to the
    // total width separately, not folded into the max).
    const { maxWidth: collapsedButtonWidth } = measureRenderedWidths(
      [collapsedButton],
      cloneForMeasure
    );

    // Measure every other visible button to find the max (drives the
    // total min-width for the buttons row) and min (drives the
    // --collapsed-menu-divider-width).
    const otherButtons = Array.from(navbar4.querySelectorAll("button")).filter(
      (b) => b !== collapsedButton && !b.classList.contains("auth-hidden")
    );
    const { maxWidth: maxButtonWidth, minWidth: minButtonWidth } =
      measureRenderedWidths(otherButtons, cloneForMeasure);

    // Set collapsed menu divider width to narrowest button.
    if (otherButtons.length > 0) {
      document.documentElement.style.setProperty(
        "--collapsed-menu-divider-width",
        `${minButtonWidth}px`
      );
    }

    // Calculate total width by ADDING widest button and collapsed button widths
    const totalWidth = maxButtonWidth + collapsedButtonWidth + 4; // 2px border on each side

    // Set data attribute and class for minimum width
    navbar4.dataset.minWidth = `${totalWidth}px`;
    navbar4.classList.add("enforce-min-width");

    // Only apply minimum width to the buttons container, not the entire navbar
    navbar4.style.minWidth = `${totalWidth}px`;
    // Don't set a minimum width for the entire navbar
    navbar.style.minWidth = "";
  } else {
    // Remove data attribute and class when not needed
    delete navbar4.dataset.minWidth;
    navbar4.classList.remove("enforce-min-width");
    navbar4.style.minWidth = "";
    navbar.style.minWidth = ""; // Reset navbar width when dropdown is hidden
  }
}
