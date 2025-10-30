"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSafeError = buildSafeError;
exports.sendSafeError = sendSafeError;
exports.logErrorContext = logErrorContext;
exports.logAuditError = logAuditError;
exports.respondWithSafeErrorAndAudit = respondWithSafeErrorAndAudit;
const client_1 = require("@prisma/client");
const statusMap = {
    INVALID_REQUEST: 400,
    INVALID_CREDENTIALS: 401,
    ACCOUNT_BLOCKED: 403,
    INTERNAL_ERROR: 500,
};
const messageMap = {
    INVALID_REQUEST: 'Solicitud inválida',
    INVALID_CREDENTIALS: 'Credenciales incorrectas',
    ACCOUNT_BLOCKED: 'Cuenta bloqueada',
    INTERNAL_ERROR: 'Error interno del servidor',
};
/**
 * Build a standardized, non-sensitive error payload
 */
function buildSafeError(type) {
    return {
        success: false,
        message: messageMap[type],
    };
}
/**
 * Send a standardized error response with appropriate HTTP status.
 * Never includes sensitive/internal details.
 */
function sendSafeError(res, type, options) {
    const status = options?.statusCode ?? statusMap[type];
    const payload = buildSafeError(type);
    return res.status(status).json(payload);
}
/**
 * Standardized console error logging that avoids leaking sensitive info outside
 * while still providing context to developers during troubleshooting.
 */
function logErrorContext(tag, error, context) {
    const safeContext = context ? JSON.stringify(context) : '';
    const message = error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === 'string'
            ? error
            : 'Unknown error';
    console.error(`[${tag}] ${message}${safeContext ? ' | context: ' + safeContext : ''}`);
}
/**
 * Persist an error condition into UserAuditLog, with non-sensitive errorKey.
 */
const prisma = new client_1.PrismaClient();
async function logAuditError(params) {
    try {
        await prisma.userAuditLog.create({
            data: {
                userId: params.userId,
                action: params.action,
                entityType: params.entityType ?? 'user',
                entityId: params.entityId,
                oldData: params.oldData,
                newData: params.newData,
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                success: false,
                errorMessage: params.errorKey,
                performedAt: new Date(),
            },
        });
    }
    catch (auditError) {
        console.error('[audit] Failed to log error:', auditError);
    }
}
/**
 * Convenience function combining console logging, audit logging, and safe response
 */
async function respondWithSafeErrorAndAudit(res, type, auditParams, options) {
    if (options?.logTag) {
        logErrorContext(options.logTag, options.error, options.context);
    }
    await logAuditError(auditParams);
    return sendSafeError(res, type, options);
}
