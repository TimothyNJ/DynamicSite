/**
 * zitadel-api.js - Zitadel Management API client
 *
 * Provides functions to query Zitadel's Management API
 * using the logged-in user's access token.
 *
 * Instance: dynamicsite-hgyhhz.us1.zitadel.cloud
 * Project ID: 339930261431031889
 */

import { getAccessToken, isAuthenticated, refreshToken, isTokenExpired } from '../auth/zitadel-auth.js';

const ZITADEL_API = 'https://dynamicsite-hgyhhz.us1.zitadel.cloud';
const PROJECT_ID = '339930261431031889';

// ─── Authenticated Fetch ─────────────────────────────────────────────────────

async function authenticatedFetch(url, options = {}) {
  if (!isAuthenticated()) {
    throw new Error('[Zitadel API] User is not authenticated');
  }

  // Refresh token if expired
  if (isTokenExpired()) {
    await refreshToken();
  }

  const token = getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`[Zitadel API] ${response.status}: ${errorBody}`);
  }

  return response.json();
}

// ─── Project Roles ───────────────────────────────────────────────────────────

/**
 * Fetch all roles for the DynamicSite project.
 * Uses POST /management/v1/projects/{id}/roles/_search
 * @returns {Promise<Array>} Array of role objects with key, displayName, group
 */
export async function fetchProjectRoles() {
  const data = await authenticatedFetch(
    `${ZITADEL_API}/management/v1/projects/${PROJECT_ID}/roles/_search`,
    {
      method: 'POST',
      body: JSON.stringify({
        query: {
          offset: '0',
          limit: 100,
          asc: true
        }
      })
    }
  );

  // Zitadel returns { result: [...], details: {...} }
  return (data.result || []).map(role => ({
    key: role.key,
    displayName: role.displayName || role.key,
    group: role.group || '',
    creationDate: role.details?.creationDate || null,
    changeDate: role.details?.changeDate || null
  }));
}
