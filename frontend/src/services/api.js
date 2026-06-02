import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const loginApi = (data) => api.post('/auth/login', data);
export const registerApi = (data) => api.post('/auth/register', data);
export const logoutApi = (data) => api.post('/auth/logout', data);
export const getMeApi = () => api.get('/auth/me');

// ─── Leads ────────────────────────────────────────────────────────────────────
export const getLeadsApi = (params) => api.get('/leads', { params });
export const getLeadApi = (id) => api.get(`/leads/${id}`);
export const createLeadApi = (data) => api.post('/leads', data);
export const updateLeadApi = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLeadApi = (id) => api.delete(`/leads/${id}`);

// ─── Users ────────────────────────────────────────────────────────────────────
export const getUsersApi = () => api.get('/users');
export const updateUserApi = (id, data) => api.put(`/users/${id}`, data);

export default api;
