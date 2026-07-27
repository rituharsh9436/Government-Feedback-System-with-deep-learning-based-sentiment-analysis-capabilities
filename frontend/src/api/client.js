const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

export async function request(path, options = {}) {
  const csrfToken = localStorage.getItem('csrf_token');
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
        await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
        isRefreshing = false;
        onRefreshed();
      } catch (e) {
        isRefreshing = false;
        throw new ApiError('Session expired', 401);
      }
    }

    // Wait for the refresh to complete, then retry the original request
    await new Promise((resolve) => subscribeTokenRefresh(resolve));
    
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
    throw new ApiError(data.detail || data.message || 'An error occurred', response.status);
  }

  return data;
}
