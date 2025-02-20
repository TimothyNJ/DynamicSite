// dimensions.js
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
  const isCollapsedButtonVisible =
    window.getComputedStyle(collapsedButton).display !== "none";

  if (isCollapsedButtonVisible) {
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.visibility = "hidden";
    document.body.appendChild(tempContainer);

    const allButtons = navbar4.querySelectorAll("button");
    let maxButtonWidth = 0;
    let widestButton = null;

    const collapsedClone = collapsedButton.cloneNode(true);
    collapsedClone.style.display = "block";
    collapsedClone.classList.add("active");
    tempContainer.appendChild(collapsedClone);
    const collapsedButtonWidth = collapsedClone.offsetWidth;

    allButtons.forEach((button) => {
      if (button !== collapsedButton) {
        const clone = button.cloneNode(true);
        clone.style.display = "block";
        clone.classList.add("active");
        tempContainer.appendChild(clone);
        const buttonWidth = clone.offsetWidth;
        if (buttonWidth > maxButtonWidth) {
          maxButtonWidth = buttonWidth;
          widestButton = button;
        }
      }
    });

    document.body.removeChild(tempContainer);

    const totalWidth = maxButtonWidth + collapsedButtonWidth + 4;
    navbar4.dataset.minWidth = `${totalWidth}px`;
    navbar4.classList.add("enforce-min-width");
    navbar4.style.minWidth = `${totalWidth}px`;
    navbar.style.minWidth = `${totalWidth + 20}px`;
  } else {
    delete navbar4.dataset.minWidth;
    navbar4.classList.remove("enforce-min-width");
    navbar4.style.minWidth = "";
    navbar.style.minWidth = "";
  }
}
