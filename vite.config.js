import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// 개발 서버에서 POST /api/gemini 를 처리하는 미들웨어.
// 프로덕션의 api/gemini.js(Vercel 서버리스 함수)와 동일하게 동작합니다.
// (요청 본문의 model 로 Google URL 을 조립하고 GEMINI_API_KEY 를 붙여 전달. 키는 브라우저에 노출되지 않음)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const key = env.GEMINI_API_KEY || "";
  const UPSTREAM = "https://generativelanguage.googleapis.com";

  const geminiDevProxy = {
    name: "gemini-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/gemini", (req, res) => {
        const done = (status, body) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.end(body);
        };
        if (req.method !== "POST") return done(405, '{"error":{"message":"POST 요청만 지원합니다."}}');
        if (!key) return done(500, '{"error":{"message":"GEMINI_API_KEY 가 .env 에 설정되지 않았습니다."}}');

        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          try {
            const { model, ...rest } = JSON.parse(raw || "{}");
            if (!model) return done(400, '{"error":{"message":"요청 본문에 model 필드가 필요합니다."}}');
            const upstream = await fetch(`${UPSTREAM}/v1beta/models/${model}:generateContent`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-goog-api-key": key },
              body: JSON.stringify(rest),
            });
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
            res.end(text);
          } catch (e) {
            done(502, JSON.stringify({ error: { message: "Gemini 프록시 요청 실패: " + (e?.message || String(e)) } }));
          }
        });
      });
    },
  };

  return {
    plugins: [react(), geminiDevProxy],
    server: { port: 5173, open: true },
  };
});
