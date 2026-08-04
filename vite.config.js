import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handleGeminiRequest, bearerToken } from "./api/_gemini-proxy.js";
import { clientIp } from "./api/_guard.js";

// 개발 서버에서 POST /api/gemini 를 처리하는 미들웨어.
// 프로덕션(api/gemini.js)과 "같은 모듈"을 호출하므로 개발과 배포의 동작이 어긋나지 않습니다.
function geminiDevProxy(apiKey) {
  return {
    name: "gemini-dev-proxy",
    configureServer(server) {
      server.middlewares.use("/api/gemini", (req, res) => {
        const send = ({ status, contentType, headers = {}, body }) => {
          res.statusCode = status;
          res.setHeader("Content-Type", contentType);
          for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
          res.end(body);
        };
        if (req.method !== "POST") {
          return send({ status: 405, contentType: "application/json",
            body: JSON.stringify({ error: { message: "POST 요청만 지원합니다." } }) });
        }

        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", async () => {
          send(await handleGeminiRequest({
            rawBody: raw,
            apiKey,
            token: bearerToken(req),
            ip: clientIp(req),
          }));
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // .env 의 값을 서버리스와 같은 이름으로 넘겨 줍니다(개발 미들웨어는 process.env 를 못 봄).
  for (const k of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL"]) {
    if (env[k] && !process.env[k]) process.env[k] = env[k];
  }

  return {
    plugins: [react(), geminiDevProxy(env.GEMINI_API_KEY || "")],
    server: { port: 5173, open: true },
  };
});
