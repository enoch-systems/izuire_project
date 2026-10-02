import { Component, computed, inject, signal } from '@angular/core';
import { AccountGate } from '../../../components/account-gate/account-gate';
import { AccountNav } from '../../../components/account-nav/account-nav';
import { Breadcrumb } from '../../../components/breadcrumb/breadcrumb';
import { AuthService, Transaction, TxStatus } from '../../../services/auth.service';
import { naira } from '../../../services/cart.service';

/** The three ways the list can be filtered. */
type Tab = 'all' | 'pending' | 'successful';

/** What a status pill reads. */
const STATUS_TEXT: Record<TxStatus, string> = {
  pending: 'Pending',
  successful: 'Successful',
  failed: 'Failed',
  refunded: 'Refunded',
};

/**
 * Payment history, split the way the orders actually live: everything, what is
 * still waiting on money, and what has gone through. Each row opens onto the
 * payment's own facts — method, reference, tracking, ETA — because that is what
 * a buyer digs for when a shipment is late.
 *
 * All of it is the seeded mock list from AuthService, so the tabs, the totals
 * and the rows always agree with each other.
 */
@Component({
  selector: 'app-payments',
  imports: [AccountGate, AccountNav, Breadcrumb],
  templateUrl: './payments.html',
})
export class Payments {
  protected readonly auth = inject(AuthService);
  protected readonly money = naira;

  protected readonly tab = signal<Tab>('all');
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'all', label: 'All transactions' },
    { id: 'pending', label: 'Pending' },
    { id: 'successful', label: 'Successful' },
  ];

  /** The row whose details are open, or null. */
  protected readonly openRow = signal<string | null>(null);

  protected readonly rows = computed(() =>
    this.auth.transactions().filter((t) => this.tab() === 'all' || t.status === this.tab()),
  );

  protected readonly paid = computed(() =>
    this.auth.transactions().filter((t) => t.status === 'successful').reduce((sum, t) => sum + t.amount, 0),
  );
  protected readonly awaiting = computed(() =>
    this.auth.transactions().filter((t) => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0),
  );
  protected readonly successfulCount = computed(
    () => this.auth.transactions().filter((t) => t.status === 'successful').length,
  );
  protected readonly pendingCount = computed(
    () => this.auth.transactions().filter((t) => t.status === 'pending').length,
  );

  protected count(tab: Tab): number {
    if (tab === 'all') return this.auth.transactions().length;
    return this.auth.transactions().filter((t) => t.status === tab).length;
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
    this.openRow.set(null);
  }

  protected toggle(id: string): void {
    this.openRow.update((current) => (current === id ? null : id));
  }

  protected status(tx: Transaction): string {
    return STATUS_TEXT[tx.status];
  }
}
