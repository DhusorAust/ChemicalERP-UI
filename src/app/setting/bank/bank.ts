import { App } from './../../app';
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, finalize, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { Int01 } from './../../common';
import type { Bas_Bank, BankSaveDto } from './bank.model';
import { environment } from '../../environments/environment';
import { Status } from './../../common';
import { ApiSaveResponse } from './../../common';

@Component({
  standalone: true,
  selector: 'app-bank',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  templateUrl: './bank.html',
  styleUrls: ['./bank.css']
})
export class Bank implements OnInit {
  private http = inject(HttpClient);

  // API
 
  apiBase = environment.apiBase; 
  endpointList = (s: Status) => `${this.apiBase}/api/Setting/getBankList/${s}`;
  endpointSave = `${this.apiBase}/api/Setting/saveBank`;

  // UI state
  mode: 'list' | 'create' | 'edit' = 'list';
  status: Status = 'EDIT';
  loading = false;
  saving = false;
  error = '';
  saveError = '';
  saveSuccess = '';
  search = '';

  items: Bas_Bank[] = [];
  form: any = this.blankForm();
  editingOriginal: Bas_Bank | null = null; // keep originals for update audit

  ngOnInit(): void { this.load(); }

  // helpers
  private blankForm() {
    return {
      BankID: 0,
      BankCode: '',
      BankName: '',
      BankShortName: '',
      BankAddress: '',
      SwiftCode: '',
      ADCode: '',
      IsBeneficiaryBankBool: false,
      IsAdvisingBankBool: false,
      IsNegoBankBool: false,
      IsActiveBool: true,
      Approved: false,
      CreatedBy: 0,
      CreatedDate: '',
      UpdatedBy: 0,
      UpdatedDate: '',
      ApprovedBy: 0,
      ApprovedDate: ''
    };
  }
  private toInt01(v: any): Int01 {
    return (v === true || v === 1 || String(v).toLowerCase() === 'true') ? 1 : 0;
  }
  private isoNow(): string { return new Date().toISOString(); }

  private normalizeRow(x: any): Bas_Bank {
    return {
      BankID: x.BankID ?? 0,
      BankCode: x.BankCode ?? '',
      BankName: x.BankName ?? '',
      BankShortName: x.BankShortName ?? '',
      BankAddress: x.BankAddress ?? '',
      SwiftCode: x.SwiftCode ?? '',
      ADCode: x.ADCode ?? '',
      IsBeneficiaryBank: (x.IsBeneficiaryBank ?? 0) as Int01,
      IsAdvisingBank: (x.IsAdvisingBank ?? 0) as Int01,
      IsNegoBank: (x.IsNegoBank ?? 0) as Int01,
      IsActive: (x.IsActive ?? 0) as Int01,
      Approved: !!x.Approved,
      ApprovedBy: x.ApprovedBy ?? 0,
      ApprovedDate: x.ApprovedDate ?? '',
      CreatedBy: x.CreatedBy ?? 0,
      CreatedDate: x.CreatedDate ?? '',
      UpdatedBy: x.UpdatedBy ?? 0,
      UpdatedDate: x.UpdatedDate ?? ''
    };
  }

  // data
  load() {
    this.loading = true; this.error = '';
    let params = new HttpParams();
    if (this.search?.trim()) params = params.set('q', this.search.trim());

    this.http.get<any>(this.endpointList(this.status), { params })
      .pipe(
        map(res => {
          const arr = res?.Items ?? res?.items ?? res ?? [];
          return (arr as any[]).map(x => this.normalizeRow(x));
        }),
        catchError(err => {
          console.error('Load error:', err);
          this.error = err?.error?.title || 'Failed to load banks';
          return of([] as Bas_Bank[]);
        }),
        finalize(() => this.loading = false)
      )
      .subscribe(list => this.items = list);
  }

  setStatus(s: Status) {
    if (this.status === s) return;
    this.status = s;
    if (this.mode === 'list') this.load();
  }

  // actions
  startCreate() {
    this.mode = 'create';
    this.saveError = ''; this.saveSuccess = '';
    this.form = this.blankForm();
    this.editingOriginal = null;
  }

  startEdit(r: Bas_Bank) {
    this.mode = 'edit'; this.saveError = ''; this.saveSuccess = '';
    this.editingOriginal = r;

    this.form = {
      BankID: r.BankID,
      BankCode: r.BankCode,
      BankName: r.BankName,
      BankShortName: r.BankShortName,
      BankAddress: r.BankAddress,
      SwiftCode: r.SwiftCode,
      ADCode: r.ADCode,
      IsBeneficiaryBankBool: r.IsBeneficiaryBank === 1,
      IsAdvisingBankBool: r.IsAdvisingBank === 1,
      IsNegoBankBool: r.IsNegoBank === 1,
      IsActiveBool: r.IsActive === 1,
      Approved: !!r.Approved,
      CreatedBy: r.CreatedBy,
      CreatedDate: r.CreatedDate,
      UpdatedBy: r.UpdatedBy,
      UpdatedDate: r.UpdatedDate,
      ApprovedBy: r.ApprovedBy,
      ApprovedDate: r.ApprovedDate
    };
  }

  cancelForm() {
    this.mode = 'list';
    this.form = this.blankForm();
    this.editingOriginal = null;
    this.saveError=''; this.saveSuccess='';
  }
  refresh() { if (this.mode === 'list') this.load(); }

  // payload — INSERT
  private buildInsertPayload(): BankSaveDto | null {
    if (!this.form) return null;
    const now = this.isoNow();

    return {
      SaveOption: 0,
      IdentityValue: 0,
      ErrNo: 0,
      ResultId: 0,
      NoofRows: 0,
      Message: 'string',
      ExceptionError: 'string',
      ErrorNo: 0,
      ReturnValue: 'string',
      UserBy: 0,
      BankID: 0,
      BankCode: (this.form.BankCode ?? 'string').trim() || 'string',
      BankName: (this.form.BankName ?? 'string').trim() || 'string',
      BankShortName: (this.form.BankShortName ?? 'string').trim() || 'string',
      BankAddress: (this.form.BankAddress ?? 'string').trim() || 'string',
      SwiftCode: (this.form.SwiftCode ?? 'string').trim() || 'string',
      ADCode: (this.form.ADCode ?? 'string').trim() || 'string',
      IsBeneficiaryBank: this.toInt01(this.form.IsBeneficiaryBankBool),
      IsAdvisingBank: this.toInt01(this.form.IsAdvisingBankBool),
      IsNegoBank: this.toInt01(this.form.IsNegoBankBool),
      IsActive: this.toInt01(this.form.IsActiveBool),
      CreatedBy: 0,
      CreatedDate: now,
      UpdatedBy: 0,
      UpdatedDate: now,
      Approved: !!this.form.Approved,
      ApprovedBy: !!this.form.Approved ? (this.form.ApprovedBy ?? 0) : 0,
      ApprovedDate: !!this.form.Approved ? (this.form.ApprovedDate || now) : now
    };
  }

  // payload — UPDATE (preserve Created*)
  private buildUpdatePayload(): BankSaveDto | null {
    if (!this.form || !this.editingOriginal) return null;
    const now = this.isoNow();

    return {
      SaveOption: 0,
      IdentityValue: 0,
      ErrNo: 0,
      ResultId: 0,
      NoofRows: 0,
      Message: 'string',
      ExceptionError: 'string',
      ErrorNo: 0,
      ReturnValue: 'string',
      UserBy: 0,
      BankID: this.form.BankID ?? this.editingOriginal.BankID,
      BankCode: (this.form.BankCode ?? 'string').trim() || 'string',
      BankName: (this.form.BankName ?? 'string').trim() || 'string',
      BankShortName: (this.form.BankShortName ?? 'string').trim() || 'string',
      BankAddress: (this.form.BankAddress ?? 'string').trim() || 'string',
      SwiftCode: (this.form.SwiftCode ?? 'string').trim() || 'string',
      ADCode: (this.form.ADCode ?? 'string').trim() || 'string',
      IsBeneficiaryBank: this.toInt01(this.form.IsBeneficiaryBankBool),
      IsAdvisingBank: this.toInt01(this.form.IsAdvisingBankBool),
      IsNegoBank: this.toInt01(this.form.IsNegoBankBool),
      IsActive: this.toInt01(this.form.IsActiveBool),
      CreatedBy: this.editingOriginal.CreatedBy ?? 0,
      CreatedDate: this.editingOriginal.CreatedDate || now,
      UpdatedBy: 0,
      UpdatedDate: now,
      Approved: !!this.form.Approved,
      ApprovedBy: !!this.form.Approved ? (this.form.ApprovedBy ?? 0) : 0,
      ApprovedDate: !!this.form.Approved ? (this.form.ApprovedDate || now) : now
    };
  }

  submit(f?: NgForm) {
  if (!this.form.BankName || !String(this.form.BankName).trim()) {
    this.saveError = 'Bank Name is required';
    return;
  }

  const isUpdate = !!this.form.BankID && this.form.BankID !== 0;
  const body = isUpdate ? this.buildUpdatePayload() : this.buildInsertPayload();
  if (!body) return;

  this.saving = true; this.saveError = ''; this.saveSuccess = '';
  const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  this.http.post<ApiSaveResponse>(this.endpointSave, body, { headers })
    .pipe(finalize(() => this.saving = false))
    .subscribe({
      next: (res) => {
        debugger;

        // ✅ Backend contract: success when ResultId > 1
        const resultId = Number(res?.ResultId ?? 0);
        const ok = resultId > 1 || ((res?.NoofRows ?? 0) > 0 && (res?.ErrorNo ?? 0) === 0);

        if (ok) {
          this.saveSuccess = res?.Message || (isUpdate ? 'Updated successfully' : 'Saved successfully');

          // go back to grid "Edit" list
          this.cancelForm();         // resets form & mode='list'
          this.status = 'EDIT';      // force Edit list
          this.load();               // reload grid
        } else {
          this.saveError = res?.Message || `Save failed (ResultId=${resultId}).`;
        }
      },
      error: (err) => {
        console.error('Save error:', err);
        this.saveError =
          err?.error?.title ||
          err?.error?.Message ||
          err?.message ||
          'Save failed. Please verify field types and required values.';
      }
    });
}

}
