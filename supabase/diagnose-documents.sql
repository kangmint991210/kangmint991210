-- 문서가 저장되지 않을 때 원인 진단.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. 아무것도 바꾸지 않고 확인만 합니다.
--
-- 증상: 문서를 만들었는데 새로고침하면 사라진다 / 즐겨찾기(별표)가 눌리지 않는다.
-- 대부분 schema.sql 을 아직 실행하지 않았거나, **다른 프로젝트**의 SQL Editor 에서 실행한 경우입니다.
--
-- ⚠ 가장 흔한 실수 — 여러 Supabase 프로젝트를 갖고 있을 때 엉뚱한 프로젝트에 실행하기.
--    아래 1번의 결과가 앱의 VITE_SUPABASE_URL 과 같은 프로젝트인지 먼저 확인하세요.

-- 1) 지금 이 SQL 을 실행 중인 프로젝트가 어디인가
select current_database() as 데이터베이스,
       coalesce(current_setting('app.settings.project_ref', true), '(알 수 없음)') as 프로젝트;

-- 2) documents 테이블에 필요한 컬럼이 다 있는가 (is_favorite 이 없으면 즐겨찾기가 실패합니다)
select column_name as 컬럼, data_type as 타입, column_default as 기본값
from information_schema.columns
where table_schema = 'public' and table_name = 'documents'
order by ordinal_position;

-- 3) 허용된 문서 종류에 새 문서(life 등)가 들어 있는가
--    빠져 있으면 그 종류만 저장이 거부되고, 화면에는 남아 있다가 새로고침 때 사라집니다.
select conname as 제약이름, pg_get_constraintdef(oid) as 정의
from pg_constraint
where conrelid = 'public.documents'::regclass and contype = 'c';

-- 4) 실제로 종류별 몇 건이 저장돼 있는가
select kind as 종류, count(*) as 건수,
       count(*) filter (where is_favorite) as 즐겨찾기,
       max(created_at) as 마지막저장
from public.documents
group by kind
order by kind;

-- 5) RLS 정책이 살아 있는가 (없으면 본인 문서를 읽지도 쓰지도 못합니다)
select policyname as 정책, cmd as 동작
from pg_policies
where schemaname = 'public' and tablename = 'documents'
order by cmd;

-- ── 결과 읽는 법 ──────────────────────────────────────────────────
-- · 2번에 is_favorite 이 없다 →  schema.sql 을 (이 프로젝트에서) 실행하세요.
-- · 3번 정의에 'life' 가 없다 →  같은 이유. schema.sql 을 실행하세요.
-- · 4번에 최근 문서가 없다     →  저장 자체가 거부되고 있습니다. 브라우저 콘솔의
--                                `[민트쌤] 문서 저장 (kind=…) 실패` 경고에 정확한 원인이 찍힙니다.
-- · 5번에 정책이 4개(select/insert/update/delete) 가 아니다 → schema.sql 을 실행하세요.
