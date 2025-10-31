import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { RegisterRequest } from '../../models/auth.models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  selectedPlan = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.registerForm = this.fb.group({
      // Dane użytkownika
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      
      // Dane firmy
      companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      taxId: [''],
      companyEmail: ['', [Validators.email]],
      companyPhone: [''],
      address: [''],
      city: [''],
      country: [''],
      postalCode: ['']
    });

    // Odczytaj ewentualnie wybrany plan z query params
    const plan = this.route.snapshot.queryParamMap.get('plan');
    if (plan) {
      this.selectedPlan.set(plan);
    }

    // Skonfiguruj formularz pod wybrany plan (np. free: tylko email i hasło)
    this.configureFormForPlan();

    // Jeśli rejestracja ma być planem "trial", kierujemy do dedykowanego widoku trial-signup,
    // który korzysta z właściwego endpointu /api/auth/trial-signup
    if ((this.selectedPlan() || '').toLowerCase() === 'trial') {
      // Preserve any potential prefilled email via query param if present later
      this.router.navigate(['/trial-signup'], { replaceUrl: true });
    }
  }

  private configureFormForPlan(): void {
    const plan = (this.selectedPlan() || '').toLowerCase();
    if (plan === 'free' || plan === 'trial') {
      // Usuń wymagania poza email i hasłem
      const controlsToRelax = ['username', 'firstName', 'lastName', 'companyName', 'taxId', 'companyEmail', 'companyPhone', 'address', 'city', 'country', 'postalCode'];
      controlsToRelax.forEach(cn => {
        const c = this.registerForm.get(cn);
        if (c) {
          c.clearValidators();
          c.updateValueAndValidity({ emitEvent: false });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading.set(true);
      this.error.set(null);
      this.success.set(null);
      const plan = (this.selectedPlan() || '').toLowerCase();
      let registerRequest: RegisterRequest = this.registerForm.value;
      if (plan === 'free' || plan === 'trial') {
        // Uzupełnij minimalny payload sensownymi domyślnymi danymi
        const email: string = this.registerForm.get('email')?.value;
        const usernameFromEmail = email?.split('@')[0] || 'user';
        registerRequest = {
          username: usernameFromEmail,
          email,
          password: this.registerForm.get('password')?.value,
          firstName: 'Test',
          lastName: 'User',
          companyName: 'Konto Testowe',
          taxId: '',
          companyEmail: '',
          companyPhone: '',
          address: '',
          city: '',
          country: '',
          postalCode: ''
        } as RegisterRequest;
      }

      this.authService.register(registerRequest).subscribe({
        next: (response) => {
          console.log('Registration successful', response);
          if ((this.selectedPlan() || '').toLowerCase() === 'free') {
            this.success.set('Dziękujemy! Wyślemy na Twój e‑mail dane do konta testowego i link aktywacyjny.');
          } else if ((this.selectedPlan() || '').toLowerCase() === 'trial') {
            this.success.set('Dziękujemy! Wyślemy na Twój e‑mail dane do konta testowego i link aktywacyjny. Dostęp testowy jest ważny 14 dni od aktywacji.');
          } else {
            this.success.set('Rejestracja przebiegła pomyślnie! Możesz się teraz zalogować.');
          }
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          console.error('Registration failed', error);
          this.error.set(error.error?.message || 'Błąd rejestracji. Spróbuj ponownie.');
          this.loading.set(false);
        },
        complete: () => {
          this.loading.set(false);
        }
      });
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}