@ -1,57 +1,5 @@
// js/navigation/router.js
// Modified preloadSliderResources function to include time format slider

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
  themeSliderScript: false,
  themeSliderIntegration: false,
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

  // Preload slider resources in the background for faster transitions
  preloadSliderResources();

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
function preloadSliderResources() {
  // Create a container for preloaded resources
  const preloadContainer = document.createElement("div");
@ -75,6 +23,22 @@ function preloadSliderResources() {
    preloadedResources.sliderStylesheet = true;
  }

  // Add time display stylesheet
  if (!document.getElementById("time-display-style")) {
    const timeStyle = document.createElement("link");
    timeStyle.id = "time-display-style";
    timeStyle.rel = "stylesheet";
    timeStyle.href = "styles/time-display.css";
    document.head.appendChild(timeStyle);

    timeStyle.onload = () => {
      preloadedResources.timeDisplayStylesheet = true;
      console.log("Time display stylesheet preloaded");
    };
  } else {
    preloadedResources.timeDisplayStylesheet = true;
  }

  // Preload slider scripts if they're not already loaded
  if (!window.sliderButtons) {
    // Create and load the main slider script (core functionality)
@ -105,13 +69,22 @@ function preloadSliderResources() {
            integrationScript.onload = () => {
              preloadedResources.themeSliderIntegration = true;
              console.log("Theme slider integration script preloaded");

              // Load time format slider scripts
              loadTimeFormatSliderScripts();
            };

            document.body.appendChild(integrationScript);
          } else {
            // Load time format slider scripts if integration script is already loaded
            loadTimeFormatSliderScripts();
          }
        };

        document.body.appendChild(themeScript);
      } else {
        // Load time format slider scripts if theme script is already loaded
        loadTimeFormatSliderScripts();
      }
    };

@ -153,123 +126,70 @@ function preloadSliderResources() {

      document.body.appendChild(integrationScript);
    }
  }
}

// Check if slider resources are loaded
function areSliderResourcesLoaded() {
  return (
    preloadedResources.sliderStylesheet &&
    preloadedResources.sliderScript &&
    preloadedResources.themeSliderScript &&
    preloadedResources.themeSliderIntegration
  );
}

// Wait for slider resources to be loaded
function waitForSliderResources() {
  return new Promise((resolve) => {
    if (areSliderResourcesLoaded()) {
      resolve();
      return;
    }

    // Check every 50ms until resources are loaded
    const checkInterval = setInterval(() => {
      if (areSliderResourcesLoaded()) {
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

// Load the slider resources and return a promise
async function loadSliderResources() {
  // If resources are already being preloaded, wait for them
  return waitForSliderResources();
}

// Navigate to a specific page
export async function navigateToPage(pageName, pushState = true) {
  if (!pageName || pageName === activePage) {
    return; // Already on this page
    // Load time format slider scripts
    loadTimeFormatSliderScripts();
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

    // For settings page, make sure slider resources are loaded before showing content
    if (pageName === "settings") {
      // Add a loading indicator
      contentContainer.innerHTML =
        '<div class="loading-indicator">Loading...</div>';

      // Await slider resources
      await loadSliderResources();
    }
  // Function to load time format slider scripts
  function loadTimeFormatSliderScripts() {
    // Check if time format slider is already loaded
    if (window.timeFormatSlider) {
      preloadedResources.timeFormatSliderScript = true;
    } else {
      // Load time format slider script
      const timeFormatScript = document.createElement("script");
      timeFormatScript.id = "time-format-slider-script";
      timeFormatScript.src = "js/settings/time-format-slider.js";

      timeFormatScript.onload = () => {
        preloadedResources.timeFormatSliderScript = true;
        console.log("Time format slider script preloaded");
      };

    // Fetch the page content
    const response = await fetch(pagePath);
    if (!response.ok) {
      throw new Error(
        `Failed to load page: ${response.status} ${response.statusText}`
      );
      document.body.appendChild(timeFormatScript);
    }

    const html = await response.text();

    // Update the content container
    contentContainer.innerHTML = html;

    // Update active page tracking
    activePage = pageName;
    // Check if time format integration is loaded
    if (window.timeFormatSliderIntegration) {
      preloadedResources.timeFormatSliderIntegration = true;
    } else {
      // Load time format integration script
      const timeFormatIntegrationScript = document.createElement("script");
      timeFormatIntegrationScript.id = "time-format-slider-integration-script";
      timeFormatIntegrationScript.src =
        "js/settings/time-format-slider-integration.js";

      timeFormatIntegrationScript.onload = () => {
        preloadedResources.timeFormatSliderIntegration = true;
        console.log("Time format slider integration script preloaded");
      };

    // Update URL for bookmarking (if this isn't from a popstate event)
    if (pushState) {
      window.history.pushState({ page: pageName }, "", `#${pageName}`);
      document.body.appendChild(timeFormatIntegrationScript);
    }
  }
}

    // Trigger any page-specific initialization - REMOVED TIMEOUT
    const pageLoadEvent = new CustomEvent("pageLoaded", {
      detail: { pageName },
    });

    // Dispatch the event immediately without delay
    document.dispatchEvent(pageLoadEvent);
// Also update the preloadedResources object at the top of the file:
const preloadedResources = {
  sliderStylesheet: false,
  timeDisplayStylesheet: false,
  sliderScript: false,
  themeSliderScript: false,
  themeSliderIntegration: false,
  timeFormatSliderScript: false,
  timeFormatSliderIntegration: false,
};

    // Update collapsed navbar menu
    if (typeof window.updateMenuContent === "function") {
      window.updateMenuContent();
    }
  } catch (error) {
    console.error("Error loading page:", error);
  }
// And update the areSliderResourcesLoaded function:
function areSliderResourcesLoaded() {
  return (
    preloadedResources.sliderStylesheet &&
    preloadedResources.sliderScript &&
    preloadedResources.themeSliderScript &&
    preloadedResources.themeSliderIntegration &&
    preloadedResources.timeDisplayStylesheet &&
    preloadedResources.timeFormatSliderScript &&
    preloadedResources.timeFormatSliderIntegration
  );
}