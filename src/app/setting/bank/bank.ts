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

  // list endpoints (unchanged)
  endpoint = (s: Status) => `${this.apiBase}/api/Setting/getBankList/${s}`;

  // NEW: save endpoint for [FromForm] action
  saveEndpoint = `${this.apiBase}/api/Setting/saveBank`;

  // UI state
  mode: 'list' | 'form' = 'list';
  status: Status = 'ALL';
  search = '';
  loading = false;
  saving = false;
  error = '';
  success = '';

  // data
  items: BankRow[] = [];
  total = 0;

  // form model (extended to match your SP/controller)
  form: any = {
    BankID: 0,
    BankCode: '',
    BankName: '',
    BankShortName: '',
    BankAddress: '',
    SwiftCode: '',
    ADCode: '',
    IsBeneficiaryBank: 0,
    IsAdvisingBank: 0,
    IsNegoBank: 0,
    IsActive: 1,
    Approved: 0
  };

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

  // -------- LIST ----------
  load() {
    this.loading = true;
    this.error = '';
    this.success = '';

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

  // -------- FORM ----------
  openNew() {
    this.error = '';
    this.success = '';
    this.form = {
      BankID: 0,
      BankCode: '',
      BankName: '',
      BankShortName: '',
      BankAddress: '',
      SwiftCode: '',
      ADCode: '',
      IsBeneficiaryBank: 0,
      IsAdvisingBank: 0,
      IsNegoBank: 0,
      IsActive: 1,
      Approved: 0
    };
    this.mode = 'form';
  }

  backToList() {
    this.mode = 'list';
    this.error = '';
    // keep success so user can see “Saved” after returning
  }

  // ====== NEW: SAVE via FormData to [FromForm] /api/Setting/save ======
  submit() {
    this.error = '';
    this.success = '';

    // basic validation
    if (!this.form.BankName || !String(this.form.BankName).trim()) {
      this.error = 'Bank Name is required';
      return;
    }

    // SaveOption: Insert=1 (BankID=0), Update=2 (BankID>0)
    const saveOption = this.form.BankID && this.form.BankID > 0 ? 2 : 1;

    // Build FormData to match [FromForm] Bas_Bank
    const fd = new FormData();
    fd.append('SaveOption', String(saveOption));
    fd.append('BankID', String(this.form.BankID || 0));
    fd.append('BankCode', (this.form.BankCode || '').trim());
    fd.append('BankName', (this.form.BankName || '').trim());
    fd.append('BankShortName', (this.form.BankShortName || '').trim());
    fd.append('BankAddress', (this.form.BankAddress || '').trim());
    fd.append('SwiftCode', (this.form.SwiftCode || '').trim());
    fd.append('ADCode', (this.form.ADCode || '').trim());

    // ints for bit fields expected by your SP/model
    fd.append('IsBeneficiaryBank', (this.form.IsBeneficiaryBank ? 1 : 0).toString());
    fd.append('IsAdvisingBank', (this.form.IsAdvisingBank ? 1 : 0).toString());
    fd.append('IsNegoBank', (this.form.IsNegoBank ? 1 : 0).toString());
    fd.append('IsActive', (this.form.IsActive ? 1 : 0).toString());
    fd.append('Approved', (this.form.Approved ? 1 : 0).toString());

    // NOTE: UserBy is set from Session in your controller, so not needed here.

    this.saving = true;

    this.http.post<any>(this.saveEndpoint, fd)
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: (res) => {
          // Session expired → redirect hint from server
          if (res?.IsLogin === 1 && res?.redirectUrl) {
            window.location.href = res.redirectUrl;
            return;
          }

          // Repository/SP error number
          if (res?.ErrorNo && res.ErrorNo !== 0) {
            this.error = res?.Message || 'Save failed';
            return;
          }

          // Success check (per your SaveAsync return)
          if ((res?.NoofRows ?? 0) > 0 && (res?.ResultId ?? 0) > 0) {
            this.success = res?.Message || 'Saved successfully.';
            this.mode = 'list';
            this.load();
          } else {
            this.error = res?.Message || 'Save failed';
          }
        },
        error: (err) => {
          console.error('Bank save error:', err);
          this.error = err?.error?.message || 'Save failed';
        }
      });
  }
}
