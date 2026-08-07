// 서버 전용 Supabase 접근 (service_role 키).
// RLS 를 우회하므로 이 파일은 절대 브라우저 번들에 들어가면 안 됩니다.
//
// SDK 대신 REST 를 직접 호출합니다 — 서버리스 콜드스타트를 줄이려는 의도이고,
// 필요한 질의가 세 개뿐이라 의존성을 늘릴 이유가 없습니다.

const env = (k) => process.env[k] || "";
const baseUrl = () => env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
const serviceKey = () => env("SUPABASE_SERVICE_ROLE_KEY");

/** 서버 검증에 필요한 환경변수가 갖춰졌는지 */
export const isConfigured = () => Boolean(baseUrl() && serviceKey());

async function rest(path, { method = "GET", headers = {}, body } = {}) {
  const key = serviceKey();
  return fetch(`${baseUrl()}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** 액세스 토큰 → 사용자 id. Supabase 에 직접 확인하므로 위조할 수 없습니다. */
export async function userIdFromToken(token) {
  try {
    const r = await fetch(`${baseUrl()}/auth/v1/user`, {
      headers: { apikey: serviceKey(), Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    return (await r.json())?.id || null;
  } catch {
    return null;
  }
}

/** 요금제 + 관리자 여부 */
export async function getAccount(userId) {
  const [profileRes, adminRes] = await Promise.all([
    rest(`profiles?select=plan&id=eq.${userId}`),
    rest(`admins?select=id&id=eq.${userId}`),
  ]);
  const admins = (await adminRes.json().catch(() => [])) || [];
  const profiles = (await profileRes.json().catch(() => [])) || [];
  return { plan: profiles[0]?.plan, isAdmin: admins.length > 0 };
}

/** 이번 달(UTC 기준) 생성 횟수 */
export async function countUsageThisMonth(userId) {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const r = await rest(`usage_events?select=id&user_id=eq.${userId}&created_at=gte.${from}`, {
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  // Content-Range: 0-0/123 → 123
  const total = Number(String(r.headers.get("content-range") || "").split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

/**
 * 행을 넣거나(있으면) 덮어씁니다.
 * @param {string} table
 * @param {object} row
 * @param {string} conflictColumn 이 값이 같으면 같은 행으로 봅니다
 */
export async function upsert(table, row, conflictColumn) {
  const r = await rest(`${table}?on_conflict=${conflictColumn}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: row,
  });
  if (!r.ok) throw new Error(`${table} 저장 실패 ${r.status}: ${await r.text()}`);
}

/**
 * 이미 처리한 알림인지 확인하고, 처음이면 표시해 둡니다.
 * @returns {Promise<boolean>} true 면 처음 보는 알림
 */
export async function claimEvent(eventId, eventType, raw) {
  // Prefer 를 주지 않으면 기본이 "충돌 시 실패" 라, 두 번째 시도는 409 로 돌아옵니다.
  const r = await rest("webhook_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: { event_id: eventId, event_type: eventType, raw },
  });
  if (r.status === 409) return false;          // 이미 처리한 알림
  if (!r.ok) throw new Error(`webhook_events 기록 실패 ${r.status}: ${await r.text()}`);
  return true;
}

/** 이메일로 회원 찾기 — 결제창이 계정 정보를 실어 보내지 못했을 때의 마지막 수단 */
export async function userIdByEmail(email) {
  if (!email) return null;
  const r = await rest(`profiles?select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
  const rows = (await r.json().catch(() => [])) || [];
  return rows[0]?.id || null;
}

/** 그 회원의 구독 전부 (요금제를 다시 계산할 때 씁니다) */
export async function listSubscriptions(userId) {
  const r = await rest(`subscriptions?select=plan,status&user_id=eq.${userId}`);
  return (await r.json().catch(() => [])) || [];
}

/** 요금제 설정 — service_role 이라 lock_profile_plan 트리거를 통과합니다 */
export async function setPlan(userId, plan) {
  const r = await rest(`profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: { plan },
  });
  if (!r.ok) throw new Error(`요금제 반영 실패 ${r.status}: ${await r.text()}`);
}

/** 사용량 1건 기록. 성공 여부를 돌려줍니다(실패하면 클라이언트가 대신 기록). */
export async function recordUsage(userId, kind) {
  try {
    const r = await rest("usage_events", { method: "POST", body: { user_id: userId, kind: kind || "play" } });
    return r.ok;
  } catch {
    return false;
  }
}
