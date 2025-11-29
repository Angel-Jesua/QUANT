import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { API_BASE_URL } from '../constants/api.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest = req.url.startsWith(API_BASE_URL);

  if (!isApiRequest) {
    return next(req);
  }

  const authorizedRequest = req.clone({
    withCredentials: true,
  });

  return next(authorizedRequest);
};
