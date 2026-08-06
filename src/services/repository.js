// Supabase 접근을 한 곳에 모읍니다.
// 화면 컴포넌트가 테이블 이름이나 컬럼을 직접 알 필요가 없도록 하고,
// 저장 실패가 화면 흐름을 막지 않도록 여기서 삼킵니다(원인은 콘솔에 남김).

import { supabase } from "../supabaseClient.js";
import { normalizePlan } from "../domain/plans.js";

const warn = (what, e) => console.warn(`[민트쌤] ${what} 실패`, e?.message || e);

/** Supabase user → 앱에서 쓰는 형태.
 *  구글/카카오는 이름·사진을 user_metadata 에, 가입 경로를 app_metadata.provider 에 담아 줍니다.
 *  카카오는 이메일 제공에 동의하지 않으면 email 이 비어 올 수 있어 모두 널 안전하게 처리합니다. */
export const mapUser = (u) => ({
  id: u.id,
  email: u.email || u.user_metadata?.email || null,
  name:
    u.user_metadata?.name ||
    u.user_metadata?.full_name ||
    u.user_metadata?.user_name ||
    u.user_metadata?.preferred_username ||
    (u.email ? u.email.split("@")[0] : "선생님"),
  provider: u.app_metadata?.provider || "email",
  avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
});

/* ---------------- 회원 프로필 ---------------- */

export const profiles = {
  /** 저장된 요금제 (없거나 옛 이름이면 정리해서 돌려줍니다) */
  async getPlan(userId) {
    if (!supabase) return null;
    const { data } = await supabase.from("profiles").select("plan").eq("id", userId).maybeSingle();
    return normalizePlan(data?.plan);
  },

  /** 마지막 접속·요금제·SNS 정보 갱신.
   *  DB 트리거가 행을 못 만든 경우(트리거 생성 전 가입자)도 여기서 보강됩니다.
   *  회원 기록이 통째로 사라지는 자리라, 한 번 실패하면 재시도합니다. */
  async upsert(user, plan) {
    if (!supabase || !user) return;
    const row = {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider,
      avatar_url: user.avatar,
      plan,
      last_seen_at: new Date().toISOString(),
    };
    let { error } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
    if (error) {
      // 로그인 직후에는 토큰 갱신과 겹쳐 일시적으로 실패할 수 있습니다.
      await new Promise((r) => setTimeout(r, 500));
      ({ error } = await supabase.from("profiles").upsert(row, { onConflict: "id" }));
    }
    if (error) {
      warn(`profiles 저장 (${user.provider} 가입자 ${user.id}) — ` +
           "schema.sql 을 실행했는지, plan 제약이 free/basic/pro 인지 확인하세요", error);
    }
  },

  /** 요금제만 갱신 */
  async setPlan(userId, plan) {
    if (!supabase || !userId) return;
    try {
      await supabase.from("profiles").upsert(
        { id: userId, plan, last_seen_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    } catch (e) { warn("요금제 저장", e); }
  },
};

/** 관리자 명단. 테이블이 없거나 조회에 실패하면 조용히 일반 회원으로 취급합니다. */
export async function isAdmin(userId) {
  if (!supabase) return false;
  const { data } = await supabase.from("admins").select("id").eq("id", userId).maybeSingle();
  return Boolean(data);
}

/* ---------------- 생성 문서 ---------------- */

export const documents = {
  /** 사용자의 모든 문서를 만든 순서대로 */
  async listAll(userId) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("documents").select("*").eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) { warn("문서 불러오기", error); return []; }
    return data || [];
  },

  /**
   * 새 문서 저장 → 만들어진 행의 id (이후 수정/삭제에 필요)
   *
   * ⚠ supabase-js 는 실패해도 예외를 던지지 않고 `{ error }` 를 돌려줍니다.
   *    예전에는 `{ data }` 만 꺼내 써서 실패가 통째로 사라졌고,
   *    "저장된 줄 알았는데 새로고침하면 없어지는" 증상의 원인을 찾을 수 없었습니다.
   *    문서 종류를 새로 추가하고 schema.sql 을 실행하지 않으면 여기서 걸립니다.
   */
  async create({ userId, kind, userText, form, payload }) {
    if (!supabase || !userId) return null;
    const row = { user_id: userId, kind, user_text: userText, form, payload };

    // 생성 직후에는 토큰 갱신과 겹쳐 한 번 실패할 수 있어(profiles.upsert 와 같은 이유)
    // 잠깐 쉬고 한 번 더 시도합니다. 만든 문서를 잃는 것보다 몇백 ms 기다리는 편이 낫습니다.
    let { data, error } = await supabase.from("documents").insert(row).select("id").single();
    if (error) {
      await new Promise((r) => setTimeout(r, 600));
      ({ data, error } = await supabase.from("documents").insert(row).select("id").single());
    }
    if (error) {
      warn(
        `문서 저장 (kind=${kind}) — supabase/schema.sql 을 최신 내용으로 실행했는지, ` +
        `documents.kind 허용 목록에 '${kind}' 가 들어 있는지 확인하세요`,
        error
      );
      return null;
    }
    return data?.id || null;
  },

  /**
   * 결과를 직접 고친 내용 반영.
   * ⚠ 다른 함수들과 달리 실패를 삼키지 않고 false 를 돌려줍니다 —
   *   사용자가 "저장" 을 눌러 놓고 저장되지 않은 줄 모르면 고친 내용을 잃기 때문입니다.
   */
  async updatePayload(docId, payload) {
    if (!supabase || !docId) return false;
    const { error } = await supabase.from("documents").update({ payload }).eq("id", docId);
    if (error) { warn("문서 수정", error); return false; }
    return true;
  },

  /** 즐겨찾기 표시/해제 → 성공 여부 (실패하면 화면을 되돌립니다) */
  async setFavorite(docId, value) {
    if (!supabase || !docId) return false;
    const { error } = await supabase.from("documents").update({ is_favorite: value }).eq("id", docId);
    if (error) {
      warn("즐겨찾기 저장 — schema.sql 의 is_favorite 컬럼을 추가했는지 확인하세요", error);
      return false;
    }
    return true;
  },

  async remove(docId) {
    if (!supabase || !docId) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) warn("문서 삭제", error);
  },

  async removeMany(docIds) {
    if (!supabase || !docIds?.length) return;
    const { error } = await supabase.from("documents").delete().in("id", docIds);
    if (error) warn("문서 일괄 삭제", error);
  },
};

/* ---------------- 사용량 ---------------- */
// documents 를 세지 않고 별도 원장을 쓰는 이유: 문서를 지우면 사용량도 줄어
// 한도를 무한히 우회할 수 있기 때문입니다. usage_events 에는 삭제 정책이 없습니다.

export const usage = {
  async countThisMonth(userId) {
    if (!supabase || !userId) return 0;
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { count } = await supabase
      .from("usage_events").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", from);
    return count || 0;
  },

  /** 서버(service_role)가 기록하지 못한 경우에만 클라이언트가 대신 남깁니다. */
  async record(userId, kind) {
    if (!supabase || !userId) return;
    try { await supabase.from("usage_events").insert({ user_id: userId, kind }); }
    catch (e) { warn("사용량 기록", e); }
  },
};
