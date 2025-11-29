/**
 * Types for Journal Entry Excel Import
 */

export interface ExcelSheetInfo {
  name: string;
  type: 'structured' | 'voucher';
  rowCount: number;
  selected?: boolean;
}

export interface ParsedJournalLine {
  accountCode: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface ParsedJournalEntry {
  sheetName: string;
  entryDate: Date;
  voucherNumber: string;
  description: string;
  exchangeRate: number;
  lines: ParsedJournalLine[];
  isValid: boolean;
  errors: string[];
}

export interface ImportPreviewResult {
  sheets: ExcelSheetInfo[];
  entries: ParsedJournalEntry[];
  summary: {
    totalSheets: number;
    totalEntries: number;
    validEntries: number;
    invalidEntries: number;
  };
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: { entry: string; error: string }[];
  createdEntryIds: number[];
}

export interface ImportOptions {
  selectedSheets?: string[];
  currencyId: number;
  defaultExchangeRate?: number;
  autoPost?: boolean;
}
