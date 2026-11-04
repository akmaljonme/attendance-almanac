CREATE TABLE public.trusted_centers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 100),
 logo_path text NOT NULL CHECK (logo_path ~ '^[a-f0-9-]+\.(png|jpg|webp)$'),
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trusted_centers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_centers TO authenticated;
GRANT ALL ON public.trusted_centers TO service_role;
ALTER TABLE public.trusted_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_centers_public_read ON public.trusted_centers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY trusted_centers_creator_write ON public.trusted_centers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'creator')) WITH CHECK (public.has_role(auth.uid(), 'creator'));
CREATE POLICY trusted_logos_creator_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trusted-logos' AND public.has_role(auth.uid(), 'creator'));
CREATE POLICY trusted_logos_creator_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'trusted-logos' AND public.has_role(auth.uid(), 'creator'));
CREATE POLICY trusted_logos_creator_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trusted-logos' AND public.has_role(auth.uid(), 'creator'));
COMMENT ON TABLE public.trusted_centers IS 'Global public marketing directory managed only by CRM creators, independent of tenant-owned centers.';