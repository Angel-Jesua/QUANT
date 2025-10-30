import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

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
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
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
  private readonly baseUrl = 'http://localhost:3000/api';
  private readonly storageKey = 'quant_auth_token';
  private readonly tokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient) {
    const storedToken = localStorage.getItem(this.storageKey);
    this.tokenSubject.next(storedToken);
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          this.handleAuthentication(response);
        }
      }),
      catchError(this.handleError)
    );
  }

  private handleAuthentication(response: LoginResponse): void {
    if (response.token) {
      localStorage.setItem(this.storageKey, response.token);
      this.tokenSubject.next(response.token);
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
    return !!this.getToken();
  }

  getToken(): string | null {
    // Primero intenta obtener el token del BehaviorSubject
    const token = this.tokenSubject.value;
    // Si no hay token en el BehaviorSubject pero sí en localStorage, actualiza el BehaviorSubject
    if (!token) {
      const storedToken = localStorage.getItem(this.storageKey);
      if (storedToken) {
        this.tokenSubject.next(storedToken);
        return storedToken;
      }
    }
    return token;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.tokenSubject.next(null);
  }
}