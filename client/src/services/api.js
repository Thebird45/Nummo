import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nummo_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401) {
    localStorage.removeItem("nummo_token");
    window.location.href = "/login";
  }
  return Promise.reject(error);
});
