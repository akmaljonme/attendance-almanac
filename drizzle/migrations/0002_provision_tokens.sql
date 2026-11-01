-- Hisob yaratishni bir martalik token bilan tasdiqlash.
-- Auth hisob qatorini yozayotganda app_metadata hali ko'rinmasligi mumkin,
-- shuning uchun trigger user_metadata ichidagi bir martalik tokenni ham qabul qiladi.

CREATE TABLE IF NOT EXISTS public.provision_tokens (
  token uuid PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.provision_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provision_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.provision_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE tok uuid;
BEGIN
  DELETE FROM public.provision_tokens WHERE expires_at < now();
  IF coalesce(new.raw_app_meta_data->>'admin_provisioned','false') <> 'true' THEN
    BEGIN
      tok := (new.raw_user_meta_data->>'provision_token')::uuid;
    EXCEPTION WHEN others THEN
      tok := NULL;
    END;
    IF tok IS NULL THEN
      RAISE EXCEPTION 'Hisobni administrator yaratishi kerak';
    END IF;
    DELETE FROM public.provision_tokens WHERE token = tok AND expires_at > now();
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Hisobni administrator yaratishi kerak';
    END IF;
  END IF;
  INSERT INTO public.profiles(id, full_name, phone)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END $function$;
