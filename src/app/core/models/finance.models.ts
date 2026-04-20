// ============================================================
// Kenya Finance Tracker – Core Domain Models
// ============================================================

export type IncomeSource =
  | 'Salary'
  | 'Side Hustle - Freelance'
  | 'Side Hustle - Business'
  | 'Bonus'
  | 'Other';

export type ExpenseCategory =
  | 'Rent'
  | 'Car'
  | 'Shopping'
  | 'Utilities'
  | 'Church / Donations'
  | 'Family Support'
  | 'Entertainment'
  | 'Miscellaneous';

export type ObligationType = 'Loan' | 'SACCO';
export type AlertSeverity  = 'info' | 'warning' | 'critical';
export type InsightType    = 'positive' | 'warning' | 'suggestion';
export type AlertType      =
  | 'spending_spike' | 'low_savings_rate' | 'high_debt_ratio'
  | 'category_overspend' | 'category_drift' | 'low_cashflow';

// ── Income ─────────────────────────────────────────────────
export interface Income {
  id: number;
  date: string;          // ISO date
  source: IncomeSource;
  description?: string;
  amount: number;
}

export interface IncomeCreate {
  date: string;
  source: IncomeSource;
  description?: string;
  amount: number;
}

// ── Expenses ───────────────────────────────────────────────
export interface Expense {
  id: number;
  date: string;
  category: ExpenseCategory;
  subcategory?: string;
  description?: string;
  amount: number;
  is_essential: boolean;
}

export interface ExpenseCreate {
  date: string;
  category: ExpenseCategory;
  subcategory?: string;
  description?: string;
  amount: number;
  is_essential?: boolean;
}

// ── Obligations ────────────────────────────────────────────
export interface Obligation {
  id: number;
  obligation_type: ObligationType;
  name: string;
  monthly_amount: number;
  annual_rate?: number;
  remaining_balance?: number;
  total_contributed?: number;
  annual_dividend_rate?: number;
}

// ── Budget ─────────────────────────────────────────────────
export interface BudgetItem {
  category: ExpenseCategory;
  monthly_limit: number;
  alert_threshold: number;  // 0-1, e.g. 0.80 = alert at 80%
}

export interface Budget {
  id: number;
  month: string;           // 'YYYY-MM'
  items: BudgetItem[];
  created_at: string;
}

// ── Dashboard / Analytics ──────────────────────────────────
export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  budget?: number;
  over_budget?: boolean;
  month_over_month?: number;
  is_drifting?: boolean;
}

export interface AmortizationRow {
  month: string;
  opening_balance: number;
  payment: number;
  interest: number;
  principal: number;
  closing_balance: number;
}

export interface SaccoGrowthPoint {
  month: string;
  balance: number;
  contributions: number;
  growth?: number;
}

export interface ForecastPoint {
  period: string;
  predicted_income: number;
  predicted_expenses: number;
  predicted_savings: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
}

export interface Alert {
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  value?: number;
  threshold?: number;
  category?: string;
}

export interface Insight {
  title: string;
  body: string;
  insight_type: InsightType;
  metric?: string;
  value?: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  savings_rate: number;
  stress_score: number;
}

export interface CashflowPoint {
  day: string;
  label: string;
  amount: number;
  type: 'in' | 'out';
  running: number;
}

export interface Dashboard {
  period: string;
  total_income: number;
  total_expenses: number;
  loan_payment: number;
  sacco_contribution: number;
  net_savings: number;
  savings_rate: number;
  debt_to_income: number;
  true_available_money: number;
  essential_spend: number;
  non_essential_spend: number;
  financial_stress_score: number;
  category_breakdown: CategoryBreakdown[];
  loan_amortization: AmortizationRow[];
  sacco_growth: SaccoGrowthPoint[];
  alerts: Alert[];
  insights: Insight[];
  monthly_trend: MonthlyTrend[];
  cashflow_timing: CashflowPoint[];
  forecast: ForecastPoint[];
}

// ── Multi-period Comparison ────────────────────────────────
export interface PeriodComparison {
  periods: string[];
  income: number[];
  expenses: number[];
  savings_rate: number[];
  category_delta: Record<string, number[]>;
  stress_scores: number[];
}

// ── Reports ────────────────────────────────────────────────
export type ReportType   = 'monthly' | 'quarterly' | 'yearly';
export type ExportFormat = 'pdf' | 'excel';

export interface ReportRequest {
  report_type: ReportType;
  period: string;      // 'YYYY-MM' | 'YYYY-QN' | 'YYYY'
  format: ExportFormat;
  include_charts: boolean;
  include_recommendations: boolean;
}

export interface ReportSummary {
  id: string;
  period: string;
  report_type: ReportType;
  generated_at: string;
  download_url: string;
}

// ── Settings / Profile ─────────────────────────────────────
export interface UserProfile {
  id: number;
  name: string;
  email?: string;
  currency: 'KES';
  salary_day: number;       // day of month salary arrives
  fiscal_month_start: number;
  savings_target_pct: number;
  emergency_fund_months: number;
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
}

// ── AI Layer ───────────────────────────────────────────────
export type AiIntent =
  | 'spending_query'
  | 'savings_advice'
  | 'loan_query'
  | 'forecast_query'
  | 'budget_advice'
  | 'comparison_query'
  | 'general';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: AiIntent;
  context_snapshot?: Partial<Dashboard>;
}

export interface AiQueryRequest {
  query: string;
  conversation_history: AiMessage[];
  context: AiFinancialContext;
}

export interface AiFinancialContext {
  current_period: string;
  total_income: number;
  total_expenses: number;
  savings_rate: number;
  debt_to_income: number;
  financial_stress_score: number;
  top_expense_categories: CategoryBreakdown[];
  active_alerts: Alert[];
  loan_remaining?: number;
  sacco_balance?: number;
  months_of_data: number;
}

export interface AiQueryResponse {
  answer: string;
  intent: AiIntent;
  relevant_metrics: Record<string, number | string>;
  suggested_follow_ups: string[];
  confidence: number;
  data_used: string[];
}

export interface AiIntentClassification {
  intent: AiIntent;
  confidence: number;
  entities: Record<string, string>;
  suggested_api_calls: string[];
}

// ── Pagination ─────────────────────────────────────────────
export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface FilterParams {
  page?: number;
  size?: number;
  category?: string;
  month?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
