// js/layout/dimensions.js
export function updateDimensions() {
  updateNavbarDimensions();
  updateContentDimensions();
  updateBufferDimensions();
  handleCollapsedNavbar();
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
    // Create temporary container
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.visibility = "hidden";
    document.body.appendChild(tempContainer);

    // Get ALL buttons including collapsed navbar
    const allButtons = navbar4.querySelectorAll("button");
    let maxButtonWidth = 0;
    let widestButton = null;

    // First clone and measure the collapsed navbar button
    const collapsedClone = collapsedButton.cloneNode(true);
    collapsedClone.style.display = "block";
    collapsedClone.classList.add("active");
    tempContainer.appendChild(collapsedClone);
    const collapsedButtonWidth = collapsedClone.offsetWidth;

    // Then clone and measure all other buttons
    allButtons.forEach((button) => {
      if (button !== collapsedButton) {
        const clone = button.cloneNode(true);
        clone.style.display = "block"; // Ensure button is measurable
        clone.classList.add("active");
        tempContainer.appendChild(clone);
        const buttonWidth = clone.offsetWidth;
        if (buttonWidth > maxButtonWidth) {
          maxButtonWidth = buttonWidth;
          widestButton = button;
        }
      }
    });

    // Clean up temporary container
    document.body.removeChild(tempContainer);

    // Calculate total width by ADDING widest button and collapsed button widths
    const totalWidth = maxButtonWidth + collapsedButtonWidth + 4; // 2px border on each side

    // Set data attribute and class for minimum width
    navbar4.dataset.minWidth = `${totalWidth}px`;
    navbar4.classList.add("enforce-min-width");

    // Directly apply the minimum width
    navbar4.style.minWidth = `${totalWidth}px`;
    navbar.style.minWidth = `${totalWidth + 20}px`; // Apply same width to entire navbar
  } else {
    // Remove data attribute and class when not needed
    delete navbar4.dataset.minWidth;
    navbar4.classList.remove("enforce-min-width");
    navbar4.style.minWidth = "";
    navbar.style.minWidth = ""; // Reset navbar width when dropdown is hidden
  }
}
