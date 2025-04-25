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

// Required resources for settings page
const settingsResources = {
  // Core selector system
  selectorInit: {
    loaded: false,
    path: "js/selectors/selector-init.js",
  },
};

// Initialize the router
export function initRouter() {
  // Set up click handlers for navigation buttons
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const pageName = button.getAttribute("data-page");
      navigateToPage(pageName);
    });
  });

  // Preload selector init in the background for faster transitions
  preloadSelectorInit();

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

// Preload the selector init module in the background
function preloadSelectorInit() {
  // Create a container for preloaded resources
  const preloadContainer = document.createElement("div");
  preloadContainer.style.display = "none";
  preloadContainer.id = "preloaded-resources";
  document.body.appendChild(preloadContainer);

  // Load the selector-init.js script if it's not already loaded
  if (!document.getElementById("selector-init-script")) {
    const script = document.createElement("script");
    script.id = "selector-init-script";
    script.src = settingsResources.selectorInit.path;

    script.onload = () => {
      settingsResources.selectorInit.loaded = true;
      console.log("Selector init module preloaded");
    };

    document.body.appendChild(script);
  } else {
    settingsResources.selectorInit.loaded = true;
  }
}

// Check if settings resources are loaded
function areSettingsResourcesLoaded() {
  return settingsResources.selectorInit.loaded;
}

// Wait for settings resources to be loaded
function waitForSettingsResources() {
  return new Promise((resolve) => {
    if (areSettingsResourcesLoaded()) {
      resolve();
      return;
    }

    // Check every 50ms until resources are loaded
    const checkInterval = setInterval(() => {
      if (areSettingsResourcesLoaded()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);

    // Timeout after 3 seconds to prevent infinite waiting
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(); // Continue anyway
    }, 3000);
  });
}

// Load the settings resources and return a promise
async function loadSettingsResources() {
  // If resources are already being preloaded, wait for them
  return waitForSettingsResources();
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

    // For settings page, make sure resources are loaded before showing content
    if (pageName === "settings") {
      // Add a loading indicator
      contentContainer.innerHTML =
        '<div class="loading-indicator">Loading...</div>';

      // Await settings resources
      await loadSettingsResources();
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

    // Trigger any page-specific initialization - REMOVED TIMEOUT
    const pageLoadEvent = new CustomEvent("pageLoaded", {
      detail: { pageName },
    });

    // Dispatch the event immediately without delay
    document.dispatchEvent(pageLoadEvent);

    // Update collapsed navbar menu
    if (typeof window.updateMenuContent === "function") {
      window.updateMenuContent();
    }
  } catch (error) {
    console.error("Error loading page:", error);
  }
}
