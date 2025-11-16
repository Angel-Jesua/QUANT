import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { API_CONFIG } from '../constants/api.constants';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  profileImageUrl?: string;
  avatarType?: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
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
}
