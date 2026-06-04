-- ============================================================================
-- 0700 — create_order RPC
-- Atomically writes an order, its line items, per-line supplier sourcing, and
-- (for partial/credit) the matching Khata. SECURITY DEFINER, but re-checks
-- super_admin so RLS intent is preserved. Stock is NEVER auto-deducted here.
--
-- p_lines shape:
--   [{ item_id, quantity, unit, selling_price,
--      suppliers: [{ supplier_id, quantity, buying_price }] }]
-- ============================================================================

create or replace function public.create_order(
  p_customer_id uuid,
  p_payment_type public.payment_type,
  p_amount_paid numeric,
  p_due_date date,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  insert into public.orders (customer_id, payment_type, status, total, amount_paid, due_date, created_by)
  values (
    p_customer_id,
    p_payment_type,
    'completed',
    v_total,
    v_paid,
    case when p_payment_type = 'cash' then null else p_due_date end,
    auth.uid()
  )
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    insert into public.order_items (order_id, item_id, quantity, unit, selling_price)
    values (
      v_order_id,
      (v_line->>'item_id')::uuid,
      (v_line->>'quantity')::numeric,
      coalesce(v_line->>'unit', 'pcs'),
      (v_line->>'selling_price')::numeric
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
$$;

grant execute on function public.create_order(uuid, public.payment_type, numeric, date, jsonb) to authenticated;
