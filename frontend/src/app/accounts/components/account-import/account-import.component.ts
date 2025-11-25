/**
 * Account Import Component
 * Wizard-based Excel import for bulk account creation
 */

import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';

import { AccountService } from '../../services/account.service';
import { API_BASE_URL } from '../../../shared/constants/api.constants';
import {
  ImportStep,
  ExcelRawRow,
  ColumnMapping,
  CurrencyOption,
  ImportPreviewRow,
  BulkImportResponse,
  ParentAccountOption,
  getFlattenedParentAccounts,
} from './account-import.types';
import { processExcelData, convertToImportItems } from './account-import.utils';

@Component({
  selector: 'app-account-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-import.component.html',
  styleUrls: ['./account-import.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountImportComponent implements OnInit {
  private accountService = inject(AccountService);
  private http = inject(HttpClient);

  /** Event emitted when import is completed or cancelled */
  importComplete = output<{ success: boolean; count: number }>();
  cancelled = output<void>();

  // Wizard state
  currentStep = signal<ImportStep>('upload');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // File data
  workbook = signal<XLSX.WorkBook | null>(null);
  sheetNames = signal<string[]>([]);
  selectedSheet = signal<string>('');
  rawData = signal<ExcelRawRow[]>([]);
  headers = signal<string[]>([]);

  // Mapping state
  columnMapping = signal<ColumnMapping>({
    accountNumber: '',
    name: '',
    type: '',
    currency: '',
    description: '',
  });

  // Reference data
  currencies = signal<CurrencyOption[]>([]);

  // Predefined parent accounts for hierarchical selection
  predefinedParentAccounts: ParentAccountOption[] = getFlattenedParentAccounts();

  // Default currency for import (required unless skipped)
  defaultCurrency = signal<string>('');
  
  // Skip currency validation (not recommended)
  skipCurrencyValidation = signal<boolean>(false);

  // Preview data
  previewRows = signal<ImportPreviewRow[]>([]);

  // Hierarchy editing - track which row is being edited
  editingParentIndex = signal<number | null>(null);

  // Import result
  importResult = signal<BulkImportResponse | null>(null);

  // Maximum allowed errors for import
  readonly MAX_ALLOWED_ERRORS = 15;

  // Computed properties
  validRowCount = computed(() => this.previewRows().filter((r) => !r.hasError).length);
  errorRowCount = computed(() => this.previewRows().filter((r) => r.hasError).length);
  hasImportErrors = computed(() => {
    const result = this.importResult();
    return result ? result.results.some((r) => !r.success) : false;
  });
  failedResults = computed(() => {
    const result = this.importResult();
    return result ? result.results.filter((r) => !r.success) : [];
  });
  canProceedToMapping = computed(() => this.selectedSheet().length > 0 && this.headers().length > 0);
  canProceedToHierarchy = computed(() => {
    const mapping = this.columnMapping();
    const hasCurrencyConfig = this.skipCurrencyValidation() || this.defaultCurrency() || mapping.currency;
    return mapping.accountNumber && mapping.name && mapping.type && hasCurrencyConfig;
  });
  
  // Can import if there are valid rows AND errors are less than MAX_ALLOWED_ERRORS
  canImport = computed(() => {
    const validCount = this.validRowCount();
    const errorCount = this.errorRowCount();
    return validCount > 0 && errorCount < this.MAX_ALLOWED_ERRORS;
  });
  
  // Check if too many errors to import
  tooManyErrors = computed(() => this.errorRowCount() >= this.MAX_ALLOWED_ERRORS);
  
  /** Get available parent options for a given account */
  getParentOptions = (accountNumber: string): ImportPreviewRow[] => {
    const rows = this.previewRows();
    // Can't be parent of itself, and parent should have lower level
    const currentRow = rows.find(r => r.accountNumber === accountNumber);
    if (!currentRow) return [];
    
    return rows.filter(r => 
      r.accountNumber !== accountNumber && 
      r.level < currentRow.level && // Parent must be at a lower level
      !r.hasError // Don't suggest accounts with errors as parents
    ).sort((a, b) => a.accountNumber.localeCompare(b.accountNumber));
  };

  ngOnInit(): void {
    this.loadCurrencies();
  }

  /** Load available currencies from backend */
  private loadCurrencies(): void {
    this.http.get<{ data: CurrencyOption[] }>(`${API_BASE_URL}/currencies`).subscribe({
      next: (response) => {
        const currencyData = Array.isArray(response) ? response : response.data ?? [];
        this.currencies.set(currencyData);
      },
      error: () => {
        // Fallback to default currencies if API fails
        this.currencies.set([
          { id: 1, code: 'NIO', name: 'Córdoba Nicaragüense' },
          { id: 2, code: 'USD', name: 'Dólar Estadounidense' },
        ]);
      },
    });
  }

  /** Handle file selection */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        this.workbook.set(wb);
        this.sheetNames.set(wb.SheetNames);

        // Auto-select first sheet
        if (wb.SheetNames.length > 0) {
          this.selectSheet(wb.SheetNames[0]);
        }
      } catch (err) {
        this.errorMessage.set('Error al leer el archivo Excel. Asegúrese de que sea un archivo .xlsx válido.');
      } finally {
        this.isLoading.set(false);
      }
    };

    reader.onerror = () => {
      this.errorMessage.set('Error al cargar el archivo.');
      this.isLoading.set(false);
    };

    reader.readAsArrayBuffer(file);
  }

  /** Select a sheet to process */
  selectSheet(sheetName: string): void {
    this.selectedSheet.set(sheetName);
    const wb = this.workbook();
    if (!wb) return;

    const sheet = wb.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<ExcelRawRow>(sheet, { header: 1, defval: '' });

    if (jsonData.length === 0) {
      this.errorMessage.set('La hoja seleccionada está vacía.');
      return;
    }

    // First row as headers
    const headerRow = jsonData[0] as unknown as string[];
    const headerStrings = headerRow.map((h) => String(h ?? '').trim()).filter((h) => h.length > 0);
    this.headers.set(headerStrings);

    // Remaining rows as data (convert to objects with header keys)
    const dataRows: ExcelRawRow[] = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as unknown as (string | number)[];
      const rowObj: ExcelRawRow = {};
      headerStrings.forEach((header, idx) => {
        rowObj[header] = row[idx];
      });
      // Skip completely empty rows
      const hasData = Object.values(rowObj).some((v) => v !== '' && v !== undefined);
      if (hasData) {
        dataRows.push(rowObj);
      }
    }

    this.rawData.set(dataRows);
    this.autoDetectMapping(headerStrings);
  }

  /** Auto-detect column mapping based on header names */
  private autoDetectMapping(headers: string[]): void {
    const mapping: ColumnMapping = {
      accountNumber: '',
      name: '',
      type: '',
      currency: '',
      description: '',
    };

    const lowerHeaders = headers.map((h) => h.toLowerCase());

    // Account number patterns
    const accountPatterns = ['numero', 'cuenta', 'code', 'codigo', 'account', 'number'];
    const namePatterns = ['nombre', 'name', 'descripcion', 'description'];
    const typePatterns = ['tipo', 'type', 'clasificacion', 'clase'];
    const currencyPatterns = ['moneda', 'currency', 'divisa', 'coin'];
    const descPatterns = ['detalle', 'observacion', 'nota', 'comment'];

    headers.forEach((header, idx) => {
      const lower = lowerHeaders[idx];
      if (!mapping.accountNumber && accountPatterns.some((p) => lower.includes(p))) {
        mapping.accountNumber = header;
      }
      if (!mapping.name && namePatterns.some((p) => lower.includes(p))) {
        mapping.name = header;
      }
      if (!mapping.type && typePatterns.some((p) => lower.includes(p))) {
        mapping.type = header;
      }
      if (!mapping.currency && currencyPatterns.some((p) => lower.includes(p))) {
        mapping.currency = header;
      }
      if (!mapping.description && descPatterns.some((p) => lower.includes(p))) {
        mapping.description = header;
      }
    });

    this.columnMapping.set(mapping);
  }

  /** Update column mapping */
  updateMapping(field: keyof ColumnMapping, value: string): void {
    this.columnMapping.update((m) => ({ ...m, [field]: value }));
  }

  /** Set default currency for import */
  setDefaultCurrency(currencyCode: string): void {
    this.defaultCurrency.set(currencyCode);
  }

  /** Toggle skip currency validation */
  toggleSkipCurrencyValidation(): void {
    const newValue = !this.skipCurrencyValidation();
    this.skipCurrencyValidation.set(newValue);
    if (newValue) {
      // Clear currency settings when skipping
      this.defaultCurrency.set('');
      this.columnMapping.update((m) => ({ ...m, currency: '' }));
    }
  }

  /** Navigate to next step */
  nextStep(): void {
    const step = this.currentStep();
    if (step === 'upload' && this.canProceedToMapping()) {
      this.currentStep.set('mapping');
    } else if (step === 'mapping' && this.canProceedToHierarchy()) {
      this.processData();
      this.currentStep.set('hierarchy');
    } else if (step === 'hierarchy') {
      this.currentStep.set('preview');
    }
  }

  /** Navigate to previous step */
  previousStep(): void {
    const step = this.currentStep();
    if (step === 'mapping') {
      this.currentStep.set('upload');
    } else if (step === 'hierarchy') {
      this.currentStep.set('mapping');
    } else if (step === 'preview') {
      this.currentStep.set('hierarchy');
    } else if (step === 'result') {
      this.currentStep.set('preview');
    }
  }

  /** Update parent account for a row */
  updateParentAccount(accountNumber: string, newParentAccountNumber: string | undefined): void {
    this.previewRows.update((rows) =>
      rows.map((row) => {
        if (row.accountNumber === accountNumber) {
          return {
            ...row,
            parentAccountNumber: newParentAccountNumber,
          };
        }
        return row;
      })
    );
    this.editingParentIndex.set(null);
  }

  /** Start editing parent for a specific row */
  startEditingParent(index: number): void {
    this.editingParentIndex.set(index);
  }

  /** Cancel editing parent */
  cancelEditingParent(): void {
    this.editingParentIndex.set(null);
  }

  /** Process raw data with mapping to create preview rows */
  private processData(): void {
    const rows = processExcelData(
      this.rawData(),
      this.columnMapping(),
      this.currencies(),
      this.defaultCurrency(),
      this.skipCurrencyValidation()
    );
    this.previewRows.set(rows);
  }

  /** Execute bulk import */
  executeImport(): void {
    const items = convertToImportItems(this.previewRows());
    if (items.length === 0) {
      this.errorMessage.set('No hay cuentas válidas para importar.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountService.bulkImport({ accounts: items }).subscribe({
      next: (response) => {
        this.importResult.set(response.data);
        this.currentStep.set('result');
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(
          err.error?.error?.message ?? 'Error durante la importación. Intente nuevamente.'
        );
        this.isLoading.set(false);
      },
    });
  }

  /** Close wizard and emit result */
  finish(): void {
    const result = this.importResult();
    this.importComplete.emit({
      success: result?.success ?? false,
      count: result?.successCount ?? 0,
    });
  }

  /** Cancel import */
  cancel(): void {
    this.cancelled.emit();
  }

  /** Reset wizard to initial state */
  reset(): void {
    this.currentStep.set('upload');
    this.workbook.set(null);
    this.sheetNames.set([]);
    this.selectedSheet.set('');
    this.rawData.set([]);
    this.headers.set([]);
    this.columnMapping.set({
      accountNumber: '',
      name: '',
      type: '',
      currency: '',
      description: '',
    });
    this.defaultCurrency.set('');
    this.skipCurrencyValidation.set(false);
    this.previewRows.set([]);
    this.importResult.set(null);
    this.errorMessage.set(null);
  }
}
