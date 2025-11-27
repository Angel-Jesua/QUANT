/**
 * Journal Entry Routes
 * Double-entry accounting endpoints
 */

import { Router } from 'express';
import * as journalController from './journal.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

/**
 * POST /api/journal
 * Create a new journal entry
 * Body: { entryDate, description, currencyId, exchangeRate?, voucherNumber?, lines[] }
 */
router.post('/', journalController.createJournalEntry);

/**
 * GET /api/journal
 * List journal entries with pagination and filters
 * Query: search?, isPosted?, currencyId?, startDate?, endDate?, page?, limit?
 */
router.get('/', journalController.listJournalEntries);

/**
 * GET /api/journal/:id
 * Get a journal entry by ID
 */
router.get('/:id', journalController.getJournalEntryById);

/**
 * GET /api/journal/number/:entryNumber
 * Get a journal entry by entry number
 */
router.get('/number/:entryNumber', journalController.getJournalEntryByNumber);

/**
 * PUT /api/journal/:id
 * Update a journal entry (only if not posted)
 * Body: { entryDate?, description?, currencyId?, exchangeRate?, voucherNumber?, lines[]? }
 */
router.put('/:id', journalController.updateJournalEntry);

/**
 * POST /api/journal/:id/post
 * Post (publish) a journal entry, making it immutable
 */
router.post('/:id/post', journalController.postJournalEntry);

/**
 * DELETE /api/journal/:id
 * Delete a journal entry (only if not posted)
 */
router.delete('/:id', journalController.deleteJournalEntry);

/**
 * POST /api/journal/:id/reverse
 * Create a reversal entry for a posted journal entry
 * Body: { reversalDate, description? }
 */
router.post('/:id/reverse', journalController.reverseJournalEntry);

export { router as journalRoutes };
