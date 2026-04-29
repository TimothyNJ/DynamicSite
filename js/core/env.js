/**
 * env.js - Environment detection + per-env service URLs
 *
 * Reads window.location.hostname and resolves to one of:
 *   prod | dev | sandbox
 *
 * Then exposes the right backend URL for each service category. Use
 * this instead of hardcoding hostnames in client code so a deploy on
 * dev only ever talks to dev backends, sandbox only ever talks to
 * sandbox backends, and a bad change to one env's API can't reach
 * another env's data.
 *
 * Hostname mapping:
 *   dynamicsite.io           -> prod
 *   www.dynamicsite.io       -> prod
 *   dev.dynamicsite.io       -> dev
 *   sandbox.dynamicsite.io   -> sandbox
 *   localhost / 127.0.0.1    -> dev (treat local dev as dev)
 *   anything else            -> prod (defensive default — never leak
 *                              a dev or sandbox URL into an unknown
 *                              host context)
 *
 * Service URL families (all served per environment so a problem on
 * one tier can't take down another):
 *
 *   AUTH_API   AWS API Gateway tier — Zitadel proxy (`/users`,
 *              `/roles`, `/user-grants`), font editor
 *              (`/push-font-variables`, `/revert-font-variables`),
 *              security settings (`/push-security-config`).
 *
 *              prod     -> auth.dynamicsite.io
 *              dev      -> auth-dev.dynamicsite.io
 *              sandbox  -> auth-sandbox.dynamicsite.io
 *
 *   PLACES_API OCI VM tier — address-data autocomplete (`/v1/places/*`).
 *
 *              prod     -> api.dynamicsite.io
 *              dev      -> api-dev.dynamicsite.io
 *              sandbox  -> api-sandbox.dynamicsite.io
 *
 * Naming pattern (all envs symmetric):
 *   auth-*    = AWS auth tier
 *   api-*     = Oracle data tier
 *   no suffix = the prod variant of either tier
 *
 * The two families are intentionally separate. AWS handles the
 * lightweight admin/auth surface where serverless makes sense. OCI
 * handles the chunky always-on database service for address lookups.
 */

const HOST =
  (typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname) ||
  '';

let _env;
if (HOST === 'dev.dynamicsite.io') {
  _env = 'dev';
} else if (HOST === 'sandbox.dynamicsite.io') {
  _env = 'sandbox';
} else if (HOST === 'localhost' || HOST === '127.0.0.1' || HOST === '') {
  // Local development is treated as dev for backend selection so that a
  // dev iterating with `npm run dev` against a local server hits the
  // dev backends, never prod.
  _env = 'dev';
} else {
  // Defensive default: any unknown host (custom mirror, preview deploy,
  // etc.) is treated as prod. Better to fail closed than to leak a dev
  // backend URL into a context the engineer didn't anticipate.
  _env = 'prod';
}

export const ENV = _env;

/**
 * AWS API Gateway base URL for this environment.
 * Each environment has its own API Gateway + Lambda function so a code
 * push to dev's Lambda cannot affect prod's auth flow.
 *
 * Naming: prod uses the bare `auth.dynamicsite.io` (one label deep so
 * Cloudflare's free Universal SSL covers it without a wildcard). dev
 * and sandbox use `auth-{env}.dynamicsite.io`.
 */
export const AUTH_API =
  ENV === 'prod'
    ? 'https://auth.dynamicsite.io'
    : `https://auth-${ENV}.dynamicsite.io`;

/**
 * OCI VM base URL for this environment (address-data autocomplete).
 *
 * Naming: prod uses bare `api.dynamicsite.io` (one label deep). dev
 * and sandbox use `api-{env}.dynamicsite.io`.
 *
 * NOTE: prod's `api.dynamicsite.io` is in transition. Until the OCI
 * prod VM has Let's Encrypt issued for this hostname and Cloudflare
 * DNS is repointed at it, calls to PLACES_API from prod will fail.
 * The address validator should detect ENV and fall back to
 * libaddressinput when prod's PLACES_API is unreachable.
 */
export const PLACES_API =
  ENV === 'prod'
    ? 'https://api.dynamicsite.io'
    : `https://api-${ENV}.dynamicsite.io`;
