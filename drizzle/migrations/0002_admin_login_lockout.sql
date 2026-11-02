CREATE TABLE public.admin_login_guards (
 username text PRIMARY KEY REFERENCES public.account_access(username) ON DELETE CASCADE,
 failures integer NOT NULL DEFAULT 0 CHECK (failures BETWEEN 0 AND 5),
 locked_until timestamptz,
 attempt_token uuid,
 attempt_until timestamptz
);
GRANT ALL ON public.admin_login_guards TO service_role;
ALTER TABLE public.admin_login_guards ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_login_guard ON public.admin_login_guards TO service_role USING (true) WITH CHECK (true);

CREATE FUNCTION public.begin_admin_login(_username text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.admin_login_guards; uid uuid; token uuid;
BEGIN
 SELECT a.user_id INTO uid FROM public.account_access a WHERE a.username = _username AND (
 EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = a.user_id AND r.role::text = 'creator') OR
 EXISTS (SELECT 1 FROM public.center_memberships m WHERE m.user_id = a.user_id AND m.role::text IN ('owner','admin')));
 IF uid IS NULL THEN RETURN jsonb_build_object('protected',false); END IF;
 INSERT INTO public.admin_login_guards(username) VALUES (_username) ON CONFLICT DO NOTHING;
 SELECT * INTO g FROM public.admin_login_guards WHERE username = _username FOR UPDATE;
 IF g.locked_until > clock_timestamp() THEN RETURN jsonb_build_object('protected',true,'locked_until',g.locked_until); END IF;
 IF g.attempt_until > clock_timestamp() THEN RETURN jsonb_build_object('protected',true,'busy',true); END IF;
 token := gen_random_uuid();
 UPDATE public.admin_login_guards SET failures = CASE WHEN locked_until IS NOT NULL THEN 0 ELSE failures END,
 locked_until = NULL, attempt_token = token, attempt_until = clock_timestamp() + interval '60 seconds' WHERE username = _username;
 RETURN jsonb_build_object('protected',true,'token',token);
END $$;
REVOKE ALL ON FUNCTION public.begin_admin_login(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_admin_login(text) TO service_role;

CREATE FUNCTION public.finish_admin_login(_username text, _token uuid, _outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE g public.admin_login_guards; n integer; deadline timestamptz; uid uuid;
BEGIN
 IF _outcome NOT IN ('success','failure','cancel') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 SELECT * INTO g FROM public.admin_login_guards WHERE username = _username FOR UPDATE;
 IF NOT FOUND OR g.attempt_token IS DISTINCT FROM _token THEN RAISE EXCEPTION 'Invalid attempt'; END IF;
 n := CASE WHEN _outcome = 'success' THEN 0 WHEN _outcome = 'failure' THEN LEAST(g.failures + 1,5) ELSE g.failures END;
 IF n = 5 THEN deadline := clock_timestamp() + interval '15 minutes'; END IF;
 UPDATE public.admin_login_guards SET failures=n, locked_until=deadline, attempt_token=NULL, attempt_until=NULL WHERE username=_username;
 IF deadline IS NOT NULL THEN SELECT user_id INTO uid FROM public.account_access WHERE username=_username; END IF;
 RETURN jsonb_build_object('locked_until',deadline,'user_id',uid);
END $$;
REVOKE ALL ON FUNCTION public.finish_admin_login(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_admin_login(text,uuid,text) TO service_role;
COMMENT ON TABLE public.admin_login_guards IS 'Server-only consecutive admin login failure state. Atomic attempt leases serialize parallel requests; Auth ban also prevents direct password endpoint bypass.';