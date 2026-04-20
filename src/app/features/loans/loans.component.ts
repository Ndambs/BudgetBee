import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatTableModule } from "@angular/material/table";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";
import { FinanceService } from "../../core/services/finance.service";
import { Obligation } from "../../core/models/finance.models";

@Component({
  selector: "app-loans",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatTableModule,
    MatProgressBarModule, MatSnackBarModule],
  template: `
    <div class="loans-page">
      <div class="page-header">
        <div><h1>Loan Tracker</h1><p class="sub">Track progress and amortization</p></div>
        <button mat-flat-button color="primary" (click)="showAddForm.set(!showAddForm())">
          <mat-icon>{{ showAddForm() ? "close" : "add" }}</mat-icon>
          {{ showAddForm() ? "Cancel" : "Add Loan" }}
        </button>
      </div>

      @if (showAddForm()) {
        <mat-card appearance="outlined" [formGroup]="loanForm">
          <mat-card-header><mat-card-title>New Loan</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="form-row">
              <mat-form-field appearance="outlined"><mat-label>Lender Name</mat-label><input matInput formControlName="name"></mat-form-field>
              <mat-form-field appearance="outlined"><mat-label>Monthly Payment (KES)</mat-label><input matInput type="number" formControlName="monthly_amount"></mat-form-field>
              <mat-form-field appearance="outlined"><mat-label>Annual Rate (%)</mat-label><input matInput type="number" formControlName="annual_rate_pct"></mat-form-field>
              <mat-form-field appearance="outlined"><mat-label>Remaining Balance (KES)</mat-label><input matInput type="number" formControlName="remaining_balance"></mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="addLoan()" [disabled]="loanForm.invalid">
              <mat-icon>save</mat-icon> Save
            </button>
          </mat-card-actions>
        </mat-card>
      }

      @for (loan of loans(); track loan.id) {
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">credit_card</mat-icon>
            <mat-card-title>{{ loan.name }}</mat-card-title>
            <mat-card-subtitle>KES {{ loan.monthly_amount | number }} /mo @ {{ (loan.annual_rate || 0) * 100 | number:"1.0-0" }}% p.a.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="loan-stats">
              <div class="stat"><span class="lbl">Remaining Balance</span><span class="val warn">KES {{ loan.remaining_balance | number }}</span></div>
              <div class="stat"><span class="lbl">Monthly Interest</span><span class="val">KES {{ monthlyInterest(loan) | number:"1.0-0" }}</span></div>
              <div class="stat"><span class="lbl">Monthly Principal</span><span class="val ok">KES {{ monthlyPrincipal(loan) | number:"1.0-0" }}</span></div>
              <div class="stat"><span class="lbl">Months Remaining</span><span class="val">{{ monthsLeft(loan) | number:"1.0-0" }}</span></div>
            </div>
            <div style="margin:12px 0 4px;font-size:11px;color:var(--mat-sys-on-surface-variant)">Payoff Progress</div>
            <mat-progress-bar [value]="payoffPct(loan)" color="primary" mode="determinate" />
            <div style="font-size:11px;text-align:right;margin-top:4px;color:var(--mat-sys-on-surface-variant)">
              {{ payoffPct(loan) | number:"1.0-1" }}% paid off · Est. payoff: {{ payoffDate(loan) }}
            </div>

            <table mat-table [dataSource]="amortRows(loan).slice(0,6)" style="width:100%;margin-top:16px;font-size:12px">
              <ng-container matColumnDef="month"><th mat-header-cell *matHeaderCellDef>Month</th><td mat-cell *matCellDef="let r">{{ r.month }}</td></ng-container>
              <ng-container matColumnDef="payment"><th mat-header-cell *matHeaderCellDef>Payment</th><td mat-cell *matCellDef="let r">KES {{ r.payment | number }}</td></ng-container>
              <ng-container matColumnDef="interest"><th mat-header-cell *matHeaderCellDef>Interest</th><td mat-cell *matCellDef="let r" style="color:#c0392b">KES {{ r.interest | number:"1.0-0" }}</td></ng-container>
              <ng-container matColumnDef="principal"><th mat-header-cell *matHeaderCellDef>Principal</th><td mat-cell *matCellDef="let r" style="color:#1a7a3c">KES {{ r.principal | number:"1.0-0" }}</td></ng-container>
              <ng-container matColumnDef="balance"><th mat-header-cell *matHeaderCellDef>Balance</th><td mat-cell *matCellDef="let r">KES {{ r.closing_balance | number }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let r; columns: cols;"></tr>
            </table>
          </mat-card-content>
          <mat-card-actions>
            <button mat-stroked-button color="warn" (click)="deleteLoan(loan.id)"><mat-icon>delete</mat-icon> Remove</button>
          </mat-card-actions>
        </mat-card>
      }

      @if (loans().length === 0 && !showAddForm()) {
        <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:48px;text-align:center;color:var(--mat-sys-on-surface-variant)">
          <mat-icon style="font-size:48px">credit_card_off</mat-icon>
          <h3>No loans tracked</h3><p>Add your first loan to start tracking payments.</p>
          <button mat-flat-button color="primary" (click)="showAddForm.set(true)">Add Loan</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .loans-page{display:flex;flex-direction:column;gap:16px}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start}
    .page-header h1{font-size:22px;font-weight:500;margin:0}
    .sub{color:var(--mat-sys-on-surface-variant);font-size:13px;margin:4px 0 0}
    .form-row{display:flex;gap:12px;flex-wrap:wrap}
    .form-row mat-form-field{flex:1;min-width:180px}
    .loan-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
    .stat{display:flex;flex-direction:column;gap:2px}
    .lbl{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--mat-sys-on-surface-variant)}
    .val{font-size:15px;font-weight:500}
    .warn{color:#c0392b}.ok{color:#1a7a3c}
  `]
})
export class LoansComponent implements OnInit {
  private finance = inject(FinanceService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  loans = signal<Obligation[]>([]);
  showAddForm = signal(false);
  cols = ["month","payment","interest","principal","balance"];
  loanForm = this.fb.group({
    name: ["", Validators.required],
    monthly_amount: [null, [Validators.required, Validators.min(1)]],
    annual_rate_pct: [14],
    remaining_balance: [null, [Validators.required, Validators.min(0)]],
  });
  ngOnInit() { this.loadLoans(); }
  loadLoans() { this.finance.getObligations().subscribe(obs => this.loans.set(obs.filter(o => o.obligation_type === "Loan"))); }
  addLoan() {
    const v = this.loanForm.value;
    this.finance.upsertObligation({ obligation_type: "Loan", name: v.name!, monthly_amount: v.monthly_amount!,
      annual_rate: (v.annual_rate_pct ?? 0) / 100, remaining_balance: v.remaining_balance! })
    .subscribe(() => { this.snack.open("Loan saved!","OK",{duration:3000}); this.showAddForm.set(false); this.loadLoans(); });
  }
  deleteLoan(id: number) { this.finance.deleteObligation(id).subscribe(() => { this.snack.open("Removed","OK",{duration:2000}); this.loadLoans(); }); }
  monthlyInterest(l: Obligation) { return (l.remaining_balance ?? 0) * ((l.annual_rate ?? 0) / 12); }
  monthlyPrincipal(l: Obligation) { return l.monthly_amount - this.monthlyInterest(l); }
  monthsLeft(l: Obligation) {
    const bal = l.remaining_balance ?? 0, r = (l.annual_rate ?? 0) / 12, p = l.monthly_amount;
    if (r === 0) return bal / p;
    return -Math.log(1 - (bal * r / p)) / Math.log(1 + r);
  }
  payoffPct(l: Obligation) {
    const mos = this.monthsLeft(l), total = mos * l.monthly_amount + (l.remaining_balance ?? 0);
    return total > 0 ? Math.min(100, ((total - (l.remaining_balance ?? 0)) / total) * 100) : 0;
  }
  payoffDate(l: Obligation) {
    const mos = Math.round(this.monthsLeft(l));
    const d = new Date(); d.setMonth(d.getMonth() + mos);
    return d.toLocaleString("en-KE", {month:"short",year:"numeric"});
  }
  amortRows(l: Obligation) {
    const rows: any[] = [];
    let bal = l.remaining_balance ?? 0, rate = (l.annual_rate ?? 0) / 12, pmt = l.monthly_amount;
    const today = new Date();
    for (let i = 0; i < 12 && bal > 0; i++) {
      const interest = bal * rate, principal = Math.min(pmt - interest, bal), closing = bal - principal;
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      rows.push({ month: d.toLocaleString("en-KE",{month:"short",year:"2-digit"}),
        payment: Math.round(pmt), interest: Math.round(interest),
        principal: Math.round(principal), closing_balance: Math.round(Math.max(0,closing)) });
      bal = Math.max(0, closing);
    }
    return rows;
  }
}
