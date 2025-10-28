import { Component, Input } from '@angular/core';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="back-btn" (click)="goBack()">
      ← {{ label || 'Wróć' }}
    </button>
  `,
  styles: [`
    .back-btn { 
      background: transparent; 
      border: 1px solid #e5e7eb; 
      color: #111827; 
      padding: .4rem .75rem; 
      border-radius: 8px; 
      cursor: pointer; 
      margin: 0 0 1rem; 
    }
    .back-btn:hover { background: #f9fafb; }
  `]
})
export class BackButtonComponent {
  @Input() label?: string;
  constructor(private location: Location) {}
  goBack(): void { this.location.back(); }
}
