import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../../shared/constants/api.constants';
import { Account, CreateAccountDto, UpdateAccountDto } from '../models/account.model';
import type { BulkImportRequest, BulkImportResponse } from '../components/account-import';

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/accounts`;

  getAccounts(): Observable<Account[]> {
    // Cargar todas las cuentas (pageSize alto) para construir la jerarquía correctamente
    return this.http.get<PaginatedResponse<Account>>(`${this.apiUrl}?pageSize=1000`).pipe(
      map(response => response.data || [])
    );
  }

  getAccount(id: number): Observable<Account> {
    return this.http.get<Account>(`${this.apiUrl}/${id}`);
  }

  createAccount(account: CreateAccountDto): Observable<Account> {
    return this.http.post<Account>(this.apiUrl, account);
  }

  updateAccount(id: number, account: UpdateAccountDto): Observable<Account> {
    return this.http.put<Account>(`${this.apiUrl}/${id}`, account);
  }

  deleteAccount(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Bulk import accounts from pre-processed Excel data
   */
  bulkImport(request: BulkImportRequest): Observable<{ success: boolean; data: BulkImportResponse }> {
    return this.http.post<{ success: boolean; data: BulkImportResponse }>(
      `${this.apiUrl}/bulk-import`,
      request
    );
  }
}
