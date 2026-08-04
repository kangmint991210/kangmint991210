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

/** 사용량 1건 기록. 성공 여부를 돌려줍니다(실패하면 클라이언트가 대신 기록). */
export async function recordUsage(userId, kind) {
  try {
    const r = await rest("usage_events", { method: "POST", body: { user_id: userId, kind: kind || "play" } });
    return r.ok;
  } catch {
    return false;
  }
}
