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
  @media (prefers-reduced-motion: reduce) { .spin,.dot { animation: none; } button { transition: none; } }
`;

export const DISPLAY = `"Jua","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;
export const BODY = `"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif`;
