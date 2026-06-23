-- ============================================================================
-- update_order RPC — edit a whole existing order atomically.
-- Recomputes the total from the new lines, replaces order_items (with a fresh
-- cost-at-sale snapshot), and reconciles the single pending khata for the order
-- (insert when it becomes udhaar, update in place, or delete when it becomes
-- cash). Mirrors create_order; SECURITY DEFINER but re-checks super_admin.
-- Stock is NEVER auto-deducted.
-- ============================================================================

create or replace function public.update_order(
  p_order_id uuid,
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
$$;

grant execute on function public.update_order(uuid, uuid, public.payment_type, numeric, date, jsonb, text) to authenticated;
