import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface LoginCredentials {
  usernameOrEmail: string;
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
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
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
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.tokenSubject.next(null);
  }
}