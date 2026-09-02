-- background_jobs is an internal queue written only by service-role edge
-- functions. It was exposed to PostgREST with full anon/authenticated grants
-- and RLS disabled (Supabase security advisor 0013, ERROR).
alter table public.background_jobs enable row level security;
-- No policies: anon/authenticated get nothing; service_role bypasses RLS.
