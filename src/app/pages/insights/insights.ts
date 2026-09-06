import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Insights page (static content, no page-specific script in the original). */
@Component({
  selector: 'app-insights',
  imports: [RouterLink],
  templateUrl: './insights.html',
})
export class Insights {}
