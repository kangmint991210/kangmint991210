// 소셜 로그인 실패를 사용자에게 보여 주기 위한 도구.
//
// 구글·카카오 로그인이 실패하면 공급자가 우리 주소로 되돌려 보내면서
// URL 에 error / error_description 을 붙입니다. 이걸 읽지 않으면 화면에는
// 아무 일도 없었던 것처럼 보이고, 사용자는 "가입이 안 되네"만 겪게 됩니다.

/** Supabase/OAuth 오류 코드를 사람이 읽을 말로 */
function translate(code, description) {
  const d = String(description || "").toLowerCase();
  if (d.includes("provider is not enabled") || code === "provider_disabled") {
    return "이 소셜 로그인이 아직 준비되지 않았어요. 잠시 후 다시 시도하거나 이메일로 가입해 주세요.";
  }
  if (d.includes("redirect") || code === "bad_oauth_state" || code === "bad_oauth_callback") {
    return "로그인 주소 설정이 맞지 않아 돌아오지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (code === "access_denied" || d.includes("denied") || d.includes("cancel")) {
    return "로그인을 취소하셨어요. 다시 시도해 주세요.";
  }
  if (d.includes("email")) {
    return "이 계정에서 이메일을 받아오지 못했어요. 카카오라면 이메일 제공에 동의하거나, 이메일로 가입해 주세요.";
  }
  return description || "소셜 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

/**
 * ⚠ 이 모듈은 "불러오는 즉시" 주소창을 읽습니다.
 *    Supabase 클라이언트가 detectSessionInUrl 로 URL 해시를 먼저 소비해 버리기 때문에,
 *    React 가 렌더될 때쯤이면 오류 정보가 이미 사라져 있습니다.
 *    그래서 src/main.jsx 의 "첫 번째" import 로 두어 가장 먼저 붙잡습니다.
 */
function capture() {
  if (typeof window === "undefined") return null;
  const { hash, search } = window.location;
  // Supabase 는 보통 해시(#error=...)로, 일부 공급자는 쿼리(?error=...)로 붙입니다.
  const params = new URLSearchParams(
    (hash?.startsWith("#") ? hash.slice(1) : hash) || (search?.startsWith("?") ? search.slice(1) : search) || ""
  );
  const code = params.get("error") || params.get("error_code");
  if (!code) return null;

  const message = translate(code, params.get("error_description")?.replace(/\+/g, " "));
  try {
    window.history.replaceState({}, "", window.location.pathname);
  } catch { /* 주소 정리에 실패해도 메시지는 보여 줍니다 */ }
  console.warn("[민트쌤] 소셜 로그인 실패", code, params.get("error_description"));
  return message;
}

const captured = capture();

/** 소셜 로그인 실패 메시지 (없으면 null). 여러 번 불러도 같은 값을 돌려줍니다. */
export const readAuthRedirectError = () => captured;
