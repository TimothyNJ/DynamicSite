// js/navigation/navbar.js
import * as router from "./router.js";

let isMenuOpenedByClick = false;

export function initializeNavbar() {
  const collapsedNavbar = document.querySelector(".collapsed-navbar");
  const collapsedMenu = document.querySelector(".collapsed-menu");

  if (collapsedNavbar && collapsedMenu) {
    // Handle hover events
    collapsedNavbar.addEventListener("mouseenter", () => {
      if (!isMenuOpenedByClick) {
        updateMenuContent();
        collapsedMenu.style.display = "flex";
      }
    });

    collapsedNavbar.addEventListener("mouseleave", () => {
      if (!isMenuOpenedByClick) {
        setTimeout(() => {
          if (!collapsedMenu.matches(":hover")) {
            collapsedMenu.style.display = "none";
          }
        }, 100);
      }
    });

    collapsedMenu.addEventListener("mouseleave", () => {
      if (!isMenuOpenedByClick) {
        collapsedMenu.style.display = "none";
      }
    });

    // Handle click events
    collapsedNavbar.addEventListener("click", (event) => {
      event.stopPropagation();
      if (isMenuOpenedByClick) {
        collapsedMenu.style.display = "none";
        isMenuOpenedByClick = false;
      } else {
        updateMenuContent();
        collapsedMenu.style.display = "flex";
        isMenuOpenedByClick = true;
      }
    });

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      if (isMenuOpenedByClick && !event.target.closest(".collapsed-menu")) {
        collapsedMenu.style.display = "none";
        isMenuOpenedByClick = false;
      }
    });

    // Get collapse breakpoint from CSS variable
    const getCollapseBreakpoint = () => {
      return parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--collapse-breakpoint"
        )
      );
    };

    // Handle resize
    window.addEventListener("resize", () => {
      const collapseBreakpoint = getCollapseBreakpoint();
      if (window.innerWidth > collapseBreakpoint) {
        collapsedMenu.style.display = "none";
        isMenuOpenedByClick = false;
      }
    });
  }

  // Setup navigation for all buttons (desktop and mobile)
  setupButtonNavigation();

  // Initial menu setup
  updateMenuContent();
}

function setupButtonNavigation() {
  // Setup click handlers for all navigation buttons
  const navButtons = document.querySelectorAll(
    ".nav-container button[data-page]:not(.collapsed-navbar)"
  );
  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const pageName = button.getAttribute("data-page");
      router.navigateToPage(pageName);
    });
  });
}

export function updateMenuContent() {
  const collapsedMenu = document.querySelector(".collapsed-menu");
  if (!collapsedMenu) return;

  collapsedMenu.innerHTML = "";
  const navContainer = document.querySelector(".nav-container:nth-child(4)");
  const allButtons = navContainer.querySelectorAll(
    "button[data-page]:not(.collapsed-navbar)"
  );

  allButtons.forEach((button) => {
    if (!button.classList.contains("active")) {
      const buttonText = button.querySelector("h3").textContent;
      const pageName = button.getAttribute("data-page");

      const menuButton = document.createElement("button");
      menuButton.setAttribute("data-page", pageName);

      const h3Element = document.createElement("h3");
      h3Element.textContent = buttonText;
      menuButton.appendChild(h3Element);

      menuButton.onclick = () => {
        router.navigateToPage(pageName);
        collapsedMenu.style.display = "none";
        isMenuOpenedByClick = false;
      };

      collapsedMenu.appendChild(menuButton);
    }
  });
}

// Make updateMenuContent available globally for router.js
window.updateMenuContent = updateMenuContent;
