import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { AdminEmailAuditService } from '../../services/admin-email-audit.service';
import { EmailAuditItem, EmailAuditPage, EmailAuditQuery } from '../../models/email-audit.models';
import { BackButtonComponent } from '../shared/back-button.component';

@Component({
  selector: 'app-email-audit-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, BackButtonComponent],
  providers: [DatePipe],
  styles: [`
    /* Align with other search pages */
    .email-audit-search{display:flex;flex-direction:column;gap:1rem;padding:20px;max-width:var(--page-max-width,1200px);margin:0 auto}
    .page-header{display:flex;justify-content:space-between;align-items:center;gap:1rem}
    .content{background:#fff;border-radius:1rem;border:1px solid #e5e7eb;padding:1rem}
    .state{padding:2rem;text-align:center;border-radius:.85rem}
    .state-loading{background:#eff6ff;color:#1d4ed8}
    .nowrap{white-space:nowrap}
    .email-audit-search .filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem 1rem;align-items:end;margin-bottom:.5rem}
    .email-audit-search .filters .filter-group label{display:grid;gap:.35rem}
    .status-chip{display:inline-block;padding:.15rem .4rem;border-radius:.5rem;font-size:.75rem}
    .status-sent{background:#e8f5e9;color:#256029}
    .status-failed{background:#fef2f2;color:#b91c1c}
    .status-pending{background:#fff7ed;color:#9a3412}
    .mono{font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace}
    /* modal */
    .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1500;display:flex;align-items:center;justify-content:center}
    .modal{background:#fff;max-width:900px;width:95%;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,.25);display:flex;flex-direction:column;max-height:85vh;overflow:hidden}
    .modal .hd{padding:14px 16px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:#f9fafb;position:sticky;top:0;z-index:1}
    .modal .ct{padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;overflow:auto}
    .modal .ct .full{grid-column:1 / -1}
    .modal .ft{padding:12px 16px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end;gap:8px;background:#fff;position:sticky;bottom:0}
    .modal .label{font-size:12px;color:#6b7280}
    .modal .value{font-weight:600;color:#111827}
    .preview{background:#0b1220; color:#e5e7eb; border:1px solid #1f2937; border-radius:8px; padding:12px; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono','Courier New', monospace; white-space:pre-wrap; overflow:auto; max-height:48vh; line-height:1.5; word-break:break-word; overflow-wrap:anywhere}
    .modal .hd button{border:none;background:transparent;color:#374151;cursor:pointer}
    .modal .hd button:focus{outline:2px solid #2563eb; outline-offset:2px; border-radius:6px}
    @media (max-width: 720px){
      .modal .ct{grid-template-columns:1fr}
    }
  `],
  template: `
    <div class="email-audit-search">
      <div class="page-header">
        <app-back-button></app-back-button>
        <h1>Rejestr e‑maili</h1>
      </div>

      <div class="content">
        <form class="filters" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="filter-group">
            <label>Status
              <select formControlName="status">
                <option value="">Wszystkie</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </label>
          </div>
          <div class="filter-group">
            <label>Typ
              <input formControlName="type" placeholder="np. TRIAL_SIGNUP" />
            </label>
          </div>
          <div class="filter-group">
            <label>Odbiorca zawiera
              <input formControlName="to" placeholder="email lub fragment" />
            </label>
          </div>
          <div class="filter-group">
            <label>Provider
              <select formControlName="provider">
                <option value="">Wszystkie</option>
                <option value="smtp">smtp</option>
                <option value="log">log</option>
              </select>
            </label>
          </div>
          <div class="filter-group">
            <label>Od (data i czas)
              <input type="datetime-local" formControlName="from" />
            </label>
          </div>
          <div class="filter-group">
            <label>Do (data i czas)
              <input type="datetime-local" formControlName="toDate" />
            </label>
          </div>
          <div class="filter-group">
            <label>Sortowanie
              <select formControlName="sort">
                <option value="createdAt,desc">createdAt,desc</option>
                <option value="createdAt,asc">createdAt,asc</option>
                <option value="status,asc">status,asc</option>
                <option value="type,asc">type,asc</option>
                <option value="recipient,asc">recipient,asc</option>
                <option value="id,asc">id,asc</option>
              </select>
            </label>
          </div>
          <div class="filter-actions">
            <button class="link-btn" type="button" (click)="reset()">Wyczyść</button>
            <button class="link-btn" type="submit">Szukaj</button>
          </div>
        </form>

        <div *ngIf="loading()" class="state state-loading">Ładowanie…</div>

        <table *ngIf="!loading() && items().length" class="app-table">
          <thead>
            <tr>
              <th (click)="toggleSort('createdAt')" class="sortable">Utworzono</th>
              <th>Do</th>
              <th>Temat</th>
              <th>Status</th>
              <th>Typ</th>
              <th>Provider</th>
              <th>Wysłano</th>
              <th>ID</th>
              <th>Podgląd</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let it of items()">
              <td>{{ it.createdAt | date:'yyyy-MM-dd HH:mm' }}</td>
              <td class="mono">{{ it.recipient }}</td>
              <td [title]="it.preview">{{ it.subject }}</td>
              <td>
                <span class="status-chip" [class.status-sent]="it.status==='SENT'" [class.status-failed]="it.status==='FAILED'" [class.status-pending]="it.status==='PENDING'">{{ it.status }}</span>
              </td>
              <td>{{ it.type }}</td>
              <td>{{ it.provider }}</td>
              <td>{{ it.sentAt ? (it.sentAt | date:'yyyy-MM-dd HH:mm') : '-' }}</td>
              <td class="mono">{{ it.id }}</td>
              <td class="nowrap"><button class="link-btn" type="button" (click)="openPreview(it)">Podgląd →</button></td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading() && total() === 0" class="state">Brak wyników.</div>

        <div class="app-pagination">
          <button type="button" [disabled]="page() === 0" (click)="prev()">Poprzednia</button>
          <span>Strona {{ page()+1 }} z {{ totalPages() }}</span>
          <button type="button" [disabled]="page()+1 >= totalPages()" (click)="next()">Następna</button>
          <select [ngModel]="size()" (ngModelChange)="changeSize($event)">
            <option [value]="10">10</option>
            <option [value]="20">20</option>
            <option [value]="50">50</option>
          </select>
        </div>

        <!-- Modal podglądu -->
        <div *ngIf="previewOpen()" class="backdrop" role="dialog" aria-modal="true" aria-labelledby="email-preview-title">
          <div class="modal" tabindex="-1">
            <div class="hd">
              <div id="email-preview-title">Podgląd wiadomości</div>
              <button type="button" (click)="closePreview()">Zamknij ✖</button>
            </div>
            <div class="ct">
              <div>
                <div class="label">Do</div>
                <div class="value mono">{{ selected()?.recipient }}</div>
              </div>
              <div>
                <div class="label">Typ</div>
                <div class="value">{{ selected()?.type }}</div>
              </div>
              <div>
                <div class="label">Status</div>
                <div class="value">{{ selected()?.status }}</div>
              </div>
              <div>
                <div class="label">Provider</div>
                <div class="value">{{ selected()?.provider }}</div>
              </div>
              <div>
                <div class="label">Utworzono</div>
                <div class="value">{{ selected()?.createdAt | date:'yyyy-MM-dd HH:mm' }}</div>
              </div>
              <div>
                <div class="label">Wysłano</div>
                <div class="value">{{ selected()?.sentAt ? (selected()?.sentAt | date:'yyyy-MM-dd HH:mm') : '-' }}</div>
              </div>
              <div class="full">
                <div class="label">Temat</div>
                <div class="value">{{ selected()?.subject }}</div>
              </div>
              <div class="full">
                <div class="label">Podgląd treści</div>
                <div class="preview">{{ selected()?.preview || '(brak podglądu)' }}</div>
              </div>
            </div>
            <div class="ft">
              <button type="button" (click)="copyPreview()">Kopiuj podgląd</button>
              <button type="button" (click)="closePreview()" class="primary">Zamknij</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EmailAuditSearchComponent implements OnInit {
  form!: FormGroup;

  loading = signal<boolean>(false);
  page = signal<number>(0);
  size = signal<number>(20);
  total = signal<number>(0);
  items = signal<EmailAuditItem[]>([]);
  previewOpen = signal<boolean>(false);
  selected = signal<EmailAuditItem | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));

  constructor(private fb: FormBuilder, private api: AdminEmailAuditService) {
    this.form = this.fb.group({
      status: [''],
      type: [''],
      to: [''],
      provider: [''],
      from: [''],
      toDate: [''],
      sort: ['createdAt,desc']
    });
  }

  ngOnInit(): void {
    this.search();
  }

  private buildQuery(): EmailAuditQuery {
    const v = this.form.value;
    return {
      page: this.page(),
      size: this.size(),
      sort: v.sort || undefined,
      status: v.status || undefined,
      type: v.type || undefined,
      to: v.to || undefined,
      provider: v.provider || undefined,
      from: this.toIso(v.from),
      toDate: this.toIso(v.toDate)
    };
  }

  private toIso(value?: string | null): string | undefined {
    if (!value) return undefined;
    // datetime-local returns 'YYYY-MM-DDTHH:mm'; assume local, convert to ISO without timezone shift
    return value;
  }

  search(): void {
    const q = this.buildQuery();
    this.loading.set(true);
    this.api.list(q).subscribe({
      next: (page: EmailAuditPage) => {
        this.items.set(page.items ?? []);
        this.total.set(page.total ?? 0);
        this.page.set(page.page ?? 0);
        this.size.set(page.size ?? 20);
      },
      error: () => {},
      complete: () => this.loading.set(false)
    });
  }

  onSubmit(): void {
    this.page.set(0);
    this.search();
  }

  reset(): void {
    this.form.reset({ status: '', type: '', to: '', provider: '', from: '', toDate: '', sort: 'createdAt,desc' });
    this.page.set(0);
    this.search();
  }

  toggleSort(field: string): void {
    const cur = this.form.value.sort || 'createdAt,desc';
    const [f, d] = cur.split(',');
    const next = f === field ? `${field},${d === 'asc' ? 'desc' : 'asc'}` : `${field},asc`;
    this.form.patchValue({ sort: next });
    this.page.set(0);
    this.search();
  }

  prev(): void {
    if (this.page() === 0) return;
    this.page.set(this.page() - 1);
    this.search();
  }

  next(): void {
    if (this.page() + 1 >= this.totalPages()) return;
    this.page.set(this.page() + 1);
    this.search();
  }

  changeSize(sz: number): void {
    const n = Number(sz);
    this.size.set(Number.isFinite(n) && n > 0 ? n : 20);
    this.page.set(0);
    this.search();
  }

  openPreview(it: EmailAuditItem): void {
    this.selected.set(it);
    this.previewOpen.set(true);
    // Focus management could be added here if needed
  }

  closePreview(): void {
    this.previewOpen.set(false);
    this.selected.set(null);
  }

  async copyPreview(): Promise<void> {
    const text = this.selected()?.preview || '';
    try {
      await navigator.clipboard.writeText(text);
      // optional toast could be triggered here if NotificationService is available
    } catch {}
  }
}
