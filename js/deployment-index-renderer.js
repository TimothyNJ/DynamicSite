/**
 * deployment-index-renderer.js
 *
 * Client-side renderer for the Deployment Index pages. Replaces the old
 * approach of injecting a 9,000+ line HTML table and post-processing it.
 *
 * Flow:
 *   1. Check localStorage for cached JSON data for this environment.
 *   2. If cached, build the table immediately from cache (chunked via rAF).
 *   3. Fetch fresh JSON from the server.
 *   4. If the data changed, update the cache and rebuild.
 *
 * Rows are built with formatting applied inline — no second-pass rewrite.
 * Chunks of CHUNK_SIZE rows per animation frame keep the main thread free.
 *
 * Created: 17-Apr-2026
 */

const CHUNK_SIZE = 50;
const CACHE_PREFIX = 'deploymentIndex_';
const CHAR_CAP = 66;

let formatLocalTimestamp = null; // lazy-loaded from userTimeZone.js

// ─── Cache helpers ──────────────────────────────────────────────────────────

function getCachedData( env ) {
  try {
    const raw = localStorage.getItem( CACHE_PREFIX + env );
    return raw ? JSON.parse( raw ) : null;
  } catch {
    return null;
  }
}

function setCachedData( env, data ) {
  try {
    localStorage.setItem( CACHE_PREFIX + env, JSON.stringify( data ) );
  } catch {
    // Storage full or unavailable — ignore silently
  }
}

// ─── Row builder ────────────────────────────────────────────────────────────

function escHtml( text ) {
  return text
    .replace( /&/g, '&amp;' )
    .replace( /</g, '&lt;' )
    .replace( />/g, '&gt;' )
    .replace( /"/g, '&quot;' );
}

function buildRow( commit ) {
  const tr = document.createElement( 'tr' );
  tr.className = 'table-body-row';

  // Local timestamp cell
  const tdLocal = document.createElement( 'td' );
  tdLocal.className = 'table-body-cell local-timestamp';
  tdLocal.dataset.utc = commit.iso;
  const localText = formatLocalTimestamp
    ? formatLocalTimestamp( commit.iso )
    : commit.iso.replace( 'T', ' ' ).replace( 'Z', ' UTC' );
  tdLocal.innerHTML = `<div class="cell-fit"><p>${ escHtml( localText ) }</p></div>`;

  // Commit SHA cell
  const tdSha = document.createElement( 'td' );
  tdSha.className = 'table-body-cell';
  tdSha.innerHTML = `<div class="cell-fit"><p>${ escHtml( commit.sha ) }</p></div>`;

  // Summary cell
  const tdSummary = document.createElement( 'td' );
  tdSummary.className = 'table-body-cell summary-cell';
  tdSummary.innerHTML = `<div class="cell-fit"><p>${ escHtml( commit.subject ) }</p></div>`;

  // Description cell
  const tdDesc = document.createElement( 'td' );
  tdDesc.className = 'table-body-cell description-cell';
  tdDesc.innerHTML = `<div class="cell-fit"><p>${ escHtml( commit.body || '' ) }</p></div>`;

  // UTC timestamp cell
  const d = new Date( commit.iso );
  const utcText = `${ d.getUTCFullYear() }-${ String( d.getUTCMonth() + 1 ).padStart( 2, '0' ) }-${ String( d.getUTCDate() ).padStart( 2, '0' ) } ${ String( d.getUTCHours() ).padStart( 2, '0' ) }:${ String( d.getUTCMinutes() ).padStart( 2, '0' ) } UTC`;
  const tdUtc = document.createElement( 'td' );
  tdUtc.className = 'table-body-cell';
  tdUtc.innerHTML = `<div class="cell-fit"><p>${ utcText }</p></div>`;

  tr.appendChild( tdLocal );
  tr.appendChild( tdSha );
  tr.appendChild( tdSummary );
  tr.appendChild( tdDesc );
  tr.appendChild( tdUtc );
  return tr;
}

// ─── Chunked renderer ───────────────────────────────────────────────────────

function renderChunked( tbody, commits ) {
  return new Promise( ( resolve ) => {
    let index = 0;

    function nextChunk() {
      const end = Math.min( index + CHUNK_SIZE, commits.length );
      const fragment = document.createDocumentFragment();

      for ( let i = index; i < end; i++ ) {
        fragment.appendChild( buildRow( commits[ i ] ) );
      }
      tbody.appendChild( fragment );
      index = end;

      if ( index < commits.length ) {
        requestAnimationFrame( nextChunk );
      } else {
        resolve();
      }
    }

    requestAnimationFrame( nextChunk );
  } );
}

// ─── Pixel cap (applied once after first chunk renders) ─────────────────────

function applyPixelCaps( container ) {
  // Query only BODY cells (td), not header cells (th) which contain <h3>.
  const cellFits = container.querySelectorAll(
    'td.description-cell .cell-fit, td.summary-cell .cell-fit'
  );
  if ( cellFits.length === 0 ) return;

  let helper = document.getElementById( 'prose-cell-measure-helper' );
  if ( ! helper ) {
    helper = document.createElement( 'span' );
    helper.id = 'prose-cell-measure-helper';
    helper.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-99999px;top:0;pointer-events:none;';
    document.body.appendChild( helper );
  }

  // Copy font properties from the first body-cell <p> for measurement.
  const firstP = cellFits[ 0 ]?.querySelector( 'p' );
  if ( ! firstP ) return;
  const cs = window.getComputedStyle( firstP );
  helper.style.fontFamily = cs.fontFamily;
  helper.style.fontSize = cs.fontSize;
  helper.style.fontWeight = cs.fontWeight;
  helper.style.fontStyle = cs.fontStyle;
  helper.style.letterSpacing = cs.letterSpacing;
  helper.style.textTransform = cs.textTransform;

  cellFits.forEach( ( cellFit ) => {
    const p = cellFit.querySelector( 'p' );
    if ( ! p ) return;
    const text = p.textContent || '';
    if ( ! text ) return;

    helper.textContent = text;
    const fullWidth = helper.offsetWidth;

    const sample = text.length >= CHAR_CAP ? text.substring( 0, CHAR_CAP ) : text;
    helper.textContent = sample;
    const capWidth = helper.offsetWidth;

    cellFit.style.width = `${ Math.ceil( Math.min( fullWidth, capWidth ) ) + 1 }px`;
  } );

  console.log( `[DeploymentIndex] Pixel-capped ${ cellFits.length } prose cells at ${ CHAR_CAP } chars` );
}

// ─── Fetch JSON from server ─────────────────────────────────────────────────

async function fetchFreshData( env ) {
  const url = `pages/development/deployment-index/${ env }/index.json`;
  try {
    const res = await fetch( url, { cache: 'no-store' } );
    if ( ! res.ok ) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Render the deployment index for the given environment.
 * Called from main.js when the deployment-index sub-subpage loads.
 *
 * @param {string} env — 'development' | 'sandbox' | 'production'
 */
export async function renderDeploymentIndex( env ) {
  // Lazy-load the timestamp formatter
  if ( ! formatLocalTimestamp ) {
    try {
      const mod = await import( './settings/userTimeZone.js' );
      formatLocalTimestamp = mod.formatLocalTimestamp;
    } catch {
      console.warn( '[DeploymentIndex] Could not load userTimeZone.js — using UTC fallback' );
    }
  }

  const tbody = document.querySelector(
    `[data-search-scope="${ env }"] .table-main tbody`
  );
  if ( ! tbody ) {
    console.error( '[DeploymentIndex] tbody not found for', env );
    return;
  }

  const tableOuter = tbody.closest( '.table-outer' );

  // 1. Check cache — render immediately if available
  const cached = getCachedData( env );
  let cacheRendered = false;
  if ( cached && cached.length > 0 ) {
    console.log( `[DeploymentIndex] Rendering ${ cached.length } cached rows (${ env })` );
    tbody.innerHTML = '';
    await renderChunked( tbody, cached );
    applyPixelCaps( tableOuter );
    cacheRendered = true;
  }

  // 2. Fetch fresh data from server
  const fresh = await fetchFreshData( env );
  if ( ! fresh ) {
    if ( ! cached ) {
      console.warn( `[DeploymentIndex] No data available for ${ env }` );
    }
    return;
  }

  // 3. Compare with cache — only re-render if data changed
  const cacheStr = cached ? JSON.stringify( cached ) : '';
  const freshStr = JSON.stringify( fresh );
  if ( cacheStr === freshStr ) {
    console.log( `[DeploymentIndex] Data unchanged (${ env }) — no re-render needed` );
    return;
  }

  // 4. Data changed — update cache and re-render
  console.log( `[DeploymentIndex] New data detected (${ env }) — ${ fresh.length } rows, re-rendering` );
  setCachedData( env, fresh );
  tbody.innerHTML = '';
  await renderChunked( tbody, fresh );
  applyPixelCaps( tableOuter );
}
