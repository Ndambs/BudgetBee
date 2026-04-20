import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiMessage, AiQueryRequest, AiQueryResponse,
  AiIntentClassification, AiFinancialContext,
  AiIntent, Dashboard
} from '../models/finance.models';

// ── Intent Detection Patterns (client-side pre-filter) ─────────────────────
const INTENT_PATTERNS: Record<AiIntent, RegExp[]> = {
  spending_query:   [/where.*spend/i, /how much.*spent/i, /top.*categor/i, /oversp/i, /most.*money/i],
  savings_advice:   [/save more/i, /saving/i, /savings rate/i, /how.*save/i, /emergency fund/i],
  loan_query:       [/loan/i, /pay.*off/i, /debt/i, /amortiz/i, /interest/i, /balance/i],
  forecast_query:   [/predict/i, /forecast/i, /next.*month/i, /project/i, /will.*have/i],
  budget_advice:    [/budget/i, /limit/i, /50.30.20/i, /allocation/i, /afford/i],
  comparison_query: [/compared/i, /last month/i, /vs\.?/i, /trend/i, /over time/i, /change/i],
  general:          [],
};

// ── Suggested Questions ────────────────────────────────────────────────────
export const AI_SUGGESTED_QUESTIONS = [
  'Where am I overspending this month?',
  'What is my savings rate trend over the last 6 months?',
  'When will my car loan be paid off?',
  'Can I afford to increase my SACCO contribution?',
  'Which categories are drifting upward?',
  'How does my December spending compare to January?',
  'What's my emergency fund gap?',
  'Give me my 50/30/20 breakdown.',
  'How much will I save by end of year?',
  'What's my financial stress score this month?',
];

@Injectable({ providedIn: 'root' })
export class AiService {
  private http    = inject(HttpClient);
  private base    = environment.apiUrl;

  // ── Conversation State ─────────────────────────────────────────────────
  private _messages = new BehaviorSubject<AiMessage[]>([]);
  messages$  = this._messages.asObservable();
  isLoading  = signal(false);
  hasError   = signal(false);
  errorMsg   = signal('');

  get messages(): AiMessage[] { return this._messages.value; }

  // ── Context Snapshot (built from last dashboard load) ──────────────────
  private _context = signal<AiFinancialContext | null>(null);
  context = computed(() => this._context());

  setContextFromDashboard(dash: Dashboard): void {
    this._context.set({
      current_period:         dash.period,
      total_income:           dash.total_income,
      total_expenses:         dash.total_expenses,
      savings_rate:           dash.savings_rate,
      debt_to_income:         dash.debt_to_income,
      financial_stress_score: dash.financial_stress_score,
      top_expense_categories: dash.category_breakdown.slice(0, 5),
      active_alerts:          dash.alerts ?? [],
      loan_remaining:         dash.loan_amortization?.[0]?.opening_balance,
      sacco_balance:          dash.sacco_growth?.[0]?.balance,
      months_of_data:         dash.monthly_trend?.length ?? 1,
    });
  }

  // ── Client-side Intent Classification (instant, no round-trip) ────────
  classifyIntentLocally(query: string): AiIntent {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [AiIntent, RegExp[]][]) {
      if (intent === 'general') continue;
      if (patterns.some(p => p.test(query))) return intent;
    }
    return 'general';
  }

  // ── Server-side Intent Classification ──────────────────────────────────
  classifyIntent(query: string): Observable<AiIntentClassification> {
    return this.http.post<AiIntentClassification>(`${this.base}/ai/intent`, { query });
  }

  // ── Context Refresh ────────────────────────────────────────────────────
  refreshContext(): Observable<AiFinancialContext> {
    return this.http.get<AiFinancialContext>(`${this.base}/ai/context`).pipe(
      tap(ctx => this._context.set(ctx))
    );
  }

  // ── Send Query ─────────────────────────────────────────────────────────
  query(userMessage: string): Observable<AiQueryResponse> {
    const context = this._context();
    if (!context) throw new Error('No financial context loaded. Visit the dashboard first.');

    // Optimistically add user message
    const userMsg: AiMessage = {
      id:        crypto.randomUUID(),
      role:      'user',
      content:   userMessage,
      timestamp: new Date().toISOString(),
      intent:    this.classifyIntentLocally(userMessage),
    };
    this._messages.next([...this.messages, userMsg]);
    this.isLoading.set(true);
    this.hasError.set(false);

    const req: AiQueryRequest = {
      query:                userMessage,
      conversation_history: this.messages.slice(-10), // last 10 msgs for context window
      context,
    };

    return this.http.post<AiQueryResponse>(`${this.base}/ai/query`, req).pipe(
      tap({
        next: (res) => {
          const assistantMsg: AiMessage = {
            id:               crypto.randomUUID(),
            role:             'assistant',
            content:          res.answer,
            timestamp:        new Date().toISOString(),
            intent:           res.intent,
            context_snapshot: { financial_stress_score: context.financial_stress_score },
          };
          this._messages.next([...this.messages, assistantMsg]);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.hasError.set(true);
          this.errorMsg.set(err?.error?.detail ?? 'Failed to get AI response. Please try again.');
        }
      })
    );
  }

  // ── Conversation Management ─────────────────────────────────────────────
  clearConversation(): void {
    this._messages.next([]);
    this.hasError.set(false);
  }

  exportConversation(): string {
    const msgs = this.messages;
    return msgs.map(m =>
      `[${new Date(m.timestamp).toLocaleString()}] ${m.role.toUpperCase()}: ${m.content}`
    ).join('\n\n');
  }

  // ── Prompt Templates (pre-AI wiring) ───────────────────────────────────
  buildSystemPrompt(): string {
    const ctx = this._context();
    if (!ctx) return SYSTEM_PROMPT_BASE;
    return `${SYSTEM_PROMPT_BASE}

CURRENT FINANCIAL SNAPSHOT (${ctx.current_period}):
- Monthly Income: KES ${ctx.total_income.toLocaleString()}
- Monthly Expenses: KES ${ctx.total_expenses.toLocaleString()}
- Savings Rate: ${(ctx.savings_rate * 100).toFixed(1)}%
- Debt-to-Income: ${(ctx.debt_to_income * 100).toFixed(1)}%
- Financial Stress Score: ${ctx.financial_stress_score}/100
- SACCO Balance: KES ${(ctx.sacco_balance ?? 0).toLocaleString()}
- Loan Remaining: KES ${(ctx.loan_remaining ?? 0).toLocaleString()}
- Active Alerts: ${ctx.active_alerts.map(a => a.title).join(', ')}
- Top Expenses: ${ctx.top_expense_categories.map(c => `${c.category} (${c.percentage}%)`).join(', ')}
- Months of data: ${ctx.months_of_data}

You are a personal finance advisor. Provide concise, actionable, Kenya-specific advice.
Always cite specific KES amounts. Reference the 50/30/20 rule when relevant.`;
  }

  getSuggestedQuestions(): string[] {
    return AI_SUGGESTED_QUESTIONS;
  }
}

// ── Base System Prompt (AI-ready, not yet wired to LLM) ──────────────────
const SYSTEM_PROMPT_BASE = `You are a senior personal finance advisor specializing in Kenyan personal finance.
You have access to the user's complete financial data including income, expenses, SACCO contributions, loan obligations, and historical trends.
You speak in clear, friendly English. You reference KES (Kenyan Shillings) for all amounts.
You follow the 50/30/20 budgeting rule as a guideline, not a strict rule.
When relevant, mention SACCO benefits, M-Pesa patterns, and local financial context.
Never make up data — only use the provided financial snapshot.`;
