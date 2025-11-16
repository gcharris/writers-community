import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    apiClient.post('/auth/register', data),

  login: (email: string, password: string) =>
    apiClient.post('/auth/login', new URLSearchParams({ username: email, password }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }),
};

// Works API
export const worksApi = {
  create: (data: { title: string; genre: string; content: string; summary?: string }) =>
    apiClient.post('/works/', data),

  get: (id: string) =>
    apiClient.get(`/works/${id}`),

  list: (skip = 0, limit = 20) =>
    apiClient.get('/works/', { params: { skip, limit } }),

  update: (id: string, data: Partial<{ title: string; content: string; status: string }>) =>
    apiClient.patch(`/works/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/works/${id}`),
};
