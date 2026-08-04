-- 현재 가입되어 있는 회원 전원을 Pro 플랜으로 바꿉니다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
--
-- ⚠ 실행 시점에 가입돼 있는 회원만 대상입니다.
--    이후 신규 가입자는 기본값(free)으로 시작하며, 자동으로 Pro 가 되지 않습니다.
-- ⚠ 되돌릴 수 없습니다. 아래 1) 로 대상 인원을 먼저 확인한 뒤 2) 를 실행하세요.

-- ─────────────────────────────────────────────────────────
-- 1) 먼저 확인 — 지금 몇 명이 어떤 플랜인지
-- ─────────────────────────────────────────────────────────
select
  (select count(*) from auth.users)                              as 전체_가입자,
  (select count(*) from public.profiles)                         as 프로필_행,
  (select count(*) from public.profiles where plan = 'pro')      as 이미_pro;

select plan, count(*) as 인원 from public.profiles group by plan order by plan;

-- ─────────────────────────────────────────────────────────
-- 2) 전원 Pro 로 변경
--    profiles 행이 아직 없는 회원(트리거 생성 전 가입자 등)도 함께 만들어 넣습니다.
-- ─────────────────────────────────────────────────────────

-- 옛 요금제 이름(free/pro/max)으로 만들어진 제약이 남아 있으면 먼저 풀어 줍니다.
alter table public.profiles drop constraint if exists profiles_plan_check;

insert into public.profiles (id, email, name, provider, plan)
select
  u.id,
  coalesce(nullif(u.email, ''), u.raw_user_meta_data->>'email'),
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    '선생님'
  ),
  coalesce(u.raw_app_meta_data->>'provider', 'email'),
  'pro'
from auth.users u
on conflict (id) do update set plan = 'pro';

-- 제약을 현재 요금제 체계로 다시 걸어 둡니다.
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free','basic','pro'));

-- ─────────────────────────────────────────────────────────
-- 3) 결과 확인 — 전원이 pro 로 바뀌었는지
-- ─────────────────────────────────────────────────────────
select plan, count(*) as 인원 from public.profiles group by plan order by plan;
