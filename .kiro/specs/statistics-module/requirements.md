# Requirements Document

## Introduction

El módulo de estadísticas proporciona un panel de control integral para visualizar KPIs financieros, reportes consolidados (Balance General, Estado de Resultados, Balanza de Comprobación) y predicciones basadas en IA para proyectar tendencias de ingresos, costos y gastos. Este módulo permite a los usuarios del bufete IURIS CONSULTUS S.A analizar la salud financiera de la empresa y tomar decisiones informadas basadas en datos históricos y proyecciones futuras.

## Glossary

- **Statistics_Module**: Componente Angular que presenta el panel de estadísticas financieras en la ruta `/estadisticas`
- **KPI_Card**: Tarjeta visual que muestra un indicador clave de rendimiento con su valor y tendencia
- **Date_Range_Filter**: Control de filtro que permite seleccionar fecha de inicio y fecha de fin para el período de análisis
- **Prediction_Engine**: Servicio backend que calcula proyecciones financieras usando algoritmos de regresión lineal y promedios móviles
- **Confidence_Indicator**: Métrica que indica el nivel de confiabilidad de una predicción (0-100%)
- **Historical_Data**: Datos de asientos contables contabilizados usados como base para cálculos y predicciones
- **Projection_Period**: Horizonte temporal para las predicciones (3, 6 o 12 meses)
- **Trial_Balance**: Balanza de comprobación que muestra saldos deudores y acreedores de todas las cuentas
- **Balance_Sheet**: Balance General que muestra activos, pasivos y patrimonio
- **Income_Statement**: Estado de Resultados que muestra ingresos, costos, gastos y utilidad neta

## Requirements

### Requirement 1

**User Story:** As a contador, I want to filter statistics by a custom date range, so that I can analyze financial data for specific periods.

#### Acceptance Criteria

1. WHEN the user accesses the statistics page THEN the Statistics_Module SHALL display a Date_Range_Filter with start date and end date inputs
2. WHEN the user selects a date range and clicks generate THEN the Statistics_Module SHALL fetch and display statistics for the selected period
3. WHEN the user selects an invalid date range (start date after end date) THEN the Statistics_Module SHALL display a validation error message and prevent report generation
4. WHEN the page loads THEN the Statistics_Module SHALL initialize the date range to the current month by default

### Requirement 2

**User Story:** As a administrador, I want to see key financial KPIs at a glance, so that I can quickly assess the company's financial health.

#### Acceptance Criteria

1. WHEN statistics are generated THEN the Statistics_Module SHALL display a KPI_Card for total assets showing the sum of all asset account balances
2. WHEN statistics are generated THEN the Statistics_Module SHALL display a KPI_Card for total liabilities showing the sum of all liability account balances
3. WHEN statistics are generated THEN the Statistics_Module SHALL display a KPI_Card for net equity calculated as total assets minus total liabilities
4. WHEN statistics are generated THEN the Statistics_Module SHALL display a KPI_Card for period revenue showing total income for the selected period
5. WHEN statistics are generated THEN the Statistics_Module SHALL display a KPI_Card for period expenses showing total costs and expenses for the selected period
6. WHEN statistics are generated THEN the Statistics_Module SHALL display a KPI_Card for net profit/loss calculated as revenue minus expenses

### Requirement 3

**User Story:** As a contador, I want to see a Balance Sheet summary, so that I can understand the company's financial position.

#### Acceptance Criteria

1. WHEN statistics are generated THEN the Statistics_Module SHALL display a Balance_Sheet section with hierarchical structure of assets, liabilities, and equity
2. WHEN displaying the Balance_Sheet THEN the Statistics_Module SHALL show subtotals for each major category (current assets, fixed assets, current liabilities, long-term liabilities, capital)
3. WHEN displaying the Balance_Sheet THEN the Statistics_Module SHALL verify the accounting equation (Assets = Liabilities + Equity) and indicate balance status

### Requirement 4

**User Story:** As a contador, I want to see an Income Statement summary, so that I can analyze profitability for the period.

#### Acceptance Criteria

1. WHEN statistics are generated THEN the Statistics_Module SHALL display an Income_Statement section showing revenue, costs, and operating expenses
2. WHEN displaying the Income_Statement THEN the Statistics_Module SHALL calculate and display gross profit (revenue minus costs)
3. WHEN displaying the Income_Statement THEN the Statistics_Module SHALL calculate and display net income (gross profit minus operating expenses)

### Requirement 5

**User Story:** As a contador, I want to see a Trial Balance summary, so that I can verify that debits equal credits.

#### Acceptance Criteria

1. WHEN statistics are generated THEN the Statistics_Module SHALL display a Trial_Balance section with a table of all accounts
2. WHEN displaying the Trial_Balance THEN the Statistics_Module SHALL show debit and credit columns with their respective totals
3. WHEN displaying the Trial_Balance THEN the Statistics_Module SHALL indicate whether the trial balance is balanced (total debits equal total credits)

### Requirement 6

**User Story:** As a administrador, I want AI-powered financial predictions, so that I can plan for future financial scenarios.

#### Acceptance Criteria

1. WHEN statistics are generated THEN the Prediction_Engine SHALL calculate revenue projections for 3, 6, and 12 month horizons using linear regression on Historical_Data
2. WHEN statistics are generated THEN the Prediction_Engine SHALL calculate cost and expense projections analyzing seasonal patterns in Historical_Data
3. WHEN displaying predictions THEN the Statistics_Module SHALL show a Confidence_Indicator for each projection based on data variance and sample size
4. WHEN displaying predictions THEN the Statistics_Module SHALL render line charts comparing historical data versus projected values
5. WHEN insufficient Historical_Data exists (less than 3 months) THEN the Prediction_Engine SHALL return a message indicating insufficient data for reliable predictions

### Requirement 7

**User Story:** As a administrador, I want visual charts for financial data, so that I can easily understand trends and distributions.

#### Acceptance Criteria

1. WHEN statistics are generated THEN the Statistics_Module SHALL display a bar chart comparing monthly income versus expenses
2. WHEN statistics are generated THEN the Statistics_Module SHALL display a pie chart showing expense distribution by category
3. WHEN statistics are generated THEN the Statistics_Module SHALL display an area chart showing equity evolution over time
4. WHEN chart data is empty THEN the Statistics_Module SHALL display a placeholder message indicating no data available for visualization

### Requirement 8

**User Story:** As a usuario, I want the statistics page to be responsive and consistent with the application design, so that I have a seamless user experience.

#### Acceptance Criteria

1. WHEN the Statistics_Module renders THEN the layout SHALL follow the existing design system (colors, typography, spacing, card styles)
2. WHEN viewed on mobile devices THEN the Statistics_Module SHALL adapt the layout to stack components vertically
3. WHEN data is loading THEN the Statistics_Module SHALL display skeleton loaders consistent with other report components
4. WHEN an error occurs THEN the Statistics_Module SHALL display an error state with retry option following existing error patterns

### Requirement 9

**User Story:** As a desarrollador, I want backend endpoints for statistics data, so that the frontend can retrieve aggregated financial data and predictions.

#### Acceptance Criteria

1. WHEN the frontend requests statistics THEN the backend SHALL provide an endpoint that returns aggregated KPI data for the specified date range
2. WHEN the frontend requests predictions THEN the backend SHALL provide an endpoint that returns projected values with confidence indicators
3. WHEN serializing statistics data THEN the backend SHALL encode responses using JSON format
4. WHEN deserializing statistics requests THEN the backend SHALL parse JSON request bodies and validate date parameters
