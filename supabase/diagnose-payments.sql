-- 결제가 반영되지 않을 때 원인 찾기.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 실행하세요. 아무것도 바꾸지 않습니다.
--
-- 증상별로 어디를 보면 되는지
--   · 돈은 나갔는데 요금제가 그대로  → ② 알림이 왔는가 → ③ 구독이 저장됐는가
--   · 알림이 아예 없음                → Paddle → Notifications 에서 주소와 이벤트 선택 확인
--   · 알림은 왔는데 구독이 없음       → ④ 회원을 못 찾았거나 가격 ID 가 안 맞는 경우

-- ① 요금제 잠금이 걸려 있는가 (없으면 회원이 스스로 Pro 가 될 수 있습니다)
select
  '① 요금제 잠금' as 확인,
  case when exists (
    select 1 from pg_trigger
    where tgrelid = 'public.profiles'::regclass and tgname = 'lock_profile_plan'
  ) then '잠김 ✅' else '뚫림 ❌ — schema.sql 을 다시 실행하세요' end as 결과;

-- ② 최근 받은 알림 (Paddle 이 우리 서버까지 닿았는가)
select '② 최근 알림' as 구분, event_type, received_at
from public.webhook_events
order by received_at desc
limit 10;

-- ③ 구독 현황 — status 가 active 여야 요금제가 열립니다
--    (past_due 도 열어 줍니다. src/domain/billing.js 의 LIVE_STATUSES 참고)
select
  '③ 구독' as 구분,
  p.email,
  s.plan          as 구독요금제,
  p.plan          as 프로필요금제,   -- 이 둘이 다르면 반영이 안 된 것입니다
  s.status,
  s.current_period_end as 다음결제일,
  s.cancel_at     as 해지예정,
  s.paddle_id
from public.subscriptions s
join public.profiles p on p.id = s.user_id
order by s.updated_at desc
limit 20;

-- ④ 결제 내역 — 금액은 최소 단위입니다 (원은 그대로, 달러는 센트)
select
  '④ 결제' as 구분,
  p.email,
  y.status,
  y.total,
  y.currency,
  y.billed_at,
  y.invoice_number
from public.payments y
join public.profiles p on p.id = y.user_id
order by y.billed_at desc nulls last
limit 20;

-- ⑤ 요금제가 구독과 어긋난 회원 (여기 뭔가 나오면 웹훅 처리에 구멍이 있는 것)
--    ⚠ 관리자·수동으로 올려 준 회원은 구독이 없어도 정상이라 제외합니다.
select
  '⑤ 어긋남' as 구분,
  p.email,
  p.plan as 프로필,
  coalesce(string_agg(s.plan || '(' || s.status || ')', ', '), '구독 없음') as 구독
from public.profiles p
left join public.subscriptions s
  on s.user_id = p.id and s.status in ('active', 'trialing', 'past_due')
left join public.admins a on a.id = p.id
where a.id is null
group by p.id, p.email, p.plan
having
  -- 유료인데 살아 있는 구독이 없음 (돈을 안 받고 열어 준 상태)
  (p.plan <> 'free' and count(s.id) = 0)
  -- 구독은 있는데 무료 (돈을 받고 안 열어 준 상태 — 더 급합니다)
  or (p.plan = 'free' and count(s.id) > 0)
limit 20;
