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
 *              prod     -> api.dynamicsite.io
 *              dev      -> auth-dev.dynamicsite.io
 *              sandbox  -> auth-sandbox.dynamicsite.io
 *
 *   PLACES_API OCI VM tier — address-data autocomplete (`/v1/places/*`).
 *
 *              dev      -> api-dev.dynamicsite.io
 *              sandbox  -> api-sandbox.dynamicsite.io
 *              prod     -> api.dynamicsite.io   (migration pending —
 *                          this hostname is currently the AWS API
 *                          Gateway. Until the prod CNAME is migrated
 *                          off AWS to the OCI VM, prod's address
 *                          validator falls back to the AWS host.)
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
 */
export const AUTH_API =
  ENV === 'prod'
    ? 'https://api.dynamicsite.io'
    : `https://auth-${ENV}.dynamicsite.io`;

/**
 * OCI VM base URL for this environment (address-data autocomplete).
 * NOTE: prod still resolves to api.dynamicsite.io which currently
 * points at AWS API Gateway, not the OCI VM. The prod CNAME migration
 * is tracked separately. Until then, calling PLACES_API in prod will
 * hit AWS and likely 404 — the address validator should detect ENV
 * and gracefully fall back to libaddressinput when ENV === 'prod'
 * until the migration completes.
 */
export const PLACES_API =
  ENV === 'prod'
    ? 'https://api.dynamicsite.io'
    : `https://api-${ENV}.dynamicsite.io`;
