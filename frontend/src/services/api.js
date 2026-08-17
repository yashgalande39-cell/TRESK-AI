/**
 * TRESK AI — Centralized API Client
 * =====================================================================
 * Phase 2: Uses credentials:'include' so httpOnly cookies are sent
 * automatically. Access token is still stored in memory for the
 * Authorization header fallback (e.g. mobile/non-cookie clients).
 *
 * Auto-refresh: when a 401 TOKEN_EXPIRED is received, silently calls
 * /api/auth/refresh and retries the original request once.
 */
import { API_BASE } from '../config';

// ── In-memory token store (NOT localStorage — no XSS risk) ───────────────────
let _accessToken = '';

/** Set the in-memory access token (called after login/refresh) */
export const setAccessToken = (token) => { _accessToken = token; };

/** Clear the in-memory token (called on logout) */
export const clearAccessToken = () => { _accessToken = ''; };

/** Get current in-memory access token */
export const getAccessToken = () => _accessToken;

// ── Build standard headers ─────────────────────────────────────────────────────
const buildHeaders = (extra = {}) => {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timezone) {
    headers['X-Timezone'] = timezone;
  }
  return headers;
};

// ── Refresh token (called automatically on TOKEN_EXPIRED) ────────────────────
let _isRefreshing = false;
let _refreshQueue = [];  // Queued requests waiting for the refresh

const processQueue = (error, token) => {
  _refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  _refreshQueue = [];
};

async function doRefresh() {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',   // Send httpOnly refresh cookie
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  setAccessToken(data.token);
  return data.token;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}, isRetry = false) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',  // Always send cookies (httpOnly refresh token)
    headers: buildHeaders(options.headers),
  });

  // Handle 401 with TOKEN_EXPIRED → auto-refresh once
  if (response.status === 401 && !isRetry) {
    let data;
    try { data = await response.clone().json(); } catch { data = {}; }

    if (data?.code === 'TOKEN_EXPIRED') {
      if (_isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          _refreshQueue.push({ resolve, reject });
        }).then(() => apiFetch(endpoint, options, true));
      }

      _isRefreshing = true;
      try {
        await doRefresh();
        processQueue(null);
        return apiFetch(endpoint, options, true); // Retry with new token
      } catch (refreshError) {
        processQueue(refreshError);
        clearAccessToken();
        // Redirect to login — session is fully expired
        window.location.href = '/login';
        throw refreshError;
      } finally {
        _isRefreshing = false;
      }
    }
  }

  let responseData;
  try {
    responseData = await response.json();
  } catch {
    responseData = { message: response.statusText };
  }

  if (!response.ok) {
    const err = new Error(responseData?.message || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = responseData;
    throw err;
  }

  return responseData;
}

export const apiGet    = (endpoint)        => apiFetch(endpoint, { method: 'GET' });
export const apiPost   = (endpoint, body)  => apiFetch(endpoint, { method: 'POST',   body: JSON.stringify(body) });
export const apiPut    = (endpoint, body)  => apiFetch(endpoint, { method: 'PUT',    body: JSON.stringify(body) });
export const apiPatch  = (endpoint, body)  => apiFetch(endpoint, { method: 'PATCH',  body: JSON.stringify(body) });
export const apiDelete = (endpoint)        => apiFetch(endpoint, { method: 'DELETE' });

/**
 * Upload a file via multipart/form-data.
 * Note: Do NOT set Content-Type manually — browser sets the boundary.
 */
export const apiUpload = (endpoint, formData) => {
  const url = `${API_BASE}${endpoint}`;
  const headers = buildHeaders();
  delete headers['Content-Type'];

  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  }).then(async (response) => {
    const data = await response.json().catch(() => ({ message: response.statusText }));
    if (!response.ok) {
      const err = new Error(data?.message || `Upload failed with status ${response.status}`);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  });
};
