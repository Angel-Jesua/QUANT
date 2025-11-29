import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JournalService } from '../journal.service';

interface ExcelSheetInfo {
  name: string;
  type: 'structured' | 'voucher';
  rowCount: number;
  selected: boolean;
}

interface ParsedJournalLine {
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

interface ParsedJournalEntry {
  sheetName: string;
  entryDate: string;
  voucherNumber: string;
  description: string;
  exchangeRate: number;
  lines: ParsedJournalLine[];
  isValid: boolean;
  errors: string[];
}

interface ImportPreviewResult {
  sheets: ExcelSheetInfo[];
  entries: ParsedJournalEntry[];
  summary: {
    totalSheets: number;
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
  };
}

@Component({
  selector: 'app-journal-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './journal-import.component.html',
  styleUrl: './journal-import.component.scss'
})
export class JournalImportComponent {
  private journalService = inject(JournalService);
  private router = inject(Router);

  step: 'upload' | 'preview' | 'importing' | 'result' = 'upload';
  selectedFile: File | null = null;
  preview: ImportPreviewResult | null = null;
  
  currencyId = 1; // Default NIO
  defaultExchangeRate = 36.5;
  autoPost = false;
  
  importing = false;
  importResult: any = null;
  error: string | null = null;

  expandedEntry: string | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.error = null;
    }
  }

  async uploadAndPreview(): Promise<void> {
    if (!this.selectedFile) return;

    this.error = null;
    this.importing = true;

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);

      const result = await this.journalService.previewImport(formData);
      this.preview = result;
      this.step = 'preview';
    } catch (err: any) {
      this.error = err.error?.error || 'Error al procesar el archivo';
    } finally {
      this.importing = false;
    }
  }

  toggleSheet(sheet: ExcelSheetInfo): void {
    sheet.selected = !sheet.selected;
  }

  selectAllSheets(): void {
    this.preview?.sheets.forEach(s => s.selected = true);
  }

  deselectAllSheets(): void {
    this.preview?.sheets.forEach(s => s.selected = false);
  }

  toggleEntryDetails(voucherNumber: string): void {
    this.expandedEntry = this.expandedEntry === voucherNumber ? null : voucherNumber;
  }

  getSelectedSheets(): string[] {
    return this.preview?.sheets.filter(s => s.selected).map(s => s.name) || [];
  }

  getFilteredEntries(): ParsedJournalEntry[] {
    if (!this.preview) return [];
    const selectedSheets = this.getSelectedSheets();
    return this.preview.entries.filter(e => selectedSheets.includes(e.sheetName));
  }

  getValidEntriesCount(): number {
    return this.getFilteredEntries().filter(e => e.isValid).length;
  }

  async startImport(): Promise<void> {
    if (!this.selectedFile || !this.preview) return;

    this.error = null;
    this.importing = true;
    this.step = 'importing';

    try {
      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('currencyId', this.currencyId.toString());
      formData.append('selectedSheets', JSON.stringify(this.getSelectedSheets()));
      formData.append('defaultExchangeRate', this.defaultExchangeRate.toString());
      formData.append('autoPost', this.autoPost.toString());

      this.importResult = await this.journalService.importJournalEntries(formData);
      this.step = 'result';
    } catch (err: any) {
      this.error = err.error?.error || 'Error al importar';
      this.step = 'preview';
    } finally {
      this.importing = false;
    }
  }

  goToList(): void {
    this.router.navigate(['/asientos']);
  }

  reset(): void {
    this.step = 'upload';
    this.selectedFile = null;
    this.preview = null;
    this.importResult = null;
    this.error = null;
  }
}
