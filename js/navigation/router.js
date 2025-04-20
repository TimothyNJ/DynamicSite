// js/navigation/router.js

// Map page names to their file paths
const pagePathMap = {
  home: "pages/home/index.html",
  "vendor-request": "pages/vendor-request/index.html",
  "data-entry": "pages/data-entry/index.html",
  progress: "pages/progress/index.html",
  settings: "pages/settings/index.html",
};

// Store the active page to avoid reloading the same page
let activePage = null;

// Initialize the router
export function initRouter() {
  // Set up click handlers for navigation buttons
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const pageName = button.getAttribute("data-page");
      navigateToPage(pageName);
    });
  });

  // Load the initial page (either from URL or default to home)
  const initialPage = getPageFromURL() || "home";
  navigateToPage(initialPage);

  // Handle browser back/forward navigation
  window.addEventListener("popstate", (event) => {
    const pageName = event.state?.page || getPageFromURL() || "home";
    navigateToPage(pageName, false); // Don't push state on popstate events
  });
}

// Get the page name from the URL (for bookmarking support)
function getPageFromURL() {
  // Extract page from URL hash (e.g., #home)
  const hash = window.location.hash.substring(1);
  return hash || null;
}

// Load the slider resources and return a promise
function loadSliderResources() {
  return new Promise((resolve) => {
    // Load slider stylesheet if not already loaded
    if (!document.getElementById("slider-buttons-style")) {
      const sliderStyle = document.createElement("link");
      sliderStyle.id = "slider-buttons-style";
      sliderStyle.rel = "stylesheet";
      sliderStyle.href = "styles/slider-buttons.css";
      document.head.appendChild(sliderStyle);
    }

    // Load slider script if not already loaded
    if (!window.sliderButtons) {
      const sliderScript = document.createElement("script");
      sliderScript.src = "js/settings/slider-buttons.js";
      sliderScript.onload = () => {
        const integrationScript = document.createElement("script");
        integrationScript.src = "js/settings/slider-integration.js";
        integrationScript.onload = () => {
          // Give time for scripts to initialize
          setTimeout(resolve, 100);
        };
        document.body.appendChild(integrationScript);
      };
      document.body.appendChild(sliderScript);
    } else {
      // Scripts already loaded
      resolve();
    }
  });
}

// Navigate to a specific page
export async function navigateToPage(pageName, pushState = true) {
  if (!pageName || pageName === activePage) {
    return; // Already on this page
  }

  try {
    // Update active button state
    document.querySelectorAll("[data-page]").forEach((button) => {
      if (button.getAttribute("data-page") === pageName) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });

    // Get the content container
    const contentContainer = document.querySelector("#page-content");
    if (!contentContainer) {
      console.error("Content container not found");
      return;
    }

    // Get the page content
    const pagePath = pagePathMap[pageName];
    if (!pagePath) {
      console.error(`No path defined for page: ${pageName}`);
      return;
    }

    // For settings page, load slider resources before content
    if (pageName === "settings") {
      await loadSliderResources();
    }

    // Fetch the page content
    const response = await fetch(pagePath);
    if (!response.ok) {
      throw new Error(
        `Failed to load page: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Update the content container
    contentContainer.innerHTML = html;

    // Update active page tracking
    activePage = pageName;

    // Update URL for bookmarking (if this isn't from a popstate event)
    if (pushState) {
      window.history.pushState({ page: pageName }, "", `#${pageName}`);
    }

    // Trigger any page-specific initialization
    const pageLoadEvent = new CustomEvent("pageLoaded", {
      detail: { pageName },
    });
    document.dispatchEvent(pageLoadEvent);

    // Update collapsed navbar menu
    if (typeof window.updateMenuContent === "function") {
      window.updateMenuContent();
    }
  } catch (error) {
    console.error("Error loading page:", error);
  }
}
