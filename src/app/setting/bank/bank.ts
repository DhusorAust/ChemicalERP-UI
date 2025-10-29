import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

type Status = 'ALL' | 'EDIT' | 'APPROVED';

interface BankRow {
  BankID: number;
  BankName: string;
  BankShortName?: string;
  BankAddress?: string;
  SwiftCode?: string;
  IsActive?: boolean | number;
  Approved?: boolean | number;
}

@Component({
  standalone: true,
  selector: 'app-bank',
  imports: [CommonModule, FormsModule],
  templateUrl: './bank.html',
  styleUrls: ['./bank.css'],
  encapsulation: ViewEncapsulation.None
})
export class Bank implements OnInit {
  private http = inject(HttpClient);

  // TODO: move to environment later
  apiBase = 'http://localhost:56172';
  endpoint = (s: Status) => `${this.apiBase}/api/Setting/getBankList/${s}`;

  // UI state
  status: Status = 'ALL';
  search = '';
  loading = false;
  error = '';

  // data
  items: BankRow[] = [];
  total = 0;

  // client-side sort (optional)
  sortField: keyof BankRow | '' = '';
  sortDir: 'asc' | 'desc' = 'asc';

  ngOnInit() {
    this.load();
  }

  // tolerate PascalCase/camelCase from API
  private normalizeRow(x: any): BankRow {
    return {
      BankID:        x.BankID        ?? x.bankID        ?? x.bankId        ?? 0,
      BankName:      x.BankName      ?? x.bankName      ?? '',
      BankShortName: x.BankShortName ?? x.bankShortName ?? '',
      BankAddress:   x.BankAddress   ?? x.bankAddress   ?? '',
      SwiftCode:     x.SwiftCode     ?? x.swiftCode     ?? '',
      IsActive:      x.IsActive      ?? x.isActive      ?? 0,
      Approved:      x.Approved      ?? x.approved      ?? 0,
    };
  }

  load() {
    this.loading = true;
    this.error = '';

    let params = new HttpParams();
    const q = (this.search || '').trim();
    if (q) params = params.set('q', q);

    this.http.get<any>(this.endpoint(this.status), { params })
      .pipe(
        map(res => {
          const rawItems = res?.Items ?? res?.items ?? res?.data ?? [];
          const total = res?.TotalCount ?? res?.totalCount ?? res?.total ?? rawItems.length;
          const items: BankRow[] = (rawItems as any[]).map(r => this.normalizeRow(r));
          return { items, total };
        }),
        catchError(err => {
          console.error('Bank load error:', err);
          this.error = 'Failed to load data';
          return of({ items: [] as BankRow[], total: 0 });
        }),
        finalize(() => { this.loading = false; })
      )
      .subscribe(({ items, total }) => {
        this.items = items;
        this.total = total;
        if (this.sortField) this.applyClientSort();
      });
  }

  // Always reload, even if clicking the active tab (fixes “need two clicks”)
  setStatus(s: Status) {
    this.status = s;
    this.load();
  }
  onSearchEnter() { this.load(); }
  refresh() { this.load(); }

  toggleSort(field: keyof BankRow) {
    if (this.sortField === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDir = 'asc';
    }
    this.applyClientSort();
  }

  private applyClientSort() {
    if (!this.sortField) return;
    const f = this.sortField;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    this.items = [...this.items].sort((a, b) => {
      const va: any = (a as any)[f];
      const vb: any = (b as any)[f];
      const na = typeof va === 'boolean' ? (va ? 1 : 0) : (va ?? '');
      const nb = typeof vb === 'boolean' ? (vb ? 1 : 0) : (vb ?? '');
      if (typeof na === 'number' && typeof nb === 'number') return (na - nb) * dir;
      return String(na).localeCompare(String(nb)) * dir;
    });
  }
}
