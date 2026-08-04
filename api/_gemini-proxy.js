// Gemini 호출의 "내용"을 담당합니다. HTTP 프레임워크에 의존하지 않아
// Vercel 서버리스(api/gemini.js)와 개발 서버(vite.config.js)가 그대로 함께 씁니다.
//
// 예전에는 두 파일에 같은 로직이 복사돼 있어 한쪽만 고치면 개발과 배포가 달라졌습니다.

import { guardRequest } from "./_guard.js";

const UPSTREAM = "https://generativelanguage.googleapis.com";

const fail = (status, message, extra = {}) => ({
  status,
  contentType: "application/json",
  headers: {},
  body: JSON.stringify({ error: { message, ...extra } }),
});

/**
 * @param {object} p
 * @param {string|object} p.rawBody 요청 본문 (문자열 또는 파싱된 객체)
 * @param {string} p.apiKey  GEMINI_API_KEY
 * @param {string} p.token   Supabase 액세스 토큰 (없으면 게스트)
 * @param {string} p.ip      레이트리밋용 클라이언트 IP
 * @returns {Promise<{status:number, contentType:string, headers:object, body:string}>}
 */
export async function handleGeminiRequest({ rawBody, apiKey, token, ip }) {
  if (!apiKey) {
    return fail(500, "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. (Vercel → Settings → Environment Variables)");
  }

  let payload;
  try {
    payload = typeof rawBody === "string" ? JSON.parse(rawBody || "{}") : (rawBody || {});
  } catch {
    return fail(400, "요청 본문을 읽을 수 없습니다.");
  }

  // model 은 URL 이 아니라 body 로 받습니다.
  // 콜론(:generateContent)이 경로에 있으면 Vercel 라우팅이 실패하기 때문입니다.
  const { model, kind, ...rest } = payload;
  if (!model) return fail(400, "요청 본문에 model 필드가 필요합니다.");

  const gate = await guardRequest({ token, ip, kind });
  if (!gate.ok) return fail(gate.status, gate.message, { code: "quota" });

  try {
    const upstream = await fetch(`${UPSTREAM}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(rest),
    });
    return {
      status: upstream.status,
      contentType: upstream.headers.get("content-type") || "application/json",
      // 서버가 사용량을 적었으면 클라이언트는 중복 기록하지 않습니다.
      headers: { "X-Usage-Counted": gate.counted ? "1" : "0" },
      body: await upstream.text(),
    };
  } catch (e) {
    return fail(502, "Gemini 프록시 요청 실패: " + (e?.message || String(e)));
  }
}

/** 요청 헤더에서 Supabase 액세스 토큰만 뽑아냅니다. */
export const bearerToken = (req) =>
  String(req.headers?.authorization || req.headers?.get?.("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
