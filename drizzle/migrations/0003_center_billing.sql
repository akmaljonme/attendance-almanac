-- Markazlarning CRM egasiga obuna to'lovi.
-- Qoidalar src/lib/billing-rules.ts bilan bir xil bo'lishi shart:
--   paid_until = obuna amal qiladigan OXIRGI kun.
--   muddatdan keyin 3 kun "imtiyoz" (hammasi ishlaydi), undan keyin faqat ko'rish.

-- 1) Obuna muddati
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS paid_until date;
-- Mavjud markazlar darhol cheklanib qolmasin: sinov tugashi yoki bugundan 30 kun (qaysi biri keyin bo'lsa)
UPDATE public.subscriptions
   SET paid_until = greatest(trial_ends_at::date, ((now() AT TIME ZONE 'Asia/Tashkent')::date + 30))
 WHERE paid_until IS NULL;
-- Yangi markazlar: 14 kunlik sinov
ALTER TABLE public.subscriptions
  ALTER COLUMN paid_until SET DEFAULT (((now() AT TIME ZONE 'Asia/Tashkent')::date) + 14);

-- 2) Obuna to'lovlari tarixi (yozish faqat yaratuvchi paneli orqali, service_role)
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  plan text NOT NULL,
  amount bigint NOT NULL CHECK (amount >= 0),
  months int NOT NULL CHECK (months BETWEEN 1 AND 36),
  period_start date NOT NULL,
  period_end date NOT NULL,
  paid_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Tashkent')::date),
  method text NOT NULL DEFAULT 'cash',
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_payments_center_idx ON public.subscription_payments(center_id, paid_on DESC);
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_payments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
DROP POLICY IF EXISTS owner_reads_billing ON public.subscription_payments;
CREATE POLICY owner_reads_billing ON public.subscription_payments FOR SELECT TO authenticated
  USING (public.has_center_role(center_id, ARRAY['owner','admin']::center_role[]));

-- 3) Holat funksiyalari
CREATE OR REPLACE FUNCTION public.center_access_state(_center uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN s.paid_until IS NULL THEN 'active'
    WHEN (now() AT TIME ZONE 'Asia/Tashkent')::date <= s.paid_until THEN 'active'
    WHEN (now() AT TIME ZONE 'Asia/Tashkent')::date <= s.paid_until + 3 THEN 'grace'
    ELSE 'readonly'
  END
  FROM public.subscriptions s WHERE s.center_id = _center
$$;

CREATE OR REPLACE FUNCTION public.center_writable(_center uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.center_access_state(_center), 'active') <> 'readonly'
$$;

-- Markaz a'zolari o'z markazining obuna holatini ko'ra oladi (rolidan qat'i nazar)
CREATE OR REPLACE FUNCTION public.center_billing(_center uuid)
RETURNS TABLE(state text, paid_until date, days_left int, plan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.center_access_state(s.center_id), s.paid_until,
         (s.paid_until - (now() AT TIME ZONE 'Asia/Tashkent')::date)::int, s.plan
  FROM public.subscriptions s
  WHERE s.center_id = _center AND public.is_member(_center)
$$;

REVOKE ALL ON FUNCTION public.center_access_state(uuid), public.center_writable(uuid), public.center_billing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.center_access_state(uuid), public.center_writable(uuid), public.center_billing(uuid) TO authenticated, service_role;

-- 4) Muddati o'tgan markazda yozish taqiqlanadi (o'qish ishlayveradi).
--    RESTRICTIVE siyosatlar mavjud ruxsatlarga qo'shimcha "VA" sharti bo'lib qo'shiladi.
DROP POLICY IF EXISTS sub_active_ins ON public.courses;
DROP POLICY IF EXISTS sub_active_upd ON public.courses;
DROP POLICY IF EXISTS sub_active_del ON public.courses;
CREATE POLICY sub_active_ins ON public.courses AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.courses AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.courses AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.teachers;
DROP POLICY IF EXISTS sub_active_upd ON public.teachers;
DROP POLICY IF EXISTS sub_active_del ON public.teachers;
CREATE POLICY sub_active_ins ON public.teachers AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.teachers AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.teachers AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.groups;
DROP POLICY IF EXISTS sub_active_upd ON public.groups;
DROP POLICY IF EXISTS sub_active_del ON public.groups;
CREATE POLICY sub_active_ins ON public.groups AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.groups AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.groups AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.students;
DROP POLICY IF EXISTS sub_active_upd ON public.students;
DROP POLICY IF EXISTS sub_active_del ON public.students;
CREATE POLICY sub_active_ins ON public.students AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.students AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.students AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.enrollments;
DROP POLICY IF EXISTS sub_active_upd ON public.enrollments;
DROP POLICY IF EXISTS sub_active_del ON public.enrollments;
CREATE POLICY sub_active_ins ON public.enrollments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.enrollments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.enrollments AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.class_sessions;
DROP POLICY IF EXISTS sub_active_upd ON public.class_sessions;
DROP POLICY IF EXISTS sub_active_del ON public.class_sessions;
CREATE POLICY sub_active_ins ON public.class_sessions AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.class_sessions AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.class_sessions AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.attendance_records;
DROP POLICY IF EXISTS sub_active_upd ON public.attendance_records;
DROP POLICY IF EXISTS sub_active_del ON public.attendance_records;
CREATE POLICY sub_active_ins ON public.attendance_records AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.attendance_records AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.attendance_records AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.payments;
DROP POLICY IF EXISTS sub_active_upd ON public.payments;
DROP POLICY IF EXISTS sub_active_del ON public.payments;
CREATE POLICY sub_active_ins ON public.payments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.payments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.payments AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.financial_adjustments;
DROP POLICY IF EXISTS sub_active_upd ON public.financial_adjustments;
DROP POLICY IF EXISTS sub_active_del ON public.financial_adjustments;
CREATE POLICY sub_active_ins ON public.financial_adjustments AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.financial_adjustments AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.financial_adjustments AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

DROP POLICY IF EXISTS sub_active_ins ON public.expenses;
DROP POLICY IF EXISTS sub_active_upd ON public.expenses;
DROP POLICY IF EXISTS sub_active_del ON public.expenses;
CREATE POLICY sub_active_ins ON public.expenses AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_upd ON public.expenses AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.center_writable(center_id)) WITH CHECK (public.center_writable(center_id));
CREATE POLICY sub_active_del ON public.expenses AS RESTRICTIVE FOR DELETE TO authenticated USING (public.center_writable(center_id));

