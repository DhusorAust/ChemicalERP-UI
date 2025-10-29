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

  // Base for list APIs (unchanged)
  apiBase = 'http://localhost:56172';

  // List endpoint (unchanged)
  endpoint = (s: Status) => `${this.apiBase}/api/Setting/getBankList/${s}`;

  // FINAL: Save endpoint (JSON) — as you requested
  saveEndpoint = `http://localhost:56172/api/Setting/saveBank`;

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

  // form model (matches your SP/controller)
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

  // client-side sort
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
  }

  // ====== SAVE to /api/Setting/saveBank (JSON) ======
  // ====== SAVE to /api/Setting/saveBank (JSON) ======
submit() {
  this.error = '';
  this.success = '';

  if (!this.form.BankName || !String(this.form.BankName).trim()) {
    this.error = 'Bank Name is required';
    return;
  }

  // SaveOption: Insert=1, Update=2
  const isUpdate = this.form.BankID && this.form.BankID > 0;

  // ISO dates to satisfy non-nullable DateTime properties (if any)
  const nowIso = new Date().toISOString();

  // ⚠️ Match Postman body (types & fields)
  const payload = {
    SaveOption: isUpdate ? 2 : 1,       // int
    IdentityValue: 0,
    ErrNo: 0,
    ResultId: 0,
    NoofRows: 0,
    Message: 'string',
    ExceptionError: 'string',
    ErrorNo: 0,
    ReturnValue: 'string',

    // who is acting (if your API needs it)
    UserBy: Number(this.form.UserBy ?? 0),   // keep 0 if not used on server

    // core entity fields
    BankID: Number(this.form.BankID || 0),
    BankCode: (this.form.BankCode || '').trim(),
    BankName: (this.form.BankName || '').trim(),
    BankShortName: (this.form.BankShortName || '').trim(),
    BankAddress: (this.form.BankAddress || '').trim(),
    SwiftCode: (this.form.SwiftCode || '').trim(),
    ADCode: (this.form.ADCode || '').trim(),

    // flags — keep same types as your working Postman:
    IsBeneficiaryBank: this.form.IsBeneficiaryBank ? 1 : 0, // number
    IsAdvisingBank:    this.form.IsAdvisingBank ? 1 : 0,     // number
    IsNegoBank:        this.form.IsNegoBank ? 1 : 0,         // number
    IsActive:          this.form.IsActive ? 1 : 0,           // number
    Approved: !!this.form.Approved,                          // ✅ boolean

    // audit fields (non-nullable on some models)
    CreatedBy: Number(this.form.CreatedBy ?? 0),
    CreatedDate: this.form.CreatedDate || nowIso,
    UpdatedBy: Number(this.form.UpdatedBy ?? 0),
    UpdatedDate: this.form.UpdatedDate || nowIso,
    ApprovedBy: Number(this.form.ApprovedBy ?? 0),
    ApprovedDate: this.form.ApprovedDate || nowIso
  };

  this.saving = true;

  // JSON post (same as Postman)
  this.http.post<any>('http://localhost:56172/api/Setting/saveBank', payload /*, { withCredentials: true } */)
    .pipe(finalize(() => this.saving = false))
    .subscribe({
      next: (res) => {
        if (res?.IsLogin === 1 && res?.redirectUrl) {
          window.location.href = res.redirectUrl;
          return;
        }
        if (res?.ErrorNo && res.ErrorNo !== 0) {
          this.error = res?.Message || 'Save failed';
          return;
        }
        if ((res?.NoofRows ?? 0) > 0 && (res?.ResultId ?? 0) > 0) {
          this.success = res?.Message || 'Saved successfully.';
          this.mode = 'list';
          this.load();
        } else {
          this.error = res?.Message || 'Save failed';
        }
      },
      error: (err) => {
        // show exact model validation errors (helpful to see which field failed)
        const details = err?.error?.errors || err?.error;
        console.error('Bank save error:', err, details);
        this.error = 'Bad Request (validation). See console for details.';
      }
    });
}

}
