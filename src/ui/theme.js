// 디자인 토큰과 전역 스타일.
// 색·폰트를 바꾸려면 여기만 고치면 전체에 반영됩니다.

export const INK = "#2E4A42";
export const PAPER = "#EAF7F1";
export const MINT = "#45C4A8";
export const MINT_STRONG = "#2FA88C";
export const SH = "#D6EFE6";

// 웹폰트는 index.html <head> 에서 미리 불러옵니다.
// (여기에 @import 로 두면 이 <style> 이 붙는 컴포넌트마다 중복 요청되고 첫 화면이 늦게 뜹니다)
export const css = `
  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
  /* 한글은 어절(공백) 단위로만 줄을 바꿉니다. keep-all 이 없으면 "있어요" 가 "있어 / 요" 로 잘립니다.
     overflow-wrap:break-word 는 "끊을 곳이 아예 없을 때"만 개입하므로(한 어절이 통째로
     컨테이너보다 넓은 경우), 한글 어절은 그대로 두면서 긴 영문·URL 의 넘침만 막아 줍니다. */
  html, body, input, textarea, button, select { word-break: keep-all; overflow-wrap: break-word; }
  ::placeholder { color: #A9C3B9; }
  button { font-family: inherit; cursor: pointer; transition: transform .12s ease; }
  button:active { transform: scale(0.96); }
  button:disabled { opacity: .6; cursor: default; }
  input, textarea { font-family: inherit; }
  textarea { resize: vertical; }
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="week"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator,
  input[type="month"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.55; }
  input[type="date"]::-webkit-datetime-edit,
  input[type="week"]::-webkit-datetime-edit,
  input[type="time"]::-webkit-datetime-edit,
  input[type="month"]::-webkit-datetime-edit { color: #2E4A42; }
  .feat-card { transition: transform .12s ease, box-shadow .12s ease; }
  .feat-card:hover { transform: translateY(-2px); box-shadow: 0 5px 0 ${MINT}; }
  .feat-card:active { transform: scale(0.96); }
  /* 결과 안에서 고칠 수 있는 문장 — 눌러야 한다는 걸 은근히 알려줌 */
  .editable { cursor: text; border-radius: 8px; transition: background .12s ease; }
  .editable:hover { background: #F1F9F5; box-shadow: 0 0 0 4px #F1F9F5; }
  .editable:hover .pen { opacity: .55; }
  .dot { animation: blink 1.2s infinite; } .d2 { animation-delay: .2s; } .d3 { animation-delay: .4s; }
  @keyframes blink { 0%,100% { opacity: .2; } 50% { opacity: 1; } }

  /* ── 랜딩 히어로 ─────────────────────────────────────────
     첫인상을 살리는 자리. 제목은 한 번만 떨어지고 멈추고(계속 움직이면 읽기 힘듦),
     별의 반짝임만 은은하게 이어집니다. */

  /* 제목이 한 글자씩 똑똑 떨어짐 — 마지막에 살짝 튀어 "떨어진" 느낌을 냅니다 */
  .drop-char { display: inline-block; opacity: 0; animation: drop-in .5s cubic-bezier(.2,1.5,.4,1) both; }
  @keyframes drop-in {
    from { opacity: 0; transform: translateY(-16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* 마스코트 별의 반짝임 */
  .twinkle-star { display: inline-block; animation: twinkle 3.2s ease-in-out infinite; }
  @keyframes twinkle {
    0%, 100% { transform: scale(1) rotate(0deg); filter: drop-shadow(0 0 0 rgba(127,216,196,0)); }
    50%      { transform: scale(1.045) rotate(-1.5deg); filter: drop-shadow(0 0 12px rgba(127,216,196,.75)); }
  }
  .twinkle-spark { animation: spark 2.4s ease-in-out infinite; }
  .twinkle-spark.s2 { animation-delay: .8s; }
  .twinkle-spark.s3 { animation-delay: 1.6s; }
  @keyframes spark {
    0%, 100% { opacity: 0; transform: scale(.6); }
    45%      { opacity: 1; transform: scale(1); }
    70%      { opacity: 0; transform: scale(.7); }
  }

  /* 메모 → 문서 변환 */
  .demo-caret { animation: caret 1s step-end infinite; }
  @keyframes caret { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  .demo-doc { opacity: 0; transform: translateY(12px) scale(.985);
              transition: opacity .45s ease, transform .45s cubic-bezier(.2,.9,.3,1); }
  .demo-doc.on { opacity: 1; transform: none; }

  /* 문서 카드가 화면에 들어올 때 차례로 나타남 */
  .reveal { opacity: 0; transform: translateY(12px); transition: opacity .5s ease, transform .5s ease; }
  .reveal.on { opacity: 1; transform: none; }

  @media (prefers-reduced-motion: reduce) {
    .spin, .dot, .twinkle-star, .twinkle-spark { animation: none; }
    .drop-char { animation: none; opacity: 1; }
    .twinkle-spark { opacity: .8; }
    .demo-caret { animation: none; }
    .demo-doc, .reveal { opacity: 1; transform: none; transition: none; }
    button { transition: none; }
  }
`;

export const DISPLAY = `"Jua","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;
export const BODY = `"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif`;
