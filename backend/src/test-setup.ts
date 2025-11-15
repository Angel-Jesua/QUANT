// Test setup file for Jest
// This file is executed once before all test files

import { expect } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test timeout
// Note: jest.setTimeout is not available here, will be set in individual test files if needed

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore specific console methods during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Helper function to validate user object
function isValidUser(received: any): boolean {
  const allowedStatuses = new Set(['custom', 'default', 'none']);
  return received &&
    typeof received.id === 'number' &&
    typeof received.username === 'string' &&
    typeof received.email === 'string' &&
    typeof received.fullName === 'string' &&
    typeof received.role === 'string' &&
    typeof received.isActive === 'boolean' &&
    received.createdAt instanceof Date &&
    received.updatedAt instanceof Date &&
    typeof received.avatarType === 'string' &&
    (received.lastLogin === null || received.lastLogin instanceof Date) &&
    (received.profileImageUrl === null || typeof received.profileImageUrl === 'string' || typeof received.profileImageUrl === 'undefined') &&
    allowedStatuses.has(received.profileImageStatus);
}

// Custom matchers
expect.extend({
  toBeValidUser(received: any) {
    const pass = isValidUser(received);

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid user`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid user`,
        pass: false,
      };
    }
  },

  toBeValidRegistrationResponse(received: any) {
    const pass = received &&
      typeof received.success === 'boolean' &&
      typeof received.message === 'string' &&
      (received.success ?
        (received.user && isValidUser(received.user)) :
        (received.errors && typeof received.errors === 'object')
      );

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid registration response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid registration response`,
        pass: false,
      };
    }
  },
});

// Extend Jest matchers interface
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUser(): R;
      toBeValidRegistrationResponse(): R;
    }
  }
}