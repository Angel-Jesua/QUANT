import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Account {
  id: number;
  accountNumber: string;
  name: string;
  type: string;
  isActive: boolean;
  isDetail: boolean;
  level: number;
  currencyId?: number;
  parentAccountId?: number;
  balance?: number;
}

interface AccountResponse {
  success: boolean;
  data: Account[];
  meta: any;
}

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private apiUrl = 'http://localhost:3000/api/accounts';

  constructor(private http: HttpClient) { }

  getAllAccounts(params?: any): Observable<Account[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    // The backend returns { success: true, data: [...], meta: ... }
    // We need to map this to just the array of accounts
    return this.http.get<AccountResponse>(this.apiUrl, { params: httpParams })
      .pipe(map(response => response.data));
  }

  getDetailAccounts(): Observable<Account[]> {
    // We want all detail accounts, so we might need to increase the limit
    // The backend defaults to 20 if not specified. Let's ask for more to ensure we get them all for the dropdown.
    return this.getAllAccounts({ isDetail: true, isActive: true, limit: 1000 });
  }
}
