const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const formatApiError = (detail) => {
  if (!Array.isArray(detail)) return detail || 'An error occurred';

  return detail
    .map(({ loc = [], msg = 'Invalid value' }) => {
      const field = loc.filter((part) => part !== 'body').join('.');
      const message = msg.replace(/^Value error,\s*/i, '');
      return field ? `${field.replace(/_/g, ' ')}: ${message}` : message;
    })
    .join(' ');
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let isRefreshing = false;
let refreshPromise = null;

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const getCsrfToken = () => {
  const cookieVal = getCookie('csrf_token');
  if (cookieVal) return cookieVal;
  return localStorage.getItem('csrf_token');
};

export async function request(path, options = {}) {
  const csrfToken = getCsrfToken();
  const headers = { ...options.headers };

  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  // Handle 401 Unauthorized by attempting to refresh the token
  if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/logout') {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
        .then(async (refreshRes) => {
          if (!refreshRes.ok) throw new Error('Refresh failed');
          try {
            const data = await refreshRes.json();
            if (data && data.csrf_token) {
              localStorage.setItem('csrf_token', data.csrf_token);
            }
          } catch (jsonError) {
            // Ignore JSON parse error if response is empty
          }
        })
        .catch((e) => {
          throw new ApiError('Session expired', 401);
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    // Wait for the refresh to complete, then retry the original request
    try {
      await refreshPromise;
    } catch (e) {
      throw e;
    }
    
    // Refresh the CSRF token in the headers in case it changed
    const newCsrfToken = getCsrfToken();
    if (newCsrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method || 'GET')) {
      headers['X-CSRF-Token'] = newCsrfToken;
    }
    
    // Retry with the same options. The browser will automatically send the new cookies.
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  }

  let data = {};
  try {
    data = await response.json();
  } catch (e) {
    // Ignore JSON parse errors for empty responses (like 204 No Content)
  }

  if (!response.ok) {
    throw new ApiError(formatApiError(data.detail || data.message), response.status);
  }

  return data;
}
