import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Vite 개발 서버가 /api/gemini 요청을 가로채서 서버 쪽에서 API 키를 붙여
// generativelanguage.googleapis.com(Gemini) 으로 전달합니다. 키는 브라우저 번들에 노출되지 않습니다.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const key = env.GEMINI_API_KEY || "";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        "/api/gemini": {
          target: "https://generativelanguage.googleapis.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (key) proxyReq.setHeader("x-goog-api-key", key);
            });
          },
        },
      },
    },
  };
});
