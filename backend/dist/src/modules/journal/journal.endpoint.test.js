"use strict";
/**
 * Journal Entry Endpoint Integration Tests
 * Tests for the createTransaction endpoint with double-entry validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testScenarios = void 0;
exports.printAllTestScenarios = printAllTestScenarios;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Test data setup
const TEST_USER_ID = 1; // Assumes a user exists
const TEST_CURRENCY_ID = 1; // Assumes USD or base currency exists
const TEST_ACCOUNT_DEBIT_ID = 1; // Assumes accounts exist
const TEST_ACCOUNT_CREDIT_ID = 2;
/**
 * Manual test scenarios for createTransaction endpoint
 * Run these with curl or Postman against a running server
 */
const testScenarios = {
    /**
     * TEST 1: Balanced entry - SHOULD PASS (201)
     *
     * curl -X POST http://localhost:3000/api/journal \
     *   -H "Content-Type: application/json" \
     *   -H "Authorization: Bearer YOUR_TOKEN" \
     *   -d '{
     *     "entryDate": "2025-11-25",
     *     "description": "Compra de equipo de oficina",
     *     "currencyId": 1,
     *     "exchangeRate": 1.00,
     *     "voucherNumber": "COMP-001",
     *     "lines": [
     *       { "accountId": 1, "description": "Equipo de oficina", "debitAmount": 5000.00, "creditAmount": 0 },
     *       { "accountId": 2, "description": "Banco Nacional", "debitAmount": 0, "creditAmount": 5000.00 }
     *     ]
     *   }'
     */
    balancedEntry: {
        entryDate: '2025-11-25',
        description: 'Compra de equipo de oficina',
        currencyId: 1,
        exchangeRate: 1.00,
        voucherNumber: 'COMP-001',
        lines: [
            { accountId: 1, description: 'Equipo de oficina', debitAmount: 5000.00, creditAmount: 0 },
            { accountId: 2, description: 'Banco Nacional', debitAmount: 0, creditAmount: 5000.00 },
        ],
        expectedStatus: 201,
        shouldPass: true,
    },
    /**
     * TEST 2: Unbalanced entry (debits > credits) - SHOULD FAIL (400)
     *
     * curl -X POST http://localhost:3000/api/journal \
     *   -H "Content-Type: application/json" \
     *   -H "Authorization: Bearer YOUR_TOKEN" \
     *   -d '{
     *     "entryDate": "2025-11-25",
     *     "description": "Asiento descuadrado - debe fallar",
     *     "currencyId": 1,
     *     "lines": [
     *       { "accountId": 1, "debitAmount": 6000.00, "creditAmount": 0 },
     *       { "accountId": 2, "debitAmount": 0, "creditAmount": 5000.00 }
     *     ]
     *   }'
     *
     * Expected response: { "error": "El asiento no cuadra..." }
     */
    unbalancedEntry: {
        entryDate: '2025-11-25',
        description: 'Asiento descuadrado - debe fallar',
        currencyId: 1,
        lines: [
            { accountId: 1, debitAmount: 6000.00, creditAmount: 0 },
            { accountId: 2, debitAmount: 0, creditAmount: 5000.00 },
        ],
        expectedStatus: 400,
        expectedError: 'El asiento no cuadra',
        shouldPass: false,
    },
    /**
     * TEST 3: Zero amount entry - SHOULD FAIL (400)
     *
     * curl -X POST http://localhost:3000/api/journal \
     *   -H "Content-Type: application/json" \
     *   -H "Authorization: Bearer YOUR_TOKEN" \
     *   -d '{
     *     "entryDate": "2025-11-25",
     *     "description": "Asiento con monto cero - debe fallar",
     *     "currencyId": 1,
     *     "lines": [
     *       { "accountId": 1, "debitAmount": 0, "creditAmount": 0 },
     *       { "accountId": 2, "debitAmount": 0, "creditAmount": 0 }
     *     ]
     *   }'
     *
     * Expected response: { "error": "El monto total del asiento debe ser mayor a cero" }
     */
    zeroAmountEntry: {
        entryDate: '2025-11-25',
        description: 'Asiento con monto cero - debe fallar',
        currencyId: 1,
        lines: [
            { accountId: 1, debitAmount: 0, creditAmount: 0 },
            { accountId: 2, debitAmount: 0, creditAmount: 0 },
        ],
        expectedStatus: 400,
        expectedError: 'mayor a cero',
        shouldPass: false,
    },
    /**
     * TEST 4: Multiple lines balanced - SHOULD PASS (201)
     *
     * curl -X POST http://localhost:3000/api/journal \
     *   -H "Content-Type: application/json" \
     *   -H "Authorization: Bearer YOUR_TOKEN" \
     *   -d '{
     *     "entryDate": "2025-11-25",
     *     "description": "Registro de nómina",
     *     "currencyId": 1,
     *     "lines": [
     *       { "accountId": 1, "description": "Salarios", "debitAmount": 25000.00, "creditAmount": 0 },
     *       { "accountId": 2, "description": "INSS Patronal", "debitAmount": 5500.00, "creditAmount": 0 },
     *       { "accountId": 3, "description": "INATEC", "debitAmount": 500.00, "creditAmount": 0 },
     *       { "accountId": 4, "description": "Banco - Pago nómina", "debitAmount": 0, "creditAmount": 22000.00 },
     *       { "accountId": 5, "description": "INSS por pagar", "debitAmount": 0, "creditAmount": 8500.00 },
     *       { "accountId": 6, "description": "INATEC por pagar", "debitAmount": 0, "creditAmount": 500.00 }
     *     ]
     *   }'
     */
    multiLineBalanced: {
        entryDate: '2025-11-25',
        description: 'Registro de nómina',
        currencyId: 1,
        lines: [
            { accountId: 1, description: 'Salarios', debitAmount: 25000.00, creditAmount: 0 },
            { accountId: 2, description: 'INSS Patronal', debitAmount: 5500.00, creditAmount: 0 },
            { accountId: 3, description: 'INATEC', debitAmount: 500.00, creditAmount: 0 },
            { accountId: 4, description: 'Banco - Pago nómina', debitAmount: 0, creditAmount: 22000.00 },
            { accountId: 5, description: 'INSS por pagar', debitAmount: 0, creditAmount: 8500.00 },
            { accountId: 6, description: 'INATEC por pagar', debitAmount: 0, creditAmount: 500.00 },
        ],
        expectedStatus: 201,
        shouldPass: true,
    },
    /**
     * TEST 5: Missing required fields - SHOULD FAIL (400)
     */
    missingFields: {
        description: 'Asiento sin fecha',
        currencyId: 1,
        lines: [
            { accountId: 1, debitAmount: 100, creditAmount: 0 },
            { accountId: 2, debitAmount: 0, creditAmount: 100 },
        ],
        expectedStatus: 400,
        expectedError: 'fecha del asiento es requerida',
        shouldPass: false,
    },
    /**
     * TEST 6: Less than 2 lines - SHOULD FAIL (400)
     */
    singleLine: {
        entryDate: '2025-11-25',
        description: 'Asiento con una sola línea',
        currencyId: 1,
        lines: [
            { accountId: 1, debitAmount: 1000, creditAmount: 0 },
        ],
        expectedStatus: 400,
        expectedError: 'al menos 2 líneas',
        shouldPass: false,
    },
    /**
     * TEST 7: Multi-currency entry - SHOULD PASS (201)
     * Stores original currency with exchange rate
     */
    multiCurrencyEntry: {
        entryDate: '2025-11-25',
        description: 'Compra en dólares (multimoneda)',
        currencyId: 2, // USD
        exchangeRate: 36.75, // Rate to base currency (NIO)
        voucherNumber: 'USD-001',
        lines: [
            { accountId: 1, description: 'Equipo importado', debitAmount: 1000.00, creditAmount: 0 },
            { accountId: 2, description: 'Cuentas por pagar USD', debitAmount: 0, creditAmount: 1000.00 },
        ],
        expectedStatus: 201,
        shouldPass: true,
        note: 'Amount stored in original currency (USD). Exchange rate for conversion to base.',
    },
};
exports.testScenarios = testScenarios;
/**
 * Helper function to print test scenario as curl command
 */
function printTestAsCurl(name, scenario, token = 'YOUR_TOKEN') {
    console.log(`\n=== ${name} ===`);
    console.log(`Expected: ${scenario.shouldPass ? 'PASS (201)' : 'FAIL (400)'}`);
    if (scenario.expectedError) {
        console.log(`Expected error: "${scenario.expectedError}"`);
    }
    console.log('\nCommand:');
    console.log(`curl -X POST http://localhost:3000/api/journal \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '${JSON.stringify(scenario, ['entryDate', 'description', 'currencyId', 'exchangeRate', 'voucherNumber', 'lines', 'accountId', 'debitAmount', 'creditAmount'], 2)}'`);
}
// Print all test scenarios
function printAllTestScenarios(token) {
    console.log('\n========================================');
    console.log('JOURNAL ENTRY ENDPOINT TEST SCENARIOS');
    console.log('========================================\n');
    for (const [name, scenario] of Object.entries(testScenarios)) {
        printTestAsCurl(name, scenario, token);
        console.log('\n---');
    }
}
