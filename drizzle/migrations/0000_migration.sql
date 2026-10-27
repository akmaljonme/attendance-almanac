
create type public.center_role as enum ('owner','admin','teacher','receptionist');

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- centers
create table public.centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  city text,
  center_type text,
  owner_id uuid not null,
  currency text not null default 'UZS',
  timezone text not null default 'Asia/Tashkent',
  prorate_first_month boolean not null default true,
  contact_email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id)
);
create table public.center_memberships (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid not null,
  role public.center_role not null,
  created_at timestamptz not null default now(),
  unique (center_id, user_id)
);
create index on public.center_memberships(user_id);

create or replace function public.is_member(_center uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from center_memberships where center_id = _center and user_id = auth.uid())
$$;
create or replace function public.has_center_role(_center uuid, _roles public.center_role[]) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from center_memberships where center_id = _center and user_id = auth.uid() and role = any(_roles))
$$;

grant select, update on public.centers to authenticated;
grant all on public.centers to service_role;
alter table public.centers enable row level security;
create policy "members read center" on public.centers for select to authenticated using (public.is_member(id));
create policy "owner updates center" on public.centers for update to authenticated using (public.has_center_role(id, array['owner']::center_role[])) with check (public.has_center_role(id, array['owner']::center_role[]));

grant select on public.center_memberships to authenticated;
grant all on public.center_memberships to service_role;
alter table public.center_memberships enable row level security;
create policy "members read memberships" on public.center_memberships for select to authenticated using (public.is_member(center_id));

-- members can see colleague names
create policy "colleagues read profiles" on public.profiles for select to authenticated using (
  exists (select 1 from center_memberships a join center_memberships b on a.center_id = b.center_id where a.user_id = auth.uid() and b.user_id = profiles.id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null unique references public.centers(id) on delete cascade,
  plan text not null default 'start',
  status text not null default 'trial',
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "owner reads subscription" on public.subscriptions for select to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[]));

-- onboarding (idempotent)
create or replace function public.create_center(_name text, _phone text, _city text, _type text, _plan text, _prorate boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if coalesce(trim(_name),'') = '' then raise exception 'Markaz nomi kerak'; end if;
  select id into cid from centers where owner_id = uid;
  if cid is not null then return cid; end if;
  insert into centers(name, phone, city, center_type, owner_id, prorate_first_month)
    values (trim(_name), _phone, _city, _type, uid, coalesce(_prorate, true)) returning id into cid;
  insert into center_memberships(center_id, user_id, role) values (cid, uid, 'owner');
  insert into subscriptions(center_id, plan) values (cid, coalesce(nullif(_plan,''),'start'));
  return cid;
end $$;
revoke execute on function public.create_center(text,text,text,text,text,boolean) from anon, public;
grant execute on function public.create_center(text,text,text,text,text,boolean) to authenticated;

-- generic updated_at
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  name text not null,
  description text,
  default_fee bigint not null default 0 check (default_fee >= 0),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.courses(center_id);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid,
  full_name text not null,
  phone text,
  email text,
  specialization text,
  status text not null default 'active' check (status in ('active','inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.teachers(center_id);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  course_id uuid not null references public.courses(id),
  teacher_id uuid references public.teachers(id) on delete set null,
  name text not null,
  days smallint[] not null default '{}',
  start_time time,
  end_time time,
  room text,
  start_date date not null default current_date,
  end_date date,
  capacity int not null default 15 check (capacity > 0),
  monthly_fee bigint not null default 0 check (monthly_fee >= 0),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.groups(center_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  full_name text not null,
  phone text not null,
  parent_name text,
  parent_phone text,
  enrolled_on date not null default current_date,
  status text not null default 'active' check (status in ('active','paused','archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.students(center_id);
create index on public.students(center_id, phone);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  monthly_fee bigint not null check (monthly_fee >= 0),
  discount bigint not null default 0 check (discount >= 0),
  status text not null default 'active' check (status in ('active','ended')),
  created_at timestamptz not null default now()
);
create unique index enrollments_one_active on public.enrollments(student_id, group_id) where status = 'active';
create index on public.enrollments(center_id);

create table public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  session_date date not null,
  start_time time,
  end_time time,
  room text,
  topic text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (group_id, session_date)
);
create index on public.class_sessions(center_id, session_date);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('present','absent','late','excused')),
  marked_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);
create index on public.attendance_records(center_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id),
  group_id uuid references public.groups(id) on delete set null,
  amount bigint not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null check (method in ('cash','card','transfer','other')),
  period_month date,
  reference text,
  notes text,
  recorded_by uuid,
  client_token uuid unique,
  voided_at timestamptz,
  voided_by uuid,
  void_reason text,
  created_at timestamptz not null default now()
);
create index on public.payments(center_id, paid_on);
create index on public.payments(student_id);

create table public.financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id),
  amount bigint not null check (amount <> 0),
  reason text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  category text not null,
  amount bigint not null check (amount > 0),
  spent_on date not null default current_date,
  description text,
  reference text,
  recorded_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.expenses(center_id, spent_on);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  user_id uuid,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  actor_id uuid,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs(center_id, created_at);

-- stamp actor columns server-side
create or replace function public.stamp_actor() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'payments' then new.recorded_by := auth.uid();
  elsif tg_table_name = 'expenses' then new.recorded_by := auth.uid();
  elsif tg_table_name = 'attendance_records' then new.marked_by := auth.uid();
  elsif tg_table_name = 'financial_adjustments' then new.created_by := auth.uid();
  elsif tg_table_name = 'class_sessions' then if tg_op = 'INSERT' then new.created_by := auth.uid(); end if;
  end if;
  return new;
end $$;
create trigger stamp before insert on public.payments for each row execute function public.stamp_actor();
create trigger stamp before insert on public.expenses for each row execute function public.stamp_actor();
create trigger stamp before insert or update on public.attendance_records for each row execute function public.stamp_actor();
create trigger stamp before insert on public.financial_adjustments for each row execute function public.stamp_actor();
create trigger stamp before insert on public.class_sessions for each row execute function public.stamp_actor();

-- payments immutable except void
create or replace function public.guard_payment_update() returns trigger language plpgsql set search_path = public as $$
begin
  if old.voided_at is not null then raise exception 'Bekor qilingan to''lovni o''zgartirib bo''lmaydi'; end if;
  if new.amount <> old.amount or new.student_id <> old.student_id or new.paid_on <> old.paid_on or new.center_id <> old.center_id then
    raise exception 'To''lov summasi o''zgartirilmaydi — bekor qilib, yangisini kiriting';
  end if;
  if new.voided_at is not null then new.voided_by := auth.uid(); if coalesce(trim(new.void_reason),'') = '' then raise exception 'Bekor qilish sababi kerak'; end if; end if;
  return new;
end $$;
create trigger guard before update on public.payments for each row execute function public.guard_payment_update();

-- audit
create or replace function public.write_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs(center_id, actor_id, table_name, record_id, action, old_data, new_data)
  values (coalesce(new.center_id, old.center_id), auth.uid(), tg_table_name, coalesce(new.id, old.id), tg_op,
    case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger audit after insert or update or delete on public.payments for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.attendance_records for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.financial_adjustments for each row execute function public.write_audit();
create trigger audit after insert or update or delete on public.expenses for each row execute function public.write_audit();
create trigger audit after update or delete on public.students for each row execute function public.write_audit();

create trigger touch before update on public.courses for each row execute function public.touch_updated_at();
create trigger touch before update on public.teachers for each row execute function public.touch_updated_at();
create trigger touch before update on public.groups for each row execute function public.touch_updated_at();
create trigger touch before update on public.students for each row execute function public.touch_updated_at();
create trigger touch before update on public.attendance_records for each row execute function public.touch_updated_at();
create trigger touch before update on public.expenses for each row execute function public.touch_updated_at();
create trigger touch before update on public.centers for each row execute function public.touch_updated_at();
create trigger touch before update on public.profiles for each row execute function public.touch_updated_at();

-- grants + RLS
grant select, insert, update on public.courses, public.teachers, public.groups, public.students, public.enrollments, public.class_sessions, public.attendance_records, public.payments, public.expenses, public.notifications to authenticated;
grant delete on public.enrollments, public.expenses to authenticated;
grant select, insert on public.financial_adjustments to authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.courses, public.teachers, public.groups, public.students, public.enrollments, public.class_sessions, public.attendance_records, public.payments, public.financial_adjustments, public.expenses, public.notifications, public.audit_logs to service_role;

alter table public.courses enable row level security;
alter table public.teachers enable row level security;
alter table public.groups enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.class_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.payments enable row level security;
alter table public.financial_adjustments enable row level security;
alter table public.expenses enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- read for all members on operational tables
create policy r on public.courses for select to authenticated using (public.is_member(center_id));
create policy r on public.teachers for select to authenticated using (public.is_member(center_id));
create policy r on public.groups for select to authenticated using (public.is_member(center_id));
create policy r on public.students for select to authenticated using (public.is_member(center_id));
create policy r on public.enrollments for select to authenticated using (public.is_member(center_id));
create policy r on public.class_sessions for select to authenticated using (public.is_member(center_id));
create policy r on public.attendance_records for select to authenticated using (public.is_member(center_id));

-- writes
create policy w_ins on public.courses for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_upd on public.courses for update to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_ins on public.teachers for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_upd on public.teachers for update to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_ins on public.groups for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_upd on public.groups for update to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_ins on public.students for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_upd on public.students for update to authenticated using (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_ins on public.enrollments for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_upd on public.enrollments for update to authenticated using (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_del on public.enrollments for delete to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_ins on public.class_sessions for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin','teacher']::center_role[]));
create policy w_upd on public.class_sessions for update to authenticated using (public.has_center_role(center_id, array['owner','admin','teacher']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin','teacher']::center_role[]));
create policy w_ins on public.attendance_records for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin','teacher']::center_role[]));
create policy w_upd on public.attendance_records for update to authenticated using (public.has_center_role(center_id, array['owner','admin','teacher']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin','teacher']::center_role[]));

-- finance
create policy r on public.payments for select to authenticated using (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_ins on public.payments for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_upd on public.payments for update to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy r on public.financial_adjustments for select to authenticated using (public.has_center_role(center_id, array['owner','admin','receptionist']::center_role[]));
create policy w_ins on public.financial_adjustments for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy r on public.expenses for select to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_ins on public.expenses for insert to authenticated with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_upd on public.expenses for update to authenticated using (public.has_center_role(center_id, array['owner','admin']::center_role[])) with check (public.has_center_role(center_id, array['owner','admin']::center_role[]));
create policy w_del on public.expenses for delete to authenticated using (public.has_center_role(center_id, array['owner']::center_role[]));
create policy r on public.notifications for select to authenticated using (public.is_member(center_id) and (user_id is null or user_id = auth.uid()));
create policy w_upd on public.notifications for update to authenticated using (public.is_member(center_id) and (user_id is null or user_id = auth.uid()));
create policy r on public.audit_logs for select to authenticated using (public.has_center_role(center_id, array['owner']::center_role[]));

-- Tuition obligations: one per enrollment per calendar month from start to min(end, current month).
-- First month is prorated by remaining days when center.prorate_first_month = true. Discount subtracted monthly.
create or replace view public.v_tuition_obligations with (security_invoker = true) as
select e.id as enrollment_id, e.center_id, e.student_id, e.group_id, m::date as period_month,
  greatest(0, case
    when c.prorate_first_month and date_trunc('month', e.start_date) = m and extract(day from e.start_date) > 1 then
      round((e.monthly_fee - e.discount)::numeric
        * ((extract(day from (m + interval '1 month' - interval '1 day')) - extract(day from e.start_date) + 1)
        / extract(day from (m + interval '1 month' - interval '1 day'))))::bigint
    else e.monthly_fee - e.discount end) as amount
from public.enrollments e
join public.centers c on c.id = e.center_id
cross join lateral generate_series(date_trunc('month', e.start_date),
  date_trunc('month', least(coalesce(e.end_date, (now() at time zone 'Asia/Tashkent')::date), (now() at time zone 'Asia/Tashkent')::date)),
  interval '1 month') m;

create or replace view public.v_student_balances with (security_invoker = true) as
select s.id as student_id, s.center_id, s.full_name, s.phone, s.status,
  coalesce(o.due, 0) as total_due,
  coalesce(p.paid, 0) as total_paid,
  coalesce(a.adj, 0) as total_adjust,
  coalesce(o.due, 0) - coalesce(p.paid, 0) - coalesce(a.adj, 0) as balance,
  p.last_paid_on,
  o.first_period
from public.students s
left join (select student_id, sum(amount)::bigint due, min(period_month) first_period from public.v_tuition_obligations group by student_id) o on o.student_id = s.id
left join (select student_id, sum(amount)::bigint paid, max(paid_on) last_paid_on from public.payments where voided_at is null group by student_id) p on p.student_id = s.id
left join (select student_id, sum(amount)::bigint adj from public.financial_adjustments group by student_id) a on a.student_id = s.id;

grant select on public.v_tuition_obligations, public.v_student_balances to authenticated;
