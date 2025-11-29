"use strict";
/**
 * Centralized Prisma Client with encryption middleware
 *
 * All modules should import prisma from this file to ensure
 * encryption/decryption middleware is applied consistently.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const encryption_service_1 = require("../utils/encryption.service");
const encryption_middleware_1 = require("../middleware/encryption.middleware");
const encryption_config_1 = require("../config/encryption.config");
// Create singleton PrismaClient
const prisma = new client_1.PrismaClient();
exports.prisma = prisma;
// Apply encryption middleware if ENCRYPTION_KEY is available
if (process.env.ENCRYPTION_KEY) {
    try {
        const encryptionService = new encryption_service_1.EncryptionService(process.env.ENCRYPTION_KEY, new encryption_service_1.ConsoleCryptoAuditLogger());
        prisma.$use((0, encryption_middleware_1.createEncryptionMiddleware)(encryption_config_1.ENCRYPTED_FIELDS, encryptionService));
        console.log('[PRISMA] Encryption middleware applied');
    }
    catch (error) {
        console.error('[PRISMA] Failed to initialize encryption:', error);
    }
}
