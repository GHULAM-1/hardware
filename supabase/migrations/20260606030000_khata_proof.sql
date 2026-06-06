-- A khata can carry a proof/bill image (a photo of the receipt or a written
-- IOU) when it isn't created from an in-app sale. order_id already links a khata
-- to an existing order; this adds the manual-proof alternative.
alter table public.khatas
  add column if not exists proof_url text;
