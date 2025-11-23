require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient, AuditAction } = require('@prisma/client');
const { userRoutes } = require('./modules/user/user.routes');
const { authRoutes } = require('./modules/auth/auth.routes');
const { currencyRoutes } = require('./modules/currency/currency.routes');
const { clientRoutes } = require('./modules/client/client.routes');
const { accountRoutes } = require('./modules/account/account.routes');
const { sendSafeError, respondWithSafeErrorAndAudit, logErrorContext } = require('./utils/error');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:4200', 'https://quant-app-7hofs.ondigitalocean.app'],
  credentials: true
}));

// Serve static files (profile images)
app.use('/images', express.static('public/images'));

// Basic route
app.get('/', (req: any, res: any) => {
  res.json({ message: 'Backend server is running!' });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/accounts', accountRoutes);

// Example API endpoint using Prisma (kept for reference)
app.get('/users', async (req: any, res: any) => {
  try {
    const users = await prisma.userAccount.findMany();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Global error handler to centralize safe error responses and audit logging
app.use(async (err: any, req: any, res: any, next: any) => {
  try {
    logErrorContext('app.unhandled', err, { path: req.path, method: req.method });
    await respondWithSafeErrorAndAudit(res, 'INTERNAL_ERROR', {
      action: AuditAction.update,
      entityType: 'server',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      errorKey: 'unhandled_exception',
    });
  } catch (handlerError) {
    console.error('Error in global error handler:', handlerError);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});