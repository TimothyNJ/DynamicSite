/**
 * deployment-index-renderer.js
 *
 * Client-side renderer for the Deployment Index pages.
 *
 * Flow:
 *   1. Check localStorage for cached JSON data for this environment.
 *   2. If cached, build the table synchronously from cache — caps applied
 *      inline so the table enters the DOM in its final wrapped state.
 *   3. Fetch fresh JSON from the server in the background.
 *   4. If the data changed, update the cache and rebuild.
 *
 * Pixel-cap strategy (zero layout thrashing):
 *   Before building any rows, scan the data for the first summary and
 *   description text that exceeds CHAR_CAP (66) characters. If found,
 *   measure the pixel width of 66 characters ONCE per column, then apply
 *   that width inline to every cell whose text exceeds the cap during row
 *   construction. Result: one measurement per column instead of two per
 *   cell — eliminates the ~2,800 forced-layout loop that caused the freeze.
 *
 * Created: 17-Apr-2026
 */

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

// ─── Pixel-cap measurement (called at most twice — once per prose column) ──

function ensureHelper() {
  let helper = document.getElementById( 'prose-cell-measure-helper' );
  if ( ! helper ) {
    helper = document.createElement( 'span' );
    helper.id = 'prose-cell-measure-helper';
    helper.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;' +
      'left:-99999px;top:0;pointer-events:none;';
    document.body.appendChild( helper );
  }
  return helper;
}

/**
 * Measure the pixel width of the first CHAR_CAP characters of `sampleText`
 * using the font properties of a <p> inside a table body cell.
 *
 * A temporary row is appended to `tbody` just long enough to read
 * getComputedStyle, then removed. This triggers ONE forced layout.
 */
function measureCapWidth( sampleText, tbody, helperFontReady ) {
  const helper = ensureHelper();

  // If we haven't copied font properties yet, create a temp cell to read them.
  if ( ! helperFontReady ) {
    const tempTr = document.createElement( 'tr' );
    tempTr.className = 'table-body-row';
    const tempTd = document.createElement( 'td' );
    tempTd.className = 'table-body-cell summary-cell';
    const tempDiv = document.createElement( 'div' );
    tempDiv.className = 'cell-fit';
    const tempP = document.createElement( 'p' );
    tempP.textContent = 'X';
    tempDiv.appendChild( tempP );
    tempTd.appendChild( tempDiv );
    tempTr.appendChild( tempTd );
    tbody.appendChild( tempTr );

    const cs = window.getComputedStyle( tempP );
    helper.style.fontFamily = cs.fontFamily;
    helper.style.fontSize = cs.fontSize;
    helper.style.fontWeight = cs.fontWeight;
    helper.style.fontStyle = cs.fontStyle;
    helper.style.letterSpacing = cs.letterSpacing;
    helper.style.textTransform = cs.textTransform;

    tbody.removeChild( tempTr );
  }

  helper.textContent = sampleText.substring( 0, CHAR_CAP );
  return Math.ceil( helper.offsetWidth ) + 1;
}

// ─── Row builder ────────────────────────────────────────────────────────────

function buildRow( commit, summaryCapPx, descCapPx ) {
  const tr = document.createElement( 'tr' );
  tr.className = 'table-body-row';

  // ── Local timestamp ──
  const tdLocal = document.createElement( 'td' );
  tdLocal.className = 'table-body-cell local-timestamp';
  tdLocal.dataset.utc = commit.iso;
  const localDiv = document.createElement( 'div' );
  localDiv.className = 'cell-fit';
  const localP = document.createElement( 'p' );
  localP.textContent = formatLocalTimestamp
    ? formatLocalTimestamp( commit.iso )
    : commit.iso.replace( 'T', ' ' ).replace( 'Z', ' UTC' );
  localDiv.appendChild( localP );
  tdLocal.appendChild( localDiv );

  // ── Commit SHA ──
  const tdSha = document.createElement( 'td' );
  tdSha.className = 'table-body-cell';
  const shaDiv = document.createElement( 'div' );
  shaDiv.className = 'cell-fit';
  const shaP = document.createElement( 'p' );
  shaP.textContent = commit.sha;
  shaDiv.appendChild( shaP );
  tdSha.appendChild( shaDiv );

  // ── Summary ──
  const tdSummary = document.createElement( 'td' );
  tdSummary.className = 'table-body-cell summary-cell';
  const summaryDiv = document.createElement( 'div' );
  summaryDiv.className = 'cell-fit';
  if ( summaryCapPx && commit.subject.length > CHAR_CAP ) {
    summaryDiv.style.width = summaryCapPx + 'px';
  }
  const summaryP = document.createElement( 'p' );
  summaryP.textContent = commit.subject;
  summaryDiv.appendChild( summaryP );
  tdSummary.appendChild( summaryDiv );

  // ── Description ──
  const tdDesc = document.createElement( 'td' );
  tdDesc.className = 'table-body-cell description-cell';
  const descDiv = document.createElement( 'div' );
  descDiv.className = 'cell-fit';
  const body = commit.body || '';
  if ( descCapPx && body.length > CHAR_CAP ) {
    descDiv.style.width = descCapPx + 'px';
  }
  const descP = document.createElement( 'p' );
  if ( body.includes( '<br>' ) ) {
    body.split( '<br>' ).forEach( ( line, i ) => {
      if ( i > 0 ) descP.appendChild( document.createElement( 'br' ) );
      descP.appendChild( document.createTextNode( line ) );
    } );
  } else {
    descP.textContent = body;
  }
  descDiv.appendChild( descP );
  tdDesc.appendChild( descDiv );

  // ── UTC timestamp ──
  const d = new Date( commit.iso );
  const pad = ( n ) => String( n ).padStart( 2, '0' );
  const utcText = `${ d.getUTCFullYear() }-${ pad( d.getUTCMonth() + 1 ) }-${ pad( d.getUTCDate() ) } ${ pad( d.getUTCHours() ) }:${ pad( d.getUTCMinutes() ) } UTC`;
  const tdUtc = document.createElement( 'td' );
  tdUtc.className = 'table-body-cell';
  const utcDiv = document.createElement( 'div' );
  utcDiv.className = 'cell-fit';
  const utcP = document.createElement( 'p' );
  utcP.textContent = utcText;
  utcDiv.appendChild( utcP );
  tdUtc.appendChild( utcDiv );

  tr.appendChild( tdLocal );
  tr.appendChild( tdSha );
  tr.appendChild( tdSummary );
  tr.appendChild( tdDesc );
  tr.appendChild( tdUtc );
  return tr;
}

// ─── Table renderer ────────────────────────────────────────────────────────

function renderTable( tbody, commits ) {
  // 1. Scan data for the first text exceeding CHAR_CAP in each prose column.
  //    Once found, measure the cap width and stop scanning that column.
  let summaryCapPx = null;
  let descCapPx = null;
  let helperFontReady = false;

  for ( const c of commits ) {
    if ( summaryCapPx === null && c.subject.length > CHAR_CAP ) {
      summaryCapPx = measureCapWidth( c.subject, tbody, helperFontReady );
      helperFontReady = true;  // font properties now copied to helper
    }
    if ( descCapPx === null && c.body && c.body.length > CHAR_CAP ) {
      descCapPx = measureCapWidth( c.body, tbody, helperFontReady );
      helperFontReady = true;
    }
    if ( summaryCapPx !== null && descCapPx !== null ) break;
  }

  // 2. Build every row with cap widths applied inline — no post-render pass.
  const fragment = document.createDocumentFragment();
  for ( const commit of commits ) {
    fragment.appendChild( buildRow( commit, summaryCapPx, descCapPx ) );
  }

  // 3. Single DOM append — one layout computation with correct widths.
  tbody.appendChild( fragment );

  console.log(
    `[DeploymentIndex] Rendered ${ commits.length } rows` +
    ( summaryCapPx ? ` (summary cap: ${ summaryCapPx }px)` : '' ) +
    ( descCapPx ? ` (desc cap: ${ descCapPx }px)` : '' )
  );
}

// ─── Fetch JSON from server ────────────────────────────────────────────────

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

// ─── Public API ────────────────────────────────────────────────────────────

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

  // 1. Render from cache immediately if available
  const cached = getCachedData( env );
  if ( cached && cached.length > 0 ) {
    console.log( `[DeploymentIndex] Rendering ${ cached.length } cached rows (${ env })` );
    tbody.innerHTML = '';
    renderTable( tbody, cached );
  }

  // 2. Fetch fresh data in background
  const fresh = await fetchFreshData( env );
  if ( ! fresh ) {
    if ( ! cached ) {
      console.warn( `[DeploymentIndex] No data available for ${ env }` );
    }
    return;
  }

  // 3. Only re-render if data actually changed
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
  renderTable( tbody, fresh );
}
