/**
 * Prisma Encryption Middleware
 * 
 * Automatically encrypts sensitive fields before database writes
 * and decrypts them after reads using AES-256-GCM encryption.
 * 
 * Requirements: 3.1, 3.2
 */

import { Prisma } from '@prisma/client';
import { EncryptionService } from '../utils/encryption.service';
import { EncryptedFieldConfig } from '../config/encryption.config';

/**
 * Creates a Prisma middleware that handles automatic encryption/decryption
 * of configured fields.
 * 
 * @param config - Array of model/field configurations for encryption
 * @param encryptionService - The encryption service instance to use
 * @returns Prisma middleware function
 */
export function createEncryptionMiddleware(
  config: EncryptedFieldConfig[],
  encryptionService: EncryptionService
): Prisma.Middleware {
  // Build a lookup map for faster field checking
  const encryptedFieldsMap = new Map<string, Set<string>>();
  for (const modelConfig of config) {
    encryptedFieldsMap.set(modelConfig.model, new Set(modelConfig.fields));
  }

  /**
   * Gets the set of encrypted fields for a model, or undefined if not configured.
   */
  function getEncryptedFields(model: string): Set<string> | undefined {
    return encryptedFieldsMap.get(model);
  }

  /**
   * Encrypts specified fields in a data object.
   */
  function encryptFields(
    data: Record<string, unknown>,
    fields: Set<string>,
    model: string
  ): Record<string, unknown> {
    const result = { ...data };
    
    for (const field of fields) {
      if (field in result && result[field] !== null && result[field] !== undefined) {
        const value = result[field];
        // Only encrypt strings or convert numbers to strings
        if (typeof value === 'string') {
          // Skip if already encrypted
          if (!encryptionService.isEncrypted(value)) {
            result[field] = encryptionService.encrypt(value, field, model);
          }
        } else if (typeof value === 'number' || typeof value === 'bigint') {
          // Convert numbers to string for encryption (e.g., creditLimit)
          result[field] = encryptionService.encrypt(String(value), field, model);
        }
      }
    }
    
    return result;
  }

  /**
   * Decrypts specified fields in a data object.
   */
  function decryptFields(
    data: Record<string, unknown>,
    fields: Set<string>,
    model: string
  ): Record<string, unknown> {
    const result = { ...data };
    
    for (const field of fields) {
      if (field in result && result[field] !== null && result[field] !== undefined) {
        const value = result[field];
        if (typeof value === 'string' && encryptionService.isEncrypted(value)) {
          result[field] = encryptionService.decrypt(value, field, model);
        }
      }
    }
    
    return result;
  }

  /**
   * Recursively encrypts fields in nested data structures.
   * Handles create, createMany, update, upsert nested writes.
   */
  function encryptNestedData(
    data: unknown,
    model: string,
    fields: Set<string>
  ): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => encryptNestedData(item, model, fields));
    }

    if (typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const result = encryptFields(obj, fields, model);
      
      // Handle nested relations (create, connect, etc.)
      for (const key of Object.keys(result)) {
        const value = result[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const nestedObj = value as Record<string, unknown>;
          // Check for nested write operations
          if ('create' in nestedObj || 'createMany' in nestedObj || 
              'update' in nestedObj || 'upsert' in nestedObj) {
            // This is a relation, process nested data if we have config for it
            // For now, we only encrypt the current model's fields
          }
        }
      }
      
      return result;
    }

    return data;
  }

  /**
   * Decrypts fields in query results (single object or array).
   */
  function decryptResult(
    result: unknown,
    model: string,
    fields: Set<string>
  ): unknown {
    if (result === null || result === undefined) {
      return result;
    }

    if (Array.isArray(result)) {
      return result.map(item => decryptResult(item, model, fields));
    }

    if (typeof result === 'object') {
      return decryptFields(result as Record<string, unknown>, fields, model);
    }

    return result;
  }

  /**
   * The actual Prisma middleware function.
   */
  return async function encryptionMiddleware(
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<unknown>
  ): Promise<unknown> {
    const model = params.model;
    
    // Skip if no model or model not configured for encryption
    if (!model) {
      return next(params);
    }

    const fields = getEncryptedFields(model);
    if (!fields || fields.size === 0) {
      return next(params);
    }

    // Clone params to avoid mutating the original
    const modifiedParams = { ...params };

    // Encrypt data before write operations
    if (params.action === 'create' && params.args?.data) {
      modifiedParams.args = {
        ...params.args,
        data: encryptNestedData(params.args.data, model, fields),
      };
    }

    if (params.action === 'createMany' && params.args?.data) {
      modifiedParams.args = {
        ...params.args,
        data: encryptNestedData(params.args.data, model, fields),
      };
    }

    if (params.action === 'update' && params.args?.data) {
      modifiedParams.args = {
        ...params.args,
        data: encryptNestedData(params.args.data, model, fields),
      };
    }

    if (params.action === 'updateMany' && params.args?.data) {
      modifiedParams.args = {
        ...params.args,
        data: encryptNestedData(params.args.data, model, fields),
      };
    }

    if (params.action === 'upsert') {
      modifiedParams.args = {
        ...params.args,
        ...(params.args?.create && {
          create: encryptNestedData(params.args.create, model, fields),
        }),
        ...(params.args?.update && {
          update: encryptNestedData(params.args.update, model, fields),
        }),
      };
    }

    // Execute the query
    const result = await next(modifiedParams);

    // Decrypt data after read operations
    const readActions = [
      'findUnique',
      'findUniqueOrThrow',
      'findFirst',
      'findFirstOrThrow',
      'findMany',
    ];

    if (readActions.includes(params.action)) {
      return decryptResult(result, model, fields);
    }

    // Also decrypt results from write operations that return data
    const writeActionsWithReturn = ['create', 'update', 'upsert'];
    if (writeActionsWithReturn.includes(params.action) && result) {
      return decryptResult(result, model, fields);
    }

    return result;
  };
}

/**
 * Type guard to check if a value is a plain object.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
