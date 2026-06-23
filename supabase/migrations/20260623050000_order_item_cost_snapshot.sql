-- ============================================================================
-- Snapshot the supplier buying cost on each order line at sale time.
-- "Cost from supplier then" must reflect what the item cost WHEN it was sold,
-- frozen at that moment. Recomputing it from current stock_entries is wrong:
-- editing the buying price (or a same-day purchase) would retroactively change
-- the historical figure. So we capture the latest stock-in buying price (per
-- primary unit) into order_items.cost_at_sale inside create_order.
--
-- Signature is unchanged (6 args) → CREATE OR REPLACE, no drop needed.
-- ============================================================================

alter table public.order_items add column cost_at_sale numeric(12,2);
comment on column public.order_items.cost_at_sale is
  'Snapshot of the item''s latest supplier buying price (per primary unit) at the moment of sale.';

create or replace function public.create_order(
  p_customer_id uuid,
  p_payment_type public.payment_type,
  p_amount_paid numeric,
  p_due_date date,
  p_lines jsonb,
  p_internal_note text default null
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
      -- Latest known supplier buying price for this item, frozen now.
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
