-- =====================================================================
-- เติมพลังใจครู — โครงสร้างฐานข้อมูล PostgreSQL (Supabase)
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run
-- รันซ้ำได้ ไม่ทำให้ข้อมูลเดิมหาย
-- =====================================================================

-- ---------- ตาราง ----------

-- ข้อมูลผู้ใช้ (1 แถวต่อ 1 บัญชี สร้างอัตโนมัติเมื่อสมัคร)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 60),
  email       text not null default '',
  created_at  timestamptz not null default now(),
  last_active timestamptz
);

-- บันทึกการทำกิจกรรม (1 แถวต่อการ์ด 1 ใบ)
create table if not exists public.entries (
  id          text primary key check (char_length(id) <= 40),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date        timestamptz not null default now(),
  cat         text not null check (cat in ('emo', 'sat', 'mean', 'goal')),
  qid         smallint not null check (qid between 0 and 24),
  question    text not null check (char_length(question) <= 500),
  answer      text not null check (char_length(answer) between 1 and 5000),
  follow_q    text not null check (char_length(follow_q) <= 500),
  follow_a    text not null check (char_length(follow_a) between 1 and 5000),
  mood        smallint not null check (mood between 1 and 5),
  blessing    text not null default '' check (char_length(blessing) <= 500),
  created_at  timestamptz not null default now()
);
create index if not exists entries_user_date_idx on public.entries (user_id, date);

-- รายชื่อผู้ดูแล/ผู้วิจัย (เพิ่มด้วย SQL เท่านั้น — ดู README)
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------- ฟังก์ชัน ----------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- สร้าง profile อัตโนมัติเมื่อมีผู้สมัครใหม่
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    left(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)), 60),
    lower(coalesce(new.email, ''))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end;
$$;

-- อัปเดตเวลาใช้งานล่าสุดเมื่อมีบันทึกใหม่
create or replace function public.touch_last_active()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set last_active = new.date where id = new.user_id;
  return new;
end;
$$;

drop trigger if exists on_entry_created on public.entries;
create trigger on_entry_created
  after insert on public.entries
  for each row execute function public.touch_last_active();

-- ---------- สิทธิ์การเข้าถึง (Row Level Security) ----------
-- นักศึกษา: อ่าน/เพิ่มได้เฉพาะของตนเอง, บันทึกแก้ไขหรือลบไม่ได้
-- ผู้ดูแล: อ่านได้ทุกคน

alter table public.profiles enable row level security;
alter table public.entries  enable row level security;
alter table public.admins   enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "entries: read own or admin" on public.entries;
create policy "entries: read own or admin" on public.entries
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "entries: insert own" on public.entries;
create policy "entries: insert own" on public.entries
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "admins: read own" on public.admins;
create policy "admins: read own" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- จำกัดคอลัมน์ที่ผู้ใช้แก้ไขได้ (แก้ได้แค่ชื่อ)
revoke all on public.profiles, public.entries, public.admins from anon, authenticated;
grant select on public.profiles, public.entries, public.admins to authenticated;
grant update (name) on public.profiles to authenticated;
grant insert (id, date, cat, qid, question, answer, follow_q, follow_a, mood, blessing) on public.entries to authenticated;
grant execute on function public.is_admin() to authenticated;
