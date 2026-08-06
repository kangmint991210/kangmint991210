-- 요금제 이름 개편 (구 free/pro/max → 신 free/basic/pro) — **1회성**
--
-- 구 요금제는 문서 종류 수로 나뉘어 있었습니다: pro=3종, max=6종.
-- 신 요금제에서는 그것이 각각 basic, pro 에 해당합니다.
-- 'pro' 라는 이름이 양쪽에 있어, 반드시 아래 순서로 한 번만 실행해야 합니다.
--
-- ⚠ 두 번 실행하지 마세요. 실행할 때마다 진짜 Pro 회원이 Basic 으로 내려갑니다.
--    그래서 schema.sql 에서 빼내 이 파일로 옮겼습니다(schema.sql 은 문서를 추가할 때마다 재실행함).
--
-- 이미 이관을 마쳤다면 실행할 필요가 없습니다. 확인 방법:
--   select plan, count(*) from public.profiles group by plan;
--   → 'max' 가 하나도 없으면 이관이 끝난 것입니다.

begin;

alter table public.profiles drop constraint if exists profiles_plan_check;

update public.profiles set plan = 'basic' where plan = 'pro';   -- 구 pro(3종)  → Basic
update public.profiles set plan = 'pro'   where plan = 'max';   -- 구 max(6종)  → Pro
update public.profiles set plan = 'free'  where plan is null or plan not in ('free','basic','pro');

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free','basic','pro'));

commit;

select plan, count(*) as 회원수 from public.profiles group by plan order by plan;
