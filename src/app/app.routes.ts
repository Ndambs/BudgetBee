import { Routes } from '@angular/router';
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'transactions', loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },
  { path: 'budget',       loadComponent: () => import('./features/budget/budget.component').then(m => m.BudgetComponent) },
  { path: 'loans',        loadComponent: () => import('./features/loans/loans.component').then(m => m.LoansComponent) },
  { path: 'sacco',        loadComponent: () => import('./features/sacco/sacco.component').then(m => m.SaccoComponent) },
  { path: 'reports',      loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent) },
  { path: 'ai',           loadComponent: () => import('./features/ai-chat/ai-chat.component').then(m => m.AiChatComponent) },
  { path: 'settings',     loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent) },
  { path: '**', redirectTo: 'dashboard' },
];
