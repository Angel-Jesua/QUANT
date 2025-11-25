/**
 * Account Import Utilities
 * Functions for Excel parsing, hierarchy inference, and data normalization
 */

import {
  ExcelRawRow,
  ColumnMapping,
  CurrencyOption,
  BulkImportAccountItem,
  ImportPreviewRow,
  getPredefinedAccountNumbers,
} from './account-import.types';

/**
 * Normalize an account number by removing dashes and extra characters
 */
export function normalizeAccountNumber(accountNumber: string): string {
  return accountNumber.trim().toUpperCase().replace(/[\s-]+/g, '');
}

/**
 * Get the segments of an account number (split by dash or fixed positions)
 * Example: "111-100-000" -> ["111", "100", "000"]
 */
export function getAccountSegments(accountNumber: string): string[] {
  const trimmed = accountNumber.trim();
  // If contains dashes, split by dash
  if (trimmed.includes('-')) {
    return trimmed.split('-').filter((s) => s.length > 0);
  }
  // Otherwise, try to split into 3-digit groups
  const normalized = normalizeAccountNumber(trimmed);
  const segments: string[] = [];
  for (let i = 0; i < normalized.length; i += 3) {
    segments.push(normalized.slice(i, i + 3));
  }
  return segments;
}

/**
 * Calculate the hierarchy level based on account number structure.
 * Level is determined by analyzing the significant digits in each segment.
 * 
 * Examples:
 * - "100-000-000" = level 1 (first digit of first segment)
 * - "110-000-000" = level 2 (second digit of first segment)
 * - "111-000-000" = level 3 (third digit of first segment)
 * - "111-100-000" = level 4 (first digit of second segment)
 * - "111-110-000" = level 5 (second digit of second segment)
 * - "111-111-000" = level 6 (third digit of second segment)
 * - "111-111-001" = level 7+ (third segment has value)
 */
export function calculateAccountLevel(accountNumber: string): number {
  const segments = getAccountSegments(accountNumber);
  let level = 0;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;
    
    const segmentValue = parseInt(segment, 10);
    if (segmentValue === 0) continue;
    
    // Count significant positions within the segment
    const segmentStr = segment.padStart(3, '0');
    for (let j = 0; j < segmentStr.length; j++) {
      if (segmentStr[j] !== '0') {
        level = (i * 3) + (j + 1);
      }
    }
  }

  return Math.max(1, level);
}

/**
 * Check if an account is a grouping account (doesn't require currency).
 * Grouping accounts are level 1-2 (e.g., 100-000-000, 110-000-000, 200-000-000, 210-000-000)
 */
export function isGroupingAccount(accountNumber: string): boolean {
  const segments = getAccountSegments(accountNumber);
  if (segments.length < 2) return true;
  
  // If second and third segments are all zeros, it's a grouping account
  const secondSegment = parseInt(segments[1] || '0', 10);
  const thirdSegment = parseInt(segments[2] || '0', 10);
  
  return secondSegment === 0 && thirdSegment === 0;
}

/**
 * Find the potential parent account number by zeroing out trailing segments.
 * Example: "111-100-001" -> tries "111-100-000", then "111-000-000", then "110-000-000"
 */
export function findPotentialParents(accountNumber: string): string[] {
  const segments = getAccountSegments(accountNumber);
  const parents: string[] = [];

  // Try zeroing out segments from right to left
  for (let i = segments.length - 1; i >= 0; i--) {
    const currentSegment = segments[i];
    if (!currentSegment || parseInt(currentSegment, 10) === 0) continue;

    // Create parent by zeroing this segment
    const parentSegments = [...segments];
    parentSegments[i] = '0'.repeat(currentSegment.length);
    const parentNumber = parentSegments.join('-');

    if (parentNumber !== accountNumber) {
      parents.push(parentNumber);
    }

    // Also try decrementing the previous significant segment
    for (let j = i - 1; j >= 0; j--) {
      const prevSegment = segments[j];
      if (prevSegment && parseInt(prevSegment, 10) > 0) {
        const decrementedSegments = [...parentSegments];
        decrementedSegments[j] = String(parseInt(prevSegment, 10) - 1).padStart(
          prevSegment.length,
          '0'
        );
        // Zero out remaining segments after j
        for (let k = j + 1; k < decrementedSegments.length; k++) {
          decrementedSegments[k] = '0'.repeat(segments[k]?.length || 3);
        }
        const altParent = decrementedSegments.join('-');
        if (altParent !== accountNumber && !parents.includes(altParent)) {
          parents.push(altParent);
        }
      }
    }
  }

  return parents;
}

/**
 * Infer parent account number from a list of available accounts.
 * Searches the potential parents in order of closest match.
 */
export function inferParentAccountNumber(
  accountNumber: string,
  availableAccounts: Set<string>
): string | undefined {
  const potentialParents = findPotentialParents(accountNumber);

  for (const parent of potentialParents) {
    if (availableAccounts.has(parent)) {
      return parent;
    }
  }

  return undefined;
}

/**
 * Clean account type text - returns trimmed string or undefined if empty
 */
export function cleanAccountType(typeText: string): string | undefined {
  const cleaned = typeText.trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Resolve currency code to currency ID
 */
export function resolveCurrencyId(
  currencyCode: string,
  currencies: CurrencyOption[]
): number | undefined {
  const normalized = currencyCode.trim().toUpperCase();
  const currency = currencies.find(
    (c) => c.code.toUpperCase() === normalized || c.name.toUpperCase() === normalized
  );
  return currency?.id;
}

/**
 * Determine if an account is a detail (leaf) account.
 * An account is NOT a detail if it's the parent of any other account in the list.
 */
export function calculateIsDetail(
  accountNumber: string,
  allParentNumbers: Set<string>
): boolean {
  return !allParentNumbers.has(accountNumber);
}

/**
 * Process raw Excel rows into import preview rows with all inferences applied.
 * Filters out predefined parent accounts (100-000-000, 110-000-000, etc.)
 */
export function processExcelData(
  rawRows: ExcelRawRow[],
  mapping: ColumnMapping,
  currencies: CurrencyOption[],
  defaultCurrencyCode: string = '',
  skipCurrencyValidation: boolean = false
): ImportPreviewRow[] {
  const previewRows: ImportPreviewRow[] = [];
  const availableAccounts = new Set<string>();
  const accountOccurrences = new Map<string, number>();
  
  // Get predefined parent account numbers to filter out
  const predefinedAccounts = getPredefinedAccountNumbers();
  
  // Resolve default currency ID
  const defaultCurrency = currencies.find(c => c.code.toUpperCase() === defaultCurrencyCode.toUpperCase());
  const defaultCurrencyId = defaultCurrency?.id;

  // First pass: collect all account numbers and count occurrences for duplicate detection
  // Skip predefined parent accounts
  for (const row of rawRows) {
    const accountNumber = String(row[mapping.accountNumber] ?? '').trim().toUpperCase();
    if (accountNumber && !predefinedAccounts.has(accountNumber)) {
      availableAccounts.add(accountNumber);
      accountOccurrences.set(accountNumber, (accountOccurrences.get(accountNumber) ?? 0) + 1);
    }
  }

  // Identify duplicates
  const duplicateAccounts = new Set<string>();
  accountOccurrences.forEach((count, accNum) => {
    if (count > 1) {
      duplicateAccounts.add(accNum);
    }
  });

  // Second pass: infer parent-child relationships
  // Include predefined accounts as potential parents
  const allPotentialParents = new Set([...availableAccounts, ...predefinedAccounts]);
  const parentNumbers = new Set<string>();
  const accountParentMap = new Map<string, string | undefined>();

  for (const row of rawRows) {
    const accountNumber = String(row[mapping.accountNumber] ?? '').trim().toUpperCase();
    if (!accountNumber || predefinedAccounts.has(accountNumber)) continue;

    const parent = inferParentAccountNumber(accountNumber, allPotentialParents);
    accountParentMap.set(accountNumber, parent);
    if (parent) {
      parentNumbers.add(parent);
    }
  }

  // Third pass: build preview rows (skip predefined parent accounts)
  for (const row of rawRows) {
    const accountNumber = String(row[mapping.accountNumber] ?? '').trim().toUpperCase();
    const name = String(row[mapping.name] ?? '').trim();
    const typeRaw = String(row[mapping.type] ?? '').trim();
    const currencyRaw = String(row[mapping.currency] ?? '').trim();
    const description = mapping.description ? String(row[mapping.description] ?? '').trim() : undefined;

    if (!accountNumber || !name) {
      continue; // Skip empty rows
    }

    // Skip predefined parent accounts
    if (predefinedAccounts.has(accountNumber)) {
      continue;
    }

    // Get type directly from Excel column (any string value is valid)
    const type = cleanAccountType(typeRaw);
    
    // Try to resolve currency: from Excel column first, then default currency
    let currencyId = resolveCurrencyId(currencyRaw, currencies);
    let finalCurrencyCode = currencyRaw;
    
    // If no currency from Excel, use default currency
    if (!currencyId && defaultCurrencyId) {
      currencyId = defaultCurrencyId;
      finalCurrencyCode = defaultCurrencyCode;
    }
    
    const parentAccountNumber = accountParentMap.get(accountNumber);
    const isDetail = calculateIsDetail(accountNumber, parentNumbers);
    const level = calculateAccountLevel(accountNumber);
    const isGrouping = isGroupingAccount(accountNumber);

    // Check for errors:
    // - Type is required (but any non-empty value is valid)
    // - Currency validation depends on skipCurrencyValidation flag
    // - Duplicate account numbers in the same file are errors
    const isDuplicate = duplicateAccounts.has(accountNumber);
    
    // Currency validation logic
    const currencyRequired = !isGrouping && !skipCurrencyValidation;
    const hasCurrencyFromExcel = currencyRaw && currencyId;
    const hasCurrencyFromDefault = !currencyRaw && defaultCurrencyId;
    const hasValidCurrency = hasCurrencyFromExcel || hasCurrencyFromDefault;
    const invalidCurrency = currencyRequired && currencyRaw && !resolveCurrencyId(currencyRaw, currencies);
    const missingCurrency = currencyRequired && !hasValidCurrency && !currencyRaw;
    
    // If skipping currency validation, no currency errors
    const currencyError = skipCurrencyValidation ? false : (invalidCurrency || missingCurrency);
    
    const hasError = !type || isDuplicate || currencyError;
    const errorMessage = isDuplicate
      ? `Número de cuenta duplicado en el archivo`
      : !type
        ? `Tipo de cuenta requerido`
        : invalidCurrency
          ? `Moneda no reconocida: "${currencyRaw}"`
          : missingCurrency
            ? `Moneda requerida para cuentas de detalle`
            : undefined;

    // For grouping accounts without currency, use the first available currency as default
    const fallbackCurrencyId = currencies.length > 0 ? currencies[0].id : 1;
    const finalCurrencyId = currencyId ?? (isGrouping ? fallbackCurrencyId : (skipCurrencyValidation ? fallbackCurrencyId : 0));
    if (!finalCurrencyCode && isGrouping) {
      finalCurrencyCode = currencies[0]?.code || 'N/A';
    }
    if (!finalCurrencyCode && skipCurrencyValidation) {
      finalCurrencyCode = currencies[0]?.code || 'N/A';
    }

    previewRows.push({
      accountNumber,
      name,
      type: type ?? '', // Will be marked as error if empty
      typeRaw,
      currencyId: finalCurrencyId,
      currencyCode: finalCurrencyCode || '',
      description: description || undefined,
      parentAccountNumber,
      isDetail: !isGrouping && isDetail, // Grouping accounts are never detail accounts
      level,
      hasError,
      errorMessage,
    });
  }

  // Sort by level then account number for hierarchical display
  previewRows.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return a.accountNumber.localeCompare(b.accountNumber);
  });

  return previewRows;
}

/**
 * Convert preview rows to bulk import items (only valid rows)
 */
export function convertToImportItems(previewRows: ImportPreviewRow[]): BulkImportAccountItem[] {
  return previewRows
    .filter((row) => !row.hasError)
    .map((row) => ({
      accountNumber: row.accountNumber,
      name: row.name,
      type: row.type,
      currencyId: row.currencyId,
      description: row.description,
      parentAccountNumber: row.parentAccountNumber,
      isDetail: row.isDetail,
      isActive: true,
    }));
}
