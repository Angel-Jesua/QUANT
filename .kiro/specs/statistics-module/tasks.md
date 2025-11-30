# Implementation Plan

## 1. Backend: Statistics Types and Interfaces

- [x] 1.1 Create statistics types file with all interfaces
  - Create `backend/src/modules/report/statistics.types.ts`
  - Define `IStatisticsQuery`, `IStatisticsResponse`, `IStatisticsKPIs`
  - Define `IPredictionQuery`, `IPredictionResponse`, `IProjectionSet`
  - Define `IChartDataSets`, `IMonthlyDataPoint`, `IProjectedValue`
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

## 2. Backend: Prediction Engine

- [x] 2.1 Implement PredictionEngine class
  - Create `backend/src/modules/report/services/prediction-engine.service.ts`
  - Implement `calculateLinearRegression()` method using least squares
  - Implement `calculateMovingAverage()` method with configurable window
  - Implement `projectValues()` method for 3, 6, 12 month projections
  - Implement `calculateConfidence()` based on R² and sample size
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2.2 Write property test for linear regression monotonicity
  - **Property 13: Linear Regression Projection Monotonicity**
  - **Validates: Requirements 6.1**

- [x] 2.3 Write property test for confidence indicator bounds
  - **Property 10: Confidence Indicator Bounds**
  - **Validates: Requirements 6.3**

- [x] 2.4 Write property test for insufficient data detection
  - **Property 9: Insufficient Data Detection**
  - **Validates: Requirements 6.5**

## 3. Backend: Statistics Service

- [x] 3.1 Implement StatisticsService class
  - Create `backend/src/modules/report/services/statistics.service.ts`
  - Implement `getStatistics()` method aggregating KPIs from existing services
  - Implement `getPredictions()` method using PredictionEngine
  - Implement `aggregateKPIs()` private method
  - Implement `getChartData()` private method for chart datasets
  - _Requirements: 9.1, 9.2_

- [x] 3.2 Write property test for account balance aggregation
  - **Property 1: Account Balance Aggregation**
  - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

- [x] 3.3 Write property test for derived calculations
  - **Property 2: Net Equity Calculation**
  - **Property 3: Net Profit/Loss Calculation**
  - **Property 4: Gross Profit Calculation**
  - **Property 5: Net Income Calculation**
  - **Validates: Requirements 2.3, 2.6, 4.2, 4.3**

- [x] 3.4 Write property test for balance verifications
  - **Property 6: Accounting Equation Verification**
  - **Property 7: Trial Balance Verification**
  - **Validates: Requirements 3.3, 5.3**

- [x] 3.5 Write property test for expense distribution sum
  - **Property 11: Expense Distribution Sum**
  - **Validates: Requirements 7.2**

- [x] 3.6 Write property test for subtotal consistency
  - **Property 14: Subtotal Consistency**
  - **Validates: Requirements 3.2, 5.2**

## 4. Backend: API Routes and Controller

- [x] 4.1 Add statistics endpoints to report controller
  - Update `backend/src/modules/report/report.controller.ts`
  - Add `getStatistics()` handler for GET `/api/reports/statistics`
  - Add `getPredictions()` handler for GET `/api/reports/predictions`
  - Implement date validation and error handling
  - _Requirements: 9.1, 9.2_

- [x] 4.2 Add routes to report routes file
  - Update `backend/src/modules/report/report.routes.ts`
  - Add route for `/statistics` endpoint
  - Add route for `/predictions` endpoint
  - _Requirements: 9.1, 9.2_

- [x] 4.3 Write property test for date range validation
  - **Property 8: Date Range Validation**
  - **Validates: Requirements 1.3**

- [x] 4.4 Write property test for JSON round-trip
  - **Property 12: Statistics JSON Round-Trip**
  - **Validates: Requirements 9.3, 9.4**

- [x] 4.5 Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

## 5. Frontend: Statistics Service

- [x] 5.1 Create statistics service
  - Create `frontend/src/app/services/statistics.service.ts`
  - Define TypeScript interfaces matching backend types
  - Implement `getStatistics()` method
  - Implement `getPredictions()` method
  - _Requirements: 9.1, 9.2_

## 6. Frontend: Chart Components

- [x] 6.1 Create income vs expense bar chart component
  - Create `frontend/src/app/estadisticas/components/income-expense-bar-chart/`
  - Implement bar chart using Canvas API or Chart.js pattern from existing components
  - Support monthly comparison data
  - _Requirements: 7.1_

- [x] 6.2 Create expense distribution pie chart component
  - Create `frontend/src/app/estadisticas/components/expense-pie-chart/`
  - Implement pie/donut chart for category distribution
  - Show percentages and labels
  - _Requirements: 7.2_

- [x] 6.3 Create equity evolution area chart component
  - Create `frontend/src/app/estadisticas/components/equity-area-chart/`
  - Implement area chart for time series data
  - Support equity evolution visualization
  - _Requirements: 7.3_

- [x] 6.4 Create prediction line chart component
  - Create `frontend/src/app/estadisticas/components/prediction-line-chart/`
  - Implement line chart with historical vs projected data
  - Show confidence bands (upper/lower bounds)
  - _Requirements: 6.4_

## 7. Frontend: Statistics Component

- [x] 7.1 Create statistics component structure
  - Create `frontend/src/app/estadisticas/estadisticas.component.ts`
  - Create `frontend/src/app/estadisticas/estadisticas.component.html`
  - Create `frontend/src/app/estadisticas/estadisticas.component.scss`
  - Set up component with signals for state management
  - Import SidebarComponent and chart components
  - _Requirements: 8.1_

- [x] 7.2 Implement date range filter section
  - Add filter card with start date and end date inputs
  - Implement date validation (start <= end)
  - Add generate and reset buttons
  - Initialize to current month by default
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 7.3 Implement KPI cards section
  - Create KPI card grid layout
  - Display total assets, liabilities, net equity
  - Display period revenue, expenses, net profit/loss
  - Style cards consistent with existing design system
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 7.4 Implement Balance Sheet summary section
  - Create collapsible section for balance sheet
  - Display hierarchical structure of assets, liabilities, equity
  - Show subtotals and balance status indicator
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 7.5 Implement Income Statement summary section
  - Create collapsible section for income statement
  - Display revenue, costs, operating expenses
  - Show gross profit and net income calculations
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 7.6 Implement Trial Balance summary section
  - Create collapsible section for trial balance
  - Display accounts table with debit/credit columns
  - Show totals and balance status
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7.7 Implement predictions panel
  - Create section for AI predictions
  - Display projection tabs (3, 6, 12 months)
  - Show confidence indicators
  - Integrate prediction line chart
  - Handle insufficient data state
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7.8 Implement charts section
  - Integrate income vs expense bar chart
  - Integrate expense distribution pie chart
  - Integrate equity evolution area chart
  - Handle empty data states with placeholders
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7.9 Implement loading and error states
  - Add skeleton loaders for loading state
  - Add error card with retry button
  - Add empty state placeholders
  - _Requirements: 8.3, 8.4_

## 8. Frontend: Routing and Navigation

- [x] 8.1 Add statistics route
  - Update `frontend/src/app/app.routes.ts`
  - Add route for `/estadisticas` path
  - Apply auth guard
  - _Requirements: 1.1_

- [x] 8.2 Add navigation link in sidebar
  - Update `frontend/src/app/dashboard/components/sidebar/sidebar.component.ts`
  - Add "Estadísticas" menu item with chart icon
  - _Requirements: 1.1_

## 9. Frontend: Responsive Styling

- [x] 9.1 Implement responsive styles
  - Add media queries for tablet and mobile breakpoints
  - Stack components vertically on smaller screens
  - Adjust chart sizes for different viewports
  - _Requirements: 8.2_

- [x] 9.2 Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## 10. Final Integration

- [x] 10.1 Integration testing
  - Test full flow from filter to data display
  - Verify all charts render correctly
  - Test prediction calculations with real data
  - Verify responsive behavior
  - _Requirements: All_

- [x] 10.2 Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
