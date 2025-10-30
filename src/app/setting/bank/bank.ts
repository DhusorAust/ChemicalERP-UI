// path: src/app/bank/bank.ts
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

type Status = 'EDIT' | 'APPROVED';

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

  apiBase = 'http://localhost:56172';
  endpointList = (s: Status) => `${this.apiBase}/api/Setting/getBankList/${s}`;
  endpointCreate = `${this.apiBase}/api/Setting/saveBank`;   // adjust if different
  endpointUpdate = `${this.apiBase}/api/Setting/saveBank`;   // same path if API upserts by BankID

  mode: 'list' | 'create' | 'edit' = 'list';
  status: Status = 'EDIT';
  search = '';
  loading = false;
  error = '';

  items: BankRow[] = [];
  total = 0;

  sortField: keyof BankRow | '' = '';
  sortDir: 'asc' | 'desc' = 'asc';

  newBank: BankRow | null = null;
  saving = false;
  saveError = '';
  saveSuccess = '';

  ngOnInit() { this.load(); }

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
    this.loading = true; this.error = '';
    let params = new HttpParams();
    const q = (this.search || '').trim();
    if (q) params = params.set('q', q);

    this.http.get<any>(this.endpointList(this.status), { params })
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
        this.items = items; this.total = total;
        if (this.sortField) this.applyClientSort();
      });
  }

  setStatus(s: Status) { this.status = s; if (this.mode === 'list') this.load(); }
  onSearchEnter() { if (this.mode === 'list') this.load(); }
  refresh() { if (this.mode === 'list') this.load(); }

  toggleSort(field: keyof BankRow) {
    if (this.sortField === field) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDir = 'asc'; }
    this.applyClientSort();
  }
  private applyClientSort() {
    if (!this.sortField) return;
    const f = this.sortField; const dir = this.sortDir === 'asc' ? 1 : -1;
    this.items = [...this.items].sort((a, b) => {
      const va: any = (a as any)[f]; const vb: any = (b as any)[f];
      const na = typeof va === 'boolean' ? (va ? 1 : 0) : (va ?? '');
      const nb = typeof vb === 'boolean' ? (vb ? 1 : 0) : (vb ?? '');
      if (typeof na === 'number' && typeof nb === 'number') return (na - nb) * dir;
      return String(na).localeCompare(String(nb)) * dir;
    });
  }

  // ---- Create flow ----
  startCreate() {
    this.mode = 'create';
    this.saveError = ''; this.saveSuccess = '';
    this.newBank = {
      BankID: 0, BankName: '', BankShortName: '', BankAddress: '', SwiftCode: '',
      IsActive: 1, Approved: 0,
    };
  }

  // ---- Edit flow ----
  startEdit(row: BankRow) {
    this.mode = 'edit';
    this.saveError = ''; this.saveSuccess = '';
    this.newBank = { ...row }; // Why: avoid mutating list row by reference
  }

  cancelForm() {
    this.mode = 'list';
    this.newBank = null;
    this.saveError = ''; this.saveSuccess = '';
  }

  submit() {
    if (this.mode === 'create') this.submitCreate();
    else if (this.mode === 'edit') this.submitUpdate();
  }

  private buildPayload(includeId = false) {
    if (!this.newBank) return null;
    const payload: any = {
      BankName: (this.newBank.BankName || '').trim(),
      BankShortName: (this.newBank.BankShortName || '').trim(),
      BankAddress: (this.newBank.BankAddress || '').trim(),
      SwiftCode: (this.newBank.SwiftCode || '').trim(),
      IsActive: !!this.newBank.IsActive,
      Approved: !!this.newBank.Approved
    };
    if (includeId) payload.BankID = this.newBank!.BankID ?? 0;
    return payload;
  }

  submitCreate() {
    const payload = this.buildPayload(false);
    if (!payload) return;
    if (!payload.BankName) { this.saveError = 'Bank Name is required'; return; }

    this.saving = true; this.saveError = ''; this.saveSuccess = '';
    this.http.post<any>(this.endpointCreate, payload)
      .pipe(
        catchError(err => { console.error('Create error:', err); this.saveError = err?.error?.message || 'Failed to save bank'; return of(null); }),
        finalize(() => { this.saving = false; })
      )
      .subscribe(res => {
        if (!res) return;
        this.saveSuccess = 'Saved successfully';
        setTimeout(() => { this.cancelForm(); this.load(); }, 400);
      });
  }

  submitUpdate() {
    const payload = this.buildPayload(true);
    if (!payload) return;
    if (!payload.BankID) { this.saveError = 'Missing BankID'; return; }
    if (!payload.BankName) { this.saveError = 'Bank Name is required'; return; }

    this.saving = true; this.saveError = ''; this.saveSuccess = '';
    this.http.post<any>(this.endpointUpdate, payload) // change to PUT if needed
      .pipe(
        catchError(err => { console.error('Update error:', err); this.saveError = err?.error?.message || 'Failed to update bank'; return of(null); }),
        finalize(() => { this.saving = false; })
      )
      .subscribe(res => {
        if (!res) return;
        this.saveSuccess = 'Updated successfully';
        setTimeout(() => { this.cancelForm(); this.load(); }, 400);
      });
  }
}
