// Vercel 서버리스 함수 — 프로덕션에서 /api/gemini/* 요청을 받아
// 서버 쪽에서 GEMINI_API_KEY 를 붙여 Google Gemini API 로 전달합니다.
// (vite.config.js 의 프록시는 개발 서버 전용이라 배포본에는 없으므로 이 함수가 그 역할을 대신함)
//
// 프론트엔드가 호출하는 경로:
//   POST /api/gemini/v1beta/models/<model>:generateContent
// 위 경로의 "/api/gemini" 뒤 부분을 그대로 generativelanguage.googleapis.com 으로 넘깁니다.
//
// Vercel 대시보드 → Settings → Environment Variables 에 GEMINI_API_KEY 를 설정해야 동작합니다.

const UPSTREAM = "https://generativelanguage.googleapis.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "POST 요청만 지원합니다." } });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({
      error: { message: "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. (Vercel → Settings → Environment Variables)" },
    });
    return;
  }

  // /api/gemini 뒤의 경로 조각을 복원 (예: v1beta/models/gemini-3.1-flash-lite:generateContent)
  const seg = req.query?.path;
  let rest = Array.isArray(seg) ? seg.join("/") : (seg || "");
  if (!rest) {
    // 폴백: req.url 에서 직접 파싱
    rest = String(req.url || "").replace(/^\/api\/gemini\/?/, "").split("?")[0];
  }
  const target = `${UPSTREAM}/${rest}`;

  try {
    const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: "Gemini 프록시 요청 실패: " + (e?.message || String(e)) } });
  }
}
