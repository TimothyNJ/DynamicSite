// router.js
import { updateDimensions } from "../layout/dimensions.js";
import { updateMenuContent } from "./navbar.js";

export async function switchPage(pageId) {
  // Update nav button styles
  document
    .querySelectorAll(".nav-bar .nav-container:nth-child(4) button")
    .forEach((button) => button.classList.remove("active"));
  const activeButton = Array.from(
    document.querySelectorAll(".nav-bar .nav-container:nth-child(4) button")
  ).find((button) => button.textContent === pageId);
  if (activeButton) activeButton.classList.add("active");

  // Get the content container
  const contentContainer = document.querySelector(".content-container");

  try {
    // Convert pageId to path
    let pagePath;
    switch (pageId) {
      case "Home":
        pagePath = "pages/home/index.html";
        break;
      case "Create Vendor Request":
        pagePath = "pages/vendor-request/index.html";
        break;
      case "Data Entry Forms":
        pagePath = "pages/data-entry/index.html";
        break;
      case "Progress View":
        pagePath = "pages/progress/index.html";
        break;
      default:
        pagePath = "pages/home/index.html";
    }

    // Fetch the page content
    const response = await fetch(pagePath);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const content = await response.text();

    // Update the content area
    contentContainer.innerHTML = content;

    // Update dimensions after content loads
    updateDimensions();
  } catch (error) {
    console.error("Error loading page:", error);
    contentContainer.innerHTML = "<h1>Error loading page content</h1>";
  }
}

// ------------------------------------------------
