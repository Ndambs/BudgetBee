import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Income, IncomeCreate, Expense, ExpenseCreate,
  Obligation, Budget, BudgetItem, Dashboard,
  PeriodComparison, ReportRequest, ReportSummary,
  UserProfile, FilterParams, PagedResponse,
  AiQueryRequest, AiQueryResponse, AiIntentClassification, AiFinancialContext
} from '../models/finance.models';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  // ── Income ──────────────────────────────────────────────
  getIncome(filters?: FilterParams): Observable<PagedResponse<Income>> {
    return this.http.get<PagedResponse<Income>>(`${this.base}/income`, { params: this.toParams(filters) });
  }
  addIncome(payload: IncomeCreate): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(`${this.base}/income`, payload);
  }
  updateIncome(id: number, payload: Partial<IncomeCreate>): Observable<Income> {
    return this.http.put<Income>(`${this.base}/income/${id}`, payload);
  }
  deleteIncome(id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/income/${id}`);
  }

  // ── Expenses ────────────────────────────────────────────
  getExpenses(filters?: FilterParams): Observable<PagedResponse<Expense>> {
    return this.http.get<PagedResponse<Expense>>(`${this.base}/expenses`, { params: this.toParams(filters) });
  }
  addExpense(payload: ExpenseCreate): Observable<{ id: number; status: string }> {
    return this.http.post<{ id: number; status: string }>(`${this.base}/expenses`, payload);
  }
  updateExpense(id: number, payload: Partial<ExpenseCreate>): Observable<Expense> {
    return this.http.put<Expense>(`${this.base}/expenses/${id}`, payload);
  }
  deleteExpense(id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/expenses/${id}`);
  }
  bulkDeleteExpenses(ids: number[]): Observable<{ deleted: number }> {
    return this.http.post<{ deleted: number }>(`${this.base}/expenses/bulk-delete`, { ids });
  }

  // ── Obligations ─────────────────────────────────────────
  getObligations(): Observable<Obligation[]> {
    return this.http.get<Obligation[]>(`${this.base}/obligations`);
  }
  upsertObligation(payload: Partial<Obligation>): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.base}/obligations`, payload);
  }
  deleteObligation(id: number): Observable<{ status: string }> {
    return this.http.delete<{ status: string }>(`${this.base}/obligations/${id}`);
  }

  // ── Budget ──────────────────────────────────────────────
  getBudget(month?: string): Observable<Budget> {
    const params = month ? new HttpParams().set('month', month) : new HttpParams();
    return this.http.get<Budget>(`${this.base}/budget`, { params });
  }
  saveBudget(payload: { month: string; items: BudgetItem[] }): Observable<Budget> {
    return this.http.post<Budget>(`${this.base}/budget`, payload);
  }
  copyBudget(fromMonth: string, toMonth: string): Observable<Budget> {
    return this.http.post<Budget>(`${this.base}/budget/copy`, { from_month: fromMonth, to_month: toMonth });
  }

  // ── Dashboard & Analytics ────────────────────────────────
  getDashboard(month?: string): Observable<Dashboard> {
    const params = month ? new HttpParams().set('month', month) : new HttpParams();
    return this.http.get<Dashboard>(`${this.base}/dashboard`, { params }).pipe(shareReplay(1));
  }
  getComparison(periods: string[]): Observable<PeriodComparison> {
    let params = new HttpParams();
    periods.forEach(p => { params = params.append('periods', p); });
    return this.http.get<PeriodComparison>(`${this.base}/analytics/comparison`, { params });
  }
  getTrends(months = 12): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/analytics/trends`, { params: new HttpParams().set('months', months) });
  }
  getCategoryTrend(category: string, months = 6): Observable<any> {
    return this.http.get<any>(`${this.base}/analytics/category/${encodeURIComponent(category)}`,
      { params: new HttpParams().set('months', months) });
  }

  // ── Reports ─────────────────────────────────────────────
  generateReport(req: ReportRequest): Observable<Blob> {
    return this.http.post(`${this.base}/reports/generate`, req, { responseType: 'blob' });
  }
  listReports(): Observable<ReportSummary[]> {
    return this.http.get<ReportSummary[]>(`${this.base}/reports`);
  }
  downloadReport(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/reports/${id}/download`, { responseType: 'blob' });
  }

  // ── Import / Export ────────────────────────────────────
  importExcel(file: File): Observable<{ status: string; counts: Record<string, number> }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ status: string; counts: Record<string, number> }>(`${this.base}/import/excel`, form);
  }
  exportData(format: 'excel' | 'csv', filters?: FilterParams): Observable<Blob> {
    return this.http.get(`${this.base}/export/${format}`, { params: this.toParams(filters), responseType: 'blob' });
  }
  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.base}/templates/excel`, { responseType: 'blob' });
  }

  // ── Profile ────────────────────────────────────────────
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.base}/profile`);
  }
  updateProfile(payload: Partial<UserProfile>): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.base}/profile`, payload);
  }

  // ── AI ─────────────────────────────────────────────────
  aiQuery(req: AiQueryRequest): Observable<AiQueryResponse> {
    return this.http.post<AiQueryResponse>(`${this.base}/ai/query`, req);
  }
  aiClassifyIntent(query: string): Observable<AiIntentClassification> {
    return this.http.post<AiIntentClassification>(`${this.base}/ai/intent`, { query });
  }
  getAiContext(): Observable<AiFinancialContext> {
    return this.http.get<AiFinancialContext>(`${this.base}/ai/context`);
  }

  // ── Util ────────────────────────────────────────────────
  private toParams(filters?: FilterParams): HttpParams {
    let p = new HttpParams();
    if (!filters) return p;
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, v.toString());
    });
    return p;
  }
}
