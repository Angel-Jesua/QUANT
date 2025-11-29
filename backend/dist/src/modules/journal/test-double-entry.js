"use strict";
/**
 * Script de Prueba Manual para Validación de Partida Doble
 *
 * Este script demuestra la funcionalidad del módulo de Journal Entry
 * con la validación de partida doble.
 *
 * Ejecutar con: npx ts-node src/modules/journal/test-double-entry.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const journal_service_1 = require("./journal.service");
console.log('='.repeat(60));
console.log('PRUEBAS DE VALIDACIÓN DE PARTIDA DOBLE');
console.log('='.repeat(60));
// Test 1: Asiento Cuadrado (DEBE PASAR)
console.log('\n📗 TEST 1: Asiento Cuadrado - Debe PASAR');
console.log('-'.repeat(40));
const balancedLines = [
    { accountId: 1, description: 'Equipo de oficina', debitAmount: 5000, creditAmount: 0 },
    { accountId: 2, description: 'Banco Nacional', debitAmount: 0, creditAmount: 5000 },
];
const result1 = (0, journal_service_1.validateDoubleEntry)(balancedLines);
console.log(`Total Debe:  ${result1.totalDebit.toFixed(2)}`);
console.log(`Total Haber: ${result1.totalCredit.toFixed(2)}`);
console.log(`Diferencia:  ${result1.difference.toFixed(2)}`);
console.log(`Resultado:   ${result1.isBalanced ? '✅ CUADRADO' : '❌ DESCUADRADO'}`);
if (result1.errorMessage)
    console.log(`Error: ${result1.errorMessage}`);
// Test 2: Asiento Descuadrado (DEBE FALLAR)
console.log('\n📕 TEST 2: Asiento Descuadrado - Debe FALLAR');
console.log('-'.repeat(40));
const unbalancedLines = [
    { accountId: 1, debitAmount: 6000, creditAmount: 0 },
    { accountId: 2, debitAmount: 0, creditAmount: 5000 },
];
const result2 = (0, journal_service_1.validateDoubleEntry)(unbalancedLines);
console.log(`Total Debe:  ${result2.totalDebit.toFixed(2)}`);
console.log(`Total Haber: ${result2.totalCredit.toFixed(2)}`);
console.log(`Diferencia:  ${result2.difference.toFixed(2)}`);
console.log(`Resultado:   ${result2.isBalanced ? '✅ CUADRADO' : '❌ DESCUADRADO'}`);
if (result2.errorMessage)
    console.log(`Error: ${result2.errorMessage}`);
// Test 3: Monto Cero (DEBE FALLAR)
console.log('\n📕 TEST 3: Monto Cero - Debe FALLAR');
console.log('-'.repeat(40));
const zeroLines = [
    { accountId: 1, debitAmount: 0, creditAmount: 0 },
    { accountId: 2, debitAmount: 0, creditAmount: 0 },
];
const result3 = (0, journal_service_1.validateDoubleEntry)(zeroLines);
console.log(`Total Debe:  ${result3.totalDebit.toFixed(2)}`);
console.log(`Total Haber: ${result3.totalCredit.toFixed(2)}`);
console.log(`Resultado:   ${result3.isBalanced ? '✅ CUADRADO' : '❌ DESCUADRADO'}`);
if (result3.errorMessage)
    console.log(`Error: ${result3.errorMessage}`);
// Test 4: Asiento con Múltiples Líneas (DEBE PASAR)
console.log('\n📗 TEST 4: Asiento con Múltiples Líneas - Debe PASAR');
console.log('-'.repeat(40));
const multiLines = [
    { accountId: 1, description: 'Salarios', debitAmount: 25000.00, creditAmount: 0 },
    { accountId: 2, description: 'INSS Patronal', debitAmount: 5500.00, creditAmount: 0 },
    { accountId: 3, description: 'INATEC', debitAmount: 500.00, creditAmount: 0 },
    { accountId: 4, description: 'Banco - Pago nómina', debitAmount: 0, creditAmount: 22000.00 },
    { accountId: 5, description: 'INSS por pagar', debitAmount: 0, creditAmount: 8500.00 },
    { accountId: 6, description: 'INATEC por pagar', debitAmount: 0, creditAmount: 500.00 },
];
const result4 = (0, journal_service_1.validateDoubleEntry)(multiLines);
console.log(`Total Debe:  ${result4.totalDebit.toFixed(2)}`);
console.log(`Total Haber: ${result4.totalCredit.toFixed(2)}`);
console.log(`Diferencia:  ${result4.difference.toFixed(2)}`);
console.log(`Resultado:   ${result4.isBalanced ? '✅ CUADRADO' : '❌ DESCUADRADO'}`);
if (result4.errorMessage)
    console.log(`Error: ${result4.errorMessage}`);
// Test 5: Asiento con Decimales Precisos (DEBE PASAR)
console.log('\n📗 TEST 5: Asiento con Decimales - Debe PASAR');
console.log('-'.repeat(40));
const decimalLines = [
    { accountId: 1, debitAmount: '1234.56', creditAmount: 0 },
    { accountId: 2, debitAmount: 0, creditAmount: '1234.56' },
];
const result5 = (0, journal_service_1.validateDoubleEntry)(decimalLines);
console.log(`Total Debe:  ${result5.totalDebit.toFixed(2)}`);
console.log(`Total Haber: ${result5.totalCredit.toFixed(2)}`);
console.log(`Diferencia:  ${result5.difference.toFixed(2)}`);
console.log(`Resultado:   ${result5.isBalanced ? '✅ CUADRADO' : '❌ DESCUADRADO'}`);
// Test 6: Diferencia de Centavo (DEBE FALLAR)
console.log('\n📕 TEST 6: Diferencia de un Centavo - Debe FALLAR');
console.log('-'.repeat(40));
const pennyDiffLines = [
    { accountId: 1, debitAmount: '100.01', creditAmount: 0 },
    { accountId: 2, debitAmount: 0, creditAmount: '100.00' },
];
const result6 = (0, journal_service_1.validateDoubleEntry)(pennyDiffLines);
console.log(`Total Debe:  ${result6.totalDebit.toFixed(2)}`);
console.log(`Total Haber: ${result6.totalCredit.toFixed(2)}`);
console.log(`Diferencia:  ${result6.difference.toFixed(2)}`);
console.log(`Resultado:   ${result6.isBalanced ? '✅ CUADRADO' : '❌ DESCUADRADO'}`);
if (result6.errorMessage)
    console.log(`Error: ${result6.errorMessage}`);
// Resumen
console.log('\n' + '='.repeat(60));
console.log('RESUMEN DE PRUEBAS');
console.log('='.repeat(60));
const tests = [
    { name: 'Asiento Cuadrado', expected: true, actual: result1.isBalanced },
    { name: 'Asiento Descuadrado', expected: false, actual: result2.isBalanced },
    { name: 'Monto Cero', expected: false, actual: result3.isBalanced },
    { name: 'Múltiples Líneas', expected: true, actual: result4.isBalanced },
    { name: 'Decimales Precisos', expected: true, actual: result5.isBalanced },
    { name: 'Diferencia Centavo', expected: false, actual: result6.isBalanced },
];
let passed = 0;
let failed = 0;
for (const test of tests) {
    const success = test.expected === test.actual;
    if (success)
        passed++;
    else
        failed++;
    console.log(`${success ? '✅' : '❌'} ${test.name}: ${success ? 'CORRECTO' : 'FALLIDO'}`);
}
console.log('\n' + '-'.repeat(40));
console.log(`Pasadas: ${passed}/${tests.length}`);
console.log(`Fallidas: ${failed}/${tests.length}`);
console.log('='.repeat(60));
process.exit(failed > 0 ? 1 : 0);
