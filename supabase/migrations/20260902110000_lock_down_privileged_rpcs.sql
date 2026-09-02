-- Lock down SECURITY DEFINER functions that were reachable via /rest/v1/rpc/
-- by anon/authenticated (Supabase security advisor 0028/0029).
--
-- assign_plan_to_user grants the caller an arbitrary subscription plan — it must
-- only be callable by the RevenueCat webhook (service_role) and internal jobs.
-- The client's old no-payment updateUserPlan() path is removed in the same change.

REVOKE EXECUTE ON FUNCTION public.assign_plan_to_user(uuid, text) FROM PUBLIC, anon, authenticated;

-- Trigger functions — fire on auth.users insert regardless of EXECUTE grant;
-- they should never be RPC-callable.
REVOKE EXECUTE ON FUNCTION public.assign_free_plan_to_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_setup() FROM PUBLIC, anon, authenticated;

-- SECURITY DEFINER helpers that take an arbitrary user_uuid — anon must not call.
REVOKE EXECUTE ON FUNCTION public.check_feature_usage(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_feature_usage(uuid, character varying) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_dream_analysis(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_dream_analysis_json(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_pending_sessions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_users_for_trait_analysis(integer, integer) FROM PUBLIC, anon, authenticated;
