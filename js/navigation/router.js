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

// Keep track of preloaded resources
const preloadedResources = {
  sliderStylesheet: false,
  sliderScript: false,
  sliderIntegration: false,
  clockStylesheet: false,
  clockScript: false,
  clockIntegration: false,
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

  // Preload slider and clock resources in the background for faster transitions
  preloadSettingsResources();

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

// Preload slider resources in the background
function preloadSettingsResources() {
  // Create a container for preloaded resources
  const preloadContainer = document.createElement("div");
  preloadContainer.style.display = "none";
  preloadContainer.id = "preloaded-resources";
  document.body.appendChild(preloadContainer);

  // Add slider stylesheet
  if (!document.getElementById("slider-buttons-style")) {
    const sliderStyle = document.createElement("link");
    sliderStyle.id = "slider-buttons-style";
    sliderStyle.rel = "stylesheet";
    sliderStyle.href = "styles/slider-buttons.css";
    document.head.appendChild(sliderStyle);

    sliderStyle.onload = () => {
      preloadedResources.sliderStylesheet = true;
      console.log("Slider stylesheet preloaded");
    };
  } else {
    preloadedResources.sliderStylesheet = true;
  }

  // Add clock selector stylesheet
  if (!document.getElementById("clock-selector-style")) {
    const clockStyle = document.createElement("link");
    clockStyle.id = "clock-selector-style";
    clockStyle.rel = "stylesheet";
    clockStyle.href = "styles/clock-selector.css";
    document.head.appendChild(clockStyle);

    clockStyle.onload = () => {
      preloadedResources.clockStylesheet = true;
      console.log("Clock stylesheet preloaded");
    };
  } else {
    preloadedResources.clockStylesheet = true;
  }

  // Preload slider scripts if they're not already loaded
  if (!window.sliderButtons) {
    // Create and load the main slider script
    const sliderScript = document.createElement("script");
    sliderScript.id = "slider-buttons-script";
    sliderScript.src = "js/settings/slider-buttons.js";

    sliderScript.onload = () => {
      preloadedResources.sliderScript = true;
      console.log("Slider buttons script preloaded");

      // After main script loads, load the integration script
      if (!document.getElementById("slider-integration-script")) {
        const integrationScript = document.createElement("script");
        integrationScript.id = "slider-integration-script";
        integrationScript.src = "js/settings/slider-integration.js";

        integrationScript.onload = () => {
          preloadedResources.sliderIntegration = true;
          console.log("Slider integration script preloaded");
        };

        document.body.appendChild(integrationScript);
      }
    };

    document.body.appendChild(sliderScript);
  } else {
    preloadedResources.sliderScript = true;
    preloadedResources.sliderIntegration = true;
  }

  // Preload clock scripts if they're not already loaded
  if (!window.clockSelector) {
    // Create and load the main clock script
    const clockScript = document.createElement("script");
    clockScript.id = "clock-selector-script";
    clockScript.src = "js/settings/clock-selector.js";

    clockScript.onload = () => {
      preloadedResources.clockScript = true;
      console.log("Clock selector script preloaded");

      // After main script loads, load the integration script
      if (!document.getElementById("clock-integration-script")) {
        const clockIntegrationScript = document.createElement("script");
        clockIntegrationScript.id = "clock-integration-script";
        clockIntegrationScript.src = "js/settings/clock-integration.js";

        clockIntegrationScript.onload = () => {
          preloadedResources.clockIntegration = true;
          console.log("Clock integration script preloaded");
        };

        document.body.appendChild(clockIntegrationScript);
      }
    };

    document.body.appendChild(clockScript);
  } else {
    preloadedResources.clockScript = true;
    preloadedResources.clockIntegration = true;
  }
}

// Check if settings resources are loaded
function areSettingsResourcesLoaded() {
  return (
    preloadedResources.sliderStylesheet &&
    preloadedResources.sliderScript &&
    preloadedResources.sliderIntegration &&
    preloadedResources.clockStylesheet &&
    preloadedResources.clockScript &&
    preloadedResources.clockIntegration
  );
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
