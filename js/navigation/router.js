// js/navigation/router.js

// Track cleanup function for current page
let currentPageCleanup = null;

// Map page names to their file paths
const pagePathMap = {
  home: "pages/home/index.html",
  "vendor-request": "pages/vendor-request/index.html",
  "data-entry": "pages/data-entry/index.html",

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
  },
  "users": {
    defaultSub: "system-roles",
    basePath: "pages/users",
    subpages: ["system-roles", "org-roles-above-admin", "org-admins", "create-org-users", "create-org-users-email", "guests", "view-org-chart", "upload-org-chart"]
  },
  "finance": {
    defaultSub: "invoice-approvers",
    basePath: "pages/finance",
    subpages: ["invoice-approvers", "upload-invoice-approvers", "banks", "upload-banks"]
  },
  "logistics": {
    defaultSub: "view-scac",
    basePath: "pages/logistics",
    subpages: ["view-scac", "upload-scac"]
  },
  "reporting": {
    defaultSub: "individual-metrics",
    basePath: "pages/reporting",
    subpages: ["individual-metrics", "team-metrics", "organisation-metrics"]
  },
  "development": {
    defaultSub: "site-settings",
    basePath: "pages/development",
    subpages: ["site-settings", "table", "engines", "infrastructure", "backgrounds", "deployment-index"],
    subSubpages: {
      "deployment-index": {
        defaultSub: "development",
        items: ["development", "sandbox", "production"]
      }
    }
  }
};

// Active state tracking
let activePage = null;
let activeSubpage = null;
let activeSubSubpage = null;
let hoveredSubpage = null; // Which sidenav1 button is hovered (for sidenav2 targeting)

// Route guard config: pages requiring authentication or a minimum role
const protectedPages = {
  'settings':       'authenticated',
  'data-entry':     'authenticated',
  'vendor-request': 'authenticated',
  'users':          '05_org_admin',
  'finance':        'authenticated',
  'logistics':      'authenticated',
  'reporting':      'authenticated',
  'development':    'authenticated'
};

// ==============================================
// Router Initialization
// ==============================================

export function initRouter() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const pageName = button.getAttribute("data-page");
      if (pageName === 'login') {
        if (typeof window.login === 'function') window.login();
        return;
      }
      navigateToPage(pageName);
    });
  });

  const initial = parseHash();
  navigateToPage(initial.page || "home", true, initial.subpage, initial.subsubpage);

  window.addEventListener("popstate", (event) => {
    const parsed = parseHash();
    navigateToPage(
      event.state?.page || parsed.page || "home",
      false,
      event.state?.subpage || parsed.subpage || null,
      event.state?.subsubpage || parsed.subsubpage || null
    );
  });
}

// ==============================================
// Hash Parsing & URL Helpers
// ==============================================

// e.g., #tasks/approve → { page: "vendor-request", subpage: "approve" }
function parseHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return { page: null, subpage: null, subsubpage: null };

  const parts = hash.split("/");
  const page = hashAliasMap[parts[0]] || parts[0];
  return { page, subpage: parts[1] || null, subsubpage: parts[2] || null };
}

// Get the URL-friendly hash parent (reverse alias lookup)
function getHashParent(pageName) {
  const alias = Object.entries(hashAliasMap).find(([, v]) => v === pageName);
  return alias ? alias[0] : pageName;
}

// Update active button state for a given data attribute
function setActiveButton(attr, value) {
  document.querySelectorAll(`.sidenav-button[${attr}]`).forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute(attr) === value);
  });
}

// ==============================================
// Page Navigation
// ==============================================

export async function navigateToPage(pageName, pushState = true, subpage = null, subsubpage = null) {
  // Route guard
  if (protectedPages[pageName]) {
    const isAuth = typeof window.isUserAuthenticated === 'function'
      ? window.isUserAuthenticated()
      : localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuth) {
      navigateToPage('login');
      return;
    }

    const requiredRole = protectedPages[pageName];
    if (requiredRole !== 'authenticated') {
      const hasAccess = typeof window.hasMinimumRole === 'function'
        ? window.hasMinimumRole(requiredRole)
        : true;
      if (!hasAccess) {
        navigateToPage('home');
        return;
      }
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

  if (!pageName || pageName === activePage) return;

  // Cleanup previous page — only runs when actually changing pages
  if (currentPageCleanup) {
    currentPageCleanup();
    currentPageCleanup = null;
  }

  try {
    // Update navbar active button
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.classList.toggle("active", button.getAttribute("data-page") === pageName);
    });

    const contentContainer = document.querySelector("#page-content");
    if (!contentContainer) return;

    const pagePath = pagePathMap[pageName];
    if (!pagePath) return;

    const response = await fetch(pagePath);
    if (!response.ok) throw new Error(`Failed to load page: ${response.status}`);

    contentContainer.innerHTML = `<div class="content-isolation-container"><div class="content-flex-container">${await response.text()}</div></div>`;
    activePage = pageName;
    activeSubpage = null;

    // If this page has a sidenav, initialize sub-routing
    if (sidenavConfig[pageName]) {
      initSidenav(pageName);
      await loadSubpage(pageName, subpage || sidenavConfig[pageName].defaultSub, pushState, subsubpage);
    } else if (pushState) {
      window.history.pushState({ page: pageName }, "", `#${pageName}`);
    }

    // Post-navigation hooks
    if (typeof window.initializePageComponents === 'function') window.initializePageComponents(pageName);
    if (typeof window.updateNavigationForAuthState === 'function') window.updateNavigationForAuthState();
    if (typeof window.updateMenuContent === 'function') window.updateMenuContent();
    document.dispatchEvent(new Event('pageLoaded'));
  } catch (error) {
    console.error("Error loading page:", error);
  }
}

// ==============================================
// Sidenav Initialization
// ==============================================

function initSidenav(pageName) {
  const sidenav = document.querySelector('.sidenav');
  const secondary = document.querySelector('.sidenav-secondary');
  const config = sidenavConfig[pageName];
  if (!sidenav) return;

  // Page load: both sidenavs start collapsible + expanded.
  // If the default subpage has sub-subpages, sidenav2 is visible + expanded.
  // Collapse is scheduled after --sidenav-collapse-delay by initSidenavHover.
  sidenav.classList.add('collapsible', 'expanded');
  if (secondary) {
    secondary.classList.add('collapsible');
    if (config?.subSubpages?.[config.defaultSub]) {
      renderSecondaryNav(pageName, config.defaultSub);
      secondary.classList.add('visible', 'expanded');
    }
  }

  // Primary sidenav button click handlers
  document.querySelectorAll('.sidenav-button[data-subpage]').forEach(button => {
    button.addEventListener('click', () => {
      loadSubpage(pageName, button.getAttribute('data-subpage'), true);
    });
  });

  initSidenavHover(pageName);
}

// ==============================================
// Dynamic Secondary Nav Rendering
// ==============================================
// Builds sidenav2 buttons from sidenavConfig for a given subpage.
// Preserves active state on the current sub-subpage button.
// If the subpage has no sub-subpages, sidenav2 is cleared and hidden.

function renderSecondaryNav(pageName, forSubpage) {
  const secondary = document.querySelector('.sidenav-secondary');
  const config = sidenavConfig[pageName];
  if (!secondary || !config) return;

  const subSubConfig = config.subSubpages?.[forSubpage];

  if (!subSubConfig) {
    secondary.innerHTML = '';
    secondary.classList.remove('visible', 'expanded');
    return;
  }

  secondary.innerHTML = '';
  subSubConfig.items.forEach(item => {
    const button = document.createElement('button');
    button.className = 'sidenav-button';
    button.setAttribute('data-subsubpage', item);

    if (forSubpage === activeSubpage && item === activeSubSubpage) {
      button.classList.add('active');
    }

    const h3 = document.createElement('h3');
    h3.textContent = item.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    button.appendChild(h3);

    button.addEventListener('click', () => loadSubpage(pageName, forSubpage, true, item));
    secondary.appendChild(button);
  });

  secondary.classList.add('visible');
}

// ==============================================
// Sidenav Hover / Collapse Logic
// ==============================================
// Rule 1 — Hover Zone:
//   sidenav1, sidenav2, and left content buffer form a single zone.
//   Mouse inside any = stay expanded. Mouse leaves all = start collapse timer.
//
// Rule 2 — Collapse Sequence (CSS):
//   Buttons fade out, arrows appear, width shrinks — all via CSS variables.
//
// Rule 3 — Page Load:
//   Start expanded, schedule collapse after --sidenav-collapse-delay.
//
// Rule 4 — Sidenav1 button hover (live preview):
//   Hovering a button renders its sub-subpages in sidenav2.
//   Moving into sidenav2 preserves the preview. Moving to left buffer restores active state.
//
// Rule 5 — Arrow/button vertical position (CSS):
//   Controlled by --sidenav-arrow-default-top.

function initSidenavHover(pageName) {
  const sidenav = document.querySelector('.sidenav');
  const secondary = document.querySelector('.sidenav-secondary');
  const contentBuffer = document.querySelector('.content-wrapper > .content-buffer:first-child');
  const config = sidenavConfig[pageName];
  if (!sidenav) return;

  const collapseDelay = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--sidenav-collapse-delay'), 10
  ) || 1200;

  let collapseTimerId = null;

  // --- Timer helpers ---

  function cancelCollapse() {
    if (collapseTimerId) {
      clearTimeout(collapseTimerId);
      collapseTimerId = null;
    }
  }

  function scheduleCollapse() {
    cancelCollapse();
    collapseTimerId = setTimeout(() => {
      collapseTimerId = null;
      hoveredSubpage = null;
      sidenav.classList.remove('expanded');
      if (secondary) {
        secondary.classList.remove('expanded');
        if (config?.subSubpages?.[activeSubpage]) {
          renderSecondaryNav(pageName, activeSubpage);
        } else {
          secondary.innerHTML = '';
          secondary.classList.remove('visible');
        }
      }
    }, collapseDelay);
  }

  // --- Expand helpers ---

  function expandAll() {
    sidenav.classList.add('expanded');
    if (secondary?.classList.contains('visible')) {
      secondary.classList.add('expanded');
    }
  }

  function restoreActiveAndExpand() {
    hoveredSubpage = null;
    if (secondary && config?.subSubpages?.[activeSubpage]) {
      renderSecondaryNav(pageName, activeSubpage);
      secondary.classList.add('visible', 'expanded');
    }
    expandAll();
  }

  // --- Zone detection ---

  const zoneElements = [sidenav, secondary, contentBuffer].filter(Boolean);

  function isInZone(target) {
    return target && zoneElements.some(el => el === target || el.contains(target));
  }

  function onLeaveZone(e) {
    if (!isInZone(e.relatedTarget)) scheduleCollapse();
  }

  // --- Event listeners ---

  // Sidenav1: expand on enter, button hover handles sidenav2 content
  sidenav.addEventListener('mouseenter', () => { cancelCollapse(); expandAll(); });
  sidenav.addEventListener('mouseleave', onLeaveZone);

  // Sidenav2: keep hover preview if coming from sidenav1, otherwise restore active state
  if (secondary) {
    secondary.addEventListener('mouseenter', () => {
      cancelCollapse();
      sidenav.classList.add('expanded');
      if (!hoveredSubpage) restoreActiveAndExpand();
      else expandAll();
    });
    secondary.addEventListener('mouseleave', onLeaveZone);
  }

  // Left buffer: always restore active state
  if (contentBuffer) {
    contentBuffer.addEventListener('mouseenter', () => { cancelCollapse(); restoreActiveAndExpand(); });
    contentBuffer.addEventListener('mouseleave', onLeaveZone);
  }

  // Sidenav1 button hover: live preview of sub-subpages in sidenav2
  if (secondary && config) {
    sidenav.querySelectorAll('.sidenav-button[data-subpage]').forEach(button => {
      button.addEventListener('mouseenter', () => {
        const sub = button.getAttribute('data-subpage');
        hoveredSubpage = config.subSubpages?.[sub] ? sub : null;
        renderSecondaryNav(pageName, sub);
        if (secondary.classList.contains('visible')) secondary.classList.add('expanded');
      });
    });
  }

  // Page load: schedule first collapse
  scheduleCollapse();
}

// ==============================================
// Subpage & Sub-subpage Loading
// ==============================================

async function loadSubpage(pageName, subpage, pushState = true, subsubpage = null) {
  const config = sidenavConfig[pageName];
  if (!config || !config.subpages.includes(subpage)) return;

  // Render sidenav2 for this subpage
  renderSecondaryNav(pageName, subpage);
  const secondary = document.querySelector('.sidenav-secondary');
  const subSubConfig = config.subSubpages?.[subpage];
  if (secondary && subSubConfig) secondary.classList.add('expanded');

  // If this subpage has sub-subpages, delegate to loadSubSubpage
  if (subSubConfig) {
    activeSubpage = subpage;
    setActiveButton('data-subpage', subpage);
    await loadSubSubpage(pageName, subpage, subsubpage || subSubConfig.defaultSub, pushState);
    return;
  }

  // Load the subpage HTML directly
  const contentArea = document.querySelector('.sidenav-content');
  if (!contentArea) return;

  try {
    const response = await fetch(`${config.basePath}/${subpage}/index.html`);
    if (!response.ok) throw new Error(`Failed to load subpage: ${response.status}`);

    contentArea.innerHTML = await response.text();
    contentArea.dataset.page = pageName;
    contentArea.dataset.subpage = subpage;
    delete contentArea.dataset.subsubpage;
    activeSubpage = subpage;
    activeSubSubpage = null;
    setActiveButton('data-subpage', subpage);

    if (pushState) {
      window.history.pushState(
        { page: pageName, subpage },
        "",
        `#${getHashParent(pageName)}/${subpage}`
      );
    }

    // Notify listeners that subpage content has loaded
    document.dispatchEvent(new CustomEvent('subpageLoaded', {
      detail: { page: pageName, subpage }
    }));
  } catch (error) {
    console.error('[Router] Error loading subpage:', error);
  }
}

async function loadSubSubpage(pageName, subpage, subsubpage, pushState = true) {
  const config = sidenavConfig[pageName];
  const subSubConfig = config?.subSubpages?.[subpage];
  if (!subSubConfig || !subSubConfig.items.includes(subsubpage)) return;

  const contentArea = document.querySelector('.sidenav-content');
  if (!contentArea) return;

  try {
    const response = await fetch(`${config.basePath}/${subpage}/${subsubpage}/index.html`);
    if (!response.ok) throw new Error(`Failed to load sub-subpage: ${response.status}`);

    contentArea.innerHTML = await response.text();
    contentArea.dataset.page = pageName;
    contentArea.dataset.subpage = subpage;
    contentArea.dataset.subsubpage = subsubpage;
    activeSubSubpage = subsubpage;
    setActiveButton('data-subsubpage', subsubpage);

    if (pushState) {
      window.history.pushState(
        { page: pageName, subpage, subsubpage },
        "",
        `#${getHashParent(pageName)}/${subpage}/${subsubpage}`
      );
    }

    // Notify listeners that sub-subpage content has loaded
    document.dispatchEvent(new CustomEvent('subpageLoaded', {
      detail: { page: pageName, subpage, subsubpage }
    }));
  } catch (error) {
    console.error('[Router] Error loading sub-subpage:', error);
  }
}

// ==============================================
// Page Cleanup Registration
// ==============================================

export function registerPageCleanup(cleanupFn) {
  currentPageCleanup = cleanupFn;
}
