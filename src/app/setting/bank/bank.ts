import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';

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

interface GridEntity<T> {
  Items: T[];
  TotalCount: number;
  Columnses?: any[];
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
  endpoint(status: Status) { return `${this.apiBase}/api/Setting/getBankList/${status}`; }

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

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    let params = new HttpParams();
    if ((this.search || '').trim()) params = params.set('q', this.search.trim());

    this.http.get<GridEntity<BankRow>>(this.endpoint(this.status), { params })
      .subscribe({
        next: res => {
          this.items = res?.Items ?? [];
          this.total = res?.TotalCount ?? this.items.length;
          // optional client sort if user toggled
          if (this.sortField) this.applyClientSort();
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.error = 'Failed to load data';
          this.loading = false;
        }
      });
  }

  setStatus(s: Status) {
    if (this.status !== s) { this.status = s; this.load(); }
  }
  onSearchEnter() { this.load(); }
  refresh() { this.load(); }

  // — client-side sort (simple, since no pagination) —
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
    const f = this.sortField;
    const dir = this.sortDir === 'asc' ? 1 : -1;
    if (!f) return;

    this.items = [...this.items].sort((a, b) => {
      const va = (a?.[f] ?? '') as any;
      const vb = (b?.[f] ?? '') as any;

      // normalize booleans/numbers/strings
      const na = typeof va === 'boolean' ? (va ? 1 : 0) : va;
      const nb = typeof vb === 'boolean' ? (vb ? 1 : 0) : vb;

      if (na == null && nb == null) return 0;
      if (na == null) return 1;
      if (nb == null) return -1;

      if (typeof na === 'number' && typeof nb === 'number') return (na - nb) * dir;
      return String(na).localeCompare(String(nb)) * dir;
    });
  }
}
