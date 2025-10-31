import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { EmployeeService } from '../../services/employee.service';
import { ImportEmployeesResponse } from '../../models/employee.models';

@Component({
  selector: 'app-import-employees',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="import-employees">
      <div class="header">
        <h1>Import Pracowników z CSV</h1>
        <button class="btn-back" (click)="goBack()">← Powrót</button>
      </div>

      <div class="import-container">
        <!-- Instructions -->
        <div class="instructions-card">
          <h2>📋 Instrukcje</h2>
          <div class="instruction-content">
            <p><strong>Format pliku CSV:</strong></p>
            <ul>
              <li>Plik musi mieć rozszerzenie <code>.csv</code></li>
              <li>Kodowanie: UTF-8</li>
              <li>Separator: przecinek (<code>,</code>)</li>
              <li>Pierwszy wiersz to nagłówki kolumn</li>
            </ul>

            <p><strong>Wymagane kolumny:</strong></p>
            <div class="csv-format">
              <pre>username,email,password,firstName,lastName,annualDays,annualUsed,sickDays,sickUsed</pre>
            </div>

            <p><strong>Przykład:</strong></p>
            <div class="csv-example">
              <pre>jkowalski,jan.kowalski@firma.pl,haslo123,Jan,Kowalski,26,5,10,2
anowak,anna.nowak@firma.pl,haslo456,Anna,Nowak,26,0,10,0</pre>
            </div>

            <p><strong>Opisy kolumn:</strong></p>
            <div class="column-descriptions">
              <div class="column-desc">
                <strong>username:</strong> Unikalna nazwa użytkownika
              </div>
              <div class="column-desc">
                <strong>email:</strong> Adres email pracownika
              </div>
              <div class="column-desc">
                <strong>password:</strong> Hasło (min. 8 znaków)
              </div>
              <div class="column-desc">
                <strong>firstName:</strong> Imię pracownika
              </div>
              <div class="column-desc">
                <strong>lastName:</strong> Nazwisko pracownika
              </div>
              <div class="column-desc">
                <strong>annualDays:</strong> Przydzielone dni urlopu wypoczynkowego
              </div>
              <div class="column-desc">
                <strong>annualUsed:</strong> Wykorzystane dni urlopu wypoczynkowego
              </div>
              <div class="column-desc">
                <strong>sickDays:</strong> Przydzielone dni zwolnień lekarskich
              </div>
              <div class="column-desc">
                <strong>sickUsed:</strong> Wykorzystane dni zwolnień lekarskich
              </div>
            </div>
          </div>

          <div class="download-template">
            <h3>📥 Szablon CSV</h3>
            <p>Pobierz szablon pliku CSV z przykładowymi danymi:</p>
            <button class="btn-template" (click)="downloadTemplate()">
              📄 Pobierz szablon CSV
            </button>
          </div>
        </div>

        <!-- File Upload -->
        <div class="upload-card">
          <h2>📁 Wybierz plik CSV</h2>
          
          <div class="file-upload-area" 
               [class.dragover]="isDragOver"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)"
               (click)="fileInput.click()">
            
            <input #fileInput 
                   type="file" 
                   accept=".csv" 
                   (change)="onFileSelected($event)"
                   style="display: none;">
            
            <div class="upload-content">
              <div class="upload-icon">📄</div>
              <div *ngIf="!selectedFile">
                <p><strong>Przeciągnij plik CSV tutaj</strong></p>
                <p>lub kliknij aby wybrać plik</p>
                <p class="file-note">Maksymalny rozmiar: 5MB</p>
              </div>
              <div *ngIf="selectedFile" class="selected-file">
                <div class="file-info">
                  <strong>{{ selectedFile.name }}</strong>
                  <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
                </div>
                <button class="btn-remove" (click)="removeFile($event)">✕</button>
              </div>
            </div>
          </div>

          <div class="upload-actions" *ngIf="selectedFile">
            <button class="btn-secondary" (click)="removeFile($event)">
              Usuń plik
            </button>
            <button class="btn-primary" 
                    (click)="uploadFile()" 
                    [disabled]="uploading">
              <span *ngIf="uploading">⏳ Importowanie...</span>
              <span *ngIf="!uploading">🚀 Importuj pracowników</span>
            </button>
          </div>
        </div>

        <!-- Results -->
        <div *ngIf="importResult" class="results-card">
          <h2>📊 Wyniki importu</h2>
          
          <div class="result-summary">
            <div class="result-stat success">
              <div class="stat-number">{{ importResult.successCount }}</div>
              <div class="stat-label">Pomyślnie zaimportowano</div>
            </div>
            <div class="result-stat error">
              <div class="stat-number">{{ importResult.failedCount }}</div>
              <div class="stat-label">Błędy importu</div>
            </div>
          </div>

          <div class="result-message" 
               [class.success]="importResult.failedCount === 0"
               [class.warning]="importResult.failedCount > 0">
            {{ importResult.message }}
          </div>

          <div *ngIf="importResult.errors && importResult.errors.length > 0" class="errors-list">
            <h3>⚠️ Szczegóły błędów:</h3>
            <ul>
              <li *ngFor="let error of importResult.errors" class="error-item">
                {{ error }}
              </li>
            </ul>
          </div>

          <div class="result-actions">
            <button class="btn-primary" (click)="viewEmployees()">
              👥 Zobacz listę pracowników
            </button>
            <button class="btn-secondary" (click)="importAnother()">
              📁 Importuj kolejny plik
            </button>
          </div>
        </div>

        <!-- Error -->
        <div *ngIf="error" class="alert alert-error">
          <strong>❌ Błąd importu:</strong><br>
          {{ error }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .import-employees {
      padding: 2rem;
      max-width: min(var(--page-max-width, 1200px), 1000px);
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      color: #1f2937;
      margin: 0;
    }

    .btn-back, .btn-primary, .btn-secondary, .btn-template, .btn-remove {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-back {
      background: #6b7280;
      color: white;
    }

    .btn-back:hover {
      background: #4b5563;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .btn-template {
      background: #059669;
      color: white;
    }

    .btn-template:hover {
      background: #047857;
    }

    .btn-remove {
      background: #dc2626;
      color: white;
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
    }

    .btn-remove:hover {
      background: #b91c1c;
    }

    .import-container {
      display: grid;
      gap: 2rem;
    }

    .instructions-card, .upload-card, .results-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 2rem;
    }

    .instructions-card h2, .upload-card h2, .results-card h2 {
      color: #1f2937;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .csv-format, .csv-example {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 1rem;
      margin: 0.5rem 0;
    }

    .csv-format pre, .csv-example pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .column-descriptions {
      display: grid;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .column-desc {
      padding: 0.5rem;
      background: #f9fafb;
      border-radius: 4px;
      font-size: 0.875rem;
    }

    .download-template {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }

    .download-template h3 {
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .file-upload-area {
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      background: #fafafa;
    }

    .file-upload-area:hover, .file-upload-area.dragover {
      border-color: #2563eb;
      background: #eff6ff;
    }

    .upload-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .upload-content p {
      margin: 0.5rem 0;
      color: #374151;
    }

    .file-note {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .selected-file {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #eff6ff;
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid #2563eb;
    }

    .file-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .file-size {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .upload-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 1.5rem;
    }

    .result-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .result-stat {
      text-align: center;
      padding: 1.5rem;
      border-radius: 6px;
    }

    .result-stat.success {
      background: #d1fae5;
      border: 1px solid #a7f3d0;
    }

    .result-stat.error {
      background: #fee2e2;
      border: 1px solid #fecaca;
    }

    .stat-number {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .result-stat.success .stat-number {
      color: #065f46;
    }

    .result-stat.error .stat-number {
      color: #991b1b;
    }

    .stat-label {
      font-weight: 500;
      color: #374151;
    }

    .result-message {
      padding: 1rem;
      border-radius: 6px;
      margin-bottom: 1.5rem;
      font-weight: 500;
    }

    .result-message.success {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    .result-message.warning {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fbbf24;
    }

    .errors-list {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .errors-list h3 {
      color: #991b1b;
      margin-bottom: 1rem;
    }

    .errors-list ul {
      margin: 0;
      padding-left: 1.5rem;
    }

    .error-item {
      color: #dc2626;
      margin-bottom: 0.5rem;
    }

    .result-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .alert {
      padding: 1rem;
      border-radius: 6px;
      margin-top: 1rem;
    }

    .alert-error {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }

    @media (max-width: 768px) {
      .import-employees {
        padding: 1rem;
      }

      .header {
        flex-direction: column;
        gap: 1rem;
      }

      .result-summary {
        grid-template-columns: 1fr;
      }

      .result-actions, .upload-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ImportEmployeesComponent {
  selectedFile: File | null = null;
  uploading = false;
  isDragOver = false;
  importResult: ImportEmployeesResponse | null = null;
  error = '';

  constructor(
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File): void {
    // Sprawdź typ pliku
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error = 'Plik musi mieć rozszerzenie .csv';
      return;
    }

    // Sprawdź rozmiar pliku (5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Plik jest za duży. Maksymalny rozmiar to 5MB.';
      return;
    }

    this.selectedFile = file;
    this.error = '';
    this.importResult = null;
  }

  removeFile(event: Event): void {
    event.stopPropagation();
    this.selectedFile = null;
    this.error = '';
    this.importResult = null;
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.error = 'Wybierz plik CSV do importu.';
      return;
    }

    this.uploading = true;
    this.error = '';

    this.employeeService.importEmployees(this.selectedFile).subscribe({
      next: (result) => {
        console.log('Import result:', result);
        this.importResult = result;
        this.uploading = false;
      },
      error: (error) => {
        console.error('Import error:', error);
        this.error = error.error?.message || 'Nie udało się zaimportować pracowników.';
        this.uploading = false;
      }
    });
  }

  downloadTemplate(): void {
    const csvContent = `username,email,password,firstName,lastName,annualDays,annualUsed,sickDays,sickUsed
jkowalski,jan.kowalski@firma.pl,haslo123,Jan,Kowalski,26,5,10,2
anowak,anna.nowak@firma.pl,haslo456,Anna,Nowak,26,0,10,0
pmalinowski,piotr.malinowski@firma.pl,haslo789,Piotr,Malinowski,24,12,8,1`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'szablon-pracownikow.csv');
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  importAnother(): void {
    this.selectedFile = null;
    this.importResult = null;
    this.error = '';
  }

  viewEmployees(): void {
    this.router.navigate(['/admin/employees/list']);
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}