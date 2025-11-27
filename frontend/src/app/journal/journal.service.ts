import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface JournalLine {
  id?: number;
  lineNumber?: number;
  accountId: number;
  accountNumber?: string;
  accountName?: string;
  description?: string;
  debitAmount: number | string;
  creditAmount: number | string;
}

export interface JournalEntry {
  id?: number;
  entryNumber?: string;
  entryDate: string;
  voucherNumber?: string;
  description: string;
  currencyId: number;
  currencyCode?: string;
  exchangeRate: number | string;
  isPosted?: boolean;
  isReversed?: boolean;
  reversedEntryId?: number;
  totalDebit?: string;
  totalCredit?: string;
  lines: JournalLine[];
  createdAt?: string;
  updatedAt?: string;
  createdById?: number;
  createdByName?: string;
  postedAt?: string;
  postedById?: number;
  postedByName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class JournalService {
  private apiUrl = 'http://localhost:3000/api/journal';

  constructor(private http: HttpClient) { }

  getJournalEntries(filters: any): Observable<any> {
    let params = new HttpParams();
    if (filters.search) params = params.set('search', filters.search);
    if (filters.startDate) params = params.set('startDate', filters.startDate);
    if (filters.endDate) params = params.set('endDate', filters.endDate);
    if (filters.status) {
        if (filters.status === 'POSTED') params = params.set('isPosted', 'true');
        if (filters.status === 'DRAFT') params = params.set('isPosted', 'false');
    }
    if (filters.currency) params = params.set('currencyId', filters.currency);

    return this.http.get(this.apiUrl, { params });
  }

  getJournalEntry(id: number): Observable<JournalEntry> {
    return this.http.get<JournalEntry>(`${this.apiUrl}/${id}`);
  }

  createJournalEntry(data: JournalEntry): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(this.apiUrl, data);
  }

  updateJournalEntry(id: number, data: JournalEntry): Observable<JournalEntry> {
    return this.http.put<JournalEntry>(`${this.apiUrl}/${id}`, data);
  }

  postJournalEntry(id: number): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(`${this.apiUrl}/${id}/post`, {});
  }

  reverseJournalEntry(id: number, data: { reversalDate: string, description: string }): Observable<JournalEntry> {
    return this.http.post<JournalEntry>(`${this.apiUrl}/${id}/reverse`, data);
  }
  
  deleteJournalEntry(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
