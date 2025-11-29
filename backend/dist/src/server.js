"use strict";
require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { PrismaClient, AuditAction } = require('@prisma/client');
const { userRoutes } = require('./modules/user/user.routes');
const { authRoutes } = require('./modules/auth/auth.routes');
const { currencyRoutes } = require('./modules/currency/currency.routes');
const { clientRoutes } = require('./modules/client/client.routes');
const { accountRoutes } = require('./modules/account/account.routes');
const { journalRoutes } = require('./modules/journal/journal.routes');
const { reportRoutes } = require('./modules/report/report.routes');
const { sendSafeError, respondWithSafeErrorAndAudit, logErrorContext } = require('./utils/error');
const { EncryptionService, ConsoleCryptoAuditLogger } = require('./utils/encryption.service');
const { KeyValidationError } = require('./utils/encryption.errors');
const { createEncryptionMiddleware } = require('./middleware/encryption.middleware');
const { ENCRYPTED_FIELDS } = require('./config/encryption.config');
// Validate ENCRYPTION_KEY at startup
let encryptionService = null;
try {
    if (process.env.ENCRYPTION_KEY) {
        encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY, new ConsoleCryptoAuditLogger());
        console.log('[STARTUP] Encryption service initialized successfully');
    }
    else {
        console.warn('[STARTUP] ENCRYPTION_KEY not set - encryption middleware disabled');
    }
}
catch (error) {
    if (error instanceof KeyValidationError) {
        console.error(`[STARTUP] Invalid ENCRYPTION_KEY: ${error.message}`);
        console.error('[STARTUP] Server cannot start with invalid encryption configuration');
        process.exit(1);
    }
    throw error;
}
const app = express();
const prisma = new PrismaClient();
// Apply encryption middleware if encryption service is available
if (encryptionService) {
    prisma.$use(createEncryptionMiddleware(ENCRYPTED_FIELDS, encryptionService));
    console.log('[STARTUP] Encryption middleware applied to PrismaClient');
}
const PORT = process.env.PORT || 3000;
// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:4200', 'https://quant-app-7hofs.ondigitalocean.app'],
    credentials: true
}));
// Serve static files (profile images)
app.use('/images', express.static('public/images'));
// Basic route
app.get('/', (req, res) => {
    res.json({ message: 'Backend server is running!' });
});
// API routes
const apiRouter = express.Router();
apiRouter.use('/users', userRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/currencies', currencyRoutes);
apiRouter.use('/clients', clientRoutes);
apiRouter.use('/accounts', accountRoutes);
apiRouter.use('/journal', journalRoutes);
apiRouter.use('/reports', reportRoutes);
// Mount API routes on both /api and root / to handle DigitalOcean stripping prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);
// Example API endpoint using Prisma (kept for reference)
app.get('/users', async (req, res) => {
    try {
        const users = await prisma.userAccount.findMany();
        res.json(users);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Global error handler to centralize safe error responses and audit logging
app.use(async (err, req, res, next) => {
    try {
        logErrorContext('app.unhandled', err, { path: req.path, method: req.method });
        await respondWithSafeErrorAndAudit(res, 'INTERNAL_ERROR', {
            action: AuditAction.update,
            entityType: 'server',
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            errorKey: 'unhandled_exception',
        });
    }
    catch (handlerError) {
        console.error('Error in global error handler:', handlerError);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
