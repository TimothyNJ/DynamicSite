// js/navigation/router.js

// Map page names to their file paths
const pagePathMap = {
  home: "pages/home/index.html",
  "vendor-request": "pages/vendor-request/index.html",
  "data-entry": "pages/data-entry/index.html",
  engines: "pages/engines/index.html",
  settings: "pages/settings/index.html",
  login: "pages/login/index.html",
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



// Navigate to a specific page
export async function navigateToPage(pageName, pushState = true) {
  // Route guard: Block access to protected pages when not authenticated
  const protectedPages = ['settings', 'data-entry', 'engines', 'vendor-request'];
  
  if (protectedPages.includes(pageName)) {
    // Check if user is authenticated (use window function if available)
    const isAuthenticated = typeof window.isUserAuthenticated === 'function' 
      ? window.isUserAuthenticated() 
      : localStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated) {
      console.log(`[Router] Blocked access to protected page: ${pageName}`);
      navigateToPage('home'); // Redirect to home
      return;
    }
  }
  
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



    // Fetch the page content
    const response = await fetch(pagePath);
    if (!response.ok) {
      throw new Error(
        `Failed to load page: ${response.status} ${response.statusText}`
      );
    }

    const html = await response.text();

    // Update the content container
    contentContainer.innerHTML = `<div class="content-isolation-container"><div class="content-flex-container">${html}</div></div>`;

    // Update active page tracking
    activePage = pageName;

    // Update URL for bookmarking (if this isn't from a popstate event)
    if (pushState) {
      window.history.pushState({ page: pageName }, "", `#${pageName}`);
    }

    // Initialize components for the loaded page
    if (typeof window.initializePageComponents === 'function') {
      window.initializePageComponents(pageName);
    }
    
    // Initialize login form if on login page
    if (pageName === 'login' && typeof window.initializeLoginForm === 'function') {
      window.initializeLoginForm();
    }

    // Update collapsed navbar menu
    if (typeof window.updateMenuContent === "function") {
      window.updateMenuContent();
    }
    
    // Dispatch pageLoaded event for dimension updates
    document.dispatchEvent(new Event('pageLoaded'));
  } catch (error) {
    console.error("Error loading page:", error);
  }
}
