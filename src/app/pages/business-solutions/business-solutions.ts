import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Business Solutions page (static content, no page-specific script). */
@Component({
  selector: 'app-business-solutions',
  imports: [RouterLink],
  templateUrl: './business-solutions.html',
})
export class BusinessSolutions {}
