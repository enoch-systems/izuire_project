import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** About page (static content, no page-specific script in the original). */
@Component({
  selector: 'app-about',
  imports: [RouterLink],
  templateUrl: './about.html',
})
export class About {}
