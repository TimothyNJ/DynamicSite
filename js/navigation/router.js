// js/navigation/router.js

// Track cleanup function for current page
let currentPageCleanup = null;

// Map page names to their file paths
const pagePathMap = {
  home: "pages/home/index.html",
  "vendor-request": "pages/vendor-request/index.html",
  "data-entry": "pages/data-entry/index.html",
  engines: "pages/engines/index.html",
  settings: "pages/settings/index.html",
  users: "pages/users/index.html",
  finance: "pages/finance/index.html",
  logistics: "pages/logistics/index.html",
  reporting: "pages/reporting/index.html",
  development: "pages/development/index.html",
  login: "pages/login/index.html",
};

// Map hash aliases to internal page names (URL-friendly → data-page)
const hashAliasMap = {
  "tasks": "vendor-request",
};

// Map parent pages to their subpage configs
// defaultSub: which subpage loads when navigating to the parent
// basePath: filesystem path prefix for subpage HTML files
const sidenavConfig = {
  "vendor-request": {
    defaultSub: "approve",
    basePath: "pages/vendor-request",
    subpages: ["approve", "visibility", "create"],
    subSubpages: {
      "create": {
        defaultSub: "bank-validations",
        items: ["bank-validations", "tin-validations", "create-scac", "change-payment-terms", "change-invoice-approver", "vendor-request", "user-permission-request", "report"]
      }
    }
  }
};

// Store the active page to avoid reloading the same page
let activePage = null;
let activeSubpage = null;
let activeSubSubpage = null;

// Initialize the router
export function initRouter() {
  // Set up click handlers for navigation buttons
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const pageName = button.getAttribute("data-page");
      // Sign In button triggers login directly — no intermediate page
      if (pageName === 'login') {
        if (typeof window.login === 'function') window.login();
        return;
      }
      navigateToPage(pageName);
    });
  });

  // Load the initial page (either from URL or default to home)
  const initial = parseHash();
  navigateToPage(initial.page || "home", true, initial.subpage, initial.subsubpage);

  // Handle browser back/forward navigation
  window.addEventListener("popstate", (event) => {
    const parsed = parseHash();
    const pageName = event.state?.page || parsed.page || "home";
    const subpage = event.state?.subpage || parsed.subpage || null;
    const subsubpage = event.state?.subsubpage || parsed.subsubpage || null;
    navigateToPage(pageName, false, subpage, subsubpage); // Don't push state on popstate events
  });
}

// Parse the URL hash into parent page and optional subpage
// e.g., #tasks/approve → { page: "vendor-request", subpage: "approve" }
// e.g., #home → { page: "home", subpage: null }
function parseHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return { page: null, subpage: null, subsubpage: null };

  const parts = hash.split("/");
  const rawPage = parts[0];
  const subpage = parts[1] || null;
  const subsubpage = parts[2] || null;

  // Resolve alias (e.g., "tasks" → "vendor-request") or use as-is
  const page = hashAliasMap[rawPage] || rawPage;
  return { page, subpage, subsubpage };
}

// Get the page name from the URL (for bookmarking support)
function getPageFromURL() {
  return parseHash().page;
}



// Navigate to a specific page, optionally to a specific subpage/subsubpage
export async function navigateToPage(pageName, pushState = true, subpage = null, subsubpage = null) {
  // Cleanup previous page components
  if (currentPageCleanup) {
    console.log(`[Router] Cleaning up previous page components`);
    currentPageCleanup();
    currentPageCleanup = null;
  }
  
  // Route guard: protect pages that require authentication and minimum role
  const protectedPages = {
    'settings':       'authenticated',
    'data-entry':     'authenticated',
    'engines':        'authenticated',
    'vendor-request': 'authenticated',
    'users':          '05_org_admin',
    'finance':        'authenticated',
    'logistics':      'authenticated',
    'reporting':      'authenticated',
    'development':    'authenticated'
  };

  if (protectedPages[pageName]) {
    const isAuth = typeof window.isUserAuthenticated === 'function'
      ? window.isUserAuthenticated()
      : localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuth) {
      console.log(`[Router] Not authenticated - redirecting to login`);
      navigateToPage('login');
      return;
    }

    const requiredRole = protectedPages[pageName];
    const hasAccess = requiredRole === 'authenticated'
      ? true
      : typeof window.hasMinimumRole === 'function'
        ? window.hasMinimumRole(requiredRole)
        : true;

    if (!hasAccess) {
      console.log(`[Router] Insufficient role for ${pageName} - requires ${requiredRole}`);
      navigateToPage('home');
      return;
    }
  }
  
  // If same parent page but different subpage, just swap the subpage
  if (pageName && pageName === activePage && sidenavConfig[pageName]) {
    const config = sidenavConfig[pageName];
    const targetSub = subpage || config.defaultSub;
    if (targetSub !== activeSubpage || subsubpage !== activeSubSubpage) {
      await loadSubpage(pageName, targetSub, pushState, subsubpage);
    }
    return;
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
    activeSubpage = null;

    // If this page has a sidenav, initialize sub-routing
    if (sidenavConfig[pageName]) {
      initSidenav(pageName);
      const targetSub = subpage || sidenavConfig[pageName].defaultSub;
      await loadSubpage(pageName, targetSub, pushState, subsubpage);
    } else {
      // Update URL for bookmarking (if this isn't from a popstate event)
      if (pushState) {
        window.history.pushState({ page: pageName }, "", `#${pageName}`);
      }
    }

    // Initialize components for the loaded page
    if (typeof window.initializePageComponents === 'function') {
      window.initializePageComponents(pageName);
    }
    
    // Update nav visibility based on auth state
    if (typeof window.updateNavigationForAuthState === 'function') {
      window.updateNavigationForAuthState();
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

// Initialize sidenav button click handlers for a parent page
function initSidenav(pageName) {
  // Start both sidenavs in collapsed state immediately to prevent flash
  const sidenav = document.querySelector('.sidenav');
  const secondary = document.querySelector('.sidenav-secondary');
  if (sidenav) sidenav.classList.add('collapsible');
  if (secondary) secondary.classList.add('collapsible');

  // Primary sidenav buttons
  const sidenavButtons = document.querySelectorAll('.sidenav-button[data-subpage]');
  sidenavButtons.forEach(button => {
    button.addEventListener('click', () => {
      const sub = button.getAttribute('data-subpage');
      loadSubpage(pageName, sub, true);
    });
  });

  // Secondary sidenav buttons (sub-subpages)
  const subSubButtons = document.querySelectorAll('.sidenav-button[data-subsubpage]');
  subSubButtons.forEach(button => {
    button.addEventListener('click', () => {
      const subsub = button.getAttribute('data-subsubpage');
      loadSubSubpage(pageName, activeSubpage, subsub, true);
    });
  });

  // Set up independent hover expand/collapse for each sidenav
  // and button hover detection for sidenav2 visibility
  initSidenavHover(pageName);
}

// Independent hover management for each sidenav
let sidenav1CollapseTimer = null;
let sidenav2CollapseTimer = null;

function setupCollapseHover(el, timerRef) {
  if (!el) return;

  el.addEventListener('mouseenter', () => {
    if (timerRef.id) {
      clearTimeout(timerRef.id);
      timerRef.id = null;
    }
    if (el.classList.contains('collapsible')) {
      el.classList.add('expanded');
    }
  });

  el.addEventListener('mouseleave', () => {
    if (timerRef.id) clearTimeout(timerRef.id);
    timerRef.id = setTimeout(() => {
      el.classList.remove('expanded');
      timerRef.id = null;
    }, 1000);
  });
}

function initSidenavHover(pageName) {
  const sidenav = document.querySelector('.sidenav');
  const secondary = document.querySelector('.sidenav-secondary');
  const config = sidenavConfig[pageName];

  // Each sidenav expands/collapses independently
  const timer1 = { id: null };
  const timer2 = { id: null };
  setupCollapseHover(sidenav, timer1);
  setupCollapseHover(secondary, timer2);

  // When hovering a sidenav1 button, show/hide sidenav2 based on sub-subpages
  if (sidenav && secondary && config) {
    const buttons = sidenav.querySelectorAll('.sidenav-button[data-subpage]');
    buttons.forEach(button => {
      button.addEventListener('mouseenter', () => {
        const sub = button.getAttribute('data-subpage');
        if (config.subSubpages?.[sub]) {
          secondary.classList.add('visible');
        } else {
          secondary.classList.remove('visible');
        }
      });
    });

    // When mouse leaves sidenav1, revert sidenav2 visibility to match active button
    sidenav.addEventListener('mouseleave', () => {
      if (config.subSubpages?.[activeSubpage]) {
        secondary.classList.add('visible');
      } else {
        secondary.classList.remove('visible');
      }
    });
  }
}

// Load a subpage into the sidenav-content area
async function loadSubpage(pageName, subpage, pushState = true, subsubpage = null) {
  const config = sidenavConfig[pageName];
  if (!config || !config.subpages.includes(subpage)) {
    console.error(`[Router] Unknown subpage: ${subpage} for ${pageName}`);
    return;
  }

  // Show/hide secondary sidenav based on whether this subpage has sub-subpages
  const secondarySidenav = document.querySelector('.sidenav-secondary');
  const subSubConfig = config.subSubpages?.[subpage];
  if (secondarySidenav) {
    if (subSubConfig) {
      secondarySidenav.classList.add('visible');
    } else {
      secondarySidenav.classList.remove('visible');
    }
  }

  // If this subpage has sub-subpages, load the sub-subpage instead of the subpage itself
  if (subSubConfig) {
    const targetSubSub = subsubpage || subSubConfig.defaultSub;
    activeSubpage = subpage;

    // Update primary sidenav active button state
    document.querySelectorAll('.sidenav-button[data-subpage]').forEach(btn => {
      if (btn.getAttribute('data-subpage') === subpage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Make primary sidenav collapsible after selection
    const sidenav = document.querySelector('.sidenav');
    if (sidenav) sidenav.classList.add('collapsible');

    await loadSubSubpage(pageName, subpage, targetSubSub, pushState);
    return;
  }

  const subpagePath = `${config.basePath}/${subpage}/index.html`;
  const contentArea = document.querySelector('.sidenav-content');
  if (!contentArea) {
    console.error('[Router] .sidenav-content container not found');
    return;
  }

  try {
    const response = await fetch(subpagePath);
    if (!response.ok) {
      throw new Error(`Failed to load subpage: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    contentArea.innerHTML = html;
    activeSubpage = subpage;
    activeSubSubpage = null;

    // Update sidenav active button state
    document.querySelectorAll('.sidenav-button[data-subpage]').forEach(btn => {
      if (btn.getAttribute('data-subpage') === subpage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Make primary sidenav collapsible after selection
    const sidenav = document.querySelector('.sidenav');
    if (sidenav) sidenav.classList.add('collapsible');

    // Remove collapsible from secondary sidenav (no sub-subpage selected)
    const secondaryNav = document.querySelector('.sidenav-secondary');
    if (secondaryNav) secondaryNav.classList.remove('collapsible');

    // Build the URL hash — use alias if one exists, otherwise use pageName
    const reverseAlias = Object.entries(hashAliasMap).find(([, v]) => v === pageName);
    const hashParent = reverseAlias ? reverseAlias[0] : pageName;

    if (pushState) {
      window.history.pushState(
        { page: pageName, subpage: subpage },
        "",
        `#${hashParent}/${subpage}`
      );
    }
  } catch (error) {
    console.error('[Router] Error loading subpage:', error);
  }
}

// Load a sub-subpage into the sidenav-content area
async function loadSubSubpage(pageName, subpage, subsubpage, pushState = true) {
  const config = sidenavConfig[pageName];
  const subSubConfig = config?.subSubpages?.[subpage];
  if (!subSubConfig || !subSubConfig.items.includes(subsubpage)) {
    console.error(`[Router] Unknown sub-subpage: ${subsubpage} for ${pageName}/${subpage}`);
    return;
  }

  const subsubpagePath = `${config.basePath}/${subpage}/${subsubpage}/index.html`;
  const contentArea = document.querySelector('.sidenav-content');
  if (!contentArea) {
    console.error('[Router] .sidenav-content container not found');
    return;
  }

  try {
    const response = await fetch(subsubpagePath);
    if (!response.ok) {
      throw new Error(`Failed to load sub-subpage: ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    contentArea.innerHTML = html;
    activeSubSubpage = subsubpage;

    // Update secondary sidenav active button state
    document.querySelectorAll('.sidenav-button[data-subsubpage]').forEach(btn => {
      if (btn.getAttribute('data-subsubpage') === subsubpage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Make secondary sidenav collapsible after selection
    const secondaryNav = document.querySelector('.sidenav-secondary');
    if (secondaryNav) secondaryNav.classList.add('collapsible');

    // Build the URL hash
    const reverseAlias = Object.entries(hashAliasMap).find(([, v]) => v === pageName);
    const hashParent = reverseAlias ? reverseAlias[0] : pageName;

    if (pushState) {
      window.history.pushState(
        { page: pageName, subpage: subpage, subsubpage: subsubpage },
        "",
        `#${hashParent}/${subpage}/${subsubpage}`
      );
    }
  } catch (error) {
    console.error('[Router] Error loading sub-subpage:', error);
  }
}

// Register cleanup function for current page
export function registerPageCleanup(cleanupFn) {
  currentPageCleanup = cleanupFn;
}
