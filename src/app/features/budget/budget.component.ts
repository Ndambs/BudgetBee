import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSliderModule } from '@angular/material/slider';
import { FinanceService } from '../../core/services/finance.service';
import { ExpenseCategory, BudgetItem } from '../../core/models/finance.models';

const CATS: ExpenseCategory[] = ['Rent','Car','Shopping','Utilities','Church / Donations','Family Support','Entertainment','Miscellaneous'];
const ICONS: Record<string, string> = { 'Rent':'home','Car':'directions_car','Shopping':'shopping_cart','Utilities':'bolt','Church / Donations':'church','Family Support':'family_restroom','Entertainment':'movie','Miscellaneous':'more_horiz' };
const COLORS: Record<string, string> = { 'Rent':'#e74c3c','Car':'#e67e22','Shopping':'#f39c12','Utilities':'#27ae60','Church / Donations':'#8e44ad','Family Support':'#2980b9','Entertainment':'#16a085','Miscellaneous':'#7f8c8d' };

@Component({
  selector: 'app-budget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressBarModule, MatSnackBarModule, MatSelectModule,
    MatChipsModule, MatSliderModule],
  template: `
    <div class="budget-page">
      <div class="page-header">
        <div><h1>Budget Manager</h1><p class="sub">Set monthly limits per category and track adherence</p></div>
        <div style="display:flex;gap:8px">
          <button mat-stroked-button (click)="copyFromLast()"><mat-icon>content_copy</mat-icon> Copy Last Month</button>
          <button mat-flat-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-icon>save</mat-icon> {{ saving() ? 'Saving…' : 'Save Budget' }}
          </button>
        </div>
      </div>

      <div class="top-bar">
        <mat-form-field appearance="outlined" style="width:200px">
          <mat-label>Budget Month</mat-label>
          <mat-select [(value)]="month" (selectionChange)="load()">
            @for (m of months; track m.value) { <mat-option [value]="m.value">{{ m.label }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-chip-set>
          <mat-chip highlighted color="primary"><mat-icon matChipAvatar>account_balance_wallet</mat-icon>Total: KES {{ total() | number }}</mat-chip>
          <mat-chip [color]="overCount() > 0 ? 'warn' : 'primary'"><mat-icon matChipAvatar>warning</mat-icon>{{ overCount() }} over budget</mat-chip>
        </mat-chip-set>
      </div>

      <div class="budget-grid" [formGroup]="form">
        <ng-container formArrayName="items">
          @for (cat of cats; track cat; let i = $index) {
            <mat-card appearance="outlined" [class.over]="isOver(cat, i)">
              <mat-card-header>
                <mat-icon mat-card-avatar [style.background]="color(cat)" style="display:flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:9px;color:white;font-size:18px">{{ icon(cat) }}</mat-icon>
                <mat-card-title>{{ cat }}</mat-card-title>
                <mat-card-subtitle>Actual: KES {{ actual(cat) | number }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content [formGroupName]="i">
                <mat-form-field appearance="outlined" style="width:100%">
                  <mat-label>Monthly Limit (KES)</mat-label>
                  <input matInput type="number" formControlName="monthly_limit" min="0" step="1000">
                  <mat-icon matSuffix>attach_money</mat-icon>
                </mat-form-field>
                <div style="margin-bottom:8px">
                  <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--mat-sys-on-surface-variant);margin-bottom:4px">
                    <span>{{ pct(cat, i) | number:'1.0-0' }}% used</span>
                    <span [style.color]="isOver(cat,i)?'#c0392b':''">KES {{ remaining(cat,i) | number }} {{ isOver(cat,i) ? 'over' : 'left' }}</span>
                  </div>
                  <mat-progress-bar [value]="pct(cat,i)" [color]="pct(cat,i)>100?'warn':pct(cat,i)>80?'accent':'primary'" mode="determinate" />
                </div>
              </mat-card-content>
            </mat-card>
          }
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .budget-page{display:flex;flex-direction:column;gap:16px}
    .page-header{display:flex;justify-content:space-between;align-items:flex-start}
    .page-header h1{font-size:22px;font-weight:500;margin:0}
    .sub{color:var(--mat-sys-on-surface-variant);font-size:13px;margin:4px 0 0}
    .top-bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
    .budget-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
    .over{border-color:var(--mat-sys-error)!important}
  `]
})
export class BudgetComponent implements OnInit {
  private finance = inject(FinanceService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  cats = CATS;
  month = new Date().toISOString().slice(0,7);
  saving = signal(false);
  actualsMap: Record<string, number> = {};
  months = Array.from({length:12},(_,i)=>{ const d=new Date(); d.setMonth(d.getMonth()-i); return {value:d.toISOString().slice(0,7), label:d.toLocaleString('en-KE',{month:'long',year:'numeric'})}; });
  form = this.fb.group({ items: this.fb.array(CATS.map(()=>this.fb.group({ monthly_limit:[50000,[Validators.min(0)]] }))) });
  get ia() { return this.form.get('items') as FormArray; }
  total = () => CATS.reduce((_,__,i)=>_+this.limit(i),0);
  overCount = () => CATS.filter((c,i)=>this.actualsMap[c]>this.limit(i)).length;
  ngOnInit() { this.load(); }
  load() {
    this.finance.getDashboard(this.month).subscribe(d => { d.category_breakdown.forEach(c=>{this.actualsMap[c.category]=c.total;}); });
    this.finance.getBudget(this.month).subscribe({ next: b=>{ b.items.forEach(item=>{ const idx=CATS.indexOf(item.category as ExpenseCategory); if(idx>=0) this.ia.at(idx).patchValue(item); }); }, error:()=>{} });
  }
  save() {
    this.saving.set(true);
    const items = CATS.map((cat,i)=>({category:cat,...this.ia.at(i).value}));
    this.finance.saveBudget({month:this.month,items}).subscribe({ next:()=>{this.snack.open('Saved!','OK',{duration:3000});this.saving.set(false);}, error:()=>this.saving.set(false) });
  }
  copyFromLast() {
    const prev = new Date(this.month+'-01'); prev.setMonth(prev.getMonth()-1);
    this.finance.copyBudget(prev.toISOString().slice(0,7),this.month).subscribe({ next:()=>{this.snack.open('Copied!','OK',{duration:3000});this.load();}, error:()=>this.snack.open('No previous budget found','OK',{duration:3000}) });
  }
  limit(i: number) { return Number(this.ia.at(i).get('monthly_limit')?.value??0); }
  actual(c: string) { return this.actualsMap[c]??0; }
  pct(c:string,i:number) { const l=this.limit(i); return l?Math.min(120,this.actual(c)/l*100):0; }
  remaining(c:string,i:number) { return Math.abs(this.limit(i)-this.actual(c)); }
  isOver(c:string,i:number) { return this.actual(c)>this.limit(i); }
  icon(c:string) { return ICONS[c]??'label'; }
  color(c:string) { return COLORS[c]??'#666'; }
}
