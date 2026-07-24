-- Order cost snapshots follow the item's own buying price.
--
-- cost_at_sale used to come solely from the latest priced stock-in. Now that cost
-- is a column on items (see 20260724010000_item_buying_price.sql) an item can have
-- a known cost with no stock ever received — that sale would have frozen a NULL
-- cost and silently reported zero-cost profit. Prefer the item column, keeping the
-- stock-entry lookup as a fallback for legacy rows whose column is still null.

CREATE OR REPLACE FUNCTION public.create_order(p_customer_id uuid, p_payment_type payment_type, p_amount_paid numeric, p_due_date date, p_lines jsonb, p_internal_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_order_id      uuid;
  v_total         numeric := 0;
  v_paid          numeric;
  v_line          jsonb;
  v_order_item_id uuid;
  v_sup           jsonb;
  v_order         jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'order must have at least one line';
  end if;

  -- Total from the actual sold prices.
  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_total := v_total + (v_line->>'quantity')::numeric * (v_line->>'selling_price')::numeric;
  end loop;

  -- Paid amount is derived from payment type (cash = full, credit = 0).
  v_paid := case p_payment_type
    when 'cash' then v_total
    when 'credit' then 0
    else coalesce(p_amount_paid, 0)
  end;

  insert into public.orders (customer_id, payment_type, status, total, amount_paid, due_date, internal_note, created_by)
  values (
    p_customer_id,
    p_payment_type,
    'completed',
    v_total,
    v_paid,
    case when p_payment_type = 'cash' then null else p_due_date end,
    nullif(btrim(p_internal_note), ''),
    auth.uid()
  )
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.order_items (order_id, item_id, quantity, unit, selling_price, cost_at_sale)
    values (
      v_order_id,
      (v_line->>'item_id')::uuid,
      (v_line->>'quantity')::numeric,
      coalesce(v_line->>'unit', 'pcs'),
      (v_line->>'selling_price')::numeric,
      coalesce(
        -- The item's own cost column. Independent of stock, so it is present even
        -- when nothing was ever received into the warehouse.
        (select i.buying_price from public.items i where i.id = (v_line->>'item_id')::uuid),
        -- Legacy fallback: the most recent priced stock-in.
        (
          select se.buying_price
          from public.stock_entries se
          where se.item_id = (v_line->>'item_id')::uuid
            and se.type = 'in'
            and se.buying_price is not null
          order by se.entry_date desc, se.created_at desc
          limit 1
        )
      )
    )
    returning id into v_order_item_id;

    if v_line ? 'suppliers' then
      for v_sup in select * from jsonb_array_elements(v_line->'suppliers') loop
        insert into public.order_item_suppliers (order_item_id, supplier_id, quantity, buying_price)
        values (
          v_order_item_id,
          nullif(v_sup->>'supplier_id', '')::uuid,
          (v_sup->>'quantity')::numeric,
          nullif(v_sup->>'buying_price', '')::numeric
        );
      end loop;
    end if;
  end loop;

  -- Partial/credit sales flow into the Khata.
  if p_payment_type in ('partial', 'credit') then
    insert into public.khatas (customer_id, order_id, amount, due_date, status, created_by, description)
    values (
      p_customer_id,
      v_order_id,
      v_total - v_paid,
      p_due_date,
      'pending',
      auth.uid(),
      'Order ' || (select order_no from public.orders where id = v_order_id)
    );
  end if;

  select to_jsonb(o.*) into v_order from public.orders o where o.id = v_order_id;
  return v_order;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_order(p_order_id uuid, p_customer_id uuid, p_payment_type payment_type, p_amount_paid numeric, p_due_date date, p_lines jsonb, p_internal_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total         numeric := 0;
  v_paid          numeric;
  v_line          jsonb;
  v_order_item_id uuid;
  v_sup           jsonb;
  v_khata_id      uuid;
  v_order         jsonb;
begin
  if not public.is_super_admin() then
    raise exception 'not authorized';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'order must have at least one line';
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_total := v_total + (v_line->>'quantity')::numeric * (v_line->>'selling_price')::numeric;
  end loop;

  v_paid := case p_payment_type
    when 'cash' then v_total
    when 'credit' then 0
    else coalesce(p_amount_paid, 0)
  end;

  update public.orders set
    customer_id   = p_customer_id,
    payment_type  = p_payment_type,
    total         = v_total,
    amount_paid   = v_paid,
    due_date      = case when p_payment_type = 'cash' then null else p_due_date end,
    internal_note = nullif(btrim(p_internal_note), '')
  where id = p_order_id;

  -- Replace the line items (cascades order_item_suppliers).
  delete from public.order_items where order_id = p_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.order_items (order_id, item_id, quantity, unit, selling_price, cost_at_sale)
    values (
      p_order_id,
      (v_line->>'item_id')::uuid,
      (v_line->>'quantity')::numeric,
      coalesce(v_line->>'unit', 'pcs'),
      (v_line->>'selling_price')::numeric,
      coalesce(
        -- The item's own cost column. Independent of stock, so it is present even
        -- when nothing was ever received into the warehouse.
        (select i.buying_price from public.items i where i.id = (v_line->>'item_id')::uuid),
        -- Legacy fallback: the most recent priced stock-in.
        (
          select se.buying_price
          from public.stock_entries se
          where se.item_id = (v_line->>'item_id')::uuid
            and se.type = 'in'
            and se.buying_price is not null
          order by se.entry_date desc, se.created_at desc
          limit 1
        )
      )
    )
    returning id into v_order_item_id;

    if v_line ? 'suppliers' then
      for v_sup in select * from jsonb_array_elements(v_line->'suppliers') loop
        insert into public.order_item_suppliers (order_item_id, supplier_id, quantity, buying_price)
        values (
          v_order_item_id,
          nullif(v_sup->>'supplier_id', '')::uuid,
          (v_sup->>'quantity')::numeric,
          nullif(v_sup->>'buying_price', '')::numeric
        );
      end loop;
    end if;
  end loop;

  -- Reconcile the order's pending khata (at most one).
  select id into v_khata_id
  from public.khatas
  where order_id = p_order_id and status = 'pending'
  limit 1;

  if p_payment_type in ('partial', 'credit') then
    if v_khata_id is null then
      insert into public.khatas (customer_id, order_id, amount, due_date, status, created_by, description)
      values (
        p_customer_id,
        p_order_id,
        v_total - v_paid,
        p_due_date,
        'pending',
        auth.uid(),
        'Order ' || (select order_no from public.orders where id = p_order_id)
      );
    else
      update public.khatas
      set customer_id = p_customer_id, amount = v_total - v_paid, due_date = p_due_date
      where id = v_khata_id;
    end if;
  elsif v_khata_id is not null then
    -- Now fully paid (cash) — drop the outstanding khata.
    delete from public.khatas where id = v_khata_id;
  end if;

  select to_jsonb(o.*) into v_order from public.orders o where o.id = p_order_id;
  return v_order;
end;
$function$;
