import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { UserProfileService } from '../shared/services/user-profile.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const userProfileService = inject(UserProfileService);

  if (authService.isAuthenticated()) {
    return userProfileService.ensureProfileLoaded().pipe(
      map((profile) => {
        if (profile) {
          return true;
        }
        authService.logout();
        router.navigate(['/auth/login']);
        return false;
      }),
      catchError(() => {
        authService.logout();
        router.navigate(['/auth/login']);
        return of(false);
      })
    );
  }

  // Redirigir al login si no está autenticado
  router.navigate(['/auth/login']);
  return false;
};
