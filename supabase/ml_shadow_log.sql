-- ml_shadow_log — shadow-mode validation for the trained signal classifier
CREATE TABLE IF NOT EXISTS public.ml_shadow_log (
  id            uuid primary key default gen_random_uuid(),
  scanned_at    date not null,
  symbol        text not null,
  bias          text not null,
  ml_bias       text not null,
  ml_confidence numeric not null,
  price_at      numeric not null,
  price_30d     numeric,
  return_30d    numeric,
  created_at    timestamptz default now(),
  UNIQUE(scanned_at, symbol)
);
ALTER TABLE public.ml_shadow_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_ml_shadow_log"  ON public.ml_shadow_log FOR SELECT USING (true);
CREATE POLICY "anon_insert_ml_shadow_log"  ON public.ml_shadow_log FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_ml_shadow_log"  ON public.ml_shadow_log FOR UPDATE USING (true);
