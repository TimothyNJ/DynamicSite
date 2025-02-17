// Create ResizeObserver to sync buffer widths (content drives navbar)
const bufferResizeObserver = new ResizeObserver((entries) => {
  entries.forEach((entry) => {
    const leftContentBuffer = document.querySelector(
      ".content-wrapper .content-buffer:first-child"
    );
    const rightContentBuffer = document.querySelector(
      ".content-wrapper .content-buffer:last-child"
    );
    const navbarBuffer1 = document.querySelector(
      ".nav-bar .nav-container:nth-child(1)"
    );
    const navbarBuffer5 = document.querySelector(
      ".nav-bar .nav-container:nth-child(5)"
    );

    if (leftContentBuffer && navbarBuffer1) {
      navbarBuffer1.style.width = getComputedStyle(leftContentBuffer).width;
    }
    if (rightContentBuffer && navbarBuffer5) {
      navbarBuffer5.style.width = getComputedStyle(rightContentBuffer).width;
    }
  });
});

// Start observing content buffers after DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const contentBuffers = document.querySelectorAll(
    ".content-wrapper .content-buffer"
  );
  contentBuffers.forEach((buffer) => bufferResizeObserver.observe(buffer));
});

// Force reflow on page load to ensure proper layout calculations
window.addEventListener("load", () => {
  document.body.style.display = "none"; // Temporarily hide body
  document.body.offsetHeight; // Trigger reflow
  document.body.style.display = ""; // Show body again
});

function switchPage(pageId) {
  // Hide all virtual pages
  const pages = document.querySelectorAll(".virtual-page");
  pages.forEach((page) => page.classList.remove("active"));

  // Show the selected page
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add("active");

  // Update nav button styles
  document
    .querySelectorAll(".nav-bar .nav-container:nth-child(4) button")
    .forEach((button) => button.classList.remove("active"));
  const activeButton = Array.from(
    document.querySelectorAll(".nav-bar .nav-container:nth-child(4) button")
  ).find((button) => button.textContent === pageId);
  if (activeButton) activeButton.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const collapsedNavbar = document.querySelector(".collapsed-navbar");
  const collapsedMenu = document.querySelector(".collapsed-menu");
  window.isMenuOpenedByClick = false;

  window.addEventListener("resize", () => {
    const collapsedMenu = document.querySelector(".collapsed-menu");
    if (
      window.innerWidth >
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--collapse-breakpoint"
        )
      )
    ) {
      if (collapsedMenu) {
        collapsedMenu.style.display = "none";
        collapsedMenu.style.removeProperty("display"); // Remove inline style completely
        window.isMenuOpenedByClick = false;
      }
    }
  });

  if (collapsedNavbar && collapsedMenu) {
    // Handle hover events
    collapsedNavbar.addEventListener("mouseenter", () => {
      if (!window.isMenuOpenedByClick) {
        updateMenuContent();
        collapsedMenu.style.display = "flex";
      }
    });

    collapsedNavbar.addEventListener("mouseleave", () => {
      if (!window.isMenuOpenedByClick) {
        setTimeout(() => {
          if (!collapsedMenu.matches(":hover")) {
            collapsedMenu.style.display = "none";
          }
        }, 100);
      }
    });

    collapsedMenu.addEventListener("mouseleave", () => {
      if (!window.isMenuOpenedByClick) {
        collapsedMenu.style.display = "none";
      }
    });

    // Handle click events
    collapsedNavbar.addEventListener("click", (event) => {
      event.stopPropagation();
      if (window.isMenuOpenedByClick) {
        collapsedMenu.style.display = "none";
        window.isMenuOpenedByClick = false;
      } else {
        updateMenuContent();
        collapsedMenu.style.display = "flex";
        window.isMenuOpenedByClick = true;
      }
    });

    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      if (
        window.isMenuOpenedByClick &&
        !event.target.closest(".collapsed-menu")
      ) {
        collapsedMenu.style.display = "none";
        window.isMenuOpenedByClick = false;
      }
    });

    // Function to update menu content
    function updateMenuContent() {
      collapsedMenu.innerHTML = "";
      const navContainer = document.querySelector(
        ".nav-container:nth-child(4)"
      );
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
              collapsedMenu.style.display = "flex";
            }, 0);
            window.isMenuOpenedByClick = false;
          };
          collapsedMenu.appendChild(menuButton);
        }
      });
    }

    // Initial menu setup
    updateMenuContent();
  }
});
