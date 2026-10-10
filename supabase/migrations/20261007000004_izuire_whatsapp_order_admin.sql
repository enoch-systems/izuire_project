-- Keep order placement server-side, expose orders to admins, and remove
-- browser permissions to write order records directly.
drop policy if exists orders_admin_rw on public.orders;
drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.orders from public, anon, authenticated;

create or replace function public.place_whatsapp_order(p_lines jsonb)
returns table(order_id uuid, order_number text, subtotal_kobo integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_order record;
begin
  select * into v_order from public.place_order('Bank transfer', p_lines);

  update public.orders
  set method = 'WhatsApp'
  where id = v_order.order_id and user_id = auth.uid();

  return query select v_order.order_id, v_order.order_number, v_order.subtotal_kobo;
end;
$function$;

revoke all on function public.place_whatsapp_order(jsonb) from public, anon, authenticated;
grant execute on function public.place_whatsapp_order(jsonb) to authenticated;