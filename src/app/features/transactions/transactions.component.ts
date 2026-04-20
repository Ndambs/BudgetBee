import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { ViewChild, AfterViewInit } from '@angular/core';
import { FinanceService } from '../../core/services/finance.service';
import { Income, Expense, ExpenseCategory, IncomeSource } from '../../core/models/finance.models';

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent','Car','Shopping','Utilities',
  'Church / Donations','Family Support','Entertainment','Miscellaneous'
];

const INCOME_SOURCES: IncomeSource[] = [
  'Salary','Side Hustle - Freelance','Side Hustle - Business','Bonus','Other'
];

const SUBCATEGORIES: Record<string, string[]> = {
  'Rent': ['Monthly Rent','Deposit'],
  'Car': ['Fuel','Maintenance','Insurance','Parking','Service'],
  'Shopping': ['Groceries','Personal Care','Clothing','Electronics'],
  'Utilities': ['Electricity (KPLC)','Water','Internet','Airtime/Data'],
  'Church / Donations': ['Tithe','Offering','Charity','Community'],
  'Family Support': ['Parents','Siblings','School Fees','Medical'],
  'Entertainment': ['Dining Out','Movies','Travel/Holiday','Subscriptions'],
  'Miscellaneous': ['Gifts','Emergency','Other'],
};

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, DatePipe, CurrencyPipe,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatCardModule, MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatTabsModule,
    MatDialogModule, MatSnackBarModule, MatChipsModule, MatCheckboxModule,
    MatMenuModule, MatDividerModule, MatDatepickerModule,
    MatNativeDateModule, MatTooltipModule,
  ],
  template: `
    <div class="transactions-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Transactions</h1>
          <p class="page-sub">Manage all income and expense entries</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button [matMenuTriggerFor]="addMenu" color="primary">
            <mat-icon>add</mat-icon> Add Entry
          </button>
          <mat-menu #addMenu>
            <button mat-menu-item (click)="activeTab.set('income'); openAddDialog('income')">
              <mat-icon>trending_up</mat-icon> Income
            </button>
            <button mat-menu-item (click)="activeTab.set('expenses'); openAddDialog('expense')">
              <mat-icon>trending_down</mat-icon> Expense
            </button>
          </mat-menu>
          <button mat-stroked-button [matMenuTriggerFor]="exportMenu">
            <mat-icon>download</mat-icon> Export
          </button>
          <mat-menu #exportMenu>
            <button mat-menu-item (click)="export('excel')"><mat-icon>table_chart</mat-icon> Excel</button>
            <button mat-menu-item (click)="export('csv')"><mat-icon>description</mat-icon> CSV</button>
          </mat-menu>
        </div>
      </div>

      <!-- Filters bar -->
      <mat-card appearance="outlined" class="filter-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outlined" class="search-field">
              <mat-label>Search transactions</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput (input)="applyFilter($event)">
            </mat-form-field>
            <mat-form-field appearance="outlined">
              <mat-label>Category</mat-label>
              <mat-select [(value)]="categoryFilter" (selectionChange)="loadExpenses()">
                <mat-option value="">All</mat-option>
                @for (cat of categories; track cat) {
                  <mat-option [value]="cat">{{ cat }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outlined">
              <mat-label>Month</mat-label>
              <mat-select [(value)]="monthFilter" (selectionChange)="loadAll()">
                <mat-option value="">All months</mat-option>
                @for (m of months; track m.value) {
                  <mat-option [value]="m.value">{{ m.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-stroked-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon> Clear
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Tabs -->
      <mat-card appearance="outlined">
        <mat-tab-group [selectedIndex]="activeTab() === 'income' ? 0 : 1" (selectedIndexChange)="onTabChange($event)">

          <!-- INCOME TAB -->
          <mat-tab label="Income ({{ incomeTotal() | currency:'KES ':'symbol':'1.0-0' }})">
            @if (selection.hasValue()) {
              <div class="bulk-actions">
                <span>{{ selection.selected.length }} selected</span>
                <button mat-stroked-button color="warn" (click)="bulkDelete()">
                  <mat-icon>delete</mat-icon> Delete Selected
                </button>
              </div>
            }
            <table mat-table [dataSource]="incomeDataSource" matSort class="data-table">
              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef>
                  <mat-checkbox (change)="$event ? masterToggle() : null"
                    [checked]="selection.hasValue() && isAllSelected()"
                    [indeterminate]="selection.hasValue() && !isAllSelected()" />
                </th>
                <td mat-cell *matCellDef="let row">
                  <mat-checkbox (click)="$event.stopPropagation()"
                    (change)="$event ? selection.toggle(row) : null"
                    [checked]="selection.isSelected(row)" />
                </td>
              </ng-container>
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                <td mat-cell *matCellDef="let row">{{ row.date | date:'dd MMM yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="source">
                <th mat-header-cell *matHeaderCellDef>Source</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip [color]="row.source === 'Salary' ? 'primary' : 'accent'" highlighted>
                    {{ row.source }}
                  </mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let row">{{ row.description }}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
                <td mat-cell *matCellDef="let row" class="amount-cell income-amount">
                  + KES {{ row.amount | number }}
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button (click)="editIncome(row)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteIncome(row.id)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="incomeColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: incomeColumns;" class="data-row"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell no-data" colspan="6">No income records found</td>
              </tr>
            </table>
            <mat-paginator [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
          </mat-tab>

          <!-- EXPENSES TAB -->
          <mat-tab label="Expenses ({{ expenseTotal() | currency:'KES ':'symbol':'1.0-0' }})">
            <table mat-table [dataSource]="expenseDataSource" matSort class="data-table">
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                <td mat-cell *matCellDef="let row">{{ row.date | date:'dd MMM yyyy' }}</td>
              </ng-container>
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>Category</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip>{{ row.category }}</mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="subcategory">
                <th mat-header-cell *matHeaderCellDef>Subcategory</th>
                <td mat-cell *matCellDef="let row">{{ row.subcategory }}</td>
              </ng-container>
              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let row">{{ row.description }}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Amount</th>
                <td mat-cell *matCellDef="let row" class="amount-cell expense-amount">
                  − KES {{ row.amount | number }}
                </td>
              </ng-container>
              <ng-container matColumnDef="essential">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip [color]="row.is_essential ? 'primary' : 'accent'" variant="outlined">
                    {{ row.is_essential ? 'Essential' : 'Discretionary' }}
                  </mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button (click)="editExpense(row)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteExpense(row.id)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="expenseColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: expenseColumns;" class="data-row"></tr>
              <tr class="mat-row" *matNoDataRow>
                <td class="mat-cell no-data" colspan="7">No expenses found</td>
              </tr>
            </table>
            <mat-paginator [pageSizeOptions]="[10,25,50]" showFirstLastButtons></mat-paginator>
          </mat-tab>

        </mat-tab-group>
      </mat-card>

      <!-- Quick Add Inline Form (shown when addMode is active) -->
      @if (showForm()) {
        <mat-card appearance="outlined" class="quick-form">
          <mat-card-header>
            <mat-card-title>{{ addType() === 'income' ? 'Add Income' : 'Add Expense' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content [formGroup]="entryForm">
            <div class="form-row">
              <mat-form-field appearance="outlined">
                <mat-label>Date</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="date">
                <mat-datepicker-toggle matSuffix [for]="picker" />
                <mat-datepicker #picker />
              </mat-form-field>

              @if (addType() === 'income') {
                <mat-form-field appearance="outlined">
                  <mat-label>Source</mat-label>
                  <mat-select formControlName="source">
                    @for (s of incomeSources; track s) {
                      <mat-option [value]="s">{{ s }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              } @else {
                <mat-form-field appearance="outlined">
                  <mat-label>Category</mat-label>
                  <mat-select formControlName="category" (selectionChange)="onCatChange()">
                    @for (c of categories; track c) {
                      <mat-option [value]="c">{{ c }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outlined">
                  <mat-label>Subcategory</mat-label>
                  <mat-select formControlName="subcategory">
                    @for (s of currentSubcategories(); track s) {
                      <mat-option [value]="s">{{ s }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }

              <mat-form-field appearance="outlined">
                <mat-label>Description</mat-label>
                <input matInput formControlName="description">
              </mat-form-field>
              <mat-form-field appearance="outlined">
                <mat-label>Amount (KES)</mat-label>
                <input matInput type="number" formControlName="amount" min="1">
                <span matPrefix>KES&nbsp;</span>
              </mat-form-field>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="submitEntry()" [disabled]="entryForm.invalid">
              <mat-icon>save</mat-icon> Save
            </button>
            <button mat-stroked-button (click)="showForm.set(false)">Cancel</button>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .transactions-page { display: flex; flex-direction: column; gap: 16px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .page-title { font-size: 22px; font-weight: 500; margin: 0; }
    .page-sub { color: var(--mat-sys-on-surface-variant); margin: 4px 0 0; font-size: 13px; }
    .header-actions { display: flex; gap: 8px; }
    .filter-card mat-card-content { padding: 12px !important; }
    .filters-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .search-field { flex: 1; min-width: 200px; }
    .data-table { width: 100%; }
    .data-row:hover { background: var(--mat-sys-surface-container-high); }
    .amount-cell { font-weight: 600; font-variant-numeric: tabular-nums; }
    .income-amount { color: #1a7a3c; }
    .expense-amount { color: #c0392b; }
    .no-data { text-align: center; padding: 32px; color: var(--mat-sys-on-surface-variant); }
    .bulk-actions { display: flex; align-items: center; gap: 12px; padding: 8px 16px; background: var(--mat-sys-surface-container); }
    .quick-form { margin-top: 8px; }
    .form-row { display: flex; gap: 12px; flex-wrap: wrap; padding: 4px 0; }
    .form-row mat-form-field { flex: 1; min-width: 160px; }
  `]
})
export class TransactionsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private finance = inject(FinanceService);
  private snack   = inject(MatSnackBar);
  private fb      = inject(FormBuilder);

  activeTab   = signal<'income' | 'expenses'>('income');
  showForm    = signal(false);
  addType     = signal<'income' | 'expense'>('income');
  categories  = EXPENSE_CATEGORIES;
  incomeSources = INCOME_SOURCES;
  categoryFilter = '';
  monthFilter    = '';

  incomeColumns  = ['select','date','source','description','amount','actions'];
  expenseColumns = ['date','category','subcategory','description','amount','essential','actions'];

  incomeDataSource  = new MatTableDataSource<Income>([]);
  expenseDataSource = new MatTableDataSource<Expense>([]);
  selection = new SelectionModel<Income>(true, []);

  incomeTotal  = signal(0);
  expenseTotal = signal(0);
  currentSubcategories = signal<string[]>([]);

  months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return { value: d.toISOString().slice(0, 7), label: d.toLocaleString('en-KE', { month: 'short', year: 'numeric' }) };
  });

  entryForm = this.fb.group({
    date:        [new Date(), Validators.required],
    source:      ['Salary'],
    category:    ['Shopping'],
    subcategory: [''],
    description: [''],
    amount:      [null, [Validators.required, Validators.min(1)]],
  });

  ngOnInit() { this.loadAll(); }

  ngAfterViewInit() {
    this.incomeDataSource.paginator  = this.paginator;
    this.incomeDataSource.sort = this.sort;
  }

  loadAll() { this.loadIncome(); this.loadExpenses(); }

  loadIncome() {
    this.finance.getIncome({ month: this.monthFilter || undefined }).subscribe(res => {
      this.incomeDataSource.data = res.items ?? [];
      this.incomeTotal.set(res.items?.reduce((s, r) => s + r.amount, 0) ?? 0);
    });
  }

  loadExpenses() {
    this.finance.getExpenses({ month: this.monthFilter || undefined, category: this.categoryFilter || undefined }).subscribe(res => {
      this.expenseDataSource.data = res.items ?? [];
      this.expenseTotal.set(res.items?.reduce((s, r) => s + r.amount, 0) ?? 0);
    });
  }

  applyFilter(event: Event) {
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.incomeDataSource.filter  = val;
    this.expenseDataSource.filter = val;
  }

  clearFilters() { this.categoryFilter = ''; this.monthFilter = ''; this.loadAll(); }

  onTabChange(idx: number) { this.activeTab.set(idx === 0 ? 'income' : 'expenses'); }

  openAddDialog(type: 'income' | 'expense') {
    this.addType.set(type);
    this.entryForm.reset({ date: new Date(), source: 'Salary', category: 'Shopping', amount: null });
    this.showForm.set(true);
  }

  onCatChange() {
    const cat = this.entryForm.get('category')?.value ?? '';
    this.currentSubcategories.set(SUBCATEGORIES[cat] ?? []);
  }

  submitEntry() {
    if (this.entryForm.invalid) return;
    const v = this.entryForm.value;
    const dateStr = (v.date as Date).toISOString().slice(0, 10);

    if (this.addType() === 'income') {
      this.finance.addIncome({ date: dateStr, source: v.source as any, description: v.description ?? '', amount: v.amount! }).subscribe({
        next: () => { this.snack.open('Income added!', 'OK', { duration: 3000 }); this.showForm.set(false); this.loadIncome(); },
      });
    } else {
      this.finance.addExpense({ date: dateStr, category: v.category as any, subcategory: v.subcategory ?? '', description: v.description ?? '', amount: v.amount! }).subscribe({
        next: () => { this.snack.open('Expense added!', 'OK', { duration: 3000 }); this.showForm.set(false); this.loadExpenses(); },
      });
    }
  }

  editIncome(row: Income) { this.addType.set('income'); this.entryForm.patchValue({ ...row, date: new Date(row.date) }); this.showForm.set(true); }
  editExpense(row: Expense) { this.addType.set('expense'); this.entryForm.patchValue({ ...row, date: new Date(row.date) }); this.showForm.set(true); }

  deleteIncome(id: number) {
    if (!confirm('Delete this income record?')) return;
    this.finance.deleteIncome(id).subscribe(() => { this.snack.open('Deleted', 'OK', { duration: 2000 }); this.loadIncome(); });
  }
  deleteExpense(id: number) {
    if (!confirm('Delete this expense?')) return;
    this.finance.deleteExpense(id).subscribe(() => { this.snack.open('Deleted', 'OK', { duration: 2000 }); this.loadExpenses(); });
  }

  isAllSelected() { return this.selection.selected.length === this.incomeDataSource.data.length; }
  masterToggle()  { this.isAllSelected() ? this.selection.clear() : this.incomeDataSource.data.forEach(r => this.selection.select(r)); }

  bulkDelete() {
    const ids = this.selection.selected.map(r => r.id);
    this.finance.bulkDeleteExpenses(ids).subscribe(() => { this.selection.clear(); this.loadIncome(); });
  }

  export(fmt: 'excel' | 'csv') {
    this.finance.exportData(fmt, { month: this.monthFilter }).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `transactions.${fmt === 'excel' ? 'xlsx' : 'csv'}`; a.click();
    });
  }
}
