"use strict";
/**
 * Journal Entry Routes
 * Double-entry accounting endpoints
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.journalRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const journalController = __importStar(require("./journal.controller"));
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.journalRoutes = router;
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// All routes require authentication
router.use(auth_middleware_1.authenticateJWT);
/**
 * POST /api/journal/import/preview
 * Preview Excel file for import
 * Body: multipart/form-data with 'file' field
 */
router.post('/import/preview', upload.single('file'), journalController.previewImport);
/**
 * POST /api/journal/import
 * Import journal entries from Excel
 * Body: multipart/form-data with 'file', 'currencyId', 'selectedSheets?', 'defaultExchangeRate?', 'autoPost?'
 */
router.post('/import', upload.single('file'), journalController.importJournalEntries);
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
