"""
Zitadel API Proxy — AWS Lambda Function

Sits between the DynamicSite SPA and Zitadel's Management API.
The browser sends the user's access token; this function:
  1. Validates the user's token against Zitadel's userinfo endpoint
  2. Authenticates as the claude-admin service account (JWT bearer grant)
  3. Calls the requested Management API endpoint
  4. Returns the result to the browser

Environment variables:
  ZITADEL_ISSUER       — e.g. https://dynamicsite-hgyhhz.us1.zitadel.cloud
  ZITADEL_PROJECT_ID   — e.g. 339930261431031889
  SECRET_NAME          — Secrets Manager key name for the service account key
  ALLOWED_ORIGINS      — comma-separated list of allowed CORS origins
"""

import json
import os
import time
import urllib.request
import urllib.parse
import urllib.error

import jwt  # PyJWT
import boto3
from botocore.exceptions import ClientError

# ─── Configuration ────────────────────────────────────────────────────────────

ZITADEL_ISSUER = os.environ.get('ZITADEL_ISSUER', 'https://dynamicsite-hgyhhz.us1.zitadel.cloud')
PROJECT_ID = os.environ.get('ZITADEL_PROJECT_ID', '339930261431031889')
SECRET_NAME = os.environ.get('SECRET_NAME', 'dynamicsite/zitadel-service-account-key')
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', 'https://dev.dynamicsite.io,https://sandbox.dynamicsite.io,https://dynamicsite.io,https://www.dynamicsite.io').split(',')]

# Cache service account token across warm Lambda invocations
_sa_token_cache = {'token': None, 'expires_at': 0}
_sa_key_cache = {'key_data': None}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_cors_headers(origin):
    """Return CORS headers if origin is allowed."""
    if origin in ALLOWED_ORIGINS:
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Max-Age': '86400'
        }
    return {
        'Access-Control-Allow-Origin': '',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }


def respond(status_code, body, origin=''):
    """Build an API Gateway proxy response."""
    headers = get_cors_headers(origin)
    headers['Content-Type'] = 'application/json'
    return {
        'statusCode': status_code,
        'headers': headers,
        'body': json.dumps(body)
    }


def get_service_account_key():
    """Retrieve the service account key from Secrets Manager (cached)."""
    if _sa_key_cache['key_data']:
        return _sa_key_cache['key_data']

    client = boto3.client('secretsmanager', region_name='us-west-2')
    try:
        response = client.get_secret_value(SecretId=SECRET_NAME)
        key_data = json.loads(response['SecretString'])
        _sa_key_cache['key_data'] = key_data
        return key_data
    except ClientError as e:
        raise RuntimeError(f'Failed to retrieve service account key: {e}')


def get_service_account_token():
    """Get a valid service account access token (cached until near expiry)."""
    now = int(time.time())

    # Return cached token if still valid (with 60s buffer)
    if _sa_token_cache['token'] and _sa_token_cache['expires_at'] > now + 60:
        return _sa_token_cache['token']

    key_data = get_service_account_key()

    # Create JWT assertion
    assertion = jwt.encode(
        {
            'iss': key_data['userId'],
            'sub': key_data['userId'],
            'aud': ZITADEL_ISSUER,
            'iat': now,
            'exp': now + 3600
        },
        key_data['key'],
        algorithm='RS256',
        headers={'kid': key_data['keyId']}
    )

    # Exchange for access token
    token_url = f'{ZITADEL_ISSUER}/oauth/v2/token'
    token_data = urllib.parse.urlencode({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion': assertion,
        'scope': 'openid urn:zitadel:iam:org:project:id:zitadel:aud'
    }).encode()

    req = urllib.request.Request(token_url, data=token_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'})
    resp = urllib.request.urlopen(req)
    tokens = json.loads(resp.read())

    _sa_token_cache['token'] = tokens['access_token']
    _sa_token_cache['expires_at'] = now + tokens.get('expires_in', 3600)

    return tokens['access_token']


def validate_user_token(user_token):
    """
    Validate the caller's access token by calling Zitadel's userinfo endpoint.
    Returns user info dict if valid, raises on failure.
    """
    userinfo_url = f'{ZITADEL_ISSUER}/oidc/v1/userinfo'
    req = urllib.request.Request(userinfo_url, headers={
        'Authorization': f'Bearer {user_token}'
    })
    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise ValueError(f'Invalid user token: {e.code} {e.reason}')


def call_zitadel_management(method, path, body=None):
    """Call a Zitadel Management API endpoint using the service account token."""
    sa_token = get_service_account_token()
    url = f'{ZITADEL_ISSUER}{path}'

    req = urllib.request.Request(url, method=method, headers={
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': f'Bearer {sa_token}'
    })

    if body:
        req.data = json.dumps(body).encode()

    try:
        resp = urllib.request.urlopen(req)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        raise RuntimeError(f'Zitadel API error {e.code}: {error_body}')


# ─── Route Handlers ──────────────────────────────────────────────────────────

def handle_get_roles():
    """Fetch all project roles."""
    return call_zitadel_management('POST',
        f'/management/v1/projects/{PROJECT_ID}/roles/_search',
        {'query': {'offset': '0', 'limit': 100, 'asc': True}}
    )


def handle_get_users():
    """Fetch all users with grants on this project."""
    return call_zitadel_management('POST',
        f'/management/v1/projects/{PROJECT_ID}/grants/_search',
        {'query': {'offset': '0', 'limit': 100}}
    )


def handle_get_user_grants():
    """Fetch all user grants (role assignments) for the project."""
    return call_zitadel_management('POST',
        '/management/v1/users/grants/_search',
        {
            'query': {'offset': '0', 'limit': 100},
            'queries': [
                {
                    'projectIdQuery': {
                        'projectId': PROJECT_ID
                    }
                }
            ]
        }
    )


# ─── Security Settings Handlers ──────────────────────────────────────────────

def handle_get_security_settings(env):
    """Fetch OIDC settings and login policy from Zitadel Admin API.
    The env parameter is accepted for future per-environment Zitadel instances,
    but currently all environments share the same Zitadel instance."""
    oidc_settings = call_zitadel_management('GET', '/admin/v1/settings/oidc')
    login_policy = call_zitadel_management('GET', '/admin/v1/policies/login')
    return {
        'environment': env,
        'oidcSettings': oidc_settings.get('settings', {}),
        'loginPolicy': login_policy.get('policy', {})
    }


def handle_update_security_settings(env, body):
    """Update Zitadel OIDC settings and/or login policy.
    Accepts a JSON body with optional 'oidcSettings' and 'loginPolicy' keys.
    Each key contains only the fields to update."""
    results = {}

    if 'oidcSettings' in body:
        oidc = body['oidcSettings']
        update_payload = {}
        if 'accessTokenLifetime' in oidc:
            update_payload['accessTokenLifetime'] = oidc['accessTokenLifetime']
        if 'idTokenLifetime' in oidc:
            update_payload['idTokenLifetime'] = oidc['idTokenLifetime']
        if 'refreshTokenIdleExpiration' in oidc:
            update_payload['refreshTokenIdleExpiration'] = oidc['refreshTokenIdleExpiration']
        if 'refreshTokenExpiration' in oidc:
            update_payload['refreshTokenExpiration'] = oidc['refreshTokenExpiration']
        if update_payload:
            results['oidc'] = call_zitadel_management('PUT', '/admin/v1/settings/oidc', update_payload)

    if 'loginPolicy' in body:
        lp = body['loginPolicy']
        update_payload = {}
        if 'passwordCheckLifetime' in lp:
            update_payload['passwordCheckLifetime'] = lp['passwordCheckLifetime']
        if update_payload:
            # Login policy update requires the full policy object; fetch current
            # and merge in the changes.
            current = call_zitadel_management('GET', '/admin/v1/policies/login')
            merged = {**current.get('policy', {}), **update_payload}
            # Remove read-only fields
            for key in ['details', 'isDefault']:
                merged.pop(key, None)
            results['loginPolicy'] = call_zitadel_management('PUT', '/admin/v1/policies/login', merged)

    results['environment'] = env
    return results


# S3 bucket map per environment for client-side security config
ENV_S3_BUCKETS = {
    'development': 'tnjdynamicsite-dev',
    'sandbox': 'tnjdynamicsite-sandbox',
    'production': 'tnjdynamicsite'
}

ENV_CLOUDFRONT_IDS = {
    'development': 'E3OWX0O17FJNHI',
    'sandbox': '',  # TODO: Add sandbox CloudFront distribution ID
    'production': ''  # TODO: Add production CloudFront distribution ID
}


def handle_push_client_config(env, body):
    """Write client-side security config JSON to the target environment's S3 bucket
    and invalidate CloudFront cache so the site picks it up."""
    import boto3

    bucket = ENV_S3_BUCKETS.get(env)
    if not bucket:
        raise ValueError(f'Unknown environment: {env}')

    config_json = json.dumps(body.get('clientConfig', {}), indent=2)

    s3 = boto3.client('s3', region_name='us-west-2')
    s3.put_object(
        Bucket=bucket,
        Key='security-config.json',
        Body=config_json.encode('utf-8'),
        ContentType='application/json',
        CacheControl='no-cache,no-store,must-revalidate'
    )

    # Invalidate CloudFront if distribution ID is configured
    cf_id = ENV_CLOUDFRONT_IDS.get(env)
    if cf_id:
        cf = boto3.client('cloudfront', region_name='us-west-2')
        cf.create_invalidation(
            DistributionId=cf_id,
            InvalidationBatch={
                'Paths': {'Quantity': 1, 'Items': ['/security-config.json']},
                'CallerReference': str(int(time.time()))
            }
        )

    return {'status': 'ok', 'environment': env, 'bucket': bucket}


# ─── Font Variable Push Handler ──────────────────────────────────────────────

GITHUB_SECRET_NAME = os.environ.get('GITHUB_SECRET_NAME', 'dynamicsite/github-token')
GITHUB_REPO = 'TimothyNJ/DynamicSite'
GITHUB_FILE_PATH = 'styles/_variables.scss'

# Environment → Git branch mapping
ENV_BRANCHES = {
    'development': 'development',
    'sandbox': 'sandbox',
    'production': 'main'
}

# Environment → S3 bucket for font state history
ENV_FONT_BUCKETS = {
    'development': 'tnjdynamicsite-dev',
    'sandbox': 'tnjdynamicsite-sandbox',
    'production': 'tnjdynamicsite'
}

_github_token_cache = {'token': None}


def get_github_token():
    """Retrieve GitHub personal access token from Secrets Manager."""
    if _github_token_cache['token']:
        return _github_token_cache['token']
    client = boto3.client('secretsmanager', region_name='us-west-2')
    resp = client.get_secret_value(SecretId=GITHUB_SECRET_NAME)
    token = resp['SecretString']
    # Handle JSON-wrapped tokens ({"token": "ghp_..."})
    try:
        parsed = json.loads(token)
        token = parsed.get('token', token)
    except (json.JSONDecodeError, TypeError):
        pass
    _github_token_cache['token'] = token.strip()
    return _github_token_cache['token']


def github_api(method, endpoint, body=None):
    """Call the GitHub REST API."""
    token = get_github_token()
    url = f'https://api.github.com{endpoint}'
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Authorization', f'Bearer {token}')
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('Content-Type', 'application/json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        raise RuntimeError(f'GitHub API {method} {endpoint}: {e.code} {error_body}')


FONT_STATE_KEY = 'font-state-history.json'


def get_font_state_history(env='development'):
    """Read the font state history from S3. Returns dict or empty default."""
    bucket = ENV_FONT_BUCKETS.get(env, ENV_FONT_BUCKETS['development'])
    s3 = boto3.client('s3', region_name='us-west-2')
    try:
        resp = s3.get_object(Bucket=bucket, Key=FONT_STATE_KEY)
        return json.loads(resp['Body'].read().decode('utf-8'))
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            return {'previous': None, 'current': None, 'environment': env}
        raise


def save_font_state_history(state, env='development'):
    """Write the font state history to S3."""
    bucket = ENV_FONT_BUCKETS.get(env, ENV_FONT_BUCKETS['development'])
    s3 = boto3.client('s3', region_name='us-west-2')
    s3.put_object(
        Bucket=bucket,
        Key=FONT_STATE_KEY,
        Body=json.dumps(state, indent=2).encode('utf-8'),
        ContentType='application/json'
    )


def extract_current_font_values(scss_content):
    """Parse current clamp() values from _variables.scss content."""
    import re
    values = {}
    for tag in ('h1', 'h2', 'h3', 'h4', 'p'):
        var_name = f'--{tag}-font-size'
        pattern = re.compile(
            rf'{var_name}:\s*clamp\(([\d.]+)rem,\s*([\d.]+)vw,\s*([\d.]+)rem\)',
            re.MULTILINE
        )
        m = pattern.search(scss_content)
        if m:
            values[tag] = {
                'min': float(m.group(1)),
                'pref': float(m.group(2)),
                'max': float(m.group(3))
            }
    return values


def handle_push_font_variables(body):
    """Update font clamp() variables in _variables.scss via GitHub API.
    Stores before/after state in S3 for revert support.
    Expects body: { fontVariables: { h1: {min, pref, max}, ... }, environment: "development" }
    """
    import base64
    import re

    font_vars = body.get('fontVariables', {})
    env = body.get('environment', 'development')
    if not font_vars:
        raise ValueError('No fontVariables in request body')

    branch = ENV_BRANCHES.get(env)
    if not branch:
        raise ValueError(f'Invalid environment: {env}')

    # 1. Fetch current file content + SHA from GitHub
    file_info = github_api('GET', f'/repos/{GITHUB_REPO}/contents/{GITHUB_FILE_PATH}?ref={branch}')
    current_sha = file_info['sha']
    content = base64.b64decode(file_info['content']).decode('utf-8')

    # 2. Extract current values before we modify anything
    before_values = extract_current_font_values(content)

    # 3. Replace each clamp() line
    for tag, vals in font_vars.items():
        min_val = vals.get('min')
        pref_val = vals.get('pref')
        max_val = vals.get('max')
        if min_val is None or pref_val is None or max_val is None:
            continue

        var_name = f'--{tag}-font-size'
        pattern = re.compile(
            rf'({var_name}:\s*clamp\()[\d.]+rem,\s*[\d.]+vw,\s*[\d.]+rem(\);?)',
            re.MULTILINE
        )
        replacement = rf'\g<1>{min_val}rem, {pref_val}vw, {max_val}rem\2'
        content = pattern.sub(replacement, content)

    # 4. Build a descriptive commit message with specific changes
    changes = []
    for tag in ('h1', 'h2', 'h3', 'h4', 'p'):
        new = font_vars.get(tag, {})
        old = before_values.get(tag, {})
        diffs = []
        for param in ('min', 'pref', 'max'):
            old_v = old.get(param)
            new_v = new.get(param)
            if old_v is not None and new_v is not None and float(old_v) != float(new_v):
                unit = 'vw' if param == 'pref' else 'rem'
                diffs.append(f'{param}: {old_v}{unit} → {new_v}{unit}')
        if diffs:
            changes.append(f'  {tag.upper()}: {", ".join(diffs)}')

    if changes:
        commit_msg = f'Font push ({env}): update {len(changes)} tier(s)\n\n' + '\n'.join(changes)
    else:
        commit_msg = f'Font push ({env}): no value changes (re-push of current values)'

    # Commit the updated file back to GitHub
    encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
    commit_body = {
        'message': commit_msg,
        'content': encoded,
        'sha': current_sha,
        'branch': branch
    }
    result = github_api('PUT', f'/repos/{GITHUB_REPO}/contents/{GITHUB_FILE_PATH}', commit_body)

    # 5. Store before/after state in S3 for revert support
    import datetime
    state = {
        'previous': before_values,
        'current': font_vars,
        'environment': env,
        'timestamp': datetime.datetime.utcnow().isoformat() + 'Z',
        'commit': result.get('commit', {}).get('sha', 'unknown')
    }
    save_font_state_history(state, env)

    return {
        'status': 'ok',
        'environment': env,
        'branch': branch,
        'commit': result.get('commit', {}).get('sha', 'unknown'),
        'fontVariables': font_vars
    }


def handle_revert_font_variables(body=None):
    """Revert font variables to the previous state.
    Reads the stored before/after from S3, pushes the 'previous' values
    as the new state, then updates the history so the current values
    become the new 'previous'.
    """
    body = body or {}
    env = body.get('environment', 'development')

    # 1. Read stored state history
    history = get_font_state_history(env)
    previous = history.get('previous')
    if not previous:
        raise ValueError(f'No previous font state to revert to for {env}')

    # 2. Push the previous values as new (reuses handle_push_font_variables)
    result = handle_push_font_variables({'fontVariables': previous, 'environment': env})

    # The push handler already saved the new state history with
    # current values as 'previous' and the reverted values as 'current'

    return {
        'status': 'ok',
        'environment': env,
        'revertedTo': previous,
        'commit': result.get('commit', 'unknown')
    }


# ─── Route Map ───────────────────────────────────────────────────────────────

ROUTES = {
    'GET /roles': handle_get_roles,
    'GET /users': handle_get_users,
    'GET /user-grants': handle_get_user_grants,
}

# Dynamic routes handled in lambda_handler:
# GET  /security-settings/<env>  → handle_get_security_settings
# POST /security-settings/<env>  → handle_update_security_settings
# POST /push-client-config/<env> → handle_push_client_config

# ─── Lambda Entry Point ──────────────────────────────────────────────────────

def lambda_handler(event, context):
    """Main Lambda handler for API Gateway proxy integration."""
    origin = (event.get('headers') or {}).get('origin', '')
    http_method = event.get('httpMethod', event.get('requestContext', {}).get('http', {}).get('method', ''))
    path = event.get('path', event.get('rawPath', ''))

    print(f'[lambda] Incoming: {http_method} {path} origin={origin}')

    # Strip stage prefix if present (e.g. /prod/roles -> /roles)
    if path and '/' in path[1:]:
        parts = path.split('/')
        if len(parts) >= 3 and parts[1] in ('prod', 'dev', 'staging'):
            path = '/' + '/'.join(parts[2:])
            print(f'[lambda] Stripped stage prefix → {path}')

    # Handle CORS preflight
    if http_method == 'OPTIONS':
        return respond(200, {}, origin)

    # Extract and validate user token
    auth_header = (event.get('headers') or {}).get('Authorization',
                   (event.get('headers') or {}).get('authorization', ''))
    if not auth_header.startswith('Bearer '):
        print(f'[lambda] 401: Missing/invalid auth header')
        return respond(401, {'error': 'Missing or invalid Authorization header'}, origin)

    user_token = auth_header[7:]

    try:
        user_info = validate_user_token(user_token)
        print(f'[lambda] User validated: {user_info.get("sub", "?")}')
    except ValueError as e:
        print(f'[lambda] 401: Token validation failed: {e}')
        return respond(401, {'error': str(e)}, origin)

    # Route to handler — check static routes first, then dynamic patterns
    route_key = f'{http_method} {path}'
    print(f'[lambda] Route key: {route_key}')
    handler = ROUTES.get(route_key)

    try:
        if handler:
            data = handler()
            return respond(200, data, origin)

        # Dynamic routes: /security-settings/<env>
        if path.startswith('/security-settings/'):
            env = path.split('/')[-1]
            if env not in ('development', 'sandbox', 'production'):
                return respond(400, {'error': f'Invalid environment: {env}'}, origin)
            if http_method == 'GET':
                data = handle_get_security_settings(env)
                return respond(200, data, origin)
            elif http_method == 'POST':
                body = json.loads(event.get('body') or '{}')
                data = handle_update_security_settings(env, body)
                return respond(200, data, origin)

        # Dynamic routes: /push-client-config/<env>
        if path.startswith('/push-client-config/') and http_method == 'POST':
            env = path.split('/')[-1]
            if env not in ('development', 'sandbox', 'production'):
                return respond(400, {'error': f'Invalid environment: {env}'}, origin)
            body = json.loads(event.get('body') or '{}')
            data = handle_push_client_config(env, body)
            return respond(200, data, origin)

        # POST /push-font-variables
        if path == '/push-font-variables' and http_method == 'POST':
            print('[lambda] Handling push-font-variables')
            body = json.loads(event.get('body') or '{}')
            print(f'[lambda] Body keys: {list(body.keys())}')
            data = handle_push_font_variables(body)
            print(f'[lambda] Push result: {data.get("status", "?")} commit={data.get("commit", "?")}')
            return respond(200, data, origin)

        # POST /revert-font-variables
        if path == '/revert-font-variables' and http_method == 'POST':
            body = json.loads(event.get('body') or '{}')
            data = handle_revert_font_variables(body)
            return respond(200, data, origin)

        # GET /font-state-history/<env>
        if path.startswith('/font-state-history') and http_method == 'GET':
            env = path.split('/')[-1] if '/' in path[1:] else 'development'
            if env == 'font-state-history':
                env = 'development'
            data = get_font_state_history(env)
            return respond(200, data, origin)

        return respond(404, {'error': f'Unknown route: {route_key}',
                             'available_routes': list(ROUTES.keys()) + [
                                 'GET /security-settings/<env>',
                                 'POST /security-settings/<env>',
                                 'POST /push-client-config/<env>',
                                 'POST /push-font-variables',
                                 'POST /revert-font-variables',
                                 'GET /font-state-history/<env>'
                             ]}, origin)

    except RuntimeError as e:
        print(f'[lambda] 502 RuntimeError: {e}')
        return respond(502, {'error': str(e)}, origin)
    except ValueError as e:
        print(f'[lambda] 400 ValueError: {e}')
        return respond(400, {'error': str(e)}, origin)
    except Exception as e:
        print(f'[lambda] 500 Exception: {type(e).__name__}: {e}')
        return respond(500, {'error': f'Internal error: {str(e)}'}, origin)
