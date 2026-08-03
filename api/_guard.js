// 생성 요청 가드 — 남용 방어 + 요금제 사용량 검증.
// 개발 서버(vite.config.js)와 프로덕션(api/gemini.js)이 같은 로직을 쓰도록 분리했습니다.
// 파일명이 _ 로 시작하므로 Vercel 이 이 파일을 라우트로 노출하지 않습니다.
//
// ── 두 겹으로 막습니다 ────────────────────────────────────────────
//  1) 게스트(비로그인 체험): IP 기준 레이트리밋. 브라우저 localStorage 만으로는
//     지우면 그만이라 서버에서도 한 번 더 셉니다.
//  2) 로그인 사용자: 요금제 월 한도(usage_events 원장 기준). 클라이언트에서도
//     막지만 그건 UX 용이고, 실제 차단은 여기서 이뤄져야 우회할 수 없습니다.
//
// ⚠ SUPABASE_SERVICE_ROLE_KEY 가 설정되지 않으면 2)를 서버에서 검증할 수 없어
//    클라이언트 게이팅만 동작합니다(사용량 기록도 클라이언트가 대신 합니다).
//    운영 배포에서는 반드시 설정하세요. — README 참고

export const PLAN_QUOTA = { free: 3, basic: 500, pro: 2000 };

// 게스트 IP 레이트리밋 (체험은 1회지만, 재방문/공용 IP 를 감안해 넉넉히 잡고 봇만 걸러냄)
const GUEST_PER_HOUR = 5;
const GUEST_PER_DAY = 20;

// ⚠ 서버리스는 인스턴스가 여러 개라 이 카운터는 인스턴스별로만 정확합니다.
//    무료 체험 남용의 대부분(단일 IP 연타)을 막는 용도이며, 정밀 과금 수단이 아닙니다.
const hits = new Map(); // ip -> number[] (요청 시각 ms)

function tooManyGuest(ip) {
  const now = Date.now();
  const HOUR = 3600e3, DAY = 24 * HOUR;
  const list = (hits.get(ip) || []).filter((t) => now - t < DAY);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // 메모리 폭주 방지
  if (list.filter((t) => now - t < HOUR).length > GUEST_PER_HOUR) return "시간당";
  if (list.length > GUEST_PER_DAY) return "하루";
  return null;
}

export function clientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"] || req.headers?.get?.("x-forwarded-for");
  return String(fwd || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

const env = (k) => process.env[k] || "";
const SUPA_URL = () => env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
const SERVICE_KEY = () => env("SUPABASE_SERVICE_ROLE_KEY");

// 이번 달 1일 00:00 (UTC 기준 — 사용량 리셋 시점)
function monthStartISO() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

async function rest(path, { method = "GET", headers = {}, body } = {}) {
  const key = SERVICE_KEY();
  return fetch(`${SUPA_URL()}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// 액세스 토큰 → 사용자 id (Supabase Auth 에 직접 확인하므로 위조 불가)
async function userFromToken(token) {
  try {
    const r = await fetch(`${SUPA_URL()}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY(), Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id || null;
  } catch {
    return null;
  }
}

async function monthlyUsage(userId) {
  const r = await rest(
    `usage_events?select=id&user_id=eq.${userId}&created_at=gte.${monthStartISO()}`,
    { headers: { Prefer: "count=exact", Range: "0-0" } }
  );
  // Content-Range: 0-0/123 → 123
  const total = Number(String(r.headers.get("content-range") || "").split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}

async function planOf(userId) {
  const [pr, ad] = await Promise.all([
    rest(`profiles?select=plan&id=eq.${userId}`),
    rest(`admins?select=id&id=eq.${userId}`),
  ]);
  const isAdmin = ((await ad.json().catch(() => [])) || []).length > 0;
  const plan = ((await pr.json().catch(() => [])) || [])[0]?.plan || "free";
  return { plan, isAdmin };
}

async function recordUsage(userId, kind) {
  try {
    await rest("usage_events", { method: "POST", body: { user_id: userId, kind: kind || "play" } });
    return true;
  } catch {
    return false;
  }
}

/**
 * 요청을 통과시킬지 판단합니다.
 * @returns {{ok:true, counted:boolean} | {ok:false, status:number, message:string}}
 */
export async function guardRequest({ token, ip, kind }) {
  // ── 게스트 ─────────────────────────────────────────────
  if (!token) {
    const over = tooManyGuest(ip);
    if (over) {
      return {
        ok: false,
        status: 429,
        message: `무료 체험은 ${over} 이용 횟수가 정해져 있어요. 회원가입하시면 바로 이어서 쓰실 수 있어요. 🌿`,
      };
    }
    return { ok: true, counted: false };
  }

  // ── 로그인 사용자 ──────────────────────────────────────
  // 서비스 키가 없으면 서버 검증 불가 → 클라이언트 게이팅에 맡기고 통과시킵니다.
  if (!SUPA_URL() || !SERVICE_KEY()) return { ok: true, counted: false };

  const userId = await userFromToken(token);
  if (!userId) return { ok: false, status: 401, message: "로그인이 만료됐어요. 다시 로그인해 주세요." };

  const { plan, isAdmin } = await planOf(userId);
  if (!isAdmin) {
    const used = await monthlyUsage(userId);
    const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.free;
    if (used >= quota) {
      return {
        ok: false,
        status: 429,
        message: `이번 달 생성 횟수(${quota}회)를 모두 사용했어요. 요금제를 올리면 바로 이어서 쓰실 수 있어요.`,
      };
    }
  }

  const counted = await recordUsage(userId, kind);
  return { ok: true, counted };
}
