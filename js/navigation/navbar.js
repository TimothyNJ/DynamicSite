// js/navigation/navbar.js
import { navigateToPage } from "./router.js"; // Changed from switchPage

let isMenuOpenedByClick = false;

export function initializeNavbar() {
  // Match this exact function name
  const collapsedNavbar = document.querySelector(".collapsed-navbar");
  const collapsedMenu = document.querySelector(".collapsed-menu");

  // All other code remains the same until updateMenuContent calls
  // ... existing code ...
}

export function updateMenuContent() {
  // Existing code until menuButton.onclick

  allButtons.forEach((button) => {
    if (!button.classList.contains("active")) {
      const buttonText = button.querySelector("h3").textContent;
      const menuButton = document.createElement("button");
      const h3Element = document.createElement("h3");
      h3Element.textContent = buttonText;
      menuButton.appendChild(h3Element);
      menuButton.onclick = () => {
        const pageName = button.getAttribute("data-page");
        navigateToPage(pageName); // Changed from switchPage to navigateToPage
        // Rest of function remains the same
        setTimeout(() => {
          updateMenuContent();
          document.querySelector(".collapsed-menu").style.display = "flex";
        }, 0);
        isMenuOpenedByClick = false;
      };
      collapsedMenu.appendChild(menuButton);
    }
  });
}
