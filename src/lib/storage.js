// 브라우저 저장소 접근을 한 곳으로 모읍니다.
// 사파리 프라이빗 모드처럼 localStorage 가 막힌 환경에서도 앱이 죽지 않도록 전부 감쌉니다.

export const KEYS = {
  pendingPlan: "mint_pending_plan", // 로그인 후 적용할 요금제
  pendingMode: "mint_pending_mode", // OAuth 리다이렉트 뒤 되살릴 문서 종류
  guestUsed: "mint_guest_used",     // 비로그인 체험 사용 횟수
  guestDoc: "mint_guest_doc",       // 체험으로 만든 결과 (로그인하면 계정으로 이관)
  lastView: "mint_last_view",       // 새로고침해도 보던 화면으로 돌아오기
  lastMode: "mint_last_mode",       // 새로고침해도 보던 문서 종류로 돌아오기
  pendingDocs: "mint_pending_docs", // 계정에 넣지 못한 문서 (다음 접속 때 다시 저장)
};

/**
 * 새로고침 뒤 되살릴 화면.
 * 작업 화면(app)만 되살립니다 — 로그인·약관 화면을 되살리면
 * 새로고침했더니 로그인 폼에 갇히는, 더 답답한 상황이 됩니다.
 */
export const restoreView = (saved) => (saved === "app" ? "app" : "landing");

/** 되살릴 값으로 남겨 둘 화면인가 (auth·legal 은 지나가는 화면이라 남기지 않습니다) */
export const isRestorableView = (view) => view === "app" || view === "landing";

export const storage = {
  get(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* 저장 못 해도 흐름은 이어감 */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* 무시 */ }
  },
  /** JSON 을 넣고 빼는 편의 래퍼 — 깨진 값이 들어 있어도 null 로 돌려줍니다. */
  getJSON(key) {
    const raw = storage.get(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  setJSON(key, value) {
    storage.set(key, JSON.stringify(value));
  },
  getNumber(key, fallback = 0) {
    const n = Number(storage.get(key, ""));
    return Number.isFinite(n) ? n : fallback;
  },
};
