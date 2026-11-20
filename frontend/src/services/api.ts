
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
} from 'axios';

const baseURL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (!error.response) {
      console.error(
        '[API Network Error]: O servidor não respondeu à solicitação.'
      );
    } else {
      const { status } = error.response;

      switch (status) {
        case 401:
          console.warn(
            '[API Auth Error]: Credenciais inválidas ou token expirado.'
          );
          break;

        case 403:
          console.warn('[API Forbidden]: Acesso não permitido.');
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
