-- 민트쌤 데이터베이스 스키마
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
-- 6종 문서(놀이활동/보육일지/관찰일지/알림장/적응일지/상담일지)를 한 테이블에 저장하고,
-- kind 컬럼으로 종류를 구분합니다. RLS 로 "본인 데이터만" 접근하도록 보호합니다.

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
