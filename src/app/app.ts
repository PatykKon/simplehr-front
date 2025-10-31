import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './components/shared/toast-container.component';
import { TrialBannerComponent } from './components/shared/trial-banner.component';
import { TrialExpiredModalComponent } from './components/shared/trial-expired-modal.component';
import { TrialService } from './services/trial.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent, TrialBannerComponent, TrialExpiredModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(private trial: TrialService) {
    this.trial.init();
  }
}
