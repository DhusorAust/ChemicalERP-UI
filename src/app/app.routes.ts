import { Bank } from './setting/bank/bank';
 
//  // src/app/app.routes.ts
// import { Routes } from '@angular/router';
// import { startGuard, authGuard, loginGuard } from './auth-guard';

// export const routes: Routes = [
//   // { path: '',    canActivate: [startGuard], loadComponent: () => import('./home/home').then(m => m.Home) },
//   // { path: 'home',  canActivate: [authGuard],  loadComponent: () => import('./home/home').then(m => m.Home) },
//   // { path: 'login', canActivate: [loginGuard], loadComponent: () => import('./login/login').then(m => m.Login) },
//   // { path: 'setting/bank',canActivate: [authGuard],loadComponent: () => import('./setting/bank/bank').then(m => m.Bank)},
//   // { path: '**', redirectTo: '' }
//   { path: '**', redirectTo: 'setting/bank' }
// ];


// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'setting/bank' },
  {
    path: 'setting/bank',
    loadComponent: () => import('./setting/bank/bank').then(m => m.Bank) // matches "export class Bank"
  },
  // TEMP aliases (catch old /Bank links)
  { path: 'Bank', pathMatch: 'full', redirectTo: 'setting/bank' },
  { path: 'Setting/Bank', pathMatch: 'full', redirectTo: 'setting/bank' },
  { path: '**', redirectTo: 'setting/bank' }
];
