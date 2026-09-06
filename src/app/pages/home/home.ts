import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Home page. The testimonial slider reproduces the original behavior:
 * prev/next arrows, dots, and auto-advance every 6 seconds.
 */
@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home implements OnInit, OnDestroy {
  protected readonly dots = [0, 1, 2];
  protected readonly current = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;

  protected goTo(idx: number): void {
    this.current.set(((idx % this.dots.length) + this.dots.length) % this.dots.length);
  }

  ngOnInit(): void {
    this.timer = setInterval(() => this.goTo(this.current() + 1), 6000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
