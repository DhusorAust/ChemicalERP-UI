// file: app/store/chemicalStore/requisition/requisition.component.ts
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

type Status = 'DRAFT' | 'EDIT' | 'APPROVED' | 'REJECTED';

interface ApiSaveResponse {
  ResultId?: number;
  NoofRows?: number;
  ErrorNo?: number;
  Message?: string;
}

interface RequisitionHeader {
  ProjectId: number;
  ProjectName?: string;
  StoreId: number;
  StoreName?: string;
  ReqDate: string;
  ReqNo: string;
  RequisitionById: number;
  RequisitionByName?: string;
  ConcernPersonId: number;
  ConcernPersonName?: string;
  Remarks: string;
  ReviseReason: string;
  RejectReason: string;
  Status: Status;
}

interface RequisitionDetail {
  ChemicalId: number;
  ChemicalName: string;
  UomId: number;
  UomName?: string;
  StockQty: number;
  Qty: number;
  SectionId: number;
  SectionName?: string;
  Remarks: string;
}

@Component({
  standalone: true,
  selector: 'app-chemical-requisition',
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule, ScrollingModule],
  templateUrl: './requisition.html',  
  styleUrls: ['./requisition.css'],
})
export class RequisitionComponent implements OnInit {
  private http = inject(HttpClient);

  apiBase = environment.apiBase;
  endpointProjects = `${this.apiBase}/api/DropDownList/projects`;
  endpointStores   = `${this.apiBase}/api/DropDownList/stores`;
  endpointPersons  = `${this.apiBase}/api/DropDownList/persons`;
  endpointSections = `${this.apiBase}/api/DropDownList/sections`;
  endpointUoms     = `${this.apiBase}/api/DropDownList/uoms`;

  endpointChemicalsBase = `${this.apiBase}/api/DropDownList/chemicals`;
  endpointStock = (chemId: number, storeId: number) =>
    `${this.apiBase}/api/Store/Chemical/stock/${chemId}/${storeId}`;

  endpointSave = `${this.apiBase}/api/Store/ChemicalRequisition/save`;

  loading = false;
  saving = false;
  error = '';
  saveError = '';
  saveSuccess = '';

  header: RequisitionHeader = this.blankHeader();
  rows: RequisitionDetail[] = [];
  totalQty = 0;

  projects: { id: number; text: string }[] = [];
  stores:   { id: number; text: string }[] = [];
  persons:  { id: number; text: string }[] = [];
  sections: { id: number; text: string }[] = [];
  uoms:     { id: number; text: string }[] = [];

  chemOpenIndex: number | null = null;
  chemList: { id: number; text: string; uomId?: number; uomName?: string }[] = [];
  chemLoading = false;
  chemPage = 1;
  chemPageSize = 50;
  chemHasMore = true;
  chemQuery = '';
  private chemSearchDebounce: any;

  ngOnInit() { this.initPage(); }

  private todayISO(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  private genReqNo(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `REQ-${d.getFullYear()}-${mm}-000011`;
  }

  private blankHeader(): RequisitionHeader {
    return {
      ProjectId: 0,
      StoreId: 0,
      ReqDate: this.todayISO(),
      ReqNo: this.genReqNo(),
      RequisitionById: 0,
      ConcernPersonId: 0,
      Remarks: '',
      ReviseReason: '',
      RejectReason: '',
      Status: 'EDIT',
    };
  }

  private blankRow(): RequisitionDetail {
    return {
      ChemicalId: 0,
      ChemicalName: '',
      UomId: 0,
      UomName: '',
      StockQty: 0,
      Qty: 0,
      SectionId: 0,
      SectionName: '',
      Remarks: '',
    };
  }

  private recalcTotal() {
    this.totalQty = this.rows.reduce((s, r) => s + (Number(r.Qty) || 0), 0);
  }

  trackByIndex = (i: number) => i;

  initPage() {
    this.loading = true;
    this.error = '';
    forkJoin({
      projects: this.http.get<any>(this.endpointProjects).pipe(catchError((err) => { console.error('Projects error:', err); return of([]); })),
      stores:   this.http.get<any>(this.endpointStores).pipe(catchError((err) => { console.error('Stores error:', err); return of([]); })),
      persons:  this.http.get<any>(this.endpointPersons).pipe(catchError((err) => { console.error('Persons error:', err); return of([]); })),
      sections: this.http.get<any>(this.endpointSections).pipe(catchError((err) => { console.error('Sections error:', err); return of([]); })),
      uoms:     this.http.get<any>(this.endpointUoms).pipe(catchError((err) => { console.error('Uoms error:', err); return of([]); })),
    })
    .pipe(finalize(() => (this.loading = false)))
    .subscribe({
      next: (res) => {
        // tolerant normalizer (handles raw arrays or common wrappers)
        this.projects = this.normalizeDropdown(res.projects);
        this.stores   = this.normalizeDropdown(res.stores);
        this.persons  = this.normalizeDropdown(res.persons);
        this.sections = this.normalizeDropdown(res.sections);
        this.uoms     = this.normalizeDropdown(res.uoms);

        if (this.projects[0]) this.header.ProjectId = toNumber(this.projects[0].id);
        if (this.stores[0])   this.header.StoreId   = toNumber(this.stores[0].id);
        if (this.persons[0])  this.header.RequisitionById = toNumber(this.persons[0].id);
        if (this.persons[1])  this.header.ConcernPersonId = toNumber(this.persons[1].id);

        this.rows = [this.blankRow()];
        this.recalcTotal();
      },
      error: (err) => {
        console.error('❌ initPage error:', err);
        this.error = 'Failed to load initial data';
      },
    });
  }

  /** Why: Different backends wrap arrays differently; prevent silent empty dropdowns. */
  private unwrapToArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    const wrappers = [
      'items','Items',
      'data','Data',
      'result','Result',
      'results','Results',
      'rows','Rows',
      'list','List'
    ];
    for (const k of wrappers) {
      const v = (data as any)[k];
      if (Array.isArray(v)) return v;
    }
    const firstArray = Object.values(data).find(v => Array.isArray(v)) as any[] | undefined;
    return firstArray ?? [];
  }

  /** Why: Accepts `{ id, text }` and common casing variants; coerces id to number. */
  private normalizeDropdown(data: any): { id: number; text: string }[] {
    const arr = this.unwrapToArray(data);
    if (!arr.length) return [];
    return arr.map((item: any) => {
      const id = item?.id ?? item?.Id ?? item?.ID ?? item?.Value ?? item?.value ?? 0;
      const text = item?.text ?? item?.Text ?? item?.Name ?? item?.name ?? item?.Label ?? item?.label ?? '';
      return { id: toNumber(id), text: String(text).trim() };
    }).filter(x => x.text !== '');
  }

  addRow() { this.rows.push(this.blankRow()); }
  removeRow(i: number) {
    if (i >= 0 && i < this.rows.length) {
      this.rows.splice(i, 1);
      this.recalcTotal();
    }
  }
  onQtyBlur() { this.recalcTotal(); }

  onStoreChanged() {
    this.header.StoreId = toNumber(this.header.StoreId || 0);
    this.closeChemDropdown();
    this.chemList = [];
    this.chemHasMore = true;
    this.chemPage = 1;
    this.chemQuery = '';
  }

  openChemDropdown(rowIndex: number) {
    if (this.chemOpenIndex === rowIndex) {
      this.closeChemDropdown();
      return;
    }
    this.chemOpenIndex = rowIndex;
    this.fetchChemicals(true);
  }
  closeChemDropdown() { this.chemOpenIndex = null; }

  private fetchChemicals(reset = false) {
    if (reset) {
      this.chemPage = 1;
      this.chemHasMore = true;
      this.chemList = [];
    }
    if (this.chemLoading || !this.chemHasMore) return;

    this.chemLoading = true;
    let params = new HttpParams()
      .set('page', String(this.chemPage))
      .set('pageSize', String(this.chemPageSize));
    if (this.header.StoreId) params = params.set('storeId', String(this.header.StoreId));
    if (this.chemQuery?.trim()) params = params.set('q', this.chemQuery.trim());

    this.http.get<{ id:number; text:string; uomId?:number; uomName?:string }[]>(
      this.endpointChemicalsBase, { params }
    )
    .pipe(finalize(() => (this.chemLoading = false)))
    .subscribe({
      next: rows => {
        const items = rows || [];
        this.chemList = this.chemList.concat(items);
        this.chemHasMore = items.length >= this.chemPageSize;
        if (this.chemHasMore) this.chemPage += 1;
      },
      error: () => {
        this.error = 'Failed to load chemicals';
        this.chemHasMore = false;
      }
    });
  }

  onChemScrolled(scrolledIndex: number) {
    const preloadThreshold = 20;
    if (!this.chemLoading && this.chemHasMore && scrolledIndex > this.chemList.length - preloadThreshold) {
      this.fetchChemicals(false);
    }
  }

  onChemSearchInput() {
    clearTimeout(this.chemSearchDebounce);
    this.chemSearchDebounce = setTimeout(() => this.fetchChemicals(true), 200);
  }

  chooseChemical(row: RequisitionDetail, c: { id:number; text:string; uomId?:number; uomName?:string }) {
    row.ChemicalId = c.id;
    row.ChemicalName = c.text;
    if (c.uomId) {
      row.UomId = c.uomId;
      row.UomName = c.uomName || '';
    }
    this.loadStock(row);
    this.closeChemDropdown();
  }

  loadStock(row: RequisitionDetail) {
    if (!row.ChemicalId || !this.header.StoreId) {
      row.StockQty = 0;
      return;
    }
    this.http.get<{ stock:number }>(this.endpointStock(row.ChemicalId, this.header.StoreId))
      .pipe(catchError(() => of({ stock: 0 })))
      .subscribe(res => row.StockQty = Number(res?.stock || 0));
  }

  submit(approve = false) {
    this.saveError = '';
    this.saveSuccess = '';

    if (!this.header.ProjectId || !this.header.StoreId) {
      this.saveError = 'Project & Store are required.';
      return;
    }
    if (!this.rows.length || !this.rows.some(r => Number(r.Qty) > 0)) {
      this.saveError = 'At least one detail with Qty > 0 is required.';
      return;
    }

    this.header.Status = approve ? 'APPROVED' : 'EDIT';
    const payload = { Header: this.header, Details: this.rows };

    this.saving = true;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post<ApiSaveResponse>(this.endpointSave, payload, { headers })
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          const ok = (Number(res?.ResultId || 0) > 1) || ((res?.NoofRows || 0) > 0 && (res?.ErrorNo || 0) === 0);
          if (ok) this.saveSuccess = res?.Message || 'Requisition saved successfully.';
          else    this.saveError   = res?.Message || 'Save failed.';
        },
        error: (err) => {
          this.saveError = err?.error?.title || err?.error?.Message || err?.message || 'Save failed.';
        }
      });
  }

  print() { window.print(); }

  backToList() {
    this.header = this.blankHeader();
    this.rows = [this.blankRow()];
    this.recalcTotal();
  }
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
