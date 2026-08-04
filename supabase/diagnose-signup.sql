-- 회원가입이 profiles 에 남지 않을 때 원인을 찾는 진단 + 복구.
-- Supabase 대시보드 → SQL Editor 에서 1) 부터 차례로 실행하세요.
--
-- 회원 기록은 두 경로로 만들어집니다.
--   ① DB 트리거 on_auth_user_created  — 가입 즉시 서버에서
--   ② 앱의 profiles.upsert            — 로그인할 때마다 보강
-- 둘 다 실패하면 회원이 DB 에 남지 않습니다. 아래에서 어느 쪽이 문제인지 가려냅니다.

-- ═══════════════════════════════════════════════════════════
-- 1) 누가 빠졌는지 — 가입 경로별로 auth.users 와 profiles 비교
-- ═══════════════════════════════════════════════════════════
select
  coalesce(u.raw_app_meta_data->>'provider', 'email') as 가입경로,
  count(*)                                            as 가입자,
  count(p.id)                                         as profiles에_있음,
  count(*) - count(p.id)                              as 빠진_회원
from auth.users u
left join public.profiles p on p.id = u.id
group by 1
order by 1;

-- ═══════════════════════════════════════════════════════════
-- 2) 빠진 회원 목록 (최근 가입 순)
-- ═══════════════════════════════════════════════════════════
select
  u.id,
  coalesce(nullif(u.email, ''), u.raw_user_meta_data->>'email') as 이메일,
  coalesce(u.raw_app_meta_data->>'provider', 'email')           as 가입경로,
  u.created_at                                                   as 가입일
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
order by u.created_at desc;

-- ═══════════════════════════════════════════════════════════
-- 3) 트리거가 살아 있는지 (①번 경로)
--    비어 있으면 schema.sql 을 다시 실행해야 합니다.
-- ═══════════════════════════════════════════════════════════
select tgname as 트리거, tgenabled as 활성화상태
from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- ═══════════════════════════════════════════════════════════
-- 4) plan 제약이 현재 요금제 체계와 맞는지 (②번 경로가 막히는 흔한 원인)
--    'free','basic','pro' 가 아니면 앱의 저장이 거부됩니다.
-- ═══════════════════════════════════════════════════════════
select conname as 제약이름, pg_get_constraintdef(oid) as 정의
from pg_constraint
where conrelid = 'public.profiles'::regclass and contype = 'c';

-- ═══════════════════════════════════════════════════════════
-- 5) 본인 행을 만들 수 있는 RLS 정책이 있는지 (②번 경로)
--    profiles_insert_own / profiles_update_own 이 보여야 합니다.
-- ═══════════════════════════════════════════════════════════
select policyname as 정책, cmd as 동작
from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by cmd;

-- ═══════════════════════════════════════════════════════════
-- 6) 복구 — 빠진 회원을 지금 채워 넣습니다 (SNS 포함)
--    이미 있는 회원은 건드리지 않습니다.
-- ═══════════════════════════════════════════════════════════
insert into public.profiles (id, email, name, provider, avatar_url, plan, created_at)
select
  u.id,
  -- 카카오는 이메일 제공에 동의하지 않으면 email 이 비어 옵니다
  coalesce(nullif(u.email, ''), u.raw_user_meta_data->>'email'),
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'user_name', ''),
    nullif(u.raw_user_meta_data->>'preferred_username', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    '선생님'
  ),
  coalesce(u.raw_app_meta_data->>'provider', 'email'),
  coalesce(
    nullif(u.raw_user_meta_data->>'avatar_url', ''),
    nullif(u.raw_user_meta_data->>'picture', '')
  ),
  'pro',   -- 지금 정책상 기존 회원은 Pro. 무료로 두려면 'free' 로 바꾸세요.
  u.created_at
from auth.users u
on conflict (id) do nothing;

-- 복구 결과 확인 — 빠진_회원 이 0 이어야 합니다.
select
  coalesce(u.raw_app_meta_data->>'provider', 'email') as 가입경로,
  count(*) - count(p.id)                              as 빠진_회원
from auth.users u
left join public.profiles p on p.id = u.id
group by 1
order by 1;

-- ═══════════════════════════════════════════════════════════
-- 7) 1) 에서 "빠진 회원 0" 이 나왔다면 여기부터 보세요.
--    profiles 는 auth.users 를 기준으로 세므로, SNS 가입 자체가 안 되고 있으면
--    누락이 0 으로 보입니다. 실제로 SNS 계정이 만들어졌는지 직접 확인합니다.
-- ═══════════════════════════════════════════════════════════

-- 7-1) 연결된 로그인 수단별 인원. google / kakao 행이 아예 없으면
--      SNS 로그인이 한 번도 성공한 적이 없다는 뜻입니다.
--      (Supabase → Authentication → Providers 설정과 Redirect URL 을 확인하세요)
select provider as 로그인수단, count(*) as 인원
from auth.identities
group by provider
order by provider;

-- 7-2) 최근 가입자 20명의 실제 로그인 수단
--      ⚠ provider 는 "최초" 가입 경로만 남습니다.
--         이미 같은 이메일로 가입한 계정이 있으면 구글·카카오로 로그인해도
--         새 회원이 생기지 않고 기존 계정에 연결됩니다(providers 배열에만 추가됨).
--         그 경우 profiles.provider 는 계속 'email' 로 보입니다.
select
  u.created_at                                     as 가입일,
  coalesce(nullif(u.email, ''), '(이메일 없음)')    as 이메일,
  u.raw_app_meta_data->>'provider'                 as 최초_가입경로,
  u.raw_app_meta_data->'providers'                 as 연결된_수단들,
  (select string_agg(i.provider, ', ') from auth.identities i where i.user_id = u.id) as identities
from auth.users u
order by u.created_at desc
limit 20;

-- 7-3) profiles.provider 를 실제 연결 수단으로 다시 맞추기 (선택)
--      SNS 로 로그인하는데 'email' 로 기록돼 있는 회원을 바로잡습니다.
update public.profiles p
set provider = sub.providers
from (
  select user_id, string_agg(provider, ',' order by provider) as providers
  from auth.identities group by user_id
) sub
where p.id = sub.user_id and p.provider is distinct from sub.providers;

select provider as 기록된_가입경로, count(*) as 인원
from public.profiles group by provider order by provider;
