// app/store/chemicalStore/requisition/requisition.component.ts
import { Component, OnInit, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

// adjust if your env path differs
import { environment } from '../../../environments/environment';

type Int01 = 0 | 1;
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
  ReqDate: string;         // YYYY-MM-DD
  ReqNo: string;           // usually backend-generated (display only)
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
  styleUrls: ['./requisition.css']
})
export class RequisitionComponent implements OnInit {
  private http = inject(HttpClient);

  // ---------- API endpoints (change to your backend) ----------
  apiBase = environment.apiBase;
  endpointProjects = `${this.apiBase}/api/common/projects`;
  endpointStores   = `${this.apiBase}/api/common/stores`;
  endpointPersons  = `${this.apiBase}/api/common/persons`;
  endpointSections = `${this.apiBase}/api/common/sections`;
  endpointUoms     = `${this.apiBase}/api/common/uoms`;

  // virtualized chemicals
  endpointChemicalsBase = `${this.apiBase}/api/store/chemicals/dropdown`; // ?storeId=&q=&page=&pageSize=
  endpointStock = (chemId: number, storeId: number) =>
    `${this.apiBase}/api/Store/Chemical/stock/${chemId}/${storeId}`;

  // save
  endpointSave = `${this.apiBase}/api/Store/ChemicalRequisition/save`;

  // ---------- UI State ----------
  loading = false;
  saving = false;
  error = '';
  saveError = '';
  saveSuccess = '';

  header: RequisitionHeader = this.blankHeader();
  rows: RequisitionDetail[] = [];
  totalQty = 0;

  // dropdowns (load once on init)
  projects: { id:number; name:string }[] = [];
  stores:   { id:number; name:string }[] = [];
  persons:  { id:number; name:string }[] = [];
  sections: { id:number; name:string }[] = [];
  uoms:     { id:number; name:string }[] = [];

  // ---------- Chemical virtual dropdown (only dropdown that calls API on open) ----------
  chemOpenIndex: number | null = null;
  chemList: { id:number; name:string; uomId?:number; uomName?:string }[] = [];
  chemLoading = false;
  chemPage = 1;
  chemPageSize = 50;
  chemHasMore = true;
  chemQuery = '';
  private chemSearchDebounce: any;

  ngOnInit() { this.initPage(); }

  // ---------- Helpers ----------
  private todayISO(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }
  private genReqNo(): string {
    // demo only; backend should generate
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
      Status: 'EDIT'
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
      Remarks: ''
    };
  }
  private recalcTotal() {
    this.totalQty = this.rows.reduce((s, r) => s + (Number(r.Qty) || 0), 0);
  }
  trackByIndex = (i: number) => i;

  // ---------- Init: load non-virtual dropdowns once ----------
  initPage(){
    this.loading = true; this.error = '';
    forkJoin({
      projects: this.http.get<{id:number;name:string}[]>(this.endpointProjects).pipe(catchError(()=>of([]))),
      stores:   this.http.get<{id:number;name:string}[]>(this.endpointStores).pipe(catchError(()=>of([]))),
      persons:  this.http.get<{id:number;name:string}[]>(this.endpointPersons).pipe(catchError(()=>of([]))),
      sections: this.http.get<{id:number;name:string}[]>(this.endpointSections).pipe(catchError(()=>of([]))),
      uoms:     this.http.get<{id:number;name:string}[]>(this.endpointUoms).pipe(catchError(()=>of([])))
    })
    .pipe(finalize(()=> this.loading = false))
    .subscribe({
      next: res => {
        this.projects = res.projects || [];
        this.stores   = res.stores   || [];
        this.persons  = res.persons  || [];
        this.sections = res.sections || [];
        this.uoms     = res.uoms     || [];

        // defaults (optional)
        if (this.projects[0]) this.header.ProjectId = this.projects[0].id;
        if (this.stores[0])   this.header.StoreId   = this.stores[0].id;
        if (this.persons[0])  this.header.RequisitionById = this.persons[0].id;
        if (this.persons[1])  this.header.ConcernPersonId = this.persons[1].id;

        this.rows = [ this.blankRow() ];
        this.recalcTotal();
      },
      error: _ => this.error = 'Failed to load initial data'
    });
  }

  // ---------- Row actions ----------
  addRow(){ this.rows.push(this.blankRow()); }
  removeRow(i: number){ if (i>=0 && i<this.rows.length){ this.rows.splice(i,1); this.recalcTotal(); } }
  onQtyBlur(){ this.recalcTotal(); }

  // ---------- Store change resets chemical cache ----------
  onStoreChanged(){
    this.header.StoreId = Number(this.header.StoreId || 0);
    this.closeChemDropdown();
    this.chemList = []; this.chemHasMore = true; this.chemPage = 1; this.chemQuery = '';
  }

  // ---------- Chemical virtual dropdown ----------
  openChemDropdown(rowIndex: number){
    if (this.chemOpenIndex === rowIndex){ this.closeChemDropdown(); return; }
    this.chemOpenIndex = rowIndex;
    this.fetchChemicals(true); // fetch only when opened
  }
  closeChemDropdown(){ this.chemOpenIndex = null; }

  private fetchChemicals(reset = false){
    if (reset){
      this.chemPage = 1; this.chemHasMore = true; this.chemList = [];
    }
    if (this.chemLoading || !this.chemHasMore) return;

    this.chemLoading = true;
    let params = new HttpParams()
      .set('page', String(this.chemPage))
      .set('pageSize', String(this.chemPageSize));
    if (this.header.StoreId) params = params.set('storeId', String(this.header.StoreId));
    if (this.chemQuery?.trim()) params = params.set('q', this.chemQuery.trim());

    this.http.get<{ id:number; name:string; uomId?:number; uomName?:string }[]>(
      this.endpointChemicalsBase, { params }
    )
    .pipe(finalize(()=> this.chemLoading = false))
    .subscribe({
      next: rows => {
        const items = rows || [];
        this.chemList = this.chemList.concat(items);
        this.chemHasMore = items.length >= this.chemPageSize;
        if (this.chemHasMore) this.chemPage += 1;
      },
      error: _ => { this.error = 'Failed to load chemicals'; this.chemHasMore = false; }
    });
  }

  onChemScrolled(scrolledIndex: number){
    const preloadThreshold = 20; // when ~20 items left, prefetch
    if (!this.chemLoading && this.chemHasMore && scrolledIndex > this.chemList.length - preloadThreshold) {
      this.fetchChemicals(false);
    }
  }

  onChemSearchInput(){
    clearTimeout(this.chemSearchDebounce);
    this.chemSearchDebounce = setTimeout(()=> this.fetchChemicals(true), 200);
  }

  chooseChemical(row: RequisitionDetail, c: { id:number; name:string; uomId?:number; uomName?:string }){
    row.ChemicalId = c.id;
    row.ChemicalName = c.name;
    if (c.uomId){ row.UomId = c.uomId; row.UomName = c.uomName || ''; }
    this.loadStock(row);
    this.closeChemDropdown();
  }

  loadStock(row: RequisitionDetail){
    if (!row.ChemicalId || !this.header.StoreId) { row.StockQty = 0; return; }
    this.http.get<{ stock:number }>(this.endpointStock(row.ChemicalId, this.header.StoreId))
      .pipe(catchError(()=>of({stock:0})))
      .subscribe(res => row.StockQty = Number(res?.stock || 0));
  }

  // ---------- Save / Print ----------
  submit(approve = false){
    this.saveError = ''; this.saveSuccess = '';

    if (!this.header.ProjectId || !this.header.StoreId){
      this.saveError = 'Project & Store are required.'; return;
    }
    if (!this.rows.length || !this.rows.some(r => Number(r.Qty) > 0)){
      this.saveError = 'At least one detail with Qty > 0 is required.'; return;
    }

    this.header.Status = approve ? 'APPROVED' : 'EDIT';
    const payload = { Header: this.header, Details: this.rows };

    this.saving = true;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    this.http.post<ApiSaveResponse>(this.endpointSave, payload, { headers })
      .pipe(finalize(()=> this.saving = false))
      .subscribe({
        next: (res) => {
          const ok = (Number(res?.ResultId||0) > 1) || ((res?.NoofRows||0) > 0 && (res?.ErrorNo||0) === 0);
          if (ok) this.saveSuccess = res?.Message || 'Requisition saved successfully.';
          else    this.saveError   = res?.Message || 'Save failed.';
        },
        error: (err) => {
          this.saveError = err?.error?.title || err?.error?.Message || err?.message || 'Save failed.';
        }
      });
  }

  print(){ window.print(); }
  backToList(){ this.header = this.blankHeader(); this.rows = [this.blankRow()]; this.recalcTotal(); }
}

