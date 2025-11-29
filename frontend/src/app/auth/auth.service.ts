import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { API_BASE_URL } from '../shared/constants/api.constants';
import { UserProfileDto, UserProfileService } from '../shared/services/user-profile.service';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  recaptchaToken?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserProfileDto;
  expiresIn?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// Interfaz para errores de la API
export interface ApiError {
  status: number;
  message: string;
  error?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = API_BASE_URL;
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private userProfileService: UserProfileService) {
    this.checkAuth().subscribe();
  }

  checkAuth(): Observable<boolean> {
    return this.http.get<any>(`${this.baseUrl}/auth/me`, { withCredentials: true }).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.isAuthenticatedSubject.next(true);
          this.userProfileService.setProfileFromAuth(response.user);
        } else {
          this.isAuthenticatedSubject.next(false);
        }
      }),
      map(() => true),
      catchError(() => {
        this.isAuthenticatedSubject.next(false);
        return of(false);
      })
    );
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials, {
      withCredentials: true // Importante para recibir y enviar cookies HttpOnly
    }).pipe(
      tap(response => {
        if (response.success) {
          this.handleAuthentication(response);
        }
      }),
      catchError(this.handleError)
    );
  }

  private handleAuthentication(response: LoginResponse): void {
    if (response.success) {
      this.isAuthenticatedSubject.next(true);
      this.userProfileService.setProfileFromAuth(response.user ?? null);
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';
    
    if (error.status === 0) {
      // Error de conexión
      errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
    } else if (error.status === 400) {
      // Error de validación
      errorMessage = error.error?.message || 'Datos de inicio de sesión inválidos.';
    } else if (error.status === 401) {
      // No autorizado
      errorMessage = 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.';
    } else if (error.status === 403) {
      // Cuenta bloqueada
      errorMessage = 'Tu cuenta ha sido bloqueada temporalmente. Inténtalo de nuevo más tarde.';
    } else if (error.status >= 500) {
      // Error del servidor
      errorMessage = 'Error en el servidor. Por favor, inténtalo de nuevo más tarde.';
    }

    return throwError(() => new Error(errorMessage));
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getToken(): string | null {
    return null;
  }

  logout(): void {
    this.http.post(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true }).subscribe(() => {
      this.isAuthenticatedSubject.next(false);
      this.userProfileService.clearProfile();
    });
  }
}