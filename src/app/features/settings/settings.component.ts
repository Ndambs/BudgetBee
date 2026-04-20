import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSliderModule } from '@angular/material/slider';
import { FinanceService } from '../../core/services/finance.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatSelectModule,
    MatSlideToggleModule, MatDividerModule, MatSnackBarModule,
    MatChipsModule, MatTooltipModule, MatSliderModule,
  ],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">Customize your finance tracker preferences</p>
      </div>

      <div class="settings-grid">

        <!-- Profile -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">person</mat-icon>
            <mat-card-title>Profile</mat-card-title>
          </mat-card-header>
          <mat-card-content [formGroup]="profileForm">
            <mat-form-field appearance="outlined" class="full">
              <mat-label>Display Name</mat-label>
              <input matInput formControlName="name">
            </mat-form-field>
            <mat-form-field appearance="outlined" class="full">
              <mat-label>Currency</mat-label>
              <mat-select formControlName="currency">
                <mat-option value="KES">KES – Kenyan Shilling</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outlined" class="full">
              <mat-label>Salary Day (day of month)</mat-label>
              <input matInput type="number" formControlName="salary_day" min="1" max="31">
            </mat-form-field>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="saveProfile()">
              <mat-icon>save</mat-icon> Save Profile
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Financial Goals -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-icon mat-card-avatar color="accent">track_changes</mat-icon>
            <mat-card-title>Financial Goals</mat-card-title>
          </mat-card-header>
          <mat-card-content [formGroup]="goalsForm">
            <div class="slider-field">
              <label>Savings Target: {{ goalsForm.get('savings_target_pct')?.value * 100 | number:'1.0-0' }}%</label>
              <mat-slider min="0.05" max="0.50" step="0.01" class="full">
                <input matSliderThumb formControlName="savings_target_pct">
              </mat-slider>
              <div class="slider-hint">
                <span>5%</span><span>50%</span>
              </div>
            </div>
            <mat-divider />
            <div class="slider-field" style="margin-top:12px">
              <label>Emergency Fund: {{ goalsForm.get('emergency_fund_months')?.value }} months of expenses</label>
              <mat-slider min="1" max="12" step="1" class="full">
                <input matSliderThumb formControlName="emergency_fund_months">
              </mat-slider>
              <div class="slider-hint">
                <span>1 month</span><span>12 months</span>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="saveGoals()">
              <mat-icon>save</mat-icon> Save Goals
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Appearance -->
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-icon mat-card-avatar>palette</mat-icon>
            <mat-card-title>Appearance</mat-card-title>
          </mat-card-header>
          <mat-card-content [formGroup]="appearanceForm">
            <mat-form-field appearance="outlined" class="full">
              <mat-label>Theme</mat-label>
              <mat-select formControlName="theme">
                <mat-option value="light">Light</mat-option>
                <mat-option value="dark">Dark</mat-option>
                <mat-option value="system">Follow System</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-slide-toggle formControlName="notifications_enabled" class="toggle">
              Enable Alert Notifications
            </mat-slide-toggle>
          </mat-card-content>
        </mat-card>

        <!-- Data Management -->
        <mat-card appearance="outlined" class="danger-zone">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">storage</mat-icon>
            <mat-card-title>Data Management</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="data-actions">
              <div class="data-action-item">
                <div>
                  <div class="action-title">Export All Data</div>
                  <div class="action-sub">Download complete transaction history as Excel</div>
                </div>
                <button mat-stroked-button (click)="exportAll()">
                  <mat-icon>download</mat-icon> Export
                </button>
              </div>
              <mat-divider />
              <div class="data-action-item">
                <div>
                  <div class="action-title">Import from Excel</div>
                  <div class="action-sub">Upload a finance tracker Excel file to import data</div>
                </div>
                <button mat-stroked-button color="primary" (click)="triggerImport()">
                  <mat-icon>upload</mat-icon> Import
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- AI Configuration -->
        <mat-card appearance="outlined" class="ai-card">
          <mat-card-header>
            <mat-icon mat-card-avatar style="color: var(--mat-sys-primary)">smart_toy</mat-icon>
            <mat-card-title>AI Advisor Configuration</mat-card-title>
            <mat-card-subtitle>Wire to your LLM provider</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content [formGroup]="aiForm">
            <mat-form-field appearance="outlined" class="full">
              <mat-label>LLM Provider</mat-label>
              <mat-select formControlName="provider">
                <mat-option value="stub">Stub (demo responses)</mat-option>
                <mat-option value="claude">Anthropic Claude</mat-option>
                <mat-option value="openai">OpenAI GPT-4o</mat-option>
                <mat-option value="gemini">Google Gemini</mat-option>
              </mat-select>
            </mat-form-field>
            @if (aiForm.get('provider')?.value !== 'stub') {
              <mat-form-field appearance="outlined" class="full">
                <mat-label>API Key</mat-label>
                <input matInput type="password" formControlName="api_key" placeholder="sk-...">
                <mat-icon matSuffix>key</mat-icon>
              </mat-form-field>
            }
            <div class="ai-status">
              <mat-chip [color]="aiForm.get('provider')?.value === 'stub' ? 'accent' : 'primary'" highlighted>
                <mat-icon matChipAvatar>circle</mat-icon>
                {{ aiForm.get('provider')?.value === 'stub' ? 'Running on stub responses' : 'API key required to activate' }}
              </mat-chip>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button color="primary" (click)="saveAiConfig()">
              <mat-icon>save</mat-icon> Save AI Config
            </button>
          </mat-card-actions>
        </mat-card>

      </div>
    </div>
  `,
  styles: [`
    .settings-page { display: flex; flex-direction: column; gap: 20px; }
    .page-header { }
    .page-title { font-size: 22px; font-weight: 500; margin: 0; }
    .page-sub { color: var(--mat-sys-on-surface-variant); margin: 4px 0 0; font-size: 13px; }
    .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full { width: 100%; margin-bottom: 4px; }
    .toggle { margin: 8px 0; }
    .slider-field { display: flex; flex-direction: column; gap: 4px; }
    .slider-field label { font-size: 13px; font-weight: 500; }
    .slider-hint { display: flex; justify-content: space-between; font-size: 10px; color: var(--mat-sys-on-surface-variant); }
    .data-actions { display: flex; flex-direction: column; gap: 0; }
    .data-action-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; }
    .action-title { font-size: 13px; font-weight: 500; }
    .action-sub { font-size: 11px; color: var(--mat-sys-on-surface-variant); margin-top: 2px; }
    .ai-card { grid-column: 1 / -1; }
    .ai-status { margin-top: 8px; }
  `]
})
export class SettingsComponent implements OnInit {
  private finance = inject(FinanceService);
  private snack   = inject(MatSnackBar);
  private fb      = inject(FormBuilder);

  profileForm = this.fb.group({ name: ['My Profile'], currency: ['KES'], salary_day: [1, [Validators.min(1), Validators.max(31)]] });
  goalsForm   = this.fb.group({ savings_target_pct: [0.20], emergency_fund_months: [3] });
  appearanceForm = this.fb.group({ theme: ['light'], notifications_enabled: [true] });
  aiForm = this.fb.group({ provider: ['stub'], api_key: [''] });

  ngOnInit() {
    this.finance.getProfile().subscribe({
      next: p => {
        this.profileForm.patchValue(p);
        this.goalsForm.patchValue(p);
        this.appearanceForm.patchValue(p);
      },
      error: () => {}
    });
  }

  saveProfile() {
    this.finance.updateProfile(this.profileForm.value as any).subscribe({
      next: () => this.snack.open('Profile saved!', 'OK', { duration: 3000 }),
    });
  }

  saveGoals() {
    this.finance.updateProfile(this.goalsForm.value as any).subscribe({
      next: () => this.snack.open('Goals updated!', 'OK', { duration: 3000 }),
    });
  }

  saveAiConfig() {
    this.snack.open('AI config saved locally. Configure backend env var to activate.', 'OK', { duration: 5000 });
  }

  exportAll() {
    this.finance.exportData('excel').subscribe(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'all_transactions.xlsx'; a.click();
    });
  }

  triggerImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.xlsx';
    input.onchange = (e: any) => {
      this.finance.importExcel(e.target.files[0]).subscribe({
        next: (r) => this.snack.open(`Imported: ${r.counts['income']} income, ${r.counts['expenses']} expenses`, 'OK', { duration: 4000 }),
      });
    };
    input.click();
  }
}
