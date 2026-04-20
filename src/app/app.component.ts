import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs';
import { FinanceService } from './core/services/finance.service';
import { AiService } from './core/services/ai.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, CommonModule,
    MatSidenavModule, MatToolbarModule, MatListModule,
    MatIconModule, MatButtonModule, MatBadgeModule,
    MatTooltipModule, MatChipsModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #sidenav [mode]="isHandset() ? 'over' : 'side'" [opened]="!isHandset()" class="sidenav">

        <!-- Logo -->
        <div class="nav-logo">
          <div class="logo-icon"><mat-icon>account_balance_wallet</mat-icon></div>
          <div><div class="logo-name">FinTrack KE</div><div class="logo-tag">KES · Nairobi</div></div>
        </div>

        <!-- Period -->
        <div class="nav-period">
          <mat-chip><mat-icon matChipAvatar style="font-size:14px">calendar_month</mat-icon>{{ period() }}</mat-chip>
        </div>

        <!-- Nav -->
        <mat-nav-list class="nav-list">
          @for (item of navItems; track item.route) {
            <a mat-list-item [routerLink]="item.route" routerLinkActive="nav-active" class="nav-item"
               [matTooltip]="item.label" matTooltipPosition="right" [matTooltipDisabled]="!isHandset()">
              <mat-icon matListItemIcon
                [matBadge]="item.badge" [matBadgeColor]="'warn'" [matBadgeHidden]="!item.badge">
                {{ item.icon }}
              </mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
              @if (item.ai) {
                <mat-icon matListItemMeta style="font-size:14px;opacity:.5">smart_toy</mat-icon>
              }
            </a>
          }
        </mat-nav-list>

        <!-- AI Teaser -->
        <a class="ai-teaser" [routerLink]="'/ai'">
          <mat-icon class="ai-spark">auto_awesome</mat-icon>
          <div class="ai-words"><span class="ai-name">AI Advisor</span><span class="ai-ready">Context-ready · Wire LLM to activate</span></div>
          <span class="beta-pill">BETA</span>
        </a>

        <div class="nav-foot">
          <a mat-list-item [routerLink]="'/settings'" routerLinkActive="nav-active" class="nav-item">
            <mat-icon matListItemIcon>settings</mat-icon>
            <span matListItemTitle>Settings</span>
          </a>
          <div class="ver">v2.0 · Angular 18 · Material 3</div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <mat-toolbar class="toolbar">
          @if (isHandset()) {
            <button mat-icon-button (click)="sidenav.toggle()"><mat-icon>menu</mat-icon></button>
          }
          <span class="flex1"></span>
          @if (stress() !== null) {
            <mat-chip [class]="'stress stress-' + stressLevel()">
              <mat-icon matChipAvatar style="font-size:14px">monitor_heart</mat-icon>
              Score: {{ stress() }}
            </mat-chip>
          }
          <button mat-icon-button matTooltip="Import Excel" (click)="importExcel()"><mat-icon>upload_file</mat-icon></button>
          <button mat-icon-button matTooltip="Notifications"
            [matBadge]="alertCount()" [matBadgeHidden]="alertCount()===0"><mat-icon>notifications</mat-icon></button>
          <button mat-icon-button matTooltip="Profile"><mat-icon>account_circle</mat-icon></button>
        </mat-toolbar>
        <div class="page-wrap"><router-outlet /></div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .shell  { height: 100%; }
    .sidenav {
      width: 236px;
      background: var(--mat-sys-surface-container-low);
      border-right: 1px solid var(--mat-sys-outline-variant);
      display: flex; flex-direction: column;
    }
    .nav-logo {
      display: flex; align-items: center; gap: 10px;
      padding: 18px 16px 12px;
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .logo-icon {
      width: 34px; height: 34px; border-radius: 9px;
      background: var(--mat-sys-primary);
      display: flex; align-items: center; justify-content: center;
    }
    .logo-icon mat-icon { color: var(--mat-sys-on-primary); font-size: 18px; }
    .logo-name { font-size: 14px; font-weight: 600; }
    .logo-tag  { font-size: 10px; color: var(--mat-sys-on-surface-variant); letter-spacing: .05em; }
    .nav-period { padding: 10px 16px 2px; }
    .nav-list { flex: 1; padding-top: 4px; }
    .nav-item { border-radius: 8px !important; margin: 2px 8px !important; }
    .nav-active {
      background: var(--mat-sys-secondary-container) !important;
      color: var(--mat-sys-on-secondary-container) !important;
    }
    .nav-active mat-icon { color: var(--mat-sys-on-secondary-container) !important; }
    .ai-teaser {
      margin: 8px 12px; padding: 10px 12px;
      background: var(--mat-sys-primary-container);
      border-radius: 12px; cursor: pointer;
      display: flex; align-items: center; gap: 8px;
      text-decoration: none;
    }
    .ai-spark { color: var(--mat-sys-primary); }
    .ai-words { flex: 1; display: flex; flex-direction: column; }
    .ai-name  { font-size: 12px; font-weight: 600; color: var(--mat-sys-on-primary-container); }
    .ai-ready { font-size: 9px; color: var(--mat-sys-on-primary-container); opacity: .7; }
    .beta-pill {
      font-size: 8px; padding: 2px 5px; letter-spacing: .06em; font-weight: 700;
      background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); border-radius: 3px;
    }
    .nav-foot { border-top: 1px solid var(--mat-sys-outline-variant); padding-bottom: 4px; }
    .ver { font-size: 9px; text-align: center; color: var(--mat-sys-on-surface-variant); padding: 4px 0 8px; }
    .toolbar {
      position: sticky; top: 0; z-index: 10;
      background: var(--mat-sys-surface-container-lowest);
      border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .flex1 { flex: 1; }
    .stress { font-size: 11px; margin-right: 6px; }
    .stress-low  { background: var(--mat-sys-tertiary-container) !important; }
    .stress-med  { background: #fff3e0 !important; }
    .stress-high { background: var(--mat-sys-error-container) !important; }
    .content { background: var(--mat-sys-surface); }
    .page-wrap { padding: 24px; max-width: 1400px; margin: 0 auto; }
  `]
})
export class AppComponent implements OnInit {
  private financeService = inject(FinanceService);
  private aiService      = inject(AiService);
  private bp             = inject(BreakpointObserver);

  isHandset = signal(false);
  period    = signal(new Date().toLocaleString('en-KE', { month: 'short', year: 'numeric' }));
  stress    = signal<number | null>(null);
  alertCount= signal(0);
  stressLevel = () => { const s = this.stress(); if (!s) return 'low'; return s < 30 ? 'low' : s < 60 ? 'med' : 'high'; };

  navItems = [
    { label: 'Dashboard',    icon: 'dashboard',       route: '/dashboard',    ai: true },
    { label: 'Transactions', icon: 'receipt_long',    route: '/transactions', ai: true },
    { label: 'Budget',       icon: 'account_balance', route: '/budget',       ai: true },
    { label: 'Loans',        icon: 'credit_card',     route: '/loans',        ai: true },
    { label: 'SACCO',        icon: 'savings',         route: '/sacco',        ai: true },
    { label: 'Reports',      icon: 'assessment',      route: '/reports' },
    { label: 'AI Advisor',   icon: 'smart_toy',       route: '/ai',           ai: true, badge: 1 },
  ];

  ngOnInit() {
    this.bp.observe(Breakpoints.Handset).pipe(map(r => r.matches)).subscribe(h => this.isHandset.set(h));
    this.financeService.getDashboard().subscribe({
      next: d => {
        this.stress.set(d.financial_stress_score);
        this.alertCount.set(d.alerts?.length ?? 0);
        this.aiService.setContextFromDashboard(d);
      },
      error: () => {}
    });
  }

  importExcel() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.xlsx,.xls';
    inp.onchange = (e: any) => { const f = e.target.files[0]; if (f) this.financeService.importExcel(f).subscribe(); };
    inp.click();
  }
}
