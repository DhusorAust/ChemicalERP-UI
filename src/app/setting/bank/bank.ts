import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

type ViewMode = 'list' | 'form';
interface BankRow {
  BankID?: number;
  BankName: string;
  BankShortName?: string;
  BankAddress?: string;
  SwiftCode?: string;
  IsActive?: number | boolean;
}

@Component({
  standalone: true,
  selector: 'app-bank',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bank.html',
  styleUrls: ['./bank.css'],              // ← keep external CSS
  encapsulation: ViewEncapsulation.None   // ← ensure styles always apply
})
export class Bank implements OnInit {
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

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.http.get<BankRow[]>(this.listUrl).subscribe({
      next: r => { this.rows = r ?? []; this.loading = false; },
      error: _ => { this.error = 'Failed to load banks'; this.loading = false; }
    });
  }

  openNew() {
    this.frm.reset({ BankID: 0, BankName: '', BankShortName: '', BankAddress: '', SwiftCode: '', IsActive: 1 });
    this.submitted = false; this.info=''; this.error=''; this.mode = 'form';
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
    this.submitted = false; this.info=''; this.error=''; this.mode = 'form';
  }
  backToList(){ this.mode = 'list'; }

  save() {
    this.submitted = true; this.error=''; this.info='';
    if (this.frm.invalid) return;

    this.saving = true;
    const fd = new FormData();
    Object.entries(this.frm.value).forEach(([k,v])=>{
      if (v===null || v===undefined) return;
      if (typeof v === 'boolean') fd.append(k, v ? '1' : '0'); else fd.append(k, String(v));
    });

    this.http.post<any>(this.saveUrl, fd).subscribe({
      next: res => {
        this.saving = false;
        if (res?.ResultId && Number(res.ResultId) > 0) {
          this.info = res?.Message || 'Saved';
          this.backToList(); this.load();
        } else {
          this.error = res?.Message || 'Save failed';
        }
      },
      error: _ => { this.saving = false; this.error = 'Save failed'; }
    });
  }

  trackById = (_: number, r: BankRow) => r.BankID ?? 0;
}
