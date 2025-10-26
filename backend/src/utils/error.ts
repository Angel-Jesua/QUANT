import { Response } from 'express';
import { PrismaClient, AuditAction } from '@prisma/client';

export type SafeErrorType =
  | 'INVALID_REQUEST'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_BLOCKED'
  | 'INTERNAL_ERROR';

const statusMap: Record<SafeErrorType, number> = {
  INVALID_REQUEST: 400,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_BLOCKED: 403,
  INTERNAL_ERROR: 500,
};

const messageMap: Record<SafeErrorType, string> = {
  INVALID_REQUEST: 'Solicitud inválida',
  INVALID_CREDENTIALS: 'Credenciales incorrectas',
  ACCOUNT_BLOCKED: 'Cuenta bloqueada',
  INTERNAL_ERROR: 'Error interno del servidor',
};

export interface SafeErrorPayload {
  success: false;
  message: string;
}

/**
 * Build a standardized, non-sensitive error payload
 */
export function buildSafeError(type: SafeErrorType): SafeErrorPayload {
  return {
    success: false,
    message: messageMap[type],
  };
}

/**
 * Send a standardized error response with appropriate HTTP status.
 * Never includes sensitive/internal details.
 */
export function sendSafeError(
  res: Response,
  type: SafeErrorType,
  options?: { statusCode?: number }
): Response {
  const status = options?.statusCode ?? statusMap[type];
  const payload = buildSafeError(type);
  return res.status(status).json(payload);
}

/**
 * Standardized console error logging that avoids leaking sensitive info outside
 * while still providing context to developers during troubleshooting.
 */
export function logErrorContext(
  tag: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const safeContext = context ? JSON.stringify(context) : '';
  const message =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : typeof error === 'string'
        ? error
        : 'Unknown error';
  console.error(`[${tag}] ${message}${safeContext ? ' | context: ' + safeContext : ''}`);
}

/**
 * Persist an error condition into UserAuditLog, with non-sensitive errorKey.
 */
const prisma = new PrismaClient();

export async function logAuditError(params: {
  action: AuditAction;
  entityType?: string;
  userId?: number;
  entityId?: number;
  errorKey?: string;
  ipAddress?: string;
  userAgent?: string;
  oldData?: any;
  newData?: any;
}): Promise<void> {
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
  } catch (auditError) {
    console.error('[audit] Failed to log error:', auditError);
  }
}

/**
 * Convenience function combining console logging, audit logging, and safe response
 */
export async function respondWithSafeErrorAndAudit(
  res: Response,
  type: SafeErrorType,
  auditParams: {
    action: AuditAction;
    entityType?: string;
    userId?: number;
    entityId?: number;
    ipAddress?: string;
    userAgent?: string;
    errorKey?: string;
  },
  options?: { statusCode?: number; logTag?: string; error?: unknown; context?: Record<string, unknown> }
): Promise<Response> {
  if (options?.logTag) {
    logErrorContext(options.logTag, options.error, options.context);
  }
  await logAuditError(auditParams);
  return sendSafeError(res, type, options);
}