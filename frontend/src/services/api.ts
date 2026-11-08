import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('@PixPro:token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    return response;
  },
  (error: AxiosError) => {
    if (!error.response) {
      console.error('[API Network Error]: O servidor nao respondeu a solicitacao.');
    } else {
      const { status } = error.response;

      switch (status) {
        case 401:
          console.warn('[API Auth Error]: Sessao expirada ou token invalido.');
          localStorage.removeItem('@PixPro:token');
          
          break;
        case 403:
          console.warn('[API Forbidden]: Acesso nao permitido.');
          break;
        case 500:
          console.error('[API Server Error]: Erro interno no servidor.');
         
          break;
        default:
          console.error(`[API Error ${status}]:`, error.response.data);
          break;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
