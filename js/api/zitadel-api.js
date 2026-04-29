/**
 * zitadel-api.js - Zitadel API client
 *
 * Calls the DynamicSite API proxy (AWS Lambda + API Gateway)
 * which authenticates with Zitadel's Management API using a
 * server-side service account. The browser only sends the
 * user's access token for authentication — the service account
 * key never leaves the server.
 *
 * Proxy endpoint, per environment (resolved via core/env.js):
 *   prod     -> https://api.dynamicsite.io           (API Gateway prod)
 *   dev      -> https://auth-dev.dynamicsite.io      (API Gateway dev)
 *   sandbox  -> https://auth-sandbox.dynamicsite.io  (API Gateway sandbox)
 *
 * Each environment has its own API Gateway + Lambda function so a code
 * push to dev's Lambda cannot affect prod's auth flow.
 */

import { getAccessToken, isAuthenticated, refreshToken, isTokenExpired } from '../auth/zitadel-auth.js';
import { AUTH_API } from '../core/env.js';

const API_BASE = AUTH_API;

// ─── Authenticated Fetch ─────────────────────────────────────────────────────

async function apiFetch(path) {
  if (!isAuthenticated()) {
    throw new Error('[Zitadel API] User is not authenticated');
  }

  // Refresh token if expired
  if (isTokenExpired()) {
    await refreshToken();
  }

  const token = getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
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
 * Calls GET /roles on the API proxy.
 * @returns {Promise<Array>} Array of role objects with key, displayName, group
 */
export async function fetchProjectRoles() {
  const data = await apiFetch('/roles');

  return (data.result || []).map(role => ({
    key: role.key,
    displayName: role.displayName || role.key,
    group: role.group || '',
    creationDate: role.details?.creationDate || null,
    changeDate: role.details?.changeDate || null
  }));
}

// ─── Users ───────────────────────────────────────────────────────────────────

/**
 * Fetch all user grants (role assignments) for the project.
 * Calls GET /user-grants on the API proxy.
 * @returns {Promise<Array>} Array of user grant objects
 */
export async function fetchUserGrants() {
  const data = await apiFetch('/user-grants');
  return data.result || [];
}

/**
 * Fetch all project grants.
 * Calls GET /users on the API proxy.
 * @returns {Promise<Array>} Array of project grant objects
 */
export async function fetchProjectUsers() {
  const data = await apiFetch('/users');
  return data.result || [];
}
