import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../core/services/finance.service';
import { Dashboard } from '../../core/models/finance.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressBarModule, MatIconModule, MatChipsModule, MatButtonModule, RouterLink],
  template: `
    <div class="dash">
      @if (data()) {
        <div class="kpi-row">
          @for (kpi of kpis(); track kpi.label) {
            <mat-card appearance="outlined" class="kpi">
              <mat-card-content>
                <div class="kpi-label">{{ kpi.label }}</div>
                <div class="kpi-val" [style.color]="kpi.color">{{ kpi.value }}</div>
                <div class="kpi-sub">{{ kpi.sub }}</div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <div class="row2">
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Top Expense Categories</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (cat of data()!.category_breakdown.slice(0,6); track cat.category) {
                <div class="cat-row">
                  <span class="cat-name">{{ cat.category }}</span>
                  <mat-progress-bar [value]="cat.percentage" [color]="cat.over_budget ? 'warn' : 'primary'" mode="determinate" />
                  <span class="cat-val">KES {{ cat.total | number }}</span>
                  @if (cat.over_budget) { <mat-chip color="warn" highlighted style="font-size:9px">over</mat-chip> }
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Active Alerts</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (alert of data()!.alerts; track alert.title) {
                <div class="alert-row" [class]="'alert-' + alert.severity">
                  <mat-icon style="font-size:16px">{{ alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info' }}</mat-icon>
                  <div><div class="alert-title">{{ alert.title }}</div><div class="alert-msg">{{ alert.message }}</div></div>
                </div>
              }
              @if (data()!.alerts.length === 0) {
                <div style="color:var(--mat-sys-on-surface-variant);font-size:13px;padding:8px">No active alerts — finances look healthy!</div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <div class="row2">
          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>50/30/20 Rule</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (rule of rules(); track rule.label) {
                <div class="rule-row">
                  <div class="rule-info">
                    <span>{{ rule.label }}</span>
                    <span [style.color]="rule.over ? '#c0392b' : '#1a7a3c'">{{ rule.pct | number:'1.0-0' }}%</span>
                  </div>
                  <mat-progress-bar [value]="rule.pct / rule.target * 100" [color]="rule.over ? 'warn' : 'primary'" mode="determinate" />
                  <div class="rule-amounts">
                    <span>KES {{ rule.actual | number:'1.0-0' }} actual</span>
                    <span>KES {{ rule.targetAmt | number:'1.0-0' }} target</span>
                  </div>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card appearance="outlined">
            <mat-card-header><mat-card-title>Insights</mat-card-title></mat-card-header>
            <mat-card-content>
              @for (ins of data()!.insights; track ins.title) {
                <div class="insight-row" [class]="'ins-' + ins.insight_type">
                  <mat-icon>{{ ins.insight_type === 'positive' ? 'check_circle' : ins.insight_type === 'warning' ? 'warning' : 'lightbulb' }}</mat-icon>
                  <div><div class="ins-title">{{ ins.title }}</div><div class="ins-body">{{ ins.body }}</div></div>
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <div class="action-row">
          <button mat-stroked-button [routerLink]="'/transactions'"><mat-icon>add</mat-icon> Add Transaction</button>
          <button mat-stroked-button [routerLink]="'/budget'"><mat-icon>account_balance</mat-icon> Manage Budget</button>
          <button mat-stroked-button [routerLink]="'/loans'"><mat-icon>credit_card</mat-icon> View Loan</button>
          <button mat-flat-button color="primary" [routerLink]="'/ai'"><mat-icon>smart_toy</mat-icon> Ask AI Advisor</button>
        </div>
      } @else {
        <div class="loading">
          <mat-progress-bar mode="indeterminate" />
          <p>Loading your financial dashboard…</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .dash { display: flex; flex-direction: column; gap: 16px; }
    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
    .kpi mat-card-content { padding: 14px 16px !important; }
    .kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: .07em; color: var(--mat-sys-on-surface-variant); font-weight: 500; }
    .kpi-val { font-size: 20px; font-weight: 500; margin: 4px 0 2px; }
    .kpi-sub { font-size: 11px; color: var(--mat-sys-on-surface-variant); }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .cat-name { font-size: 12px; width: 130px; flex-shrink: 0; }
    .cat-val { font-size: 11px; font-weight: 500; width: 90px; text-align: right; flex-shrink: 0; }
    .alert-row { display: flex; gap: 8px; padding: 7px 9px; margin-bottom: 6px; border-radius: 0 6px 6px 0; font-size: 11px; }
    .alert-warning { background: #fef9f0; border-left: 3px solid #e67e22; color: #e67e22; }
    .alert-critical { background: #fdf2f2; border-left: 3px solid #c0392b; color: #c0392b; }
    .alert-info { background: #eaf3fb; border-left: 3px solid #2980b9; color: #2980b9; }
    .alert-title { font-weight: 500; }
    .alert-msg { color: var(--mat-sys-on-surface-variant); margin-top: 2px; line-height: 1.35; }
    .rule-row { margin-bottom: 14px; }
    .rule-info { display: flex; justify-content: space-between; font-size: 12px; font-weight: 500; margin-bottom: 4px; }
    .rule-amounts { display: flex; justify-content: space-between; font-size: 10px; color: var(--mat-sys-on-surface-variant); margin-top: 3px; }
    .insight-row { display: flex; gap: 8px; padding: 8px 0; border-bottom: 0.5px solid var(--mat-sys-outline-variant); }
    .ins-positive mat-icon { color: #1a7a3c; }
    .ins-warning mat-icon  { color: #e67e22; }
    .ins-suggestion mat-icon { color: #2980b9; }
    .ins-title { font-size: 12px; font-weight: 500; margin-bottom: 2px; }
    .ins-body  { font-size: 11px; color: var(--mat-sys-on-surface-variant); line-height: 1.4; }
    .action-row { display: flex; gap: 10px; flex-wrap: wrap; }
    .loading { text-align: center; padding: 48px; color: var(--mat-sys-on-surface-variant); }
  `]
})
export class DashboardComponent implements OnInit {
  private finance = inject(FinanceService);
  data = signal<Dashboard | null>(null);

  kpis = () => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: 'Total Income',   value: `KES ${(d.total_income/1000).toFixed(0)}K`,   sub: 'This month',       color: '#1a7a3c' },
      { label: 'Total Expenses', value: `KES ${(d.total_expenses/1000).toFixed(0)}K`, sub: '8 categories',     color: '#c0392b' },
      { label: 'Savings Rate',   value: `${(d.savings_rate*100).toFixed(1)}%`,         sub: d.savings_rate>=.20 ? '✓ On target' : '⚠ Below 20%', color: d.savings_rate>=.20 ? '#1a7a3c' : '#c0392b' },
      { label: 'True Available', value: `KES ${(d.true_available_money/1000).toFixed(0)}K`, sub: 'After all obligations', color: '#2980b9' },
      { label: 'Debt/Income',    value: `${(d.debt_to_income*100).toFixed(1)}%`,       sub: d.debt_to_income<.30 ? '✓ Safe zone' : '⚠ High',    color: d.debt_to_income<.30 ? '#1a7a3c' : '#c0392b' },
      { label: 'Stress Score',   value: `${d.financial_stress_score}/100`,             sub: d.financial_stress_score<30 ? 'Low stress' : d.financial_stress_score<60 ? 'Moderate' : 'High stress', color: d.financial_stress_score<30 ? '#1a7a3c' : d.financial_stress_score<60 ? '#e67e22' : '#c0392b' },
    ];
  };

  rules = () => {
    const d = this.data();
    if (!d) return [];
    const inc = d.total_income;
    return [
      { label: 'Needs (50%)',   actual: d.essential_spend,     target: 50, pct: d.essential_spend/inc*100,     targetAmt: inc*.50, over: d.essential_spend     > inc*.50 },
      { label: 'Wants (30%)',   actual: d.non_essential_spend, target: 30, pct: d.non_essential_spend/inc*100, targetAmt: inc*.30, over: d.non_essential_spend  > inc*.30 },
      { label: 'Savings (20%)', actual: d.net_savings+d.sacco_contribution, target: 20,
        pct: (d.net_savings+d.sacco_contribution)/inc*100, targetAmt: inc*.20, over: (d.net_savings+d.sacco_contribution) < inc*.20 },
    ];
  };

  ngOnInit() {
    this.finance.getDashboard().subscribe({ next: d => this.data.set(d), error: () => {} });
  }
}
