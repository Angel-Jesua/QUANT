import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBaseCurrency: boolean;
  exchangeRate: string;
  isActive: boolean;
}

export interface CurrencyResponse {
  success: boolean;
  data: Currency[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {
  private apiUrl = 'http://localhost:3000/api/currencies';

  constructor(private http: HttpClient) { }

  getAllCurrencies(isActive?: boolean): Observable<Currency[]> {
    let params = new HttpParams();
    if (isActive !== undefined) {
      params = params.set('isActive', isActive.toString());
    }
    // We want all currencies, so we might want to increase the limit or handle pagination.
    // For now, let's request a large limit to get all active currencies.
    params = params.set('limit', '100');

    return this.http.get<CurrencyResponse>(this.apiUrl, { params }).pipe(
      map(response => response.data)
    );
  }

  getCurrencyById(id: number): Observable<Currency> {
    return this.http.get<{success: boolean, data: Currency}>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }
}
