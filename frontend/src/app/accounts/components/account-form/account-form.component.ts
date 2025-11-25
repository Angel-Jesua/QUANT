import { Component, inject, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AccountService } from '../../services/account.service';
import { API_BASE_URL } from '../../../shared/constants/api.constants';
import {
  ParentAccountOption,
  getFlattenedParentAccounts,
} from '../account-import/account-import.types';

interface Currency {
  id: number;
  code: string;
  name: string;
}

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-form.component.html',
  styleUrls: ['./account-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private http = inject(HttpClient);

  // Predefined parent accounts
  predefinedParentAccounts: ParentAccountOption[] = getFlattenedParentAccounts();

  // Available currencies from backend
  currencies = signal<Currency[]>([]);

  accountForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    parentAccountNumber: [''],
    code: ['', Validators.required],
    type: ['', Validators.required],
    currency: ['', Validators.required],
    isDetail: [false]
  });

  ngOnInit(): void {
    this.loadCurrencies();
  }

  private loadCurrencies(): void {
    this.http.get<{ data: Currency[] }>(`${API_BASE_URL}/currencies`).subscribe({
      next: (response) => {
        const currencyData = Array.isArray(response) ? response : response.data ?? [];
        this.currencies.set(currencyData);
      },
      error: () => {
        this.currencies.set([
          { id: 1, code: 'NIO', name: 'Córdoba Nicaragüense' },
          { id: 2, code: 'USD', name: 'Dólar Estadounidense' },
        ]);
      },
    });
  }

  onSubmit() {
    if (this.accountForm.valid) {
      console.log(this.accountForm.value);
      // Call service to create account
    }
  }

  onCancel() {
    this.accountForm.reset();
  }
}
