// 화면 레이아웃 검증 설정.
//
// 단위 테스트(npm test)로는 "글자가 칸을 넘는다", "버튼이 옆에 붙는다" 같은
// 배치 문제를 잡을 수 없습니다. 실제 브라우저에서 치수를 재는 자리입니다.
//
//   npm run test:visual            검증만
//   npm run test:visual -- --ui    브라우저를 띄워 눈으로 보며
//
// 검수용 페이지(gallery.html)를 대상으로 하므로 로그인·AI 호출이 필요 없습니다.

import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;

export default defineConfig({
  testDir: "tests/visual",
  fullyParallel: true,
  reporter: process.env.CI ? "line" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
  },
  projects: [
    // 보육교사는 대부분 휴대폰으로 씁니다. 좁은 화면이 기본 기준입니다.
    // ⚠ iPhone 프로필의 기본 엔진은 WebKit 이지만, 여기서 보는 것은 flex·inline 배치라
    //    엔진 차이가 없습니다. 브라우저를 하나만 받아 두려고 Chromium 으로 고정합니다.
    //    (사파리 고유의 렌더링까지 보려면 `npx playwright install webkit` 후 이 줄을 지우세요)
    {
      name: "모바일",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", browserName: "chromium" },
    },
    {
      name: "데스크톱",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    // VITE_NO_OPEN — 검증 중에 사용자 브라우저가 멋대로 열리지 않게 합니다.
    command: "VITE_NO_OPEN=1 npm run dev",
    url: `http://localhost:${PORT}/gallery.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
