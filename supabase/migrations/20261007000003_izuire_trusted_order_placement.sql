-- Build pending orders from canonical product prices inside Postgres. The
-- browser submits only product IDs, quantities, and the customer's method pick.
create or replace function public.place_order(p_method text, p_lines jsonb)
returns table(order_id uuid, order_number text, subtotal_kobo integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_product_id text;
  v_quantity integer;
  v_product_title text;
  v_unit_price integer;
  v_product_unit text;
  v_product_image jsonb;
  v_product_badge text;
  v_product_icon text;
  v_line_total bigint;
  v_subtotal bigint := 0;
  v_item_count integer := 0;
  v_first_title text := '';
  v_items_summary text := '';
  v_order_title text;
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_order_lines jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Sign in to place an order.';
  end if;
  if p_method not in ('Paystack', 'Bank transfer') then
    raise exception using errcode = '22023', message = 'Choose a valid payment method.';
  end if;
  if jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) < 1
    or jsonb_array_length(p_lines) > 100 then
    raise exception using errcode = '22023', message = 'An order must contain between 1 and 100 products.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_lines) as line(value)
    group by line.value ->> 'id'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'A product may appear only once in an order.';
  end if;

  for v_item in select value from jsonb_array_elements(p_lines)
  loop
    v_product_id := nullif(btrim(v_item ->> 'id'), '');
    begin
      v_quantity := (v_item ->> 'qty')::integer;
    exception when others then
      raise exception using errcode = '22023', message = 'Each product needs a valid whole-number quantity.';
    end;
    if v_product_id is null or v_quantity < 1 or v_quantity > 100000 then
      raise exception using errcode = '22023', message = 'Each product needs a valid ID and quantity.';
    end if;

    select p.title, p.price_kobo, p.unit, p.image, p.badge, p.icon
    into v_product_title, v_unit_price, v_product_unit, v_product_image, v_product_badge, v_product_icon
    from public.products p
    where p.id = v_product_id and p.active and not p.sold_out
    for share;
    if not found then
      raise exception using errcode = '22023', message = 'A product is no longer available. Refresh your cart.';
    end if;
    if v_unit_price < 1 then
      raise exception using errcode = '22023', message = 'A product has no valid price and cannot be ordered.';
    end if;

    v_line_total := v_unit_price::bigint * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    if v_subtotal > 2147483647 then
      raise exception using errcode = '22003', message = 'The order total exceeds the supported limit.';
    end if;

    if v_item_count = 0 then
      v_first_title := v_product_title;
    end if;
    v_item_count := v_item_count + 1;
    v_items_summary := concat_ws(' - ', nullif(v_items_summary, ''), v_quantity::text || ' x ' || v_product_title);
    v_order_lines := v_order_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'title', v_product_title,
      'qty', v_quantity,
      'unit_price_kobo', v_unit_price,
      'snapshot', jsonb_build_object(
        'unit', v_product_unit,
        'image', v_product_image,
        'badge', v_product_badge,
        'icon', v_product_icon
      )
    ));
  end loop;

  v_order_title := case
    when v_item_count = 1 then v_first_title
    else v_first_title || ' + ' || (v_item_count - 1)::text || ' more'
  end;
  v_order_number := 'IZU-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders (
    id, user_id, number, title, items_summary, subtotal_kobo, currency, status, method
  ) values (
    v_order_id, v_user_id, v_order_number, v_order_title, v_items_summary,
    v_subtotal::integer, 'NGN', 'pending', p_method
  );

  insert into public.order_lines (order_id, product_id, title, qty, unit_price_kobo, snapshot)
  select
    v_order_id,
    line.value ->> 'product_id',
    line.value ->> 'title',
    (line.value ->> 'qty')::integer,
    (line.value ->> 'unit_price_kobo')::integer,
    line.value -> 'snapshot'
  from jsonb_array_elements(v_order_lines) as line(value);

  return query select v_order_id, v_order_number, v_subtotal::integer;
end;
$function$;

revoke all on function public.place_order(text, jsonb) from public, anon, authenticated;
grant execute on function public.place_order(text, jsonb) to authenticated;

drop policy if exists orders_owner_insert on public.orders;
drop policy if exists orders_owner_update on public.orders;
drop policy if exists lines_owner_insert on public.order_lines;
drop policy if exists lines_owner_write on public.order_lines;