import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../shared/constants/api.constants';

export interface Client {
  id: number;
  clientCode: string;
  taxId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  creditLimit: string;
  currencyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: number;
  updatedById?: number;
}

export interface ClientResponse {
  success: boolean;
  data: Client[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateClientDTO {
  clientCode: string;
  taxId?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  creditLimit?: number | string;
  currencyId: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/clients`;

  getClients(
    page: number = 1, 
    pageSize: number = 10, 
    search: string = '',
    sortBy?: string,
    sortOrder?: 'asc' | 'desc',
    filters?: {
      isActive?: boolean;
      country?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Observable<ClientResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());
    
    if (search) {
      params = params.set('search', search);
    }

    if (sortBy) {
      params = params.set('orderBy', sortBy);
    }

    if (sortOrder) {
      params = params.set('orderDir', sortOrder);
    }

    if (filters) {
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }
      if (filters.country) {
        params = params.set('countryCode', filters.country);
      }
      if (filters.startDate) {
        params = params.set('startDate', filters.startDate);
      }
      if (filters.endDate) {
        params = params.set('endDate', filters.endDate);
      }
    }

    return this.http.get<ClientResponse>(this.apiUrl, { params });
  }

  getClientById(id: number): Observable<{ success: boolean; data: Client }> {
    return this.http.get<{ success: boolean; data: Client }>(`${this.apiUrl}/${id}`);
  }

  createClient(client: CreateClientDTO): Observable<any> {
    return this.http.post(this.apiUrl, client);
  }

  updateClient(id: number, client: Partial<CreateClientDTO>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, client);
  }
}
