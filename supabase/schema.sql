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

-- ── 요금제는 회원이 스스로 바꿀 수 없습니다 ──────────────────────────
-- ⚠ 결제를 붙이기 전에는 화면에서 요금제 버튼을 누르면 profiles.plan 이 그대로
--    바뀌었습니다. 즉 "돈을 내지 않고 Pro 가 되는 버튼"이었습니다.
--    RLS 만으로는 막을 수 없습니다 — 정책은 "이 행을 고쳐도 되는가"만 볼 뿐,
--    "어느 칸을 고쳤는가"는 보지 못합니다(정책에서 이전 값과 새 값을 비교할 수 없음).
--    그래서 트리거로 plan 칸을 고정합니다.
--
-- ⚠ 이 함수는 security definer 로 만들면 안 됩니다.
--    그렇게 하면 함수 안의 current_user 가 항상 소유자(postgres)가 되어
--    검사가 통째로 무력화됩니다. 호출자 권한 그대로 돌아야 합니다.
--
-- 통과시키는 대상
--   · service_role — 결제 웹훅(api/paddle-webhook.js)이 쓰는 역할
--   · postgres / supabase_admin — 대시보드 SQL Editor, 가입 트리거(security definer)
create or replace function public.lock_profile_plan()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  -- 오류를 내지 않고 조용히 되돌립니다.
  -- 오류를 내면 이름·프로필 사진 저장까지 통째로 실패합니다.
  if tg_op = 'INSERT' then
    new.plan := 'free';
  else
    new.plan := old.plan;
  end if;
  return new;
end;
$$;

drop trigger if exists lock_profile_plan on public.profiles;
create trigger lock_profile_plan
  before insert or update on public.profiles
  for each row execute function public.lock_profile_plan();

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
-- 5) 결제 — Paddle 구독과 결제 내역
--
--    회원은 자기 것만 "읽을" 수 있습니다. 쓰기 정책은 의도적으로 두지 않습니다 —
--    결제 웹훅(service_role)만 씁니다. service_role 은 RLS 를 우회합니다.
--
--    ⚠ Paddle 이 보내 주는 원본(raw)을 통째로 남깁니다.
--       환불·분쟁이 생기면 "그때 무엇을 받았는지"가 유일한 근거가 되고,
--       나중에 필요해질 값을 미리 다 예측할 수는 없습니다.
-- ══════════════════════════════════════════════════════════════════

-- ── 5-1) subscriptions — 지금 어떤 구독을 갖고 있는가 ────────────────
create table if not exists public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  paddle_id         text not null unique,              -- sub_xxx
  paddle_customer_id text,                             -- ctm_xxx
  plan              text not null,                     -- basic / pro
  status            text not null,                     -- active/trialing/past_due/paused/canceled
  price_id          text,                              -- pri_xxx
  started_at        timestamptz,
  current_period_end timestamptz,                      -- 다음 결제일 (= 이 날까지 유효)
  cancel_at         timestamptz,                       -- 해지 예약된 날 (없으면 계속 갱신)
  canceled_at       timestamptz,
  raw               jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ── 5-2) payments — 언제 얼마가 결제·환불되었는가 ───────────────────
--    ⚠ 금액은 Paddle 이 주는 "최소 단위 문자열"을 그대로 정수로 담습니다.
--       원(KRW)은 최소 단위가 1원이라 그대로지만, 달러는 센트입니다.
--       화면에 보일 때 currency 를 함께 봐야 합니다. 반올림 오차를 피하려고
--       실수(numeric) 대신 정수(bigint)로 둡니다.
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  paddle_id       text not null unique,                -- txn_xxx
  subscription_id text,                                -- sub_xxx (일회성 결제면 null)
  status          text not null,                       -- completed / billed / past_due / canceled
  total           bigint,                              -- 세금 포함 총액 (최소 단위)
  tax             bigint,
  currency        text,                                -- KRW / USD …
  billed_at       timestamptz,
  invoice_number  text,
  raw             jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists payments_user_billed_idx on public.payments (user_id, billed_at desc);

alter table public.payments enable row level security;

drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

-- ── 5-3) webhook_events — 같은 알림을 두 번 처리하지 않도록 ──────────
--    Paddle 은 응답이 늦거나 실패하면 같은 알림을 다시 보냅니다.
--    그대로 두면 환불 알림이 두 번 처리되는 식의 사고가 납니다.
--    event_id 를 먼저 기록해 두고, 이미 있으면 건너뜁니다.
create table if not exists public.webhook_events (
  event_id     text primary key,
  event_type   text not null,
  received_at  timestamptz not null default now(),
  raw          jsonb
);

alter table public.webhook_events enable row level security;
-- 정책 없음 = 회원은 아무것도 볼 수 없습니다. service_role 만 다룹니다.

-- ══════════════════════════════════════════════════════════════════
-- 6) API 스키마 캐시 갱신
--    Supabase 의 REST API(PostgREST)는 테이블 구조를 캐시해 두고 씁니다.
--    컬럼을 새로 만들어도 이 캐시가 갱신되지 않으면, DB 에는 컬럼이 있는데
--    앱에서는 "Could not find the 'xxx' column of 'documents' in the schema cache"
--    로 계속 거부됩니다. 보통은 자동으로 갱신되지만 늦거나 누락될 때가 있어
--    이 파일을 실행할 때마다 확실하게 한 번 밀어 줍니다.
-- ══════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════
-- 7) 실행 결과 확인
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
   coalesce((select string_agg(distinct plan, ', ') from public.profiles), '(회원 없음)')),
  -- 이 줄이 ❌ 면 회원이 브라우저에서 스스로 Pro 로 올릴 수 있는 상태입니다
  ('요금제 잠금(결제만 변경)',
   case when exists (select 1 from pg_trigger
                     where tgrelid = 'public.profiles'::regclass
                       and tgname = 'lock_profile_plan')
        then '잠김 ✅' else '뚫림 ❌' end),
  ('결제 테이블',
   (select string_agg(c.relname, ', ' order by c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('subscriptions', 'payments', 'webhook_events'))
   || ' (3개여야 함)'),
  ('결제 내역',
   (select count(*)::text from public.payments) || '건 · 구독 ' ||
   (select count(*)::text from public.subscriptions) || '건')
) as t(확인, 결과);
