import axios from 'axios';
import useAuthStore from './store/useAuthStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Utility function to get a cookie by name.
 * Django's CSRF token is stored in a cookie named 'csrftoken'.
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Function to get and update CSRF token
 */
function getCSRFToken() {
  return getCookie('csrftoken');
}

/**
 * Function to set CSRF token header
 */
function setCSRFTokenHeader(config) {
  const csrftoken = getCSRFToken();
  if (csrftoken) {
    config.headers['X-CSRFToken'] = csrftoken;
  }
  return config;
}

const api = axios.create({
  baseURL,
  withCredentials: true, // Critical: tells Axios to send cookies (refresh_token, csrftoken) with every request
});

// Set CSRF token for unsafe methods (POST, PUT, DELETE, PATCH)
const csrftoken = getCSRFToken();
if (csrftoken) {
  api.defaults.headers.common['X-CSRFToken'] = csrftoken;
  api.defaults.headers.post['X-CSRFToken'] = csrftoken;
  api.defaults.headers.put['X-CSRFToken'] = csrftoken;
  api.defaults.headers.patch['X-CSRFToken'] = csrftoken;
  api.defaults.headers.delete['X-CSRFToken'] = csrftoken;
}

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request Interceptor: Attach access_token and CSRF token
api.interceptors.request.use(
  (config) => {
    // Add CSRF token to all requests
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
    
    // Add auth token if available
    const access_token = useAuthStore.getState().access_token;
    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request was already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Try both possible refresh token endpoints
      let response;
      try {
        response = await axios.post(
          `${baseURL}/api/v1/token/refresh/`,
          {},
          { withCredentials: true }
        );
      } catch (err) {
        // Fallback to old endpoint if v1 doesn't exist
        response = await axios.post(
          `${baseURL}/api/token/refresh/`,
          {},
          { withCredentials: true }
        );
      }

      // Handle different response structures
      const responseData = response.data?.data || response.data;
      const access_token = responseData.access_token || responseData.token;
      
      if (access_token) {
        // Update token using setToken to preserve user data
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setToken(access_token);
        } else {
          // If no user, do full login (shouldn't happen but safe fallback)
          useAuthStore.getState().login(access_token, currentUser || {});
        }

        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;

