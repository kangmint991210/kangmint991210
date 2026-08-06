-- 문서가 저장되지 않을 때 원인 진단.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. 아무것도 바꾸지 않고 확인만 합니다.
--
-- 증상: 문서를 만들었는데 새로고침하면 사라진다 / 즐겨찾기(별표)가 눌리지 않는다.
--
-- ⚠ SQL Editor 는 여러 문장을 실행하면 **마지막 결과만** 보여 줍니다.
--    그래서 이 파일은 확인 항목을 한 표로 묶어 한 번에 나오게 만들었습니다.
--    아래를 통째로 복사해 실행하고, 나온 표를 그대로 알려 주시면 됩니다.
--
-- ⚠ 프로젝트를 여러 개 갖고 있다면, 앱의 VITE_SUPABASE_URL 과 **같은 프로젝트**에서 실행하세요.
--    (로컬은 .env, 배포본은 Vercel → Settings → Environment Variables 에 있습니다)

with 컬럼 as (
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'documents'
),
제약 as (
  select pg_get_constraintdef(oid) as 정의 from pg_constraint
  where conrelid = 'public.documents'::regclass and contype = 'c'
)
select * from (
  values (0, '이 프로젝트', current_database())
) as t(순번, 항목, 결과)

union all
select 1, '판정 · is_favorite 컬럼',
       case when exists (select 1 from 컬럼 where column_name = 'is_favorite')
            then '있음 ✅' else '없음 ❌ → schema.sql 을 이 프로젝트에서 실행하세요' end

union all
select 2, '판정 · life(생활기록부) 허용',
       case when exists (select 1 from 제약 where 정의 like '%life%')
            then '허용됨 ✅'
            when not exists (select 1 from 제약)
            then '제약 없음 (모든 종류 허용) ✅'
            else '빠짐 ❌ → schema.sql 을 이 프로젝트에서 실행하세요' end

union all
select 3, 'documents 컬럼 전체',
       coalesce((select string_agg(column_name, ', ') from 컬럼), '테이블 없음 ❌')

union all
select 4, 'kind 제약 정의',
       coalesce((select string_agg(정의, ' | ') from 제약), '(없음)')

union all
select 5, '종류별 저장 건수',
       coalesce((select string_agg(kind || '=' || n, ', ' order by kind)
                 from (select kind, count(*) as n from public.documents group by kind) x),
                '(한 건도 없음)')

union all
select 6, '즐겨찾기 표시된 문서',
       case when exists (select 1 from 컬럼 where column_name = 'is_favorite')
            then (select count(*)::text from public.documents where is_favorite)
            else '(컬럼 없음)' end

union all
select 7, '최근 저장 시각',
       coalesce((select max(created_at)::text from public.documents), '(없음)')

union all
select 8, 'RLS 정책',
       coalesce((select string_agg(policyname, ', ' order by policyname) from pg_policies
                 where schemaname = 'public' and tablename = 'documents'),
                '(없음 ❌)')
order by 순번;

-- ── 결과 읽는 법 ──────────────────────────────────────────────────
-- · 1번이 '없음' 이거나 2번이 '빠짐' → schema.sql 을 이 프로젝트에서 실행하세요.
-- · 5번에 최근 만든 문서 종류가 없다 → 저장이 거부되고 있습니다.
--   브라우저 콘솔의 `[민트쌤] 문서 저장 (kind=…) 실패` 경고에 정확한 원인이 찍힙니다.
-- · 8번 정책이 4개(select/insert/update/delete) 가 아니다 → schema.sql 을 실행하세요.
