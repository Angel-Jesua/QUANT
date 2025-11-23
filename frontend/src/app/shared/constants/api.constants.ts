import { isDevMode } from '@angular/core';

const PROD_URL = 'https://quant-app-7hofs.ondigitalocean.app/api';
const DEV_URL = 'http://localhost:3000/api';

export const API_BASE_URL = isDevMode() ? DEV_URL : PROD_URL;

export const API_CONFIG = {
  BASE_URL: API_BASE_URL
};
