"use strict";
/**
 * Journal Entry Controller
 * Handles HTTP requests for double-entry accounting operations
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJournalEntry = createJournalEntry;
exports.getJournalEntryById = getJournalEntryById;
exports.getJournalEntryByNumber = getJournalEntryByNumber;
exports.listJournalEntries = listJournalEntries;
exports.updateJournalEntry = updateJournalEntry;
exports.postJournalEntry = postJournalEntry;
exports.deleteJournalEntry = deleteJournalEntry;
exports.reverseJournalEntry = reverseJournalEntry;
const journalService = __importStar(require("./journal.service"));
/**
 * Extract request context for audit logging
 */
function getRequestContext(req) {
    return {
        ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id,
    };
}
/**
 * POST /api/journal
 * Creates a new journal entry with double-entry validation
 */
async function createJournalEntry(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const data = req.body;
        // Basic input validation
        if (!data.entryDate) {
            res.status(400).json({ error: 'La fecha del asiento es requerida' });
            return;
        }
        if (!data.description || data.description.trim() === '') {
            res.status(400).json({ error: 'La descripción del asiento es requerida' });
            return;
        }
        if (!data.currencyId) {
            res.status(400).json({ error: 'La moneda es requerida' });
            return;
        }
        if (!data.lines || !Array.isArray(data.lines) || data.lines.length < 2) {
            res.status(400).json({ error: 'Un asiento contable debe tener al menos 2 líneas' });
            return;
        }
        // Validate each line has required fields
        for (let i = 0; i < data.lines.length; i++) {
            const line = data.lines[i];
            if (!line.accountId) {
                res.status(400).json({ error: `Línea ${i + 1}: La cuenta es requerida` });
                return;
            }
            const hasDebit = line.debitAmount !== undefined && line.debitAmount !== null && Number(line.debitAmount) > 0;
            const hasCredit = line.creditAmount !== undefined && line.creditAmount !== null && Number(line.creditAmount) > 0;
            if (!hasDebit && !hasCredit) {
                res.status(400).json({ error: `Línea ${i + 1}: Debe tener un monto al debe o al haber` });
                return;
            }
            if (hasDebit && hasCredit) {
                res.status(400).json({ error: `Línea ${i + 1}: Una línea no puede tener monto al debe y al haber simultáneamente` });
                return;
            }
        }
        const ctx = getRequestContext(req);
        const result = await journalService.createJournalEntry(data, userId, ctx);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error creating journal entry:', error);
        // Return validation errors with 400
        if (error.message?.includes('no cuadra') ||
            error.message?.includes('mayor a cero') ||
            error.message?.includes('al menos 2 líneas')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Error interno al crear el asiento contable' });
    }
}
/**
 * GET /api/journal/:id
 * Gets a journal entry by ID
 */
async function getJournalEntryById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const entry = await journalService.getJournalEntryById(id);
        if (!entry) {
            res.status(404).json({ error: 'Asiento contable no encontrado' });
            return;
        }
        res.json(entry);
    }
    catch (error) {
        console.error('Error getting journal entry:', error);
        res.status(500).json({ error: 'Error interno al obtener el asiento contable' });
    }
}
/**
 * GET /api/journal/number/:entryNumber
 * Gets a journal entry by entry number
 */
async function getJournalEntryByNumber(req, res) {
    try {
        const { entryNumber } = req.params;
        if (!entryNumber) {
            res.status(400).json({ error: 'Número de asiento requerido' });
            return;
        }
        const entry = await journalService.getJournalEntryByNumber(entryNumber);
        if (!entry) {
            res.status(404).json({ error: 'Asiento contable no encontrado' });
            return;
        }
        res.json(entry);
    }
    catch (error) {
        console.error('Error getting journal entry by number:', error);
        res.status(500).json({ error: 'Error interno al obtener el asiento contable' });
    }
}
/**
 * GET /api/journal
 * Lists journal entries with optional filters
 */
async function listJournalEntries(req, res) {
    try {
        const query = {
            search: req.query.search,
            isPosted: req.query.isPosted === 'true' ? true : req.query.isPosted === 'false' ? false : undefined,
            currencyId: req.query.currencyId ? parseInt(req.query.currencyId, 10) : undefined,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            page: req.query.page ? parseInt(req.query.page, 10) : 1,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
        };
        const result = await journalService.listJournalEntries(query);
        res.json(result);
    }
    catch (error) {
        console.error('Error listing journal entries:', error);
        res.status(500).json({ error: 'Error interno al listar asientos contables' });
    }
}
/**
 * PUT /api/journal/:id
 * Updates a journal entry (only if not posted)
 */
async function updateJournalEntry(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const data = req.body;
        // If updating lines, validate each line
        if (data.lines) {
            if (data.lines.length < 2) {
                res.status(400).json({ error: 'Un asiento contable debe tener al menos 2 líneas' });
                return;
            }
            for (let i = 0; i < data.lines.length; i++) {
                const line = data.lines[i];
                if (!line.accountId) {
                    res.status(400).json({ error: `Línea ${i + 1}: La cuenta es requerida` });
                    return;
                }
            }
        }
        const ctx = getRequestContext(req);
        const result = await journalService.updateJournalEntry(id, data, userId, ctx);
        res.json(result);
    }
    catch (error) {
        console.error('Error updating journal entry:', error);
        if (error.message?.includes('no encontrado')) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.message?.includes('no cuadra') ||
            error.message?.includes('publicado') ||
            error.message?.includes('al menos 2 líneas')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Error interno al actualizar el asiento contable' });
    }
}
/**
 * POST /api/journal/:id/post
 * Posts (publishes) a journal entry
 */
async function postJournalEntry(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const ctx = getRequestContext(req);
        const result = await journalService.postJournalEntry(id, userId, ctx);
        res.json(result);
    }
    catch (error) {
        console.error('Error posting journal entry:', error);
        if (error.message?.includes('no encontrado')) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.message?.includes('ya está publicado') ||
            error.message?.includes('No se puede publicar')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Error interno al publicar el asiento contable' });
    }
}
/**
 * DELETE /api/journal/:id
 * Deletes a journal entry (only if not posted)
 */
async function deleteJournalEntry(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const ctx = getRequestContext(req);
        await journalService.deleteJournalEntry(id, userId, ctx);
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting journal entry:', error);
        if (error.message?.includes('no encontrado')) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.message?.includes('publicado')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Error interno al eliminar el asiento contable' });
    }
}
/**
 * POST /api/journal/:id/reverse
 * Creates a reversal entry for a posted journal entry
 */
async function reverseJournalEntry(req, res) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: 'Usuario no autenticado' });
            return;
        }
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const { reversalDate, description } = req.body;
        if (!reversalDate) {
            res.status(400).json({ error: 'La fecha de reversión es requerida' });
            return;
        }
        const ctx = getRequestContext(req);
        const result = await journalService.reverseJournalEntry(id, userId, reversalDate, description, ctx);
        res.status(201).json(result);
    }
    catch (error) {
        console.error('Error reversing journal entry:', error);
        if (error.message?.includes('no encontrado')) {
            res.status(404).json({ error: error.message });
            return;
        }
        if (error.message?.includes('publicados') ||
            error.message?.includes('ya ha sido reversado')) {
            res.status(400).json({ error: error.message });
            return;
        }
        res.status(500).json({ error: 'Error interno al reversar el asiento contable' });
    }
}
