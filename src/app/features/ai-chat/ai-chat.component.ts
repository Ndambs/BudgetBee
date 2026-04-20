import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AiService, AI_SUGGESTED_QUESTIONS } from '../../core/services/ai.service';
import { FinanceService } from '../../core/services/finance.service';
import { AiMessage, AiIntent } from '../../core/models/finance.models';

const INTENT_ICONS: Record<AiIntent, string> = {
  spending_query:   'trending_down',
  savings_advice:   'savings',
  loan_query:       'credit_card',
  forecast_query:   'insights',
  budget_advice:    'account_balance',
  comparison_query: 'compare_arrows',
  general:          'chat',
};

const INTENT_COLORS: Record<AiIntent, string> = {
  spending_query:   '#e74c3c',
  savings_advice:   '#27ae60',
  loan_query:       '#e67e22',
  forecast_query:   '#8e44ad',
  budget_advice:    '#2980b9',
  comparison_query: '#16a085',
  general:          '#7f8c8d',
};

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatInputModule, MatFormFieldModule,
    MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatDividerModule, MatTooltipModule,
    MatBadgeModule, MatExpansionModule, MatListModule, MatSnackBarModule,
  ],
  template: `
    <div class="ai-page">

      <!-- Left: Chat Panel -->
      <div class="chat-panel">

        <!-- Header -->
        <div class="chat-header">
          <div class="ai-avatar">
            <mat-icon>smart_toy</mat-icon>
          </div>
          <div class="chat-header-text">
            <h2 class="chat-title">AI Financial Advisor</h2>
            <span class="chat-sub" [class.ready]="contextLoaded()">
              <span class="status-dot" [class.active]="contextLoaded()"></span>
              {{ contextLoaded() ? 'Context loaded · Ready' : 'Loading your financial context…' }}
            </span>
          </div>
          <div class="header-actions">
            <button mat-icon-button matTooltip="Export conversation" (click)="exportConversation()">
              <mat-icon>download</mat-icon>
            </button>
            <button mat-icon-button matTooltip="Clear conversation" (click)="clearConversation()">
              <mat-icon>delete_sweep</mat-icon>
            </button>
          </div>
        </div>

        <!-- Beta Notice -->
        <div class="beta-notice">
          <mat-icon>info</mat-icon>
          <span>
            AI Advisor is <strong>AI-ready</strong> — context, intent detection, and conversation flow are fully wired.
            Connect an LLM (Claude / Gemini / OpenAI) at <code>/api/ai/query</code> to activate live responses.
          </span>
        </div>

        <!-- Messages -->
        <div class="messages-wrap" #messagesContainer>
          @if (messages().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">auto_awesome</mat-icon>
              <h3>Ask me anything about your finances</h3>
              <p>I have your full financial context loaded — income, expenses, loans, SACCO, and trends.</p>
              <div class="suggestion-grid">
                @for (q of suggestedQuestions; track q) {
                  <button mat-stroked-button class="suggestion-btn" (click)="sendSuggestion(q)">
                    {{ q }}
                  </button>
                }
              </div>
            </div>
          } @else {
            @for (msg of messages(); track msg.id) {
              <div class="message-row" [class.user-row]="msg.role === 'user'" [class.ai-row]="msg.role === 'assistant'">

                @if (msg.role === 'assistant') {
                  <div class="msg-avatar ai-msg-avatar">
                    <mat-icon [style.color]="intentColor(msg.intent)">{{ intentIcon(msg.intent) }}</mat-icon>
                  </div>
                }

                <div class="message-bubble" [class.user-bubble]="msg.role === 'user'" [class.ai-bubble]="msg.role === 'assistant'">
                  <div class="msg-content">{{ msg.content }}</div>
                  <div class="msg-meta">
                    <span class="msg-time">{{ msg.timestamp | date:'HH:mm' }}</span>
                    @if (msg.intent && msg.intent !== 'general') {
                      <mat-chip class="intent-chip" [style.background]="intentColor(msg.intent) + '22'" [style.color]="intentColor(msg.intent)">
                        <mat-icon matChipAvatar [style.font-size]="'14px'">{{ intentIcon(msg.intent) }}</mat-icon>
                        {{ msg.intent | replace:'_':' ' }}
                      </mat-chip>
                    }
                  </div>
                </div>

                @if (msg.role === 'user') {
                  <div class="msg-avatar user-msg-avatar">
                    <mat-icon>person</mat-icon>
                  </div>
                }
              </div>
            }

            @if (aiService.isLoading()) {
              <div class="message-row ai-row">
                <div class="msg-avatar ai-msg-avatar">
                  <mat-icon>smart_toy</mat-icon>
                </div>
                <div class="ai-bubble thinking-bubble">
                  <div class="thinking-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <!-- Error banner -->
        @if (aiService.hasError()) {
          <div class="error-bar">
            <mat-icon>error</mat-icon>
            {{ aiService.errorMsg() }}
          </div>
        }

        <!-- Input bar -->
        <div class="input-bar">
          <div class="intent-preview" *ngIf="currentIntent()">
            <mat-icon [style.color]="intentColor(currentIntent()!)">{{ intentIcon(currentIntent()!) }}</mat-icon>
            <span>Detected: {{ currentIntent() | replace:'_':' ' }}</span>
          </div>
          <div class="input-row">
            <mat-form-field appearance="outlined" class="msg-input">
              <input matInput
                [(ngModel)]="inputText"
                (ngModelChange)="onInputChange()"
                (keydown.enter)="send()"
                placeholder="Ask about your finances… (e.g. Where am I overspending?)"
                [disabled]="aiService.isLoading()">
            </mat-form-field>
            <button mat-fab extended color="primary" (click)="send()"
              [disabled]="!inputText.trim() || aiService.isLoading() || !contextLoaded()">
              <mat-icon>send</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <!-- Right: Context Panel -->
      <div class="context-panel">

        <mat-card appearance="outlined" class="context-card">
          <mat-card-header>
            <mat-card-title>Financial Context</mat-card-title>
            <mat-card-subtitle>Snapshot sent with every AI query</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (context(); as ctx) {
              <div class="context-grid">
                <div class="ctx-item">
                  <span class="ctx-label">Period</span>
                  <span class="ctx-value">{{ ctx.current_period }}</span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Income</span>
                  <span class="ctx-value income-val">KES {{ ctx.total_income | number }}</span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Expenses</span>
                  <span class="ctx-value expense-val">KES {{ ctx.total_expenses | number }}</span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Savings Rate</span>
                  <span class="ctx-value" [class.warn-val]="ctx.savings_rate < 0.20">
                    {{ ctx.savings_rate * 100 | number:'1.1-1' }}%
                  </span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Debt/Income</span>
                  <span class="ctx-value">{{ ctx.debt_to_income * 100 | number:'1.1-1' }}%</span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Stress Score</span>
                  <span class="ctx-value" [class.warn-val]="ctx.financial_stress_score > 50">
                    {{ ctx.financial_stress_score }}/100
                  </span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">SACCO Balance</span>
                  <span class="ctx-value">KES {{ ctx.sacco_balance | number }}</span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Loan Remaining</span>
                  <span class="ctx-value">KES {{ ctx.loan_remaining | number }}</span>
                </div>
                <div class="ctx-item">
                  <span class="ctx-label">Data Months</span>
                  <span class="ctx-value">{{ ctx.months_of_data }}</span>
                </div>
              </div>

              <mat-divider />

              <div class="active-alerts">
                <div class="alerts-header">
                  <mat-icon color="warn">notifications_active</mat-icon>
                  <span>Active Alerts ({{ ctx.active_alerts.length }})</span>
                </div>
                @for (alert of ctx.active_alerts; track alert.title) {
                  <div class="ctx-alert" [class]="'alert-' + alert.severity">
                    <mat-icon>{{ alert.severity === 'critical' ? 'error' : 'warning' }}</mat-icon>
                    <span>{{ alert.title }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="ctx-loading">
                <mat-spinner diameter="24" />
                <span>Loading context…</span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- API Wiring Guide -->
        <mat-card appearance="outlined" class="wiring-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">code</mat-icon>
            <mat-card-title>AI Integration Points</mat-card-title>
            <mat-card-subtitle>Ready to wire to any LLM</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-accordion>
              @for (hook of integrationHooks; track hook.endpoint) {
                <mat-expansion-panel>
                  <mat-expansion-panel-header>
                    <mat-panel-title>
                      <mat-chip [color]="hook.method === 'POST' ? 'primary' : 'accent'" highlighted style="font-size:10px">
                        {{ hook.method }}
                      </mat-chip>
                      &nbsp;{{ hook.endpoint }}
                    </mat-panel-title>
                  </mat-expansion-panel-header>
                  <p class="hook-desc">{{ hook.description }}</p>
                  <code class="hook-code">{{ hook.payload }}</code>
                </mat-expansion-panel>
              }
            </mat-accordion>
          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .ai-page { display: grid; grid-template-columns: 1fr 380px; gap: 20px; height: calc(100vh - 120px); }

    .chat-panel { display: flex; flex-direction: column; background: var(--mat-sys-surface-container-lowest);
      border: 1px solid var(--mat-sys-outline-variant); border-radius: 16px; overflow: hidden; }

    .chat-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px;
      border-bottom: 1px solid var(--mat-sys-outline-variant); background: var(--mat-sys-surface-container-low); }
    .ai-avatar { width: 40px; height: 40px; border-radius: 12px; background: var(--mat-sys-primary-container);
      display: flex; align-items: center; justify-content: center; }
    .ai-avatar mat-icon { color: var(--mat-sys-on-primary-container); }
    .chat-header-text { flex: 1; }
    .chat-title { font-size: 16px; font-weight: 500; margin: 0; }
    .chat-sub { font-size: 11px; color: var(--mat-sys-on-surface-variant); display: flex; align-items: center; gap: 4px; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: #ccc; }
    .status-dot.active { background: #27ae60; }
    .header-actions { display: flex; }

    .beta-notice { display: flex; align-items: flex-start; gap: 8px; padding: 10px 20px;
      background: var(--mat-sys-surface-container); font-size: 11px;
      color: var(--mat-sys-on-surface-variant); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .beta-notice mat-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
    code { font-family: monospace; background: var(--mat-sys-surface-container-high); padding: 1px 4px; border-radius: 3px; }

    .messages-wrap { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 0; text-align: center; }
    .empty-icon { font-size: 48px; color: var(--mat-sys-primary); }
    .empty-state h3 { font-size: 16px; font-weight: 500; margin: 0; }
    .empty-state p { color: var(--mat-sys-on-surface-variant); font-size: 13px; margin: 0; }
    .suggestion-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 500px; }
    .suggestion-btn { font-size: 11px !important; padding: 4px 10px !important; }

    .message-row { display: flex; align-items: flex-end; gap: 8px; }
    .user-row { flex-direction: row-reverse; }
    .msg-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .ai-msg-avatar { background: var(--mat-sys-primary-container); }
    .ai-msg-avatar mat-icon { font-size: 16px; color: var(--mat-sys-on-primary-container); }
    .user-msg-avatar { background: var(--mat-sys-secondary-container); }
    .user-msg-avatar mat-icon { font-size: 16px; color: var(--mat-sys-on-secondary-container); }

    .message-bubble { max-width: 75%; border-radius: 12px; padding: 10px 14px; }
    .user-bubble { background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); border-bottom-right-radius: 3px; }
    .ai-bubble { background: var(--mat-sys-surface-container-high); border-bottom-left-radius: 3px; }
    .msg-content { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
    .msg-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .msg-time { font-size: 10px; opacity: 0.6; }
    .intent-chip { font-size: 9px !important; height: 18px !important; }

    .thinking-bubble { padding: 14px 18px; }
    .thinking-dots { display: flex; gap: 4px; }
    .thinking-dots span { width: 6px; height: 6px; border-radius: 50%; background: var(--mat-sys-on-surface-variant);
      animation: bounce 1.2s infinite; }
    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }

    .error-bar { display: flex; align-items: center; gap: 8px; padding: 10px 20px;
      background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container);
      font-size: 12px; }

    .input-bar { border-top: 1px solid var(--mat-sys-outline-variant); padding: 12px 16px; }
    .intent-preview { display: flex; align-items: center; gap: 4px; font-size: 11px;
      color: var(--mat-sys-on-surface-variant); margin-bottom: 6px; }
    .input-row { display: flex; gap: 8px; align-items: center; }
    .msg-input { flex: 1; }

    /* Right panel */
    .context-panel { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
    .context-card { }
    .context-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
    .ctx-item { display: flex; flex-direction: column; gap: 2px; }
    .ctx-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--mat-sys-on-surface-variant); }
    .ctx-value { font-size: 13px; font-weight: 500; }
    .income-val { color: #27ae60; }
    .expense-val { color: #c0392b; }
    .warn-val { color: #e67e22; }
    .active-alerts { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
    .alerts-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; margin-bottom: 4px; }
    .ctx-alert { display: flex; align-items: center; gap: 6px; padding: 5px 8px; border-radius: 6px; font-size: 11px; }
    .alert-warning { background: #fef9f0; color: #e67e22; }
    .alert-critical { background: #fdf2f2; color: #c0392b; }
    .alert-info { background: #eaf3fb; color: #2980b9; }
    .ctx-loading { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--mat-sys-on-surface-variant); }

    .wiring-card { }
    .hook-desc { font-size: 12px; color: var(--mat-sys-on-surface-variant); margin: 0 0 8px; }
    .hook-code { display: block; font-family: monospace; font-size: 10px;
      background: var(--mat-sys-surface-container); padding: 8px; border-radius: 6px; white-space: pre-wrap; }
  `]
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private container!: ElementRef;

  aiService = inject(AiService);
  private finance = inject(FinanceService);
  private snack   = inject(MatSnackBar);

  inputText    = '';
  contextLoaded = signal(false);
  currentIntent = signal<AiIntent | null>(null);
  messages     = this.aiService.messages$.pipe ? signal<AiMessage[]>([]) : signal<AiMessage[]>([]);
  context      = this.aiService.context;

  suggestedQuestions = AI_SUGGESTED_QUESTIONS.slice(0, 8);

  integrationHooks = [
    {
      method: 'POST', endpoint: '/api/ai/query',
      description: 'Send a user query with full financial context and conversation history. Wire this to Claude, Gemini, or OpenAI.',
      payload: '{\n  "query": "...",\n  "context": { ...snapshot },\n  "conversation_history": [...]\n}'
    },
    {
      method: 'POST', endpoint: '/api/ai/intent',
      description: 'Classify user query intent server-side. Returns intent type, entities, and suggested API calls.',
      payload: '{ "query": "Where am I overspending?" }\n→ { "intent": "spending_query", "confidence": 0.92 }'
    },
    {
      method: 'GET', endpoint: '/api/ai/context',
      description: 'Fetch the latest financial context snapshot used to prime the AI system prompt.',
      payload: '→ { "total_income": 192000, "savings_rate": 0.134, ... }'
    },
  ];

  ngOnInit() {
    this.aiService.messages$.subscribe(msgs => this.messages.set(msgs));
    this.finance.getDashboard().subscribe({
      next: dash => {
        this.aiService.setContextFromDashboard(dash);
        this.contextLoaded.set(true);
      },
      error: () => this.contextLoaded.set(true) // allow demo mode
    });
  }

  ngAfterViewChecked() {
    if (this.container) {
      this.container.nativeElement.scrollTop = this.container.nativeElement.scrollHeight;
    }
  }

  onInputChange() {
    const intent = this.aiService.classifyIntentLocally(this.inputText);
    this.currentIntent.set(intent !== 'general' ? intent : null);
  }

  send() {
    if (!this.inputText.trim()) return;
    const q = this.inputText.trim();
    this.inputText = '';
    this.currentIntent.set(null);

    this.aiService.query(q).subscribe({
      error: () => {} // handled in service
    });
  }

  sendSuggestion(q: string) { this.inputText = q; this.send(); }

  clearConversation() {
    this.aiService.clearConversation();
    this.snack.open('Conversation cleared', 'OK', { duration: 2000 });
  }

  exportConversation() {
    const text = this.aiService.exportConversation();
    const blob = new Blob([text], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ai-conversation.txt'; a.click();
  }

  intentIcon(intent?: AiIntent): string { return intent ? INTENT_ICONS[intent] : 'chat'; }
  intentColor(intent?: AiIntent): string { return intent ? INTENT_COLORS[intent] : '#7f8c8d'; }
}
