import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LeaveConfigurationService } from '../../services/leave-configuration.service';
import { 
  LeaveConfigurationRequest, 
  LeaveConfigurationResponse, 
  LEAVE_CONFIGURATION_DEFAULTS 
} from '../../models/leave-configuration.models';
import { LeaveType, LEAVE_TYPE_LABELS } from '../../models/leave-proposal.models';

@Component({
  selector: 'app-leave-configuration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="leave-configuration">
      <div class="header">
        <h1>⚙️ Konfiguracja urlopów</h1>
        <button class="btn-back" (click)="goBack()">← Powrót</button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="loading-container">
        <div class="loading-spinner">⏳ Ładowanie konfiguracji...</div>
      </div>

      <!-- Error -->
      <div *ngIf="error" class="alert alert-error">
        <strong>❌ Błąd:</strong><br>
        {{ error }}
      </div>

      <!-- Success -->
      <div *ngIf="success" class="alert alert-success">
        <strong>✅ Sukces:</strong><br>
        {{ success }}
      </div>

      <!-- Main Content -->
      <div class="main-content" *ngIf="!loading">
        
        <!-- Configurations List -->
        <div class="configurations-section">
          <div class="section-header">
            <h2>📋 Lista konfiguracji urlopów</h2>
            <button class="btn-primary" (click)="showCreateForm()">
              ➕ Dodaj nową konfigurację
            </button>
          </div>

          <div class="configurations-grid" *ngIf="configurations.length > 0">
            <div 
              *ngFor="let config of configurations" 
              class="config-card"
              [class.active]="config.active"
              [class.inactive]="!config.active">
              
              <div class="config-header">
                <div class="config-type">
                  <span class="config-icon" [style.color]="getLeaveTypeColor(config.leaveType)">
                    {{ getLeaveTypeIcon(config.leaveType) }}
                  </span>
                  <div class="config-info">
                    <h3>{{ config.name }}</h3>
                    <span class="config-label">{{ getLeaveTypeLabel(config.leaveType) }}</span>
                  </div>
                </div>
                <div class="config-status">
                  <span class="status-badge" [class.active]="config.active" [class.inactive]="!config.active">
                    {{ config.active ? 'Aktywny' : 'Nieaktywny' }}
                  </span>
                </div>
              </div>

              <div class="config-details" *ngIf="config.description">
                <p>{{ config.description }}</p>
              </div>

              <div class="config-summary">
                <div class="summary-item" *ngIf="config.daysPerYear">
                  <span class="summary-label">Dni w roku:</span>
                  <span class="summary-value">{{ config.daysPerYear }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Wymaga zatwierdzenia:</span>
                  <span class="summary-value" [class.yes]="config.requiresApproval" [class.no]="!config.requiresApproval">
                    {{ config.requiresApproval ? 'Tak' : 'Nie' }}
                  </span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Płatny:</span>
                  <span class="summary-value" [class.yes]="config.isPaid" [class.no]="!config.isPaid">
                    {{ config.isPaid ? 'Tak' : 'Nie' }}
                  </span>
                </div>
                <div class="summary-item" *ngIf="config.minimumAdvanceDays">
                  <span class="summary-label">Min. wyprzedzenie:</span>
                  <span class="summary-value">{{ config.minimumAdvanceDays }} dni</span>
                </div>
                <div class="summary-item" *ngIf="config.requiredApprovals !== undefined">
                  <span class="summary-label">Wymagane akceptacje:</span>
                  <span class="summary-value">{{ config.requiredApprovals || 'Auto' }}</span>
                </div>
                <div class="summary-item" *ngIf="config.approverRoles && config.approverRoles.length > 0">
                  <span class="summary-label">Role akceptujące:</span>
                  <span class="summary-value">{{ formatApproverRoles(config.approverRoles) }}</span>
                </div>
              </div>

              <div class="config-actions">
                <button class="btn-secondary" (click)="editConfiguration(config)">
                  ✏️ Edytuj
                </button>
                <button class="btn-danger" (click)="toggleConfigurationStatus(config)" *ngIf="config.active">
                  🚫 Deaktywuj
                </button>
                <button class="btn-success" (click)="toggleConfigurationStatus(config)" *ngIf="!config.active">
                  ✅ Aktywuj
                </button>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="configurations.length === 0">
            <div class="empty-icon">📝</div>
            <h3>Brak konfiguracji urlopów</h3>
            <p>Nie znaleziono żadnych konfiguracji urlopów dla Twojej firmy.</p>
            <button class="btn-primary" (click)="showCreateForm()">
              ➕ Utwórz pierwszą konfigurację
            </button>
          </div>
        </div>

        <!-- Create/Edit Form -->
        <div class="form-section" *ngIf="showForm">
          <div class="form-header">
            <h2>{{ editingConfig ? '✏️ Edytuj konfigurację' : '➕ Nowa konfiguracja' }}</h2>
            <button class="btn-secondary" (click)="cancelForm()">❌ Anuluj</button>
          </div>

          <form [formGroup]="configForm" (ngSubmit)="onSubmit()" class="config-form">
            
            <!-- Leave Type Selection -->
            <div class="form-section-group">
              <h3>🏷️ Typ urlopu</h3>
              
              <div class="form-group">
                <label for="leaveType">Typ urlopu *</label>
                <select formControlName="leaveType" id="leaveType" class="form-control" (change)="onLeaveTypeChange()">
                  <option value="">Wybierz typ urlopu</option>
                  <option *ngFor="let type of availableLeaveTypes" [value]="type">
                    {{ getLeaveTypeIcon(type) }} {{ getLeaveTypeLabel(type) }}
                  </option>
                </select>
                <div class="error-message" *ngIf="configForm.get('leaveType')?.invalid && configForm.get('leaveType')?.touched">
                  <small>Typ urlopu jest wymagany</small>
                </div>
              </div>

              <div class="form-group">
                <label for="name">Nazwa *</label>
                <input 
                  type="text" 
                  id="name" 
                  formControlName="name"
                  class="form-control"
                  placeholder="np. Urlop wypoczynkowy"
                  maxlength="100">
                <div class="error-message" *ngIf="configForm.get('name')?.invalid && configForm.get('name')?.touched">
                  <small>Nazwa jest wymagana</small>
                </div>
              </div>

              <div class="form-group">
                <label for="description">Opis</label>
                <textarea 
                  id="description" 
                  formControlName="description"
                  class="form-control textarea"
                  rows="3"
                  placeholder="Opcjonalny opis typu urlopu..."
                  maxlength="500"></textarea>
              </div>
            </div>

            <!-- Basic Settings -->
            <div class="form-section-group">
              <h3>⚙️ Podstawowe ustawienia</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="daysPerYear">Dni w roku</label>
                  <input 
                    type="number" 
                    id="daysPerYear" 
                    formControlName="daysPerYear"
                    class="form-control"
                    min="0"
                    max="365">
                  <small class="help-text">Maksymalna liczba dni tego typu urlopu w roku (0 = bez limitu)</small>
                </div>

                <div class="form-group">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="active" 
                      formControlName="active">
                    <label for="active">Aktywny</label>
                  </div>
                  <small class="help-text">Czy ten typ urlopu jest dostępny dla pracowników</small>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="isPaid" 
                      formControlName="isPaid">
                    <label for="isPaid">Płatny</label>
                  </div>
                  <small class="help-text">Czy urlop jest płatny</small>
                </div>

                <div class="form-group">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="canBeSplit" 
                      formControlName="canBeSplit">
                    <label for="canBeSplit">Można dzielić</label>
                  </div>
                  <small class="help-text">Czy urlop można brać w częściach</small>
                </div>
              </div>
            </div>

            <!-- Approval Settings -->
            <div class="form-section-group">
              <h3>✅ Ustawienia zatwierdzania</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="requiresApproval" 
                      formControlName="requiresApproval">
                    <label for="requiresApproval">Wymaga zatwierdzenia</label>
                  </div>
                  <small class="help-text">Czy wniosek musi być zatwierdzony przez przełożonego</small>
                </div>

                <div class="form-group" *ngIf="configForm.get('requiresApproval')?.value">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="autoApprove" 
                      formControlName="autoApprove">
                    <label for="autoApprove">Automatyczne zatwierdzanie</label>
                  </div>
                  <small class="help-text">Czy wnioski są automatycznie zatwierdzane</small>
                </div>
              </div>

              <div class="form-group">
                <div class="checkbox-group">
                  <input 
                    type="checkbox" 
                    id="requiresDocument" 
                    formControlName="requiresDocument">
                  <label for="requiresDocument">Wymaga dokumentów</label>
                </div>
                <small class="help-text">Czy wymagane są dodatkowe dokumenty (np. zaświadczenie lekarskie)</small>
              </div>
            </div>

            <!-- Time Constraints -->
            <div class="form-section-group">
              <h3>⏰ Ograniczenia czasowe</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="minimumAdvanceDays">Min. wyprzedzenie (dni)</label>
                  <input 
                    type="number" 
                    id="minimumAdvanceDays" 
                    formControlName="minimumAdvanceDays"
                    class="form-control"
                    min="0"
                    max="365">
                  <small class="help-text">Ile dni wcześniej trzeba złożyć wniosek</small>
                </div>

                <div class="form-group">
                  <label for="maximumAdvanceDays">Max. wyprzedzenie (dni)</label>
                  <input 
                    type="number" 
                    id="maximumAdvanceDays" 
                    formControlName="maximumAdvanceDays"
                    class="form-control"
                    min="0"
                    max="365">
                  <small class="help-text">Jak wcześnie można złożyć wniosek</small>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="minimumDurationDays">Min. czas trwania (dni)</label>
                  <input 
                    type="number" 
                    id="minimumDurationDays" 
                    formControlName="minimumDurationDays"
                    class="form-control"
                    min="1"
                    max="365">
                  <small class="help-text">Minimalny czas trwania urlopu</small>
                </div>

                <div class="form-group">
                  <label for="maximumDurationDays">Max. czas trwania (dni)</label>
                  <input 
                    type="number" 
                    id="maximumDurationDays" 
                    formControlName="maximumDurationDays"
                    class="form-control"
                    min="1"
                    max="365">
                  <small class="help-text">Maksymalny czas trwania jednego urlopu</small>
                </div>
              </div>
            </div>

            <!-- Carry Over Settings -->
            <div class="form-section-group">
              <h3>📅 Przenoszenie urlopów</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="carryOverAllowed" 
                      formControlName="carryOverAllowed">
                    <label for="carryOverAllowed">Można przenosić na następny rok</label>
                  </div>
                  <small class="help-text">Czy niewykorzystane dni można przenieść na następny rok</small>
                </div>

                <div class="form-group" *ngIf="configForm.get('carryOverAllowed')?.value">
                  <label for="carryOverMaxDays">Max. dni do przeniesienia</label>
                  <input 
                    type="number" 
                    id="carryOverMaxDays" 
                    formControlName="carryOverMaxDays"
                    class="form-control"
                    min="0"
                    max="365">
                  <small class="help-text">Maksymalna liczba dni do przeniesienia</small>
                </div>
              </div>
            </div>

            <!-- Approval Settings Extended -->
            <div class="form-section-group">
              <h3>👥 Ustawienia akceptacji</h3>
              
              <div class="form-row">
                <div class="form-group">
                  <label for="requiredApprovals">Wymagana liczba akceptacji</label>
                  <input 
                    type="number" 
                    id="requiredApprovals" 
                    formControlName="requiredApprovals"
                    class="form-control"
                    min="0"
                    max="5">
                  <small class="help-text">Ile osób musi zaakceptować wniosek (0 = automatyczna akceptacja)</small>
                </div>

                <div class="form-group">
                  <div class="checkbox-group">
                    <input 
                      type="checkbox" 
                      id="canApproveOwnRequests" 
                      formControlName="canApproveOwnRequests">
                    <label for="canApproveOwnRequests">Można akceptować własne wnioski</label>
                  </div>
                  <small class="help-text">Czy osoba składająca wniosek może go sama zaakceptować</small>
                </div>
              </div>

              <div class="form-group">
                <label>Role uprawnione do akceptacji</label>
                <div class="role-checkboxes">
                  <div class="role-checkbox" *ngFor="let role of availableRoles">
                    <input 
                      type="checkbox" 
                      [id]="'role_' + role.value"
                      [value]="role.value"
                      (change)="onApproverRoleChange(role.value, $event)"
                      [checked]="isRoleSelected(role.value)">
                    <label [for]="'role_' + role.value" class="role-label">
                      <span class="role-icon">{{ role.icon }}</span>
                      <span class="role-name">{{ role.label }}</span>
                    </label>
                  </div>
                </div>
                <small class="help-text">Wybierz role, które mogą akceptować wnioski tego typu</small>
              </div>
            </div>

            <!-- Advanced Settings -->
            <div class="form-section-group">
              <h3>🔧 Zaawansowane ustawienia</h3>
              
              <div class="form-group">
                <label for="configurationRules">Dodatkowe reguły</label>
                <textarea 
                  id="configurationRules" 
                  formControlName="configurationRules"
                  class="form-control textarea"
                  rows="4"
                  placeholder="Dodatkowe reguły konfiguracji w formacie JSON lub opis specjalnych warunków..."
                  maxlength="1000"></textarea>
                <small class="help-text">Opcjonalne dodatkowe reguły lub warunki dla tego typu urlopu</small>
              </div>
            </div>

            <!-- Submit Actions -->
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="resetForm()">
                🔄 Resetuj
              </button>
              <button type="button" class="btn-secondary" (click)="cancelForm()">
                Anuluj
              </button>
              <button 
                type="submit" 
                class="btn-primary"
                [disabled]="configForm.invalid || submitting">
                <span *ngIf="submitting">⏳ Zapisywanie...</span>
                <span *ngIf="!submitting">
                  {{ editingConfig ? '💾 Zaktualizuj konfigurację' : '➕ Utwórz konfigurację' }}
                </span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  `,
  styleUrl: './leave-configuration.component.css'
})
export class LeaveConfigurationComponent implements OnInit {
  configurations: LeaveConfigurationResponse[] = [];
  configForm!: FormGroup;
  
  loading = false;
  submitting = false;
  error = '';
  success = '';
  showForm = false;
  editingConfig: LeaveConfigurationResponse | null = null;

  availableLeaveTypes = Object.values(LeaveType);
  leaveTypeDefaults = LEAVE_CONFIGURATION_DEFAULTS;
  availableRoles = [
    { value: 'ADMIN', label: 'Administrator', icon: '👑' },
    { value: 'HR', label: 'HR', icon: '👥' },
    { value: 'MANAGER', label: 'Menedżer', icon: '👨‍💼' },
    { value: 'USER', label: 'Pracownik', icon: '👤' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private leaveConfigService: LeaveConfigurationService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadConfigurations();
  }

  initForm(): void {
    this.configForm = this.fb.group({
      leaveType: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      requiresApproval: [true],
      autoApprove: [false],
      daysPerYear: [0, [Validators.min(0), Validators.max(365)]],
      minimumAdvanceDays: [0, [Validators.min(0), Validators.max(365)]],
      maximumAdvanceDays: [365, [Validators.min(0), Validators.max(365)]],
      minimumDurationDays: [1, [Validators.min(1), Validators.max(365)]],
      maximumDurationDays: [365, [Validators.min(1), Validators.max(365)]],
      canBeSplit: [true],
      requiresDocument: [false],
      isPaid: [true],
      carryOverAllowed: [false],
      carryOverMaxDays: [0, [Validators.min(0), Validators.max(365)]],
      active: [true],
      configurationRules: [''],
      // Ustawienia akceptacji
      requiredApprovals: [1, [Validators.min(0), Validators.max(5)]],
      approverRoles: [['MANAGER', 'HR', 'ADMIN']],
      canApproveOwnRequests: [false]
    });
  }

  loadConfigurations(): void {
    this.loading = true;
    this.error = '';

    this.leaveConfigService.getAllConfigurations().subscribe({
      next: (configs) => {
        this.configurations = configs;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading configurations:', error);
        this.error = 'Nie udało się załadować konfiguracji urlopów.';
        this.loading = false;
      }
    });
  }

  showCreateForm(): void {
    this.editingConfig = null;
    this.showForm = true;
    this.resetForm();
    this.error = '';
    this.success = '';
  }

  editConfiguration(config: LeaveConfigurationResponse): void {
    this.editingConfig = config;
    this.showForm = true;
    this.error = '';
    this.success = '';

    // Wypełnij formularz danymi konfiguracji
    this.configForm.patchValue({
      leaveType: config.leaveType,
      name: config.name,
      description: config.description || '',
      requiresApproval: config.requiresApproval,
      autoApprove: config.autoApprove || false,
      daysPerYear: config.daysPerYear || 0,
      minimumAdvanceDays: config.minimumAdvanceDays || 0,
      maximumAdvanceDays: config.maximumAdvanceDays || 365,
      minimumDurationDays: config.minimumDurationDays || 1,
      maximumDurationDays: config.maximumDurationDays || 365,
      canBeSplit: config.canBeSplit !== false,
      requiresDocument: config.requiresDocument || false,
      isPaid: config.isPaid !== false,
      carryOverAllowed: config.carryOverAllowed || false,
      carryOverMaxDays: config.carryOverMaxDays || 0,
      active: config.active,
      configurationRules: config.configurationRules || '',
      // Ustawienia akceptacji
      requiredApprovals: config.requiredApprovals || 1,
      approverRoles: config.approverRoles || ['MANAGER', 'HR', 'ADMIN'],
      canApproveOwnRequests: config.canApproveOwnRequests || false
    });
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingConfig = null;
    this.resetForm();
    this.error = '';
    this.success = '';
  }

  resetForm(): void {
    this.configForm.reset();
    this.configForm.patchValue({
      requiresApproval: true,
      autoApprove: false,
      daysPerYear: 0,
      minimumAdvanceDays: 0,
      maximumAdvanceDays: 365,
      minimumDurationDays: 1,
      maximumDurationDays: 365,
      canBeSplit: true,
      requiresDocument: false,
      isPaid: true,
      carryOverAllowed: false,
      carryOverMaxDays: 0,
      active: true,
      requiredApprovals: 1,
      approverRoles: ['MANAGER', 'HR', 'ADMIN'],
      canApproveOwnRequests: false
    });
  }

  onLeaveTypeChange(): void {
    const selectedType = this.configForm.get('leaveType')?.value as LeaveType;
    if (selectedType && this.leaveTypeDefaults[selectedType]) {
      const defaults = this.leaveTypeDefaults[selectedType];
      
      // Wypełnij formularz domyślnymi wartościami, ale tylko jeśli to nowa konfiguracja
      if (!this.editingConfig) {
        this.configForm.patchValue({
          name: defaults.name,
          description: defaults.description,
          requiresApproval: defaults.requiresApproval,
          autoApprove: defaults.autoApprove,
          daysPerYear: defaults.daysPerYear,
          minimumAdvanceDays: defaults.minimumAdvanceDays,
          maximumAdvanceDays: defaults.maximumAdvanceDays,
          minimumDurationDays: defaults.minimumDurationDays,
          maximumDurationDays: defaults.maximumDurationDays,
          canBeSplit: defaults.canBeSplit,
          requiresDocument: defaults.requiresDocument,
          isPaid: defaults.isPaid,
          carryOverAllowed: defaults.carryOverAllowed,
          carryOverMaxDays: defaults.carryOverMaxDays,
          active: defaults.active,
          requiredApprovals: defaults.requiredApprovals,
          approverRoles: defaults.approverRoles,
          canApproveOwnRequests: defaults.canApproveOwnRequests
        });
      }
    }
  }

  onSubmit(): void {
    if (this.configForm.invalid) {
      this.configForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = '';
    this.success = '';

    const formData = this.configForm.value;
    const request: LeaveConfigurationRequest = {
      leaveType: formData.leaveType,
      name: formData.name,
      description: formData.description || undefined,
      requiresApproval: formData.requiresApproval,
      autoApprove: formData.autoApprove || undefined,
      daysPerYear: formData.daysPerYear || undefined,
      minimumAdvanceDays: formData.minimumAdvanceDays || undefined,
      maximumAdvanceDays: formData.maximumAdvanceDays || undefined,
      minimumDurationDays: formData.minimumDurationDays || undefined,
      maximumDurationDays: formData.maximumDurationDays || undefined,
      canBeSplit: formData.canBeSplit,
      requiresDocument: formData.requiresDocument,
      isPaid: formData.isPaid,
      carryOverAllowed: formData.carryOverAllowed,
      carryOverMaxDays: formData.carryOverMaxDays || undefined,
      active: formData.active,
      configurationRules: formData.configurationRules || undefined,
      // Ustawienia akceptacji
      requiredApprovals: formData.requiredApprovals || undefined,
      approverRoles: formData.approverRoles || undefined,
      canApproveOwnRequests: formData.canApproveOwnRequests
    };

    const operation = this.editingConfig
      ? this.leaveConfigService.updateConfiguration(this.editingConfig.id, request)
      : this.leaveConfigService.createConfiguration(request);

    operation.subscribe({
      next: (response) => {
        this.submitting = false;
        this.success = this.editingConfig 
          ? 'Konfiguracja została zaktualizowana pomyślnie.'
          : 'Konfiguracja została utworzona pomyślnie.';
        
        this.showForm = false;
        this.editingConfig = null;
        this.resetForm();
        this.loadConfigurations();

        // Ukryj komunikat sukcesu po 3 sekundach
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error saving configuration:', error);
        this.submitting = false;
        this.error = error.error?.message || 'Nie udało się zapisać konfiguracji.';
      }
    });
  }

  toggleConfigurationStatus(config: LeaveConfigurationResponse): void {
    const request: LeaveConfigurationRequest = {
      ...config,
      active: !config.active
    };

    this.leaveConfigService.updateConfiguration(config.id, request).subscribe({
      next: () => {
        this.success = `Konfiguracja "${config.name}" została ${config.active ? 'deaktywowana' : 'aktywowana'}.`;
        this.loadConfigurations();

        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (error) => {
        console.error('Error toggling configuration status:', error);
        this.error = 'Nie udało się zmienić statusu konfiguracji.';
      }
    });
  }

  getLeaveTypeLabel(type: LeaveType): string {
    return LEAVE_TYPE_LABELS[type] || type;
  }

  getLeaveTypeIcon(type: LeaveType): string {
    return this.leaveTypeDefaults[type]?.icon || '📋';
  }

  getLeaveTypeColor(type: LeaveType): string {
    return this.leaveTypeDefaults[type]?.color || '#64748b';
  }

  formatApproverRoles(roles: string[]): string {
    const roleLabels: { [key: string]: string } = {
      'ADMIN': 'Admin',
      'HR': 'HR',
      'MANAGER': 'Menedżer',
      'USER': 'Pracownik'
    };
    
    return roles.map(role => roleLabels[role] || role).join(', ');
  }

  onApproverRoleChange(role: string, event: any): void {
    const currentRoles = this.configForm.get('approverRoles')?.value || [];
    
    if (event.target.checked) {
      // Dodaj rolę jeśli nie ma jej już
      if (!currentRoles.includes(role)) {
        this.configForm.patchValue({
          approverRoles: [...currentRoles, role]
        });
      }
    } else {
      // Usuń rolę
      this.configForm.patchValue({
        approverRoles: currentRoles.filter((r: string) => r !== role)
      });
    }
  }

  isRoleSelected(role: string): boolean {
    const currentRoles = this.configForm.get('approverRoles')?.value || [];
    return currentRoles.includes(role);
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}