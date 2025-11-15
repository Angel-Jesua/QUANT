import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { API_BASE_URL } from '../constants/api.constants';

export type ProfileImageStatus = 'custom' | 'default' | 'none';

export interface UserProfileDto {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  avatarType: string;
  profileImageUrl: string | null;
  profileImageStatus: ProfileImageStatus;
}

export interface UserProfile extends UserProfileDto {
  resolvedImageUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly endpoint = `${API_BASE_URL}/users/me`;
  private readonly defaultImagePath = '/images/default-avatar.svg';
  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);

  readonly profile$ = this.profileSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  get snapshot(): UserProfile | null {
    return this.profileSubject.value;
  }

  setProfileFromAuth(dto?: UserProfileDto | null): void {
    if (!dto) {
      this.profileSubject.next(null);
      return;
    }
    this.profileSubject.next(this.mapDto(dto));
  }

  loadProfile(forceRefresh = false): Observable<UserProfile | null> {
    if (!forceRefresh && this.profileSubject.value) {
      return of(this.profileSubject.value);
    }

    return this.http.get<UserProfileDto>(this.endpoint).pipe(
      map((dto) => this.mapDto(dto)),
      tap((profile) => this.profileSubject.next(profile)),
      catchError((error) => {
        console.error('Failed to load profile', error);
        this.profileSubject.next(null);
        return of(null);
      })
    );
  }

  ensureProfileLoaded(forceRefresh = false): Observable<UserProfile | null> {
    return this.loadProfile(forceRefresh);
  }

  clearProfile(): void {
    this.profileSubject.next(null);
  }

  private mapDto(dto: UserProfileDto): UserProfile {
    return {
      ...dto,
      resolvedImageUrl: this.resolveImageUrl(dto.profileImageUrl, dto.profileImageStatus),
    };
  }

  private resolveImageUrl(path?: string | null, status?: ProfileImageStatus): string | null {
    if (!path) {
      return status === 'default' ? this.defaultImagePath : null;
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const normalized = path.replace(/^\/+/g, '');
    return `/${normalized}`;
  }
}
