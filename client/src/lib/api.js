import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

let unauthorizedHandler = null;
let refreshPromise = null;

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

const isAuthFlowRequest = (url = '') => {
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/register') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/logout')
  );
};

const normalizeUser = (payload) => ({
  id: payload?._id ||'mock_id', //remove mock id
  username: payload?.username ||'mock_user',//remove mock user
  role: payload?.role || 'user'

});

const updateSessionFromPayload = (payload) => {
  const token = payload?.token || payload?.accessToken;
  if (token) {
    localStorage.setItem('token', token);
  }

  if (payload?._id) {
    localStorage.setItem('user', JSON.stringify(normalizeUser(payload)));
  }

  return token;
};

const refreshAccessToken = async () => {
  const res = await refreshClient.post('/api/auth/refresh');
  const payload = res.data?.data || {};
  const token = updateSessionFromPayload(payload);

  if (!token) {
    const error = new Error('Refresh response did not include an access token');
    error.userMessage = 'Your session expired. Please log in again.';
    throw error;
  }

  return token;
};

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config || {};
    const requestUrl = originalRequest?.url || '';
    const shouldTryRefresh = status === 401 && !originalRequest._retry && !isAuthFlowRequest(requestUrl);

    if (shouldTryRefresh) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }

        const nextToken = await refreshPromise;
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;
        return api(originalRequest);
      } catch (refreshError) {
          // console.log("Blocking logout for UI work");

        if (typeof unauthorizedHandler === 'function') {
          unauthorizedHandler(refreshError);
        }
      }
    } else if (status === 401 && !isAuthFlowRequest(requestUrl) && typeof unauthorizedHandler === 'function') {
      unauthorizedHandler(error);
    }

    const apiMessage = error?.response?.data?.message;
    if (apiMessage) {
      error.userMessage = apiMessage;
    } else if (error.code === 'ECONNABORTED') {
      error.userMessage = 'Request timed out. Please try again.';
    } else {
      error.userMessage = 'Something went wrong. Please try again.';
    }

    return Promise.reject(error);
  }
);
