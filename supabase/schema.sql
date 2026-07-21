-- 민트쌤 데이터베이스 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
-- 6종 문서(놀이활동/보육일지/관찰일지/알림장/적응일지/상담일지)를 한 테이블에 저장하고,
-- kind 컬럼으로 종류를 구분합니다. RLS 로 "본인 데이터만" 접근하도록 보호합니다.
-- profiles 테이블로 "회원 자체"(이름/이메일/요금제/가입일/마지막 접속)를 추적합니다.

-- ══════════════════════════════════════════════════════════════════
-- 1) profiles — 회원 등록/추적 테이블
--    회원가입(auth.users insert)이 일어나면 아래 트리거가 자동으로
--    이 테이블에 한 행을 만들어, 모든 회원이 서버에 기록/추적됩니다.
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  name          text,
  plan          text not null default 'free' check (plan in ('free','pro','max')),
  created_at    timestamptz not null default now(),   -- 가입 시각
  last_seen_at  timestamptz not null default now()    -- 마지막 접속 시각
);

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
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════
-- 2) documents — 회원이 생성한 6종 문서(결과물) 저장
-- ══════════════════════════════════════════════════════════════════
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('play','daily','obs','note','adapt','counsel')),
  user_text   text,          -- 사용자가 입력/요청한 내용(말풍선)
  form        jsonb,         -- 입력 폼 값 전체
  payload     jsonb,         -- AI 가 생성한 문서 결과
  created_at  timestamptz not null default now()
);

-- 조회 성능용 인덱스 (사용자별 + 종류별 + 시간순)
create index if not exists documents_user_kind_created_idx
  on public.documents (user_id, kind, created_at);

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
