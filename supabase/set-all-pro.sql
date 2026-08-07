-- 현재 가입되어 있는 회원 전원을 Pro 플랜으로 바꿉니다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 "전체"를 실행하세요.
--
-- ⚠ 실행 시점에 가입돼 있는 회원만 대상입니다.
--    이후 신규 가입자는 기본값(free)으로 시작하며, 자동으로 Pro 가 되지 않습니다.
--
-- ⚠ 되돌릴 수 없습니다. 아래 ①로 대상 인원을 먼저 확인하세요.
--
-- ⚠ 두 번 실행하지 마세요.
--    나중에 무료로 내려간 회원까지 다시 Pro 로 올려 버립니다.
--
-- ⚠ 결제(Paddle)와의 관계 — 여기서 준 Pro 는 구독이 아니라 "그냥 준 것"입니다.
--    · 결제 웹훅은 구독 알림이 온 회원만 건드리므로, 이분들은 계속 Pro 로 남습니다.
--    · 다만 이분들 중 누군가가 나중에 직접 결제했다가 해지하면, 그때 웹훅이
--      "살아 있는 구독 없음 → free" 로 계산해 여기서 준 Pro 도 함께 사라집니다.
--      그런 일이 생기면 이 파일이 아니라 그 회원만 따로 올려 주세요.

-- ═════════════════════════════════════════════════════════
-- ① 먼저 확인 — 지금 몇 명이 어떤 플랜인지
-- ═════════════════════════════════════════════════════════
select
  (select count(*) from auth.users)                         as 전체_가입자,
  (select count(*) from public.profiles)                    as 프로필_행,
  (select count(*) from public.profiles where plan = 'pro') as 이미_pro;

select plan, count(*) as 인원 from public.profiles group by plan order by plan;

-- ═════════════════════════════════════════════════════════
-- ② 전원 Pro 로 변경
--
--    ⚠ profiles.plan 은 lock_profile_plan 트리거가 지키고 있습니다
--       (회원이 스스로 Pro 가 되는 것을 막는 장치 — schema.sql 참고).
--       그 트리거가 켜져 있으면 아래 update 가 "조용히" 무시됩니다.
--       오류도 나지 않고 인원도 그대로라, 왜 안 되는지 알기 어렵습니다.
--       그래서 잠깐 껐다가 다시 켭니다.
--
--    ⚠ 전체를 하나의 DO 블록에 둔 이유 — 중간에 실패하면 통째로 되돌아가서,
--       트리거가 꺼진 채로 남는 일이 없습니다. 꺼진 채 남으면 보안 구멍이 다시 열립니다.
-- ═════════════════════════════════════════════════════════
do $$
declare
  locked  boolean;
  made    int;
  changed int;
begin
  select exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass and tgname = 'lock_profile_plan'
  ) into locked;

  if locked then
    alter table public.profiles disable trigger lock_profile_plan;
  end if;

  -- 옛 요금제 이름(free/pro/max)으로 만들어진 제약이 남아 있으면 먼저 풀어 줍니다
  alter table public.profiles drop constraint if exists profiles_plan_check;

  -- 프로필 행이 아직 없는 회원(트리거 생성 전 가입자 등)도 함께 만들어 넣습니다
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
  get diagnostics made = row_count;

  alter table public.profiles
    add constraint profiles_plan_check check (plan in ('free','basic','pro'));

  -- ⚠ 반드시 다시 켭니다. 꺼진 채로 두면 회원이 스스로 Pro 가 될 수 있습니다.
  if locked then
    alter table public.profiles enable trigger lock_profile_plan;
  end if;

  select count(*) into changed from public.profiles where plan = 'pro';
  raise notice '전원 Pro 전환 — 처리 % 행, 현재 Pro %명, 잠금 %',
    made, changed, case when locked then '다시 켬' else '원래 없음(schema.sql 을 실행하세요)' end;
end;
$$;

-- ═════════════════════════════════════════════════════════
-- ③ 결과 확인
--    ⚠ '요금제 잠금' 이 ✅ 인지 반드시 보세요.
--       ❌ 면 회원이 브라우저에서 스스로 Pro 가 될 수 있는 상태입니다.
--       그럴 때는 supabase/schema.sql 을 다시 실행하면 복구됩니다.
-- ═════════════════════════════════════════════════════════
select * from (values
  ('회원 수', (select count(*)::text from auth.users)),
  ('프로필 행', (select count(*)::text from public.profiles)),
  ('요금제 분포',
   (select string_agg(plan || ' ' || cnt::text || '명', ' / ' order by plan)
    from (select plan, count(*) as cnt from public.profiles group by plan) s)),
  ('무료로 남은 회원',
   case when exists (select 1 from public.profiles where plan <> 'pro')
        then (select count(*)::text from public.profiles where plan <> 'pro') || '명 남음 ❌'
        else '없음 ✅' end),
  ('요금제 잠금(결제만 변경)',
   case when exists (
          select 1 from pg_trigger
          where tgrelid = 'public.profiles'::regclass
            and tgname = 'lock_profile_plan'
            and tgenabled <> 'D'          -- D = 꺼짐
        ) then '잠김 ✅' else '뚫림 ❌ — schema.sql 을 다시 실행하세요' end)
) as t(확인, 결과);
