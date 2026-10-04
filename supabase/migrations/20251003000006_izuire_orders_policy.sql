-- Phase 1 (part 4: let an order's owner settle it).
-- The checkout writes an order `pending`, then flips it to `successful` with a
-- payment reference - the same write a gateway callback would make. Without an
-- owner UPDATE policy that second step is refused by RLS, so the order would
-- stay pending forever. Scoped to the owner, exactly like the read/insert.
drop policy if exists orders_owner_update on public.orders;
create policy orders_owner_update on public.orders for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The order lines follow the order: an owner may rewrite the lines of their own
-- order (e.g. a re-quote) but nobody else's.
drop policy if exists lines_owner_write on public.order_lines;
create policy lines_owner_write on public.order_lines for update to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
