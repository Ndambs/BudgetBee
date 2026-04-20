import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceService } from '../../core/services/finance.service';
import { ReportSummary, ReportType, ExportFormat } from '../../core/models/finance.models';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, DatePipe, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule,
    MatSelectModule, MatCheckboxModule, MatProgressBarModule,
    MatChipsModule, MatDividerModule, MatListModule, MatSnackBarModule,
    MatTableModule, MatTooltipModule,
  ],
  template: `
    <div class="reports-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">Reports & Export</h1>
          <p class="page-sub">Generate monthly, quarterly, and yearly reports in PDF or Excel format</p>
        </div>
      </div>

      <div class="reports-grid">

        <!-- Generator -->
        <mat-card appearance="outlined" class="generator-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">description</mat-icon>
            <mat-card-title>Generate Report</mat-card-title>
            <mat-card-subtitle>Configure and download a comprehensive financial report</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content [formGroup]="reportForm">

            <mat-form-field appearance="outlined" class="full-width">
              <mat-label>Report Type</mat-label>
              <mat-select formControlName="report_type" (selectionChange)="onTypeChange()">
                <mat-option value="monthly">Monthly Report</mat-option>
                <mat-option value="quarterly">Quarterly Report</mat-option>
                <mat-option value="yearly">Yearly Report</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Period selector depending on type -->
            @if (reportForm.get('report_type')?.value === 'monthly') {
              <mat-form-field appearance="outlined" class="full-width">
                <mat-label>Month</mat-label>
                <mat-select formControlName="period">
                  @for (m of months; track m.value) {
                    <mat-option [value]="m.value">{{ m.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
            @if (reportForm.get('report_type')?.value === 'quarterly') {
              <div class="period-row">
                <mat-form-field appearance="outlined">
                  <mat-label>Year</mat-label>
                  <mat-select formControlName="year">
                    @for (y of years; track y) { <mat-option [value]="y">{{ y }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outlined">
                  <mat-label>Quarter</mat-label>
                  <mat-select formControlName="quarter">
                    <mat-option value="1">Q1 (Jan–Mar)</mat-option>
                    <mat-option value="2">Q2 (Apr–Jun)</mat-option>
                    <mat-option value="3">Q3 (Jul–Sep)</mat-option>
                    <mat-option value="4">Q4 (Oct–Dec)</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            }
            @if (reportForm.get('report_type')?.value === 'yearly') {
              <mat-form-field appearance="outlined" class="full-width">
                <mat-label>Year</mat-label>
                <mat-select formControlName="year">
                  @for (y of years; track y) { <mat-option [value]="y">{{ y }}</mat-option> }
                </mat-select>
              </mat-form-field>
            }

            <mat-form-field appearance="outlined" class="full-width">
              <mat-label>Export Format</mat-label>
              <mat-select formControlName="format">
                <mat-option value="pdf">
                  <mat-icon style="vertical-align:middle;margin-right:6px;color:#e74c3c">picture_as_pdf</mat-icon>
                  PDF Report
                </mat-option>
                <mat-option value="excel">
                  <mat-icon style="vertical-align:middle;margin-right:6px;color:#27ae60">table_chart</mat-icon>
                  Excel Workbook
                </mat-option>
              </mat-select>
            </mat-form-field>

            <div class="options-group">
              <p class="options-label">Include in report:</p>
              <mat-checkbox formControlName="include_charts">Charts and visualizations</mat-checkbox>
              <mat-checkbox formControlName="include_recommendations">AI recommendations</mat-checkbox>
            </div>

          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="generateReport()" [disabled]="generating()">
              <mat-icon>download</mat-icon>
              {{ generating() ? 'Generating…' : 'Generate & Download' }}
            </button>
          </mat-card-actions>
          @if (generating()) {
            <mat-progress-bar mode="indeterminate" />
          }
        </mat-card>

        <!-- Quick Export -->
        <div class="quick-panel">

          <mat-card appearance="outlined">
            <mat-card-header>
              <mat-icon mat-card-avatar>bolt</mat-icon>
              <mat-card-title>Quick Export</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-action-list>
                <button mat-list-item (click)="quickExport('excel', 'all')">
                  <mat-icon matListItemIcon color="primary">table_chart</mat-icon>
                  <span matListItemTitle>All Transactions (Excel)</span>
                  <span matListItemLine>Complete income + expenses</span>
                </button>
                <mat-divider />
                <button mat-list-item (click)="quickExport('csv', 'expenses')">
                  <mat-icon matListItemIcon>description</mat-icon>
                  <span matListItemTitle>Expenses CSV</span>
                  <span matListItemLine>Current month expenses</span>
                </button>
                <mat-divider />
                <button mat-list-item (click)="quickExport('csv', 'income')">
                  <mat-icon matListItemIcon>description</mat-icon>
                  <span matListItemTitle>Income CSV</span>
                  <span matListItemLine>Income history</span>
                </button>
                <mat-divider />
                <button mat-list-item (click)="downloadTemplate()">
                  <mat-icon matListItemIcon color="accent">file_download</mat-icon>
                  <span matListItemTitle>Excel Template</span>
                  <span matListItemLine>Blank data entry template</span>
                </button>
              </mat-action-list>
            </mat-card-content>
          </mat-card>

          <!-- Report type guide -->
          <mat-card appearance="outlined">
            <mat-card-header>
              <mat-icon mat-card-avatar>info</mat-icon>
              <mat-card-title>Report Contents</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="report-guide">
                @for (guide of reportGuide; track guide.type) {
                  <div class="guide-item">
                    <mat-chip highlighted [color]="guide.color">{{ guide.type }}</mat-chip>
                    <ul class="guide-list">
                      @for (item of guide.includes; track item) { <li>{{ item }}</li> }
                    </ul>
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Report History -->
        <mat-card appearance="outlined" class="history-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>history</mat-icon>
            <mat-card-title>Report History</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (reports().length === 0) {
              <div class="empty-history">
                <mat-icon>description</mat-icon>
                <p>No reports generated yet. Generate your first report above.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="reports()" class="history-table">
                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef>Period</th>
                  <td mat-cell *matCellDef="let r">{{ r.period }}</td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let r">
                    <mat-chip>{{ r.report_type }}</mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="generated">
                  <th mat-header-cell *matHeaderCellDef>Generated</th>
                  <td mat-cell *matCellDef="let r">{{ r.generated_at | date:'dd MMM yyyy HH:mm' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    <button mat-icon-button (click)="downloadExisting(r.id)" matTooltip="Download">
                      <mat-icon>download</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="historyColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: historyColumns;"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .reports-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-title { font-size: 22px; font-weight: 500; margin: 0; }
    .page-sub { color: var(--mat-sys-on-surface-variant); margin: 4px 0 0; font-size: 13px; }

    .reports-grid { display: grid; grid-template-columns: 340px 1fr; gap: 20px; }
    .generator-card { }
    .full-width { width: 100%; margin-bottom: 4px; }
    .period-row { display: flex; gap: 12px; }
    .period-row mat-form-field { flex: 1; }
    .options-group { display: flex; flex-direction: column; gap: 8px; margin: 8px 0; }
    .options-label { font-size: 12px; color: var(--mat-sys-on-surface-variant); margin: 0 0 4px; }

    .quick-panel { display: flex; flex-direction: column; gap: 16px; }

    .history-card { grid-column: 1 / -1; }
    .history-columns { width: 100%; }
    .history-table { width: 100%; }
    .empty-history { display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px; color: var(--mat-sys-on-surface-variant); }
    .empty-history mat-icon { font-size: 40px; }

    .report-guide { display: flex; flex-direction: column; gap: 12px; }
    .guide-item { display: flex; flex-direction: column; gap: 4px; }
    .guide-list { margin: 4px 0 0 16px; padding: 0; font-size: 11px; color: var(--mat-sys-on-surface-variant); }
    .guide-list li { margin-bottom: 2px; }
  `]
})
export class ReportsComponent implements OnInit {
  private finance = inject(FinanceService);
  private snack   = inject(MatSnackBar);
  private fb      = inject(FormBuilder);

  generating = signal(false);
  reports    = signal<ReportSummary[]>([]);
  historyColumns = ['period','type','generated','actions'];

  months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleString('en-KE', { month: 'long', year: 'numeric' }) };
  });
  years = [new Date().getFullYear(), new Date().getFullYear() - 1];

  reportForm = this.fb.group({
    report_type:             ['monthly', Validators.required],
    period:                  [new Date().toISOString().slice(0, 7)],
    year:                    [new Date().getFullYear()],
    quarter:                 ['1'],
    format:                  ['pdf', Validators.required],
    include_charts:          [true],
    include_recommendations: [true],
  });

  reportGuide = [
    { type: 'Monthly', color: 'primary' as const, includes: ['Income vs expense summary','Category breakdown','Budget vs actual','Alerts & insights','Cashflow timing'] },
    { type: 'Quarterly', color: 'accent' as const, includes: ['3-month trend analysis','Category drift detection','Savings rate trend','Quarter-over-quarter comparison'] },
    { type: 'Yearly', color: 'warn' as const, includes: ['Full 12-month overview','YTD savings & investments','Loan payoff progress','SACCO growth','Financial stress trajectory'] },
  ];

  ngOnInit() {
    this.finance.listReports().subscribe({ next: r => this.reports.set(r), error: () => {} });
  }

  onTypeChange() {}

  generateReport() {
    this.generating.set(true);
    const v = this.reportForm.value;
    let period = v.period!;
    if (v.report_type === 'quarterly') period = `${v.year}-Q${v.quarter}`;
    if (v.report_type === 'yearly')    period = String(v.year);

    this.finance.generateReport({
      report_type: v.report_type as any,
      period,
      format: v.format as any,
      include_charts: v.include_charts!,
      include_recommendations: v.include_recommendations!,
    }).subscribe({
      next: blob => {
        const ext = v.format === 'pdf' ? 'pdf' : 'xlsx';
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `finance-report-${period}.${ext}`;
        a.click();
        this.generating.set(false);
        this.snack.open('Report downloaded!', 'OK', { duration: 3000 });
        this.finance.listReports().subscribe(r => this.reports.set(r));
      },
      error: () => {
        this.generating.set(false);
        this.snack.open('Report generation failed. Is the backend running?', 'Dismiss', { duration: 5000 });
      }
    });
  }

  quickExport(fmt: 'excel' | 'csv', _type: string) {
    this.finance.exportData(fmt).subscribe(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `transactions.${fmt === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
    });
  }

  downloadTemplate() {
    this.finance.downloadTemplate().subscribe(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'finance_template_kenya.xlsx';
      a.click();
    });
  }

  downloadExisting(id: string) {
    this.finance.downloadReport(id).subscribe(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `report-${id}.pdf`;
      a.click();
    });
  }
}
