/**
 * page-prefetch.js — Background Page Prefetch System
 *
 * After the app initialises, uses requestIdleCallback to fetch all page HTML
 * fragments in the background and cache them in memory. The router checks this
 * cache before making network requests, making navigation effectively instant.
 *
 * Cache is a simple Map<url, htmlString>. If a URL isn't cached (race on first
 * load, new page added), the router falls back to a normal fetch — nothing breaks.
 *
 * Created: 17-Apr-2026
 */

const cache = new Map();
let prefetchStarted = false;

// requestIdleCallback with setTimeout fallback for Safari
const scheduleIdle = typeof requestIdleCallback === 'function'
  ? requestIdleCallback
  : ( cb ) => setTimeout( cb, 50 );

/**
 * Fetch a single URL and store the response text in the cache.
 * Silently ignores failures — a miss just means the router fetches live.
 */
async function prefetchUrl( url ) {
  if ( cache.has( url ) ) return;
  try {
    const res = await fetch( url );
    if ( res.ok ) {
      cache.set( url, await res.text() );
    }
  } catch ( e ) {
    // Network error — ignore silently, router will fetch on demand
  }
}

/**
 * Build the complete list of page URLs from the router's config.
 * We import the maps directly rather than importing from router.js to avoid
 * circular dependencies — these are static config, safe to duplicate.
 */
function getAllPageUrls( pagePathMap, sidenavConfig ) {
  const urls = [];

  // Top-level pages
  for ( const path of Object.values( pagePathMap ) ) {
    urls.push( path );
  }

  // Subpages and sub-subpages
  for ( const [ , config ] of Object.entries( sidenavConfig ) ) {
    for ( const sub of config.subpages ) {
      urls.push( `${config.basePath}/${sub}/index.html` );

      // Sub-subpages
      const subSub = config.subSubpages?.[ sub ];
      if ( subSub ) {
        for ( const item of subSub.items ) {
          urls.push( `${config.basePath}/${sub}/${item}/index.html` );
        }
      }
    }
  }

  return urls;
}

/**
 * Prefetch all URLs in idle-time batches.
 * Fetches BATCH_SIZE urls per idle callback to avoid hogging the main thread.
 */
function prefetchAll( urls ) {
  const BATCH_SIZE = 4;
  let index = 0;

  function nextBatch() {
    if ( index >= urls.length ) {
      console.log( `[Prefetch] Complete — ${cache.size} pages cached` );
      return;
    }

    const batch = urls.slice( index, index + BATCH_SIZE );
    index += BATCH_SIZE;

    // Fire all fetches in this batch concurrently
    Promise.all( batch.map( prefetchUrl ) ).then( () => {
      scheduleIdle( nextBatch );
    } );
  }

  scheduleIdle( nextBatch );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start prefetching. Called once from main.js after app initialises.
 * Accepts the router config objects so we don't duplicate them.
 */
export function startPrefetch( pagePathMap, sidenavConfig ) {
  if ( prefetchStarted ) return;
  prefetchStarted = true;

  const urls = getAllPageUrls( pagePathMap, sidenavConfig );
  console.log( `[Prefetch] Starting — ${urls.length} pages to cache` );
  prefetchAll( urls );
}

/**
 * Get cached HTML for a URL. Returns the HTML string or null if not cached.
 * Called by the router before making a network fetch.
 */
export function getCached( url ) {
  return cache.get( url ) || null;
}

/**
 * Invalidate the entire cache. Called on version update / page refresh.
 */
export function clearCache() {
  cache.clear();
  prefetchStarted = false;
}
