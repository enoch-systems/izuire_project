import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Sourcing page (static content, no page-specific script in the original). */
@Component({
  selector: 'app-sourcing',
  imports: [RouterLink],
  templateUrl: './sourcing.html',
})
export class Sourcing {}
