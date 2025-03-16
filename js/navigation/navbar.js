import { navigateToPage } from "./router.js";

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

    // Handle resize
    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) {
        collapsedMenu.style.display = "none";
        collapsedMenu.style.removeProperty("display");
        isMenuOpenedByClick = false;
      }
    });
  }
}

export function updateMenuContent() {
  const collapsedMenu = document.querySelector(".collapsed-menu");
  collapsedMenu.innerHTML = "";
  const navContainer = document.querySelector(".nav-container:nth-child(4)");
  const allButtons = navContainer.querySelectorAll(
    "button:not(.collapsed-navbar)"
  );

  allButtons.forEach((button) => {
    if (!button.classList.contains("active")) {
      const buttonText = button.querySelector("h3").textContent;
      const menuButton = document.createElement("button");
      const h3Element = document.createElement("h3");
      h3Element.textContent = buttonText;
      menuButton.appendChild(h3Element);
      menuButton.onclick = () => {
        switchPage(buttonText);
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
