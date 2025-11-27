/**
 * Journal Entry Validation
 * Implements double-entry accounting (Partida Doble) validation rules
 * 
 * Key Validations:
 * - Total Debits MUST equal Total Credits (balanced entry)
 * - Total amount MUST be greater than zero
 * - Minimum 2 lines required for double-entry
 */

import { Prisma } from '@prisma/client';
import { IJournalLineInput, IBalanceValidation } from './journal.types';
import { toDecimal } from './journal.utils';

/**
 * Validates that a journal entry follows double-entry rules:
 * 1. Total Debits == Total Credits
 * 2. Total > 0
 * 
 * @param lines Array of journal entry lines
 * @returns Validation result with totals and error message if invalid
 */
export function validateDoubleEntry(lines: IJournalLineInput[]): IBalanceValidation {
  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);

  for (const line of lines) {
    totalDebit = totalDebit.plus(toDecimal(line.debitAmount));
    totalCredit = totalCredit.plus(toDecimal(line.creditAmount));
  }

  const difference = totalDebit.minus(totalCredit).abs();
  const isBalanced = difference.isZero();
  const hasPositiveAmount = totalDebit.greaterThan(0);

  if (!hasPositiveAmount) {
    return {
      isBalanced: false,
      totalDebit,
      totalCredit,
      difference,
      errorMessage: 'El monto total del asiento debe ser mayor a cero',
    };
  }

  if (!isBalanced) {
    return {
      isBalanced: false,
      totalDebit,
      totalCredit,
      difference,
      errorMessage: `El asiento no cuadra. Total Debe: ${totalDebit.toFixed(2)}, Total Haber: ${totalCredit.toFixed(2)}, Diferencia: ${difference.toFixed(2)}`,
    };
  }

  return {
    isBalanced: true,
    totalDebit,
    totalCredit,
    difference,
  };
}

/**
 * Validates minimum line count for double-entry
 * @param lines Array of journal entry lines
 * @throws Error if less than 2 lines
 */
export function validateMinimumLines(lines: IJournalLineInput[]): void {
  if (lines.length < 2) {
    throw new Error('Un asiento contable debe tener al menos 2 líneas');
  }
}

/**
 * Validates journal entry data before creation or update
 * @param lines Array of journal entry lines
 * @returns Validation result
 * @throws Error if validation fails
 */
export function validateJournalEntry(lines: IJournalLineInput[]): IBalanceValidation {
  validateMinimumLines(lines);
  
  const validation = validateDoubleEntry(lines);
  if (!validation.isBalanced) {
    throw new Error(validation.errorMessage);
  }
  
  return validation;
}
