import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FinanceService } from '../../core/services/finance.service';
import { Obligation } from '../../core/models/finance.models';

@Component({
  selector: 'app-sacco',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatDividerModule, MatSnackBarModule, MatProgressBarModule],
  template: `
    <div class="sacco-page">
      <div class="page-header">
        <div><h1>SACCO Tracker</h1><p class="sub">Monitor contributions, dividends, and projected growth</p></div>
        <button mat-flat-button color="primary" (click)="showForm.set(!showForm())">
          <mat-icon>{{ showForm() ? 'close' : 'add' }}</mat-icon>
          {{ showForm() ? 'Cancel' : 'Add SACCO' }}
        </button>
      </div>

      @if (showForm()) {
        <mat-card appearance="outlined" [formGroup]="saccoForm">
          <mat-card-header><mat-card-title>Add SACCO</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outlined"><mat-label>SACCO Name</mat-label><input matInput formControlName="name"></mat-form-field>
              <mat-form-field appearance="outlined"><mat-label>Monthly Contribution (KES)</mat-label><input matInput type="number" formControlName="monthly_amount"></mat-form-field>
              <mat-form-field appearance="outlined"><mat-label>Total Contributed (KES)</mat-label><input matInput type="number" formControlName="total_contributed"></mat-form-field>
              <mat-form-field appearance="outlined"><mat-label>Annual Dividend Rate (%)</mat-label><input matInput type="number" formControlName="dividend_pct"></mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="addSacco()" [disabled]="saccoForm.invalid">
              <mat-icon>save</mat-icon> Save SACCO
            </button>
          </mat-card-actions>
        </mat-card>
      }

      @for (sacco of saccos(); track sacco.id) {
        <mat-card appearance="outlined" class="sacco-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary" style="background:var(--mat-sys-primary-container);border-radius:10px;display:flex;align-items:center;justify-content:center;width:40px;height:40px">savings</mat-icon>
            <mat-card-title>{{ sacco.name }}</mat-card-title>
            <mat-card-subtitle>{{ (sacco.annual_dividend_rate || 0) * 100 | number:'1.0-1' }}% p.a. dividend · KES {{ sacco.monthly_amount | number }}/mo</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="sacco-stats">
              <div class="stat green"><span class="lbl">Current Balance</span><span class="val">KES {{ sacco.total_contributed | number }}</span></div>
              <div class="stat blue"><span class="lbl">Monthly Contribution</span><span class="val">KES {{ sacco.monthly_amount | number }}</span></div>
              <div class="stat purple"><span class="lbl">Projected 1 Year</span><span class="val">KES {{ proj1yr(sacco) | number:'1.0-0' }}</span></div>
              <div class="stat orange"><span class="lbl">Projected 3 Years</span><span class="val">KES {{ proj3yr(sacco) | number:'1.0-0' }}</span></div>
            </div>

            <mat-divider style="margin:16px 0" />

            <div class="growth-section">
              <div class="growth-label">Growth Projection (24 months)</div>
              <div class="growth-table">
                @for (row of growthRows(sacco).filter((_,i) => i % 4 === 0 || i === 23); track row.month) {
                  <div class="growth-row">
                    <span class="growth-mo">{{ row.month }}</span>
                    <div class="growth-bar-bg">
                      <div class="growth-bar" [style.width]="(row.balance / proj3yr(sacco) * 100) + '%'"></div>
                    </div>
                    <span class="growth-val">KES {{ row.balance | number:'1.0-0' }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="ef-check">
              <mat-icon [color]="sacco.total_contributed >= emergencyFundTarget() ? 'primary' : 'warn'">
                {{ sacco.total_contributed >= emergencyFundTarget() ? 'check_circle' : 'warning' }}
              </mat-icon>
              <span>
                Emergency Fund: {{ sacco.total_contributed >= emergencyFundTarget() ? 'Met ✓' : 'Gap of KES ' + (emergencyFundTarget() - sacco.total_contributed | number:'1.0-0') }}
                (Target: KES {{ emergencyFundTarget() | number }})
              </span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-stroked-button color="warn" (click)="deleteSacco(sacco.id)"><mat-icon>delete</mat-icon> Remove</button>
          </mat-card-actions>
        </mat-card>
      }

      @if (saccos().length === 0 && !showForm()) {
        <div class="empty">
          <mat-icon>savings</mat-icon>
          <h3>No SACCO tracked</h3>
          <p>Add your SACCO to track contributions and see compound growth projections.</p>
          <button mat-flat-button color="primary" (click)="showForm.set(true)">Add SACCO</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .sacco-page{display:flex;flex-direction:column;gap:16px}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start}
    .page-header h1{font-size:22px;font-weight:500;margin:0}
    .sub{color:var(--mat-sys-on-surface-variant);font-size:13px;margin:4px 0 0}
    .form-row{display:flex;gap:12px;flex-wrap:wrap}
    .form-row mat-form-field{flex:1;min-width:180px}
    .sacco-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
    .stat{display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:8px}
    .green{background:#e8f5e9}.blue{background:#e3f2fd}.purple{background:#f3e5f5}.orange{background:#fff3e0}
    .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#555}
    .val{font-size:14px;font-weight:600;margin-top:2px}
    .growth-section{margin-top:4px}
    .growth-label{font-size:11px;font-weight:500;color:var(--mat-sys-on-surface-variant);margin-bottom:8px}
    .growth-table{display:flex;flex-direction:column;gap:4px}
    .growth-row{display:flex;align-items:center;gap:8px;font-size:11px}
    .growth-mo{width:52px;color:var(--mat-sys-on-surface-variant);flex-shrink:0}
    .growth-bar-bg{flex:1;height:14px;background:var(--mat-sys-surface-container);border-radius:3px;overflow:hidden}
    .growth-bar{height:100%;background:var(--mat-sys-primary);border-radius:3px;transition:width 0.3s}
    .growth-val{width:100px;text-align:right;font-weight:500;flex-shrink:0}
    .ef-check{display:flex;align-items:center;gap:8px;margin-top:16px;padding:10px 12px;background:var(--mat-sys-surface-container);border-radius:8px;font-size:12px}
    .empty{display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px;text-align:center;color:var(--mat-sys-on-surface-variant)}
    .empty mat-icon{font-size:48px}
  `]
})
export class SaccoComponent implements OnInit {
  private finance = inject(FinanceService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  saccos = signal<Obligation[]>([]);
  showForm = signal(false);
  saccoForm = this.fb.group({
    name: ['', Validators.required],
    monthly_amount: [null, [Validators.required, Validators.min(1)]],
    total_contributed: [0],
    dividend_pct: [12.5],
  });
  ngOnInit() { this.loadSaccos(); }
  loadSaccos() { this.finance.getObligations().subscribe(obs => this.saccos.set(obs.filter(o => o.obligation_type === 'SACCO'))); }
  addSacco() {
    const v = this.saccoForm.value;
    this.finance.upsertObligation({ obligation_type: 'SACCO', name: v.name!, monthly_amount: v.monthly_amount!,
      total_contributed: v.total_contributed ?? 0, annual_dividend_rate: (v.dividend_pct ?? 0) / 100 })
    .subscribe(() => { this.snack.open('SACCO saved!','OK',{duration:3000}); this.showForm.set(false); this.loadSaccos(); });
  }
  deleteSacco(id: number) { this.finance.deleteObligation(id).subscribe(() => { this.snack.open('Removed','OK',{duration:2000}); this.loadSaccos(); }); }
  proj(s: Obligation, years: number) {
    let bal = s.total_contributed ?? 0, mr = (s.annual_dividend_rate ?? 0) / 12;
    for (let i = 0; i < years * 12; i++) bal = (bal + s.monthly_amount) * (1 + mr);
    return bal;
  }
  proj1yr(s: Obligation) { return this.proj(s, 1); }
  proj3yr(s: Obligation) { return this.proj(s, 3); }
  emergencyFundTarget() { return 134200 * 3; } // 3 months avg expenses
  growthRows(s: Obligation) {
    const rows: any[] = [];
    let bal = s.total_contributed ?? 0, mr = (s.annual_dividend_rate ?? 0) / 12;
    const today = new Date();
    for (let i = 0; i < 24; i++) {
      bal = (bal + s.monthly_amount) * (1 + mr);
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      rows.push({ month: d.toLocaleString('en-KE',{month:'short',year:'2-digit'}), balance: Math.round(bal) });
    }
    return rows;
  }
}
