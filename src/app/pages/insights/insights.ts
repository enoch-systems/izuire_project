import { Component } from '@angular/core';
import { Breadcrumb } from '../../components/breadcrumb/breadcrumb';

/** Insights page (static content, no page-specific script in the original). */
@Component({
  selector: 'app-insights',
  imports: [Breadcrumb],
  templateUrl: './insights.html',
})
export class Insights {}
