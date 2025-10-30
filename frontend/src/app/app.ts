import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnimatedBackgroundComponent } from './animated-background/animated-background.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AnimatedBackgroundComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');
}
