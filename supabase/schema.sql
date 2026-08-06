-- 민트쌤 데이터베이스 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. 여러 번 실행해도 안전합니다.
-- 문서 12종(놀이활동/보육일지/관찰일지/알림장/적응일지/상담일지/생활기록부/발달평가총평/
--          월간평가/안전교육일지/견학계획안/행사계획안)을 한 테이블에 저장하고,
-- kind 컬럼으로 종류를 구분합니다. RLS 로 "본인 데이터만" 접근하도록 보호합니다.
-- profiles 테이블로 "회원 자체"(이름/이메일/가입경로/요금제/가입일/마지막 접속)를 추적합니다.
-- 이메일 가입과 SNS 간편로그인(구글·카카오) 모두 같은 트리거로 기록됩니다.
-- admins 테이블에 등록된 회원은 요금제와 무관하게 문서 전체를 이용합니다.

-- ══════════════════════════════════════════════════════════════════
-- 1) profiles — 회원 등록/추적 테이블
--    회원가입(auth.users insert)이 일어나면 아래 트리거가 자동으로
--    이 테이블에 한 행을 만들어, 모든 회원이 서버에 기록/추적됩니다.
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  name          text,
  provider      text,                                 -- 가입 경로: email / google / kakao
  avatar_url    text,                                 -- SNS 프로필 사진
  plan          text not null default 'free',         -- free / basic / pro (아래 제약조건 참고)
  created_at    timestamptz not null default now(),   -- 가입 시각
  last_seen_at  timestamptz not null default now()    -- 마지막 접속 시각
);

-- 이전 버전으로 이미 만들어 둔 경우를 위한 컬럼 보강 (신규 설치에는 영향 없음)
alter table public.profiles add column if not exists provider   text;
alter table public.profiles add column if not exists avatar_url text;

-- ── 요금제 값 정리 ────────────────────────────────────────────────
-- ⚠ 이 파일은 문서 종류를 추가할 때마다 다시 실행합니다. 그러므로 여기에는
--    "몇 번을 실행해도 결과가 같은" 문장만 둡니다.
--    구 pro(3종) → basic 로 내리는 1회성 이관은 migrate-plan-names.sql 로 옮겼습니다.
--    그 문장을 여기 두면 재실행할 때마다 진짜 Pro 회원이 Basic 으로 강등됩니다.
alter table public.profiles drop constraint if exists profiles_plan_check;
update public.profiles set plan = 'pro'  where plan = 'max';   -- 구 최상위 → 신 Pro (이미 이관됐으면 대상 없음)
update public.profiles set plan = 'free' where plan is null or plan not in ('free','basic','pro');
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free','basic','pro'));

alter table public.profiles enable row level security;

-- 본인 프로필만 읽기/생성/수정 (삭제는 계정 삭제 시 cascade 로 처리)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 회원가입 시 profiles 행을 자동 생성하는 트리거
-- (이메일 가입·구글·카카오 모든 경로에서 동작. SECURITY DEFINER 로 RLS 우회하여 삽입)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, provider, avatar_url)
  values (
    new.id,
    -- 카카오는 이메일 제공에 동의하지 않으면 email 이 비어 옵니다.
    coalesce(nullif(new.email, ''), new.raw_user_meta_data->>'email'),
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'user_name', ''),
      nullif(new.raw_user_meta_data->>'preferred_username', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '선생님'
    ),
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    coalesce(
      nullif(new.raw_user_meta_data->>'avatar_url', ''),
      nullif(new.raw_user_meta_data->>'picture', '')
    )
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- 프로필 기록 실패가 회원가입 자체를 막지 않도록 함
  -- (트리거에서 예외가 나면 auth.users insert 가 통째로 롤백되어 가입이 실패합니다)
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 트리거가 없던 시절에 가입한 회원(이메일·구글·카카오 모두) 소급 등록.
-- on conflict do nothing 이라 몇 번 실행해도 안전하고, 기존 행은 건드리지 않습니다.
insert into public.profiles (id, email, name, provider, avatar_url, created_at)
select
  u.id,
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
  u.created_at
from auth.users u
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════════════════════
-- 2) admins — 관리자 명단 (요금제와 무관하게 문서 전체 개방)
--    ⚠ 일부러 profiles 의 컬럼이 아니라 별도 테이블로 둡니다.
--       profiles 는 "본인 행 수정 허용" 정책이라, 관리자 표시를 거기 두면
--       회원이 브라우저에서 스스로를 관리자로 바꿀 수 있기 때문입니다.
--    이 테이블에는 select 정책만 만들고 insert/update/delete 정책은 두지 않습니다.
--    → 클라이언트(anon 키)로는 절대 쓸 수 없고, 대시보드 SQL Editor 에서만 부여됩니다.
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.admins (
  id         uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note       text
);

alter table public.admins enable row level security;

-- 본인이 관리자인지'만' 확인 가능. 쓰기 정책은 의도적으로 없음.
drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins
  for select using (auth.uid() = id);

-- ══════════════════════════════════════════════════════════════════
-- 3) documents — 회원이 생성한 문서(결과물) 저장
--    kind 로 종류를 구분하고, is_favorite 로 선생님이 표시해 둔 문서를 가려냅니다.
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null,
  user_text   text,          -- 사용자가 입력/요청한 내용(말풍선)
  form        jsonb,         -- 입력 폼 값 전체
  payload     jsonb,         -- AI 가 생성한 문서 결과
  is_favorite boolean not null default false,  -- 선생님이 별표해 둔 문서
  created_at  timestamptz not null default now()
);

-- 이전 버전으로 이미 만들어 둔 경우를 위한 컬럼 보강 (신규 설치에는 영향 없음)
alter table public.documents add column if not exists is_favorite boolean not null default false;

-- 문서 종류 제약. 종류를 추가할 때마다 아래 목록에 넣고 이 파일을 다시 실행하세요.
-- (제약을 지웠다 다시 만드는 이유 — 이미 만들어진 제약에는 새 종류가 빠져 있어 저장이 거부됩니다)
alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents
  add constraint documents_kind_check
  check (kind in ('play','daily','obs','note','adapt','counsel','life','assess',
                  'monthly','safety','trip','event'));

-- 조회 성능용 인덱스 (사용자별 + 종류별 + 시간순)
create index if not exists documents_user_kind_created_idx
  on public.documents (user_id, kind, created_at);

-- 즐겨찾기만 골라 볼 때 쓰는 부분 인덱스 (별표한 문서는 전체의 일부라 부분 인덱스가 알맞습니다)
create index if not exists documents_user_favorite_idx
  on public.documents (user_id, kind, created_at) where is_favorite;

-- Row Level Security 활성화
alter table public.documents enable row level security;

-- 본인 데이터만 읽기/쓰기/수정/삭제
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- 4) usage_events — 월 생성 횟수 과금 원장 (append-only)
--    ⚠ documents 를 세지 않고 별도 테이블을 두는 이유:
--       사용자가 문서를 삭제하면 사용량이 같이 줄어 한도를 무한 우회할 수 있습니다.
--       이 테이블에는 update/delete 정책을 두지 않아 한 번 기록되면 지울 수 없습니다.
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,                          -- 문서 종류 (play/daily/...)
  created_at timestamptz not null default now()
);

-- 이번 달 사용량 집계용 인덱스
create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at);

alter table public.usage_events enable row level security;

-- 본인 사용량만 조회/기록 가능. 수정·삭제 정책은 의도적으로 두지 않습니다.
drop policy if exists "usage_select_own" on public.usage_events;
create policy "usage_select_own" on public.usage_events
  for select using (auth.uid() = user_id);

drop policy if exists "usage_insert_own" on public.usage_events;
create policy "usage_insert_own" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════
-- 5) API 스키마 캐시 갱신
--    Supabase 의 REST API(PostgREST)는 테이블 구조를 캐시해 두고 씁니다.
--    컬럼을 새로 만들어도 이 캐시가 갱신되지 않으면, DB 에는 컬럼이 있는데
--    앱에서는 "Could not find the 'xxx' column of 'documents' in the schema cache"
--    로 계속 거부됩니다. 보통은 자동으로 갱신되지만 늦거나 누락될 때가 있어
--    이 파일을 실행할 때마다 확실하게 한 번 밀어 줍니다.
-- ══════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════
-- 6) 실행 결과 확인
--    SQL Editor 는 마지막 문장의 결과만 보여 줍니다.
--    아래 표가 전부 ✅ 여야 앱에서 저장·즐겨찾기가 동작합니다.
-- ══════════════════════════════════════════════════════════════════
--    ⚠ current_database() 는 Supabase 에서 어느 프로젝트든 'postgres' 라 구분에 쓸 수 없습니다.
--       엉뚱한 프로젝트에 실행하지 않았는지는 브라우저 주소의
--       supabase.com/dashboard/project/<여기> 와 .env 의 VITE_SUPABASE_URL 을 견줘 확인하세요.
--       아래 '회원 수 / 저장된 문서' 도 프로젝트마다 달라 분간에 도움이 됩니다.
select * from (values
  ('회원 수',
   (select count(*)::text from auth.users)),
  ('저장된 문서',
   (select count(*)::text from public.documents) || '건, 마지막 ' ||
   coalesce((select max(created_at)::text from public.documents), '없음')),
  ('documents.is_favorite',
   case when exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'documents'
                       and column_name = 'is_favorite')
        then '있음 ✅' else '없음 ❌' end),
  ('새 문서(event) 허용',
   case when exists (select 1 from pg_constraint
                     where conrelid = 'public.documents'::regclass and contype = 'c'
                       and pg_get_constraintdef(oid) like '%event%')
        then '허용됨 ✅' else '빠짐 ❌' end),
  ('documents RLS 정책',
   (select count(*)::text from pg_policies
    where schemaname = 'public' and tablename = 'documents') || ' / 4'),
  ('요금제 값',
   coalesce((select string_agg(distinct plan, ', ') from public.profiles), '(회원 없음)'))
) as t(확인, 결과);
