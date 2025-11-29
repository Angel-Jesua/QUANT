/**
 * Journal Entry Import Service
 * Handles Excel file parsing and import for journal entries
 */

import * as XLSX from 'xlsx';
import { getPrismaClient } from './journal.repository';
import {
  ExcelSheetInfo,
  ParsedJournalEntry,
  ParsedJournalLine,
  ImportPreviewResult,
  ImportResult,
  ImportOptions,
} from './journal-import.types';
import { createJournalEntry, postJournalEntry } from './journal.service';

/**
 * Parse Excel date (serial number) to JS Date
 */
function parseExcelDate(value: any): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Excel serial date - convert to JS Date
    // Excel dates are days since 1900-01-01 (with a bug for 1900 leap year)
    const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
    const msPerDay = 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + value * msPerDay);
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
}

/**
 * Detect sheet type based on content
 */
function detectSheetType(data: any[][]): 'structured' | 'voucher' {
  if (!data || data.length === 0) return 'voucher';
  
  const firstRow = data[0];
  if (!firstRow) return 'voucher';
  
  // Check for structured headers
  const headers = firstRow.map(h => String(h || '').toLowerCase().trim());
  const structuredHeaders = ['fecha', 'comprobante', 'concepto', 'cuenta', 'debe', 'haber'];
  const matchCount = structuredHeaders.filter(h => 
    headers.some(header => header.includes(h))
  ).length;
  
  return matchCount >= 4 ? 'structured' : 'voucher';
}

/**
 * Parse structured sheet (tabular format)
 */
function parseStructuredSheet(sheetName: string, data: any[][]): ParsedJournalEntry[] {
  const entries: ParsedJournalEntry[] = [];
  const entriesMap = new Map<string, ParsedJournalEntry>();
  
  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(cell => !cell)) continue;
    
    const [dateVal, voucherNumber, concept, accountCode, accountName, debit, credit] = row;
    
    if (!voucherNumber || !accountCode) continue;
    
    const voucherKey = String(voucherNumber);
    
    if (!entriesMap.has(voucherKey)) {
      entriesMap.set(voucherKey, {
        sheetName,
        entryDate: parseExcelDate(dateVal),
        voucherNumber: voucherKey,
        description: String(concept || ''),
        exchangeRate: 1,
        lines: [],
        isValid: true,
        errors: [],
      });
    }
    
    const entry = entriesMap.get(voucherKey)!;
    entry.lines.push({
      accountCode: String(accountCode || '').trim(),
      accountName: String(accountName || '').trim(),
      description: String(concept || ''),
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0,
    });
  }
  
  // Validate entries
  entriesMap.forEach((entry) => {
    validateEntry(entry);
    entries.push(entry);
  });
  
  return entries;
}


/**
 * Parse voucher-type sheet (bank voucher format)
 */
function parseVoucherSheet(sheetName: string, data: any[][]): ParsedJournalEntry[] {
  const entry: ParsedJournalEntry = {
    sheetName,
    entryDate: new Date(),
    voucherNumber: sheetName,
    description: '',
    exchangeRate: 1,
    lines: [],
    isValid: true,
    errors: [],
  };
  
  let headerRowIndex = -1;
  
  // Find key data points
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    // Look for reference number (voucher number)
    if (row[8] === 'Numero de Referencia' || String(row[8] || '').includes('DIARIO')) {
      entry.voucherNumber = String(row[9] || row[8] || sheetName);
      if (typeof row[9] === 'number' && row[9] > 40000) {
        entry.entryDate = parseExcelDate(row[9]);
      }
    }
    
    // Look for date
    if (row[9] && typeof row[9] === 'number' && row[9] > 40000 && row[9] < 50000) {
      entry.entryDate = parseExcelDate(row[9]);
    }
    
    // Look for concept
    if (row[1] === 'Concepto:') {
      entry.description = String(row[2] || '');
      // Extract exchange rate if present
      if (row[11] && typeof row[11] === 'number') {
        entry.exchangeRate = row[11];
      }
    }
    
    // Find header row for lines
    if (row[1] === 'Codigo' && row[2] === 'Nombre de la cuenta') {
      headerRowIndex = i;
    }
    
    // Parse lines after header
    if (headerRowIndex > 0 && i > headerRowIndex) {
      const code = row[1];
      const name = row[2];
      const debit = row[8];
      const credit = row[9];
      
      // Check if this is a data row (has account code)
      if (code && typeof code === 'string' && code.includes('-')) {
        entry.lines.push({
          accountCode: code.trim(),
          accountName: String(name || '').trim(),
          debit: parseFloat(debit) || 0,
          credit: parseFloat(credit) || 0,
        });
      }
      
      // Stop at totals row
      if (row[1] === 'Totales') break;
    }
  }
  
  validateEntry(entry);
  return entry.lines.length > 0 ? [entry] : [];
}

/**
 * Validate a parsed entry
 */
function validateEntry(entry: ParsedJournalEntry): void {
  entry.errors = [];
  
  if (!entry.voucherNumber) {
    entry.errors.push('Número de comprobante no encontrado');
  }
  
  if (entry.lines.length === 0) {
    entry.errors.push('No se encontraron líneas de asiento');
  }
  
  if (entry.lines.length < 2) {
    entry.errors.push('Un asiento debe tener al menos 2 líneas');
  }
  
  // Check balance
  const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    entry.errors.push(`Asiento desbalanceado: Débito=${totalDebit.toFixed(2)}, Crédito=${totalCredit.toFixed(2)}`);
  }
  
  // Check for accounts without codes
  const missingCodes = entry.lines.filter(l => !l.accountCode);
  if (missingCodes.length > 0) {
    entry.errors.push(`${missingCodes.length} línea(s) sin código de cuenta`);
  }
  
  entry.isValid = entry.errors.length === 0;
}

/**
 * Get preview of Excel file for import
 */
export async function previewExcelImport(buffer: Buffer): Promise<ImportPreviewResult> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  const sheets: ExcelSheetInfo[] = [];
  const entries: ParsedJournalEntry[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
    
    const type = detectSheetType(data);
    const rowCount = data.filter(row => row && row.some(cell => cell)).length;
    
    sheets.push({ name: sheetName, type, rowCount, selected: true });
    
    const parsedEntries = type === 'structured' 
      ? parseStructuredSheet(sheetName, data)
      : parseVoucherSheet(sheetName, data);
    
    entries.push(...parsedEntries);
  }
  
  return {
    sheets,
    entries,
    summary: {
      totalSheets: sheets.length,
      totalEntries: entries.length,
      validEntries: entries.filter(e => e.isValid).length,
      invalidEntries: entries.filter(e => !e.isValid).length,
    },
  };
}


/**
 * Find account by code or create mapping
 */
async function findAccountByCode(code: string): Promise<number | null> {
  const prisma = getPrismaClient();
  // Normalize code format (XXX-XXX-XXX)
  const normalizedCode = code.replace(/[^0-9-]/g, '');
  
  const account = await prisma.account.findFirst({
    where: {
      OR: [
        { code: normalizedCode },
        { code: code },
        { accountNumber: normalizedCode },
        { accountNumber: code },
      ],
      isActive: true,
      isDetail: true,
    },
  });
  
  return account?.id || null;
}

/**
 * Import journal entries from Excel
 */
export async function importJournalEntries(
  buffer: Buffer,
  options: ImportOptions,
  userId: number
): Promise<ImportResult> {
  const preview = await previewExcelImport(buffer);
  
  // Filter by selected sheets if specified
  let entriesToImport = preview.entries;
  if (options.selectedSheets && options.selectedSheets.length > 0) {
    entriesToImport = entriesToImport.filter(e => 
      options.selectedSheets!.includes(e.sheetName)
    );
  }
  
  // Only import valid entries
  entriesToImport = entriesToImport.filter(e => e.isValid);
  
  const result: ImportResult = {
    success: true,
    imported: 0,
    failed: 0,
    errors: [],
    createdEntryIds: [],
  };
  
  for (const entry of entriesToImport) {
    try {
      // Map account codes to IDs
      const lines = [];
      let hasUnmappedAccounts = false;
      
      for (const line of entry.lines) {
        const accountId = await findAccountByCode(line.accountCode);
        
        if (!accountId) {
          hasUnmappedAccounts = true;
          result.errors.push({
            entry: entry.voucherNumber,
            error: `Cuenta no encontrada: ${line.accountCode} (${line.accountName})`,
          });
          continue;
        }
        
        lines.push({
          accountId,
          description: line.description,
          debitAmount: line.debit > 0 ? line.debit : undefined,
          creditAmount: line.credit > 0 ? line.credit : undefined,
        });
      }
      
      if (hasUnmappedAccounts || lines.length < 2) {
        result.failed++;
        continue;
      }
      
      // Create journal entry
      const created = await createJournalEntry(
        {
          entryDate: entry.entryDate,
          voucherNumber: entry.voucherNumber,
          description: entry.description,
          currencyId: options.currencyId,
          exchangeRate: entry.exchangeRate || options.defaultExchangeRate || 1,
          lines,
        },
        userId
      );
      
      result.createdEntryIds.push(created.id);
      
      // Auto-post if requested
      if (options.autoPost) {
        await postJournalEntry(created.id, userId);
      }
      
      result.imported++;
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        entry: entry.voucherNumber,
        error: error.message || 'Error desconocido',
      });
    }
  }
  
  result.success = result.failed === 0;
  return result;
}
