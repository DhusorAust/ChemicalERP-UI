// src/app/setting/bank.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

type ViewMode = 'list' | 'form';

interface BankRow {
  BankID?: number;
  BankName: string;
  BankShortName?: string;
  BankAddress?: string;
  SwiftCode?: string;
  IsActive?: number | boolean; // 0/1 or boolean
}

@Component({
  standalone: true,
  selector: 'app-bank',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="container p-3">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h4 class="m-0">Bank</h4>
      <div *ngIf="mode==='list'">
        <button class="btn btn-primary btn-sm" (click)="openNew()">+ Add New</button>
      </div>
      <div *ngIf="mode==='form'">
        <button class="btn btn-light border btn-sm" (click)="backToList()">← Back</button>
      </div>
    </div>

    <!-- LIST -->
    <div *ngIf="mode==='list'">
      <div *ngIf="loading" class="alert alert-info py-2">Loading...</div>
      <div *ngIf="error" class="alert alert-danger py-2">{{ error }}</div>

      <div class="table-responsive" *ngIf="!loading && rows.length">
        <table class="table table-bordered table-sm align-middle">
          <thead class="table-light">
            <tr>
              <th style="width:90px">Action</th>
              <th>Bank Name</th>
              <th>Short</th>
              <th>Address</th>
              <th>Swift</th>
              <th style="width:70px">Active</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of rows">
              <td>
                <button class="btn btn-outline-secondary btn-sm" (click)="openEdit(r)">Edit</button>
              </td>
              <td>{{ r.BankName }}</td>
              <td>{{ r.BankShortName }}</td>
              <td>{{ r.BankAddress }}</td>
              <td>{{ r.SwiftCode }}</td>
              <td>{{ (r.IsActive?1:0) ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="!loading && !rows.length" class="text-muted">No data found.</div>
    </div>

    <!-- FORM -->
    <div *ngIf="mode==='form'">
      <form [formGroup]="frm" (ngSubmit)="save()" class="row g-3">

        <div class="col-md-6">
          <label class="form-label">Bank Name <span class="text-danger">*</span></label>
          <input class="form-control" formControlName="BankName">
          <div *ngIf="submitted && frm.controls.BankName.invalid" class="text-danger small">
            Bank Name is required
          </div>
        </div>

        <div class="col-md-6">
          <label class="form-label">Short Name</label>
          <input class="form-control" formControlName="BankShortName">
        </div>

        <div class="col-md-6">
          <label class="form-label">Swift Code</label>
          <input class="form-control" formControlName="SwiftCode">
        </div>

        <div class="col-md-6">
          <label class="form-label">Active</label>
          <select class="form-select" formControlName="IsActive">
            <option [ngValue]="1">Yes</option>
            <option [ngValue]="0">No</option>
          </select>
        </div>

        <div class="col-12">
          <label class="form-label">Address</label>
          <textarea rows="2" class="form-control" formControlName="BankAddress"></textarea>
        </div>

        <div class="col-12 d-flex gap-2 mt-2">
          <button class="btn btn-primary" type="submit" [disabled]="saving">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button class="btn btn-light border" type="button" (click)="backToList()">Cancel</button>
        </div>

        <div *ngIf="error" class="alert alert-danger mt-3 py-2">{{ error }}</div>
        <div *ngIf="info" class="alert alert-success mt-3 py-2">{{ info }}</div>
      </form>
    </div>
  </div>
  `
})
export class Bank {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);
 
  apiBase = 'http://localhost:56172';
  listUrl = `${this.apiBase}/api/setting/GetBankLIst`;   
  saveUrl = `${this.apiBase}/api/setting/SaveBank`;     

  mode: ViewMode = 'list';
  rows: BankRow[] = [];
  loading = false;
  saving = false;
  submitted = false;
  error = '';
  info = '';

  frm = this.fb.group({
    BankID: [0],
    BankName: ['', Validators.required],
    BankShortName: [''],
    BankAddress: [''],
    SwiftCode: [''],
    IsActive: [1]
  });

  ngOnInit() {
    this.load();
  }

  // === LIST LOAD ===
  load() {
    this.loading = true; this.error = '';
    this.http.get<BankRow[]>(this.listUrl).subscribe({
      next: (res) => { this.rows = res ?? []; this.loading = false; },
      error: (err) => { console.error(err); this.error = 'Failed to load'; this.loading = false; }
    });
  }

  // === OPEN FORM ===
  openNew() {
    this.frm.reset({ BankID: 0, BankName: '', BankShortName: '', BankAddress: '', SwiftCode: '', IsActive: 1 });
    this.info=''; this.error=''; this.submitted=false;
    this.mode = 'form';
  }
  openEdit(r: BankRow) {
    this.frm.reset({
      BankID: r.BankID ?? 0,
      BankName: r.BankName ?? '',
      BankShortName: r.BankShortName ?? '',
      BankAddress: r.BankAddress ?? '',
      SwiftCode: r.SwiftCode ?? '',
      IsActive: (r.IsActive ? 1 : 0)
    });
    this.info=''; this.error=''; this.submitted=false;
    this.mode = 'form';
  }
  backToList(){ this.mode = 'list'; }

  // === SAVE ===
  save() {
    this.submitted = true; this.error=''; this.info='';
    if (this.frm.invalid) return;

    this.saving = true;
    const v = this.frm.value;

    // Backend যদি [FromForm] নেয়: FormData পাঠান (সবচেয়ে compatible)
    const fd = new FormData();
    Object.entries(v).forEach(([k,val])=>{
      if (val===null || val===undefined) return;
      if (typeof val === 'boolean') fd.append(k, val ? '1':'0');
      else fd.append(k, String(val));
    });

    this.http.post<any>(this.saveUrl, fd).subscribe({
      next: (res) => {
        this.saving = false;
        this.info = res?.Message || 'Saved';
        this.backToList();
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.saving = false;
        this.error = 'Save failed';
      }
    });

    // যদি আপনার save API pure JSON হয়, উপরের POST বদলে দিন:
    // this.http.post<any>(this.saveUrl, this.frm.value).subscribe(...)
  }
}
