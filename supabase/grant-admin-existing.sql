-- 기존 회원 전원에게 관리자 권한 부여 (1회성)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요.
--
-- ⚠ 이 스크립트는 "실행하는 시점에 가입돼 있는" 회원만 관리자로 만듭니다.
--    실행 이후 새로 가입하는 회원은 포함되지 않습니다 (자동 부여 트리거 없음).
--    나중에 다시 실행하면 그 시점의 신규 회원까지 관리자가 되므로, 한 번만 실행하세요.
--
-- 선행 조건: schema.sql 의 admins 테이블이 먼저 만들어져 있어야 합니다.

insert into public.admins (id, note)
select id, '기존 회원 일괄 부여'
from auth.users
on conflict (id) do nothing;

-- 결과 확인 — 부여된 관리자 목록
select a.id, u.email, a.granted_at, a.note
from public.admins a
join auth.users u on u.id = a.id
order by a.granted_at;
