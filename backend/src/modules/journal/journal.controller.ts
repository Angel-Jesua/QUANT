/**
 * Journal Entry Controller
 * Handles HTTP requests for double-entry accounting operations
 */

import { Request, Response } from 'express';
import * as journalService from './journal.service';
import { IRequestContext, ICreateJournalEntry, IUpdateJournalEntry, IJournalListQuery } from './journal.types';

/**
 * Extract request context for audit logging
 */
function getRequestContext(req: Request): IRequestContext {
  return {
    ipAddress: (req.ip || req.socket?.remoteAddress) ?? undefined,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
  };
}

/**
 * POST /api/journal
 * Creates a new journal entry with double-entry validation
 */
export async function createJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const data: ICreateJournalEntry = req.body;

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
  } catch (error: any) {
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
export async function getJournalEntryById(req: Request, res: Response): Promise<void> {
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
  } catch (error: any) {
    console.error('Error getting journal entry:', error);
    res.status(500).json({ error: 'Error interno al obtener el asiento contable' });
  }
}

/**
 * GET /api/journal/number/:entryNumber
 * Gets a journal entry by entry number
 */
export async function getJournalEntryByNumber(req: Request, res: Response): Promise<void> {
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
  } catch (error: any) {
    console.error('Error getting journal entry by number:', error);
    res.status(500).json({ error: 'Error interno al obtener el asiento contable' });
  }
}

/**
 * GET /api/journal
 * Lists journal entries with optional filters
 */
export async function listJournalEntries(req: Request, res: Response): Promise<void> {
  try {
    const query: IJournalListQuery = {
      search: req.query.search as string,
      isPosted: req.query.isPosted === 'true' ? true : req.query.isPosted === 'false' ? false : undefined,
      currencyId: req.query.currencyId ? parseInt(req.query.currencyId as string, 10) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const result = await journalService.listJournalEntries(query);
    res.json(result);
  } catch (error: any) {
    console.error('Error listing journal entries:', error);
    res.status(500).json({ error: 'Error interno al listar asientos contables' });
  }
}

/**
 * PUT /api/journal/:id
 * Updates a journal entry (only if not posted)
 */
export async function updateJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const data: IUpdateJournalEntry = req.body;

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
  } catch (error: any) {
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
export async function postJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
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
  } catch (error: any) {
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
export async function deleteJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
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
  } catch (error: any) {
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
export async function reverseJournalEntry(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
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
  } catch (error: any) {
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

/**
 * POST /api/journal/import/preview
 * Preview Excel file for import
 */
export async function previewImport(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Archivo Excel requerido' });
      return;
    }

    const { previewExcelImport } = await import('./journal-import.service');
    const result = await previewExcelImport(req.file.buffer);

    res.json(result);
  } catch (error: any) {
    console.error('Error previewing import:', error.message, error.stack);
    res.status(500).json({ error: `Error al procesar el archivo Excel: ${error.message}` });
  }
}

/**
 * POST /api/journal/import
 * Import journal entries from Excel
 */
export async function importJournalEntries(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Archivo Excel requerido' });
      return;
    }

    const { currencyId, selectedSheets, defaultExchangeRate, autoPost } = req.body;

    if (!currencyId) {
      res.status(400).json({ error: 'La moneda es requerida' });
      return;
    }

    const { importJournalEntries: doImport } = await import('./journal-import.service');
    const result = await doImport(
      req.file.buffer,
      {
        currencyId: parseInt(currencyId, 10),
        selectedSheets: selectedSheets ? JSON.parse(selectedSheets) : undefined,
        defaultExchangeRate: defaultExchangeRate ? parseFloat(defaultExchangeRate) : undefined,
        autoPost: autoPost === 'true',
      },
      userId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error importing journal entries:', error);
    res.status(500).json({ error: 'Error al importar asientos contables' });
  }
}
