import { createClient } from "@supabase/supabase-js";

// 값은 .env 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 에서 주입됩니다.
// anon 키는 프론트엔드에 노출돼도 안전하며, 실제 데이터 보호는 Supabase RLS 정책이 담당합니다.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * anon 키(JWT) 안에는 그 키가 발급된 프로젝트 ref 가 들어 있습니다.
 * 서명 검증 없이 payload 만 읽어, URL 의 프로젝트와 같은지 확인합니다.
 *
 * ⚠ 왜 이런 검사를 두는가 —
 *   프로젝트를 두 개 이상 갖고 있으면 URL 은 A, 키는 B 로 섞이기 아주 쉽습니다.
 *   그렇게 되면 모든 DB 요청이 401 "Invalid API key" 로 죽는데, 화면에는
 *   "저장이 안 된다" 정도로만 나타나 원인을 찾는 데 한참 걸립니다.
 *   짝이 맞더라도 "지금 어느 프로젝트에 붙어 있는지"를 콘솔에 남겨 두면,
 *   배포본이 엉뚱한 DB 를 보고 있는 상황을 바로 알아챌 수 있습니다.
 */
function checkProjectMatch(u, key) {
  const fromUrl = String(u || "").match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  let fromKey = null;
  try {
    const payload = JSON.parse(atob(String(key).split(".")[1]));
    fromKey = payload?.ref || null;
  } catch { /* 옛 형식이거나 JWT 가 아니면 확인을 건너뜁니다 */ }

  if (!fromUrl || !fromKey) return;
  if (fromUrl === fromKey) {
    console.info(`[민트쌤] Supabase 프로젝트: ${fromUrl}`);
    return;
  }
  console.error(
    `[민트쌤] ⚠ Supabase 설정이 어긋났습니다 — URL 은 '${fromUrl}' 인데 anon 키는 '${fromKey}' 의 것입니다.\n` +
    "         모든 DB 요청이 401 Invalid API key 로 실패합니다(로그인·문서 저장 포함).\n" +
    "         대시보드에서 같은 프로젝트의 URL 과 anon 키를 함께 복사해 주세요.\n" +
    "         로컬은 .env, 배포본은 Vercel → Settings → Environment Variables 입니다."
  );
}

if (url && anonKey) checkProjectMatch(url, anonKey);

// 키가 없으면 null 을 내보내 앱이 죽지 않고 "설정 필요" 안내를 띄우도록 합니다.
export const supabase =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const supabaseReady = Boolean(supabase);
