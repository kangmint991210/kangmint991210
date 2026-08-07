// Vercel 서버리스 함수 — GET /api/holidays?year=2026 의 HTTP 어댑터.
// 실제 처리는 _holidays.js 가 하고, 여기서는 요청/응답 형식만 맞춥니다.
// (개발 서버는 vite.config.js 가 같은 모듈을 씁니다)
//
// 환경변수가 필요 없습니다 — 인증키 없이 쓸 수 있는 출처를 골랐습니다.

import { fetchHolidays, validYear } from "./_holidays.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "GET 요청만 지원합니다." });
    return;
  }

  const year = validYear(req.query?.year);
  if (!year) {
    res.status(400).json({ error: "year 는 2021~2031 사이의 값이어야 합니다." });
    return;
  }

  const days = await fetchHolidays(year);
  if (!days) {
    // 받아오지 못했을 때 빈 목록을 주면 화면이 그걸 정답으로 캐시해 버립니다.
    // 실패는 실패라고 알려서, 화면이 내장 표로 되돌아가게 합니다.
    res.status(502).json({ error: "공휴일 달력을 불러오지 못했습니다." });
    return;
  }

  // 공휴일은 거의 바뀌지 않습니다 — 엣지에 하루 두고, 그 뒤 일주일은
  // 낡은 값을 먼저 보여 주면서 뒤에서 새로 받아 옵니다.
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).json({ year, days });
}
