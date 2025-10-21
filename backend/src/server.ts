const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();
const { userRoutes } = require('./modules/user/user.routes');

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200', // Default Angular dev server
  credentials: true
}));

// Basic route
app.get('/', (req: any, res: any) => {
  res.json({ message: 'Backend server is running!' });
});

// API routes
app.use('/api/users', userRoutes);

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});