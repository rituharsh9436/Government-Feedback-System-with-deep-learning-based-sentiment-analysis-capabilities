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
let refreshSubscribers = [];

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const subscribeTokenRefresh = (resolve, reject) => {
  refreshSubscribers.push({ resolve, reject });
};

const onRefreshed = (error = null) => {
  refreshSubscribers.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  });
  refreshSubscribers = [];
};

export async function request(path, options = {}) {
  const csrfToken = getCookie('csrf_token');
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
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        if (!refreshRes.ok) throw new Error('Refresh failed');
        isRefreshing = false;
        onRefreshed();
      } catch (e) {
        isRefreshing = false;
        onRefreshed(new ApiError('Session expired', 401));
        throw new ApiError('Session expired', 401);
      }
    }

    // Wait for the refresh to complete, then retry the original request
    try {
      await new Promise((resolve, reject) => subscribeTokenRefresh(resolve, reject));
    } catch (e) {
      throw e;
    }
    
    // Refresh the CSRF token in the headers in case it changed
    const newCsrfToken = getCookie('csrf_token');
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
