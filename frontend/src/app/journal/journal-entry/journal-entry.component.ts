import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { SidebarComponent } from '../../dashboard/components/sidebar/sidebar.component';
import { JournalService, JournalEntry } from '../journal.service';
import { AccountService, Account } from '../../services/account.service';
import { CurrencyService, Currency } from '../../services/currency.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-journal-entry',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SidebarComponent],
  templateUrl: './journal-entry.component.html',
  styleUrls: ['./journal-entry.component.scss']
})
export class JournalEntryComponent implements OnInit {
  journalForm: FormGroup;
  isEditMode = false;
  entryId: number | null = null;
  
  accounts: Account[] = [];
  loadingAccounts = false;
  loadingEntry = false;
  loadError: string | null = null;

  currencies: Currency[] = [];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private journalService: JournalService,
    private accountService: AccountService,
    private currencyService: CurrencyService
  ) {
    this.journalForm = this.fb.group({
      date: [new Date().toISOString().substring(0, 10), Validators.required],
      currency: [null, Validators.required],
      exchangeRate: [1.0, [Validators.required, Validators.min(0.0001)]],
      voucherNumber: [''],
      description: ['', Validators.required],
      lines: this.fb.array([])
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id) {
      this.isEditMode = true;
      this.entryId = +id;
      this.loadAllDataForEdit();
    } else {
      this.loadInitialData();
    }
  }

  // Load data for new entry mode
  loadInitialData() {
    this.loadingAccounts = true;
    
    forkJoin({
      currencies: this.currencyService.getAllCurrencies(true),
      accounts: this.accountService.getDetailAccounts()
    }).subscribe({
      next: ({ currencies, accounts }) => {
        this.currencies = currencies;
        this.accounts = accounts;
        this.loadingAccounts = false;
        
        // Set default currency
        if (currencies.length > 0) {
          const baseCurrency = currencies.find(c => c.isBaseCurrency) || currencies[0];
          this.journalForm.patchValue({ 
            currency: baseCurrency.id,
            exchangeRate: parseFloat(baseCurrency.exchangeRate)
          });
        }
        
        // Add initial lines for new entry
        this.addLine();
        this.addLine();
      },
      error: (err) => {
        console.error('Error loading initial data', err);
        this.loadingAccounts = false;
        this.loadError = 'Error al cargar datos. Por favor, recargue la página.';
      }
    });
  }

  // Load all data for edit mode - currencies, accounts, then entry
  loadAllDataForEdit() {
    this.loadingAccounts = true;
    this.loadingEntry = true;
    this.loadError = null;
    
    forkJoin({
      currencies: this.currencyService.getAllCurrencies(true),
      accounts: this.accountService.getDetailAccounts()
    }).subscribe({
      next: ({ currencies, accounts }) => {
        this.currencies = currencies;
        this.accounts = accounts;
        this.loadingAccounts = false;
        
        // Now load the entry after accounts are ready
        if (this.entryId) {
          this.loadEntry(this.entryId);
        }
      },
      error: (err) => {
        console.error('Error loading data for edit', err);
        this.loadingAccounts = false;
        this.loadingEntry = false;
        this.loadError = 'Error al cargar cuentas contables. Por favor, recargue la página.';
      }
    });
  }

  loadEntry(id: number) {
    this.loadingEntry = true;
    
    this.journalService.getJournalEntry(id).subscribe({
      next: (entry) => {
        // Parse exchange rate - could be string or number
        const exchangeRate = typeof entry.exchangeRate === 'string' 
          ? parseFloat(entry.exchangeRate) 
          : entry.exchangeRate;
        
        this.journalForm.patchValue({
          date: entry.entryDate ? entry.entryDate.substring(0, 10) : '',
          currency: entry.currencyId,
          exchangeRate: exchangeRate || 1,
          voucherNumber: entry.voucherNumber || '',
          description: entry.description || ''
        });
        
        // Clear existing lines
        while (this.lines.length) {
          this.lines.removeAt(0);
        }
        
        // Add lines from entry
        if (entry.lines && entry.lines.length > 0) {
          entry.lines.forEach(line => {
            // Find account - try by ID first, then by accountNumber
            let acc = this.accounts.find(a => a.id === line.accountId);
            
            // If not found by id, try using accountNumber from the line (backend might include it)
            if (!acc && line.accountNumber) {
              acc = this.accounts.find(a => a.accountNumber === line.accountNumber);
            }
            
            const searchLabel = acc ? `${acc.accountNumber} - ${acc.name}` : 
                               (line.accountNumber && line.accountName ? `${line.accountNumber} - ${line.accountName}` : '');
            
            // Parse amounts - could be string or number
            const debitAmount = typeof line.debitAmount === 'string' 
              ? parseFloat(line.debitAmount) || 0 
              : (line.debitAmount || 0);
            const creditAmount = typeof line.creditAmount === 'string' 
              ? parseFloat(line.creditAmount) || 0 
              : (line.creditAmount || 0);
            
            this.lines.push(this.fb.group({
              accountId: [line.accountId, Validators.required],
              accountSearch: [searchLabel, Validators.required],
              description: [line.description || ''],
              debit: [debitAmount, [Validators.min(0)]],
              credit: [creditAmount, [Validators.min(0)]]
            }));
          });
        } else {
          // If no lines, add two empty ones
          this.addLine();
          this.addLine();
        }
        
        this.loadingEntry = false;
      },
      error: (err) => {
        console.error('Error loading entry', err);
        this.loadingEntry = false;
        this.loadError = 'Error al cargar el asiento contable. Por favor, intente de nuevo.';
      }
    });
  }

  loadCurrencies() {
    this.currencyService.getAllCurrencies(true).subscribe({
      next: (currencies) => {
        this.currencies = currencies;
        // Set default currency (USD or base currency)
        if (!this.journalForm.get('currency')?.value && currencies.length > 0) {
          const baseCurrency = currencies.find(c => c.isBaseCurrency) || currencies[0];
          this.journalForm.patchValue({ 
            currency: baseCurrency.id,
            exchangeRate: parseFloat(baseCurrency.exchangeRate)
          });
        }
      },
      error: (err) => console.error('Error loading currencies', err)
    });
  }

  loadAccounts() {
    this.loadingAccounts = true;
    this.accountService.getDetailAccounts().subscribe({
      next: (accounts) => {
        this.accounts = accounts;
        this.loadingAccounts = false;
        
        // Initialize form after accounts are loaded
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
          this.isEditMode = true;
          this.entryId = +id;
          this.loadEntry(this.entryId);
        } else {
          this.addLine();
          this.addLine();
        }
      },
      error: (err) => {
        console.error('Error loading accounts', err);
        this.loadingAccounts = false;
      }
    });
  }

  get lines() {
    return this.journalForm.get('lines') as FormArray;
  }

  addLine() {
    const lineGroup = this.fb.group({
      accountId: ['', Validators.required],
      accountSearch: ['', Validators.required],
      description: [''],
      debit: [0, [Validators.min(0)]],
      credit: [0, [Validators.min(0)]]
    });
    
    this.lines.push(lineGroup);
  }

  onAccountInput(event: any, index: number) {
    const value = event.target.value;
    const found = this.accounts.find(a => `${a.accountNumber} - ${a.name}` === value);
    
    const line = this.lines.at(index);
    if (found) {
      line.patchValue({ accountId: found.id });
      line.get('accountId')?.setErrors(null);
    } else {
      line.patchValue({ accountId: null });
      line.get('accountId')?.setErrors({ 'invalidAccount': true });
    }
  }

  removeLine(index: number) {
    this.lines.removeAt(index);
  }

  get totalDebit(): number {
    return this.lines.controls
      .reduce((sum, control) => sum + (control.get('debit')?.value || 0), 0);
  }

  get totalCredit(): number {
    return this.lines.controls
      .reduce((sum, control) => sum + (control.get('credit')?.value || 0), 0);
  }

  get difference(): number {
    return Math.abs(this.totalDebit - this.totalCredit);
  }

  get isBalanced(): boolean {
    return this.difference < 0.01;
  }

  get isBaseCurrencySelected(): boolean {
    const currencyId = this.journalForm.get('currency')?.value;
    const currency = this.currencies.find(c => c.id == currencyId);
    return currency ? currency.isBaseCurrency : false;
  }

  prepareData(): JournalEntry {
    const formValue = this.journalForm.value;
    return {
      entryDate: formValue.date,
      currencyId: +formValue.currency,
      exchangeRate: +formValue.exchangeRate,
      voucherNumber: formValue.voucherNumber,
      description: formValue.description,
      lines: formValue.lines.map((line: any) => ({
        accountId: +line.accountId,
        description: line.description,
        debitAmount: +line.debit,
        creditAmount: +line.credit
      }))
    };
  }

  saveDraft() {
    if (this.journalForm.invalid) return;
    
    const data = this.prepareData();
    
    if (this.isEditMode && this.entryId) {
      this.journalService.updateJournalEntry(this.entryId, data).subscribe({
        next: () => this.router.navigate(['/journal']),
        error: (err) => console.error(err)
      });
    } else {
      this.journalService.createJournalEntry(data).subscribe({
        next: () => this.router.navigate(['/journal']),
        error: (err) => console.error(err)
      });
    }
  }

  postEntry() {
    if (this.journalForm.invalid || !this.isBalanced) return;
    
    const data = this.prepareData();
    
    const save$ = (this.isEditMode && this.entryId) 
      ? this.journalService.updateJournalEntry(this.entryId, data)
      : this.journalService.createJournalEntry(data);
      
    save$.subscribe({
      next: (entry) => {
        if (entry.id) {
            this.journalService.postJournalEntry(entry.id).subscribe({
                next: () => this.router.navigate(['/journal']),
                error: (err) => console.error(err)
            });
        }
      },
      error: (err) => console.error(err)
    });
  }
}
