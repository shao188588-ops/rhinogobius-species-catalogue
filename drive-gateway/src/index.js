const encoder = new TextEncoder();
const DEVICE_COOKIE = 'rg_library_device';
let accessTokenCache = null;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }

    const match = url.pathname.match(/^\/download\/([a-z0-9-]{1,80})$/i);
    if (!match) return pageResponse('Not found', 'The requested resource does not exist.', 404);

    const documentId = match[1];
    const document = await env.DOCUMENTS.get(`document:${documentId}`, { type: 'json' });
    if (!document?.fileId) return pageResponse('Unavailable', 'This document has not been configured for private access.', 404);

    if (request.method === 'GET') return showAuthorizationPage(request, documentId, document, env);
    if (request.method === 'POST') return authorizeAndDownload(request, documentId, document, env);
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST' } });
  },
};

async function showAuthorizationPage(request, documentId, document, env) {
  const device = await validDevice(request, env);
  const message = device
    ? 'This browser is registered. Enter the access code to download this document.'
    : 'Enter the access code to register this browser and download this document.';
  return new Response(renderForm(documentId, document.label || 'Article', message), {
    headers: securityHeaders('text/html; charset=UTF-8'),
  });
}

async function authorizeAndDownload(request, documentId, document, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const limit = Number.parseInt(env.MAX_ATTEMPTS_PER_HOUR || '8', 10);
  if (!(await allowAttempt(ip, limit, env))) {
    return pageResponse('Too many attempts', 'Please wait and try again later.', 429);
  }

  const form = await request.formData();
  const code = String(form.get('code') || '');
  if (!(await validAccessCode(code, env))) {
    return pageResponse('Access denied', 'The access code is invalid.', 403);
  }

  let deviceToken = readCookie(request.headers.get('Cookie'), DEVICE_COOKIE);
  const deviceKnown = deviceToken && await env.ACCESS_STATE.get(`device:${deviceToken}`);
  const headers = securityHeaders();
  if (!deviceKnown) {
    deviceToken = randomToken();
    const ttl = Number.parseInt(env.DEVICE_TTL_SECONDS || '7776000', 10);
    await env.ACCESS_STATE.put(`device:${deviceToken}`, JSON.stringify({ createdAt: new Date().toISOString() }), {
      expirationTtl: ttl,
    });
    headers.set('Set-Cookie', `${DEVICE_COOKIE}=${deviceToken}; Path=/; Max-Age=${ttl}; HttpOnly; Secure; SameSite=Lax`);
  }

  try {
    const token = await googleAccessToken(env);
    const driveResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(document.fileId)}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!driveResponse.ok || !driveResponse.body) {
      console.error('Google Drive download failed', driveResponse.status);
      return pageResponse('Download unavailable', 'The private document could not be retrieved.', 502);
    }
    headers.set('Content-Type', driveResponse.headers.get('Content-Type') || 'application/pdf');
    headers.set('Content-Disposition', contentDisposition(document.filename || `${document.label || documentId}.pdf`));
    headers.set('Cache-Control', 'private, no-store, max-age=0');
    return new Response(driveResponse.body, { status: 200, headers });
  } catch (error) {
    console.error('Private download error', error);
    return pageResponse('Download unavailable', 'The private document could not be retrieved.', 502);
  }
}

async function validDevice(request, env) {
  const token = readCookie(request.headers.get('Cookie'), DEVICE_COOKIE);
  return Boolean(token && await env.ACCESS_STATE.get(`device:${token}`));
}

async function allowAttempt(ip, limit, env) {
  const windowId = Math.floor(Date.now() / 3_600_000);
  const key = `attempt:${windowId}:${ip}`;
  const count = Number.parseInt(await env.ACCESS_STATE.get(key) || '0', 10);
  if (count >= limit) return false;
  await env.ACCESS_STATE.put(key, String(count + 1), { expirationTtl: 3_700 });
  return true;
}

async function validAccessCode(code, env) {
  if (code.length < 16 || !env.AUTH_CODE_SALT || !env.AUTH_CODE_SHA256) return false;
  const actual = await sha256Hex(`${env.AUTH_CODE_SALT}:${code}`);
  return constantTimeEqual(actual, env.AUTH_CODE_SHA256);
}

async function googleAccessToken(env) {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) return accessTokenCache.value;
  const account = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}');
  if (!account.client_email || !account.private_key) throw new Error('Google service account is not configured.');

  const now = Math.floor(Date.now() / 1_000);
  const assertion = await signServiceJwt({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3_600,
  }, account.private_key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${response.status}`);
  const token = await response.json();
  accessTokenCache = { value: token.access_token, expiresAt: Date.now() + (token.expires_in * 1_000) };
  return accessTokenCache.value;
}

async function signServiceJwt(payload, privateKeyPem) {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64Url(JSON.stringify(payload));
  const key = await crypto.subtle.importKey('pkcs8', pemToArrayBuffer(privateKeyPem), {
    name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256',
  }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(`${header}.${body}`));
  return `${header}.${body}.${base64Url(signature)}`;
}

function pemToArrayBuffer(pem) {
  const base64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(value) {
  const bytes = typeof value === 'string' ? encoder.encode(value) : new Uint8Array(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function readCookie(header, name) {
  if (!header) return '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : '';
}

function contentDisposition(filename) {
  const safeFallback = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `attachment; filename="${safeFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function securityHeaders(contentType) {
  const headers = new Headers({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  if (contentType) headers.set('Content-Type', contentType);
  return headers;
}

function pageResponse(title, message, status) {
  return new Response(renderPage(title, message), {
    status,
    headers: securityHeaders('text/html; charset=UTF-8'),
  });
}

function renderForm(documentId, label, message) {
  return renderPage('Private document', `
    <p>${escapeHtml(message)}</p>
    <form method="post" action="/download/${encodeURIComponent(documentId)}">
      <label>Access code<input name="code" type="password" minlength="16" required autocomplete="off" autofocus></label>
      <button type="submit">Verify and download ${escapeHtml(label)}</button>
    </form>
  `);
}

function renderPage(title, content) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f4ed;color:#192c3d;font:16px Arial,sans-serif}.card{width:min(420px,calc(100% - 40px));padding:28px;background:#fff;border:1px solid #d9e1e4;border-radius:14px;box-shadow:0 18px 50px #14304014}h1{margin:0 0 12px;font:700 2rem Georgia,serif}p{color:#536875;line-height:1.55}form{display:grid;gap:14px;margin-top:20px}label{display:grid;gap:6px;font-weight:700}input,button{font:inherit;border-radius:8px;padding:10px 12px}input{border:1px solid #b9c9cf}button{border:0;background:#0c6570;color:#fff;font-weight:700;cursor:pointer}</style><main class="card"><h1>${escapeHtml(title)}</h1>${content}</main></html>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function json(value) {
  return new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json; charset=UTF-8' } });
}
