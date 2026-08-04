// 브라우저 저장소 접근을 한 곳으로 모읍니다.
// 사파리 프라이빗 모드처럼 localStorage 가 막힌 환경에서도 앱이 죽지 않도록 전부 감쌉니다.

export const KEYS = {
  pendingPlan: "mint_pending_plan", // 로그인 후 적용할 요금제
  pendingMode: "mint_pending_mode", // OAuth 리다이렉트 뒤 되살릴 문서 종류
  guestUsed: "mint_guest_used",     // 비로그인 체험 사용 횟수
  guestDoc: "mint_guest_doc",       // 체험으로 만든 결과 (로그인하면 계정으로 이관)
};

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
