// 생성 요청을 통과시킬지 판단하는 정책.
// "무엇을 막을지"만 여기서 정하고, 실제 세는 일은 _rate-limit.js / _supabase-admin.js 가 맡습니다.
//
// ── 두 겹으로 막습니다 ────────────────────────────────────────────
//  1) 게스트(비로그인 체험): IP 기준 레이트리밋.
//     브라우저 localStorage 만으로는 지우면 그만이라 서버에서도 한 번 더 셉니다.
//  2) 로그인 사용자: 요금제 월 한도(usage_events 원장 기준).
//     클라이언트에서도 막지만 그건 UX 용이고, 실제 차단은 여기서 이뤄져야 우회할 수 없습니다.
//
// ⚠ SUPABASE_SERVICE_ROLE_KEY 가 없으면 2)를 검증할 수 없어 클라이언트 게이팅만 동작합니다.
//    운영 배포에서는 반드시 설정하세요. — README 참고

import { quotaOf, normalizePlan } from "../src/domain/plans.js";
import { hit, clientIp } from "./_rate-limit.js";
import * as db from "./_supabase-admin.js";

export { clientIp };

/** 비로그인 체험에 허용하는 호출량 (재방문·공용 IP 를 감안해 넉넉히 잡고 봇만 걸러냄) */
const GUEST_LIMITS = [
  { label: "시간당", windowMs: 3600e3, max: 5 },
  { label: "하루", windowMs: 24 * 3600e3, max: 20 },
];

/**
 * @returns {{ok:true, counted:boolean} | {ok:false, status:number, message:string}}
 */
export async function guardRequest({ token, ip, kind }) {
  if (!token) return guardGuest(ip);
  if (!db.isConfigured()) return { ok: true, counted: false }; // 서버 검증 불가 → 클라이언트에 위임
  return guardMember(token, kind);
}

function guardGuest(ip) {
  const over = hit(ip, GUEST_LIMITS);
  if (!over) return { ok: true, counted: false };
  return {
    ok: false,
    status: 429,
    message: `무료 체험은 ${over} 이용 횟수가 정해져 있어요. 회원가입하시면 바로 이어서 쓰실 수 있어요. 🌿`,
  };
}

async function guardMember(token, kind) {
  const userId = await db.userIdFromToken(token);
  if (!userId) return { ok: false, status: 401, message: "로그인이 만료됐어요. 다시 로그인해 주세요." };

  const { plan, isAdmin } = await db.getAccount(userId);
  if (!isAdmin) {
    const quota = quotaOf(normalizePlan(plan));
    const used = await db.countUsageThisMonth(userId);
    if (used >= quota) {
      return {
        ok: false,
        status: 429,
        message: `이번 달 생성 횟수(${quota.toLocaleString()}회)를 모두 사용했어요. 요금제를 올리면 바로 이어서 쓰실 수 있어요.`,
      };
    }
  }
  return { ok: true, counted: await db.recordUsage(userId, kind) };
}
