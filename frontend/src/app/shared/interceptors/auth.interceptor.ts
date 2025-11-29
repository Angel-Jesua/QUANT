import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Aplicar withCredentials a todas las peticiones a la API (localhost o producción)
  const isApiRequest = req.url.includes('/api/') || 
                       req.url.includes('localhost:3000') || 
                       req.url.includes('ondigitalocean.app');

  if (!isApiRequest) {
    return next(req);
  }

  const authorizedRequest = req.clone({
    withCredentials: true,
  });

  return next(authorizedRequest);
};
