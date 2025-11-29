import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.constants';

export interface User {
  id: number;
  username: string;
  email: string;
  cedula?: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  profileImageUrl?: string;
  avatarType?: string;
}

export interface UserDetails extends User {
  lastActivity?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  passwordChangedAt?: string;
  mustChangePassword: boolean;
  googleId?: string;
  facebookId?: string;
  createdById?: number;
  updatedById?: number;
  _count?: {
    sessions: number;
    auditLogs: number;
    createdClients: number;
    updatedClients: number;
    createdAccounts: number;
    updatedAccounts: number;
    createdCurrencies: number;
    updatedCurrencies: number;
  };
}

export interface CreateUserData {
  username: string;
  email: string;
  cedula?: string;
  password: string;
  fullName: string;
  role: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  cedula?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  profileImageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${API_CONFIG.BASE_URL}/users`;
  
  private usersSubject = new BehaviorSubject<User[]>([]);
  readonly users$ = this.usersSubject.asObservable();

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl).pipe(
      tap(users => this.usersSubject.next(users)),
      catchError(error => {
        console.error('Error fetching users:', error);
        throw error;
      })
    );
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  getUserDetails(id: number): Observable<UserDetails> {
    return this.http.get<UserDetails>(`${this.apiUrl}/${id}/details`);
  }

  createUser(userData: CreateUserData): Observable<{ success: boolean; message: string; data: User }> {
    return this.http.post<{ success: boolean; message: string; data: User }>(this.apiUrl, userData).pipe(
      tap(() => this.getAllUsers().subscribe())
    );
  }

  updateUser(id: number, userData: UpdateUserData): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, userData).pipe(
      tap(() => this.getAllUsers().subscribe())
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.getAllUsers().subscribe())
    );
  }

  uploadProfileImage(userId: number, imageFile: File): Observable<User> {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    
    return this.http.post<User>(`${this.apiUrl}/${userId}/upload-image`, formData).pipe(
      tap(() => this.getAllUsers().subscribe())
    );
  }

  verifyPasswordAndGetDetails(userId: number, password: string): Observable<UserDetails> {
    return this.http.post<UserDetails>(`${this.apiUrl}/${userId}/verify-access`, { password });
  }
}
