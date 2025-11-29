const PROD_URL = 'https://quant-app-7hofs.ondigitalocean.app/api';
const DEV_URL = 'http://localhost:3000/api';

// Detectar entorno basado en el hostname
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const API_BASE_URL = isDev ? DEV_URL : PROD_URL;

export const API_CONFIG = {
  BASE_URL: API_BASE_URL
};
