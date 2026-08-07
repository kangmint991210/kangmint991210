// 화면 스타일 모음.
// 값(색·간격)은 theme.js 의 토큰을 쓰고, 여기서는 "어디에 어떻게 쓸지"만 정합니다.

import { INK, PAPER, MINT, MINT_STRONG, SH, DISPLAY, BODY } from "./theme.js";

export const styles = {
  wrap: {
    fontFamily: BODY, color: INK, background: PAPER, minHeight: "100dvh",
    display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto",
    backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px",
  },
  header: { position: "relative", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, rowGap: 10, flexWrap: "wrap", padding: "14px 18px 8px" },
  brand: { display: "flex", alignItems: "center", gap: 11 },
  brandBtn: { display: "flex", alignItems: "center", gap: 11, background: "transparent", border: "none", padding: 0, cursor: "pointer" },
  logoMark: { width: 52, height: 52, borderRadius: 18, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 4px 0 #CDEBDF" },
  title: { fontSize: 23, fontFamily: DISPLAY, color: "#2E9E86", lineHeight: 1 },
  subtitle: { fontSize: 12.5, color: "#7A9A90", marginTop: 3, whiteSpace: "nowrap" },
  resetBtn: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#7A9A90", background: "#fff", border: "none", borderRadius: 999, padding: "8px 13px", boxShadow: `0 3px 0 ${SH}` },

  modeBar: { position: "relative", padding: "4px 16px 10px" },
  backdrop: { position: "fixed", inset: 0, background: "transparent", border: "none", zIndex: 20, padding: 0 },
  dropdown: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 15, fontWeight: 800, color: INK, background: "#fff", border: "none", borderRadius: 16, padding: "13px 16px", boxShadow: `0 3px 0 ${SH}` },
  dropLabel: { display: "inline-flex", alignItems: "center", gap: 8 },
  menu: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "#fff", borderRadius: 16, boxShadow: "0 12px 34px rgba(46,74,66,0.20)", padding: 6, display: "flex", flexDirection: "column", gap: 2, maxHeight: 340, overflowY: "auto" },
  menuItem: { display: "flex", alignItems: "center", gap: 9, width: "100%", fontSize: 14, fontWeight: 700, color: "#5A6B64", background: "transparent", border: "none", borderRadius: 12, padding: "11px 12px", textAlign: "left" },
  menuItemOn: { background: "#E5F7F0", color: "#1F6B5A" },
  lockTag: { marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#B08900", background: "#FFF3D1", padding: "3px 8px", borderRadius: 999 },

  panel: { padding: "8px 16px 14px" },
  row: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  rowSplit: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 },
  miniRow: { display: "flex", alignItems: "flex-start", gap: 10, flex: "1 1 220px" },
  rowLabel: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: "#7A9A90", minWidth: 50, paddingTop: 7, whiteSpace: "nowrap" },
  chips: { display: "flex", flexWrap: "wrap", gap: 7 },
  chip: { fontSize: 12.5, padding: "7px 13px", borderRadius: 999, border: "none", background: "#fff", color: "#6f8079", boxShadow: `0 2px 0 ${SH}` },
  chipOn: { background: "#B7EBDD", color: "#1F6B5A", fontWeight: 700, boxShadow: "0 2px 0 #7FD4BE" },
  chipOnDark: { background: "#2E9E86", color: "#fff", fontWeight: 700, boxShadow: "0 2px 0 #227A69" },
  crayon: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, padding: "7px 13px", borderRadius: 999, border: "2px solid" },
  selWrap: { flex: "1 1 160px", minWidth: 140, display: "flex", flexDirection: "column", gap: 7 },
  selBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13.5, fontWeight: 700, color: INK, background: "#fff", border: "none", borderRadius: 14, padding: "10px 14px", boxShadow: `0 2px 0 ${SH}` },
  selValue: (filled) => ({ color: filled ? INK : "#A9C3B9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
  selMenu: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "#fff", borderRadius: 14, boxShadow: "0 12px 30px rgba(46,74,66,0.20)", padding: 6, display: "flex", flexDirection: "column", gap: 2, maxHeight: 244, overflowY: "auto", zIndex: 40 },
  selItem: { display: "flex", alignItems: "center", gap: 8, width: "100%", fontSize: 13.5, fontWeight: 600, color: "#5A6B64", background: "transparent", border: "none", borderRadius: 10, padding: "9px 11px", textAlign: "left" },
  selItemOn: { background: "#E5F7F0", color: "#1F6B5A", fontWeight: 700 },
  selChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  selChip: { fontSize: 11.5, fontWeight: 700, padding: "4px 9px", borderRadius: 999 },
  dateWrap: { flex: "1 1 150px", display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 16, background: "#fff", boxShadow: `0 2px 0 ${SH}` },
  dateInput: { flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 13.5, color: INK },
  dateText: { fontSize: 12.5, color: "#7A9A90", fontWeight: 700, flexShrink: 0 },
  field: { flex: "1 1 150px", fontSize: 13.5, padding: "11px 15px", borderRadius: 16, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 2px 0 ${SH}` },
  // 발달평가 총평 — 영역 여섯 칸을 세로로 쌓습니다 (칸마다 무엇을 적을지 라벨로 안내)
  assessField: { marginBottom: 10 },
  assessLabel: { display: "block", fontSize: 12.5, fontWeight: 800, color: "#5E7168", marginBottom: 5 },
  assessArea: { width: "100%", minHeight: 62, fontSize: 13.5, lineHeight: 1.55, padding: "11px 14px", borderRadius: 14, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 2px 0 ${SH}`, resize: "vertical" },
  textarea: { width: "100%", minHeight: 78, fontSize: 13.5, lineHeight: 1.55, padding: "12px 15px", borderRadius: 16, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 2px 0 ${SH}`, marginBottom: 10 },
  genBtn: { width: "100%", marginTop: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "13px", boxShadow: `0 4px 0 ${MINT_STRONG}` },

  thread: { flex: "1 0 auto", overflowY: "visible", padding: "6px 16px 18px", display: "flex", flexDirection: "column", gap: 14 },
  empty: { textAlign: "center", margin: "auto", maxWidth: 430 },
  emptyMascot: { display: "flex", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 20, fontFamily: DISPLAY, color: "#2E9E86" },
  emptyDesc: { fontSize: 13.5, color: "#7A9A90", marginTop: 8, lineHeight: 1.7 },
  starters: { display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 18 },
  starter: { fontSize: 13, padding: "9px 15px", borderRadius: 999, border: "none", background: "#fff", color: "#5c6b64", boxShadow: `0 3px 0 ${SH}` },

  userBubble: { alignSelf: "flex-end", maxWidth: "82%", background: "#8FDCC9", color: "#1B5346", padding: "11px 15px", borderRadius: "20px 20px 6px 20px", fontSize: 14, lineHeight: 1.5, fontWeight: 500, boxShadow: "0 3px 0 #63C9AF" },
  botBlock: { alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 10 },
  // 생성 결과 목록 — 접힌 상태에서는 헤더 한 줄만 보임
  // 아래 docHead 와 이름이 겹치지 않도록 turn* 접두사 사용(겹치면 뒤에 정의된 쪽이 이김)
  turnItem: { alignSelf: "stretch", background: "#fff", borderRadius: 16, boxShadow: `0 3px 0 ${SH}`, overflow: "hidden" },
  turnHead: { width: "100%", display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", padding: "13px 14px", textAlign: "left" },
  turnHeadOpen: { borderBottom: "1px solid #E8F4EE" },
  turnNo: { flexShrink: 0, minWidth: 21, height: 21, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", borderRadius: 999 },
  turnTitle: { fontSize: 13.5, fontWeight: 700, color: "#2E4A42", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  turnBody: { display: "flex", flexDirection: "column", gap: 12, padding: "12px 12px 14px" },
  botRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  botFace: { flexShrink: 0, width: 38, height: 38, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", boxShadow: `0 2px 0 ${SH}` },
  botText: { fontSize: 14, color: "#4A5B54", lineHeight: 1.55, background: "#fff", padding: "10px 14px", borderRadius: "6px 18px 18px 18px", boxShadow: `0 2px 0 ${SH}`, maxWidth: "84%" },

  card: { background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: `0 4px 0 ${SH}, 0 10px 28px rgba(69,196,168,0.12)` },
  cardBar: { height: 7, width: "100%" },
  cardInner: { padding: "15px 18px 18px" },
  docHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" },
  docHeadMain: { flex: "1 1 190px", minWidth: 0 },
  docBadge: { display: "inline-block", fontSize: 11, fontWeight: 800, color: "#2E9E86", background: "#E5F7F0", padding: "3px 9px", borderRadius: 999, marginBottom: 6 },
  cardTitle: { margin: 0, fontSize: 18, fontFamily: DISPLAY, color: "#2E4A42", lineHeight: 1.3 },
  copyBtn: { flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#6f8079", background: "#EEF7F3", border: "none", borderRadius: 999, padding: "7px 12px" },
  copyDone: { background: "#CFF0E4", color: "#1F6B5A" },
  tagRow2: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: { fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999 },
  meta: { display: "flex", flexWrap: "wrap", gap: 12, paddingBottom: 13, marginBottom: 4, borderBottom: "2px dotted #DDEEE6" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#7A9A90", fontWeight: 600 },
  section: { marginTop: 13 },
  sectionHead: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: "#5E7168", marginBottom: 8, padding: "4px 11px", borderRadius: 999 },
  body: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#48564F" },
  // 모델이 문단을 빈 줄(\n\n)로 구분해 주므로 줄바꿈을 그대로 살림
  bodyPara: { margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "#48564F", whiteSpace: "pre-wrap" },
  // 요일별 3항목(놀이평가 / 지원계획 / 배움읽기)
  dayField: { marginTop: 8 },
  dayFieldLabel: { display: "block", fontSize: 11, fontWeight: 800, color: "#1F6B5A", marginBottom: 4 },
  readList: { margin: 0, paddingLeft: 17, display: "flex", flexDirection: "column", gap: 3 },
  readItem: { fontSize: 13.5, lineHeight: 1.6, color: "#48564F" },
  matWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  matChip: { fontSize: 12.5, padding: "5px 11px", borderRadius: 999, background: "#EEF7F3", color: "#4A5B54" },
  steps: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  step: { display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.55, color: "#48564F", alignItems: "flex-start" },
  stepNum: { flexShrink: 0, width: 23, height: 23, borderRadius: 999, color: "#fff", fontSize: 12.5, fontWeight: 800, display: "grid", placeItems: "center", marginTop: 1 },
  safety: { display: "flex", alignItems: "center", gap: 7, marginTop: 15, padding: "10px 13px", background: "#FFF3E0", borderRadius: 14, fontSize: 12.5, color: "#C97B2C", fontWeight: 600 },

  noteBody: { fontSize: 14, lineHeight: 1.75, color: "#48564F", whiteSpace: "pre-wrap", background: "#FFF6F1", padding: "14px 16px", borderRadius: 16 },
  homeTip: { marginTop: 10, fontSize: 13, color: "#B5651D", background: "#FFF3E0", padding: "10px 13px", borderRadius: 14, fontWeight: 600 },

  planTheme: { fontSize: 13.5, fontWeight: 700, color: "#1F6B5A", background: "#E5F7F0", padding: "8px 13px", borderRadius: 999, display: "inline-block", marginBottom: 6 },
  weeks: { display: "flex", flexDirection: "column", gap: 10 },
  week: { background: "#F5FBF8", borderRadius: 14, padding: "11px 13px" },
  weekHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, color: "#2E4A42", marginBottom: 6 },
  weekTag: { fontSize: 11.5, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", padding: "3px 9px", borderRadius: 999 },
  weekList: { margin: 0, paddingLeft: 18 },
  weekItem: { fontSize: 13, lineHeight: 1.65, color: "#48564F" },
  schedList: { display: "flex", flexDirection: "column", gap: 7 },
  schedRow: { padding: "9px 12px", background: "#F5FBF8", borderRadius: 12 },
  schedTop: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  schedName: { fontSize: 13, fontWeight: 800, color: "#2E4A42" },
  schedTime: { fontSize: 11, color: "#8AA79D", fontWeight: 700 },
  schedContent: { fontSize: 12.5, color: "#48564F", lineHeight: 1.5, marginTop: 3 },
  obsArea: { marginTop: 12, background: "#F7FBFE", borderRadius: 14, padding: "12px 14px" },
  obsAreaHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" },
  obsTag: { fontSize: 11.5, fontWeight: 800, color: "#2C6FA6", background: "#DCEBF8", padding: "3px 10px", borderRadius: 999 },
  obsDate: { fontSize: 11.5, color: "#8AA79D", fontWeight: 700 },
  obsField: { marginTop: 9 },
  obsFieldLabel: { display: "block", fontSize: 11, fontWeight: 800, color: "#2C6FA6", marginBottom: 4 },
  // 줄바꿈을 살립니다.
  // ⚠ text-indent 로 내어쓰기를 주면 안 됩니다 — 그 값은 "블록의 첫 줄"에만 걸려서,
  //    첫 항목만 왼쪽으로 튀어나오고 나머지는 들여쓰인 채 어긋납니다. 실제로 그렇게 보였습니다.
  obsFieldVal: { margin: 0, fontSize: 13, lineHeight: 1.7, color: "#48564F", whiteSpace: "pre-wrap" },
  // 배움읽기·가정연계는 해석과 구분되도록 다른 색을 씁니다
  obsLearning: { fontSize: 13, color: "#1F6B5A", background: "#E5F7F0", borderRadius: 10, padding: "9px 12px", lineHeight: 1.55, fontWeight: 500 },
  obsHome: { fontSize: 13, color: "#8A5A2B", background: "#FFF6EA", borderRadius: 10, padding: "9px 12px", lineHeight: 1.55, fontWeight: 500 },
  obsInterp: { fontSize: 13, color: "#2C5A8C", background: "#EAF2FB", borderRadius: 10, padding: "10px 12px", lineHeight: 1.7, fontWeight: 500, whiteSpace: "pre-wrap" },
  adaptDay: { marginTop: 12, background: "#FBF7FE", borderRadius: 14, padding: "12px 14px" },
  adaptDayHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  adaptTag: { fontSize: 11.5, fontWeight: 800, color: "#7B4F9E", background: "#EADDF7", padding: "3px 10px", borderRadius: 999 },
  adaptFieldLabel: { display: "block", fontSize: 11, fontWeight: 800, color: "#7B4F9E", marginBottom: 4 },
  adaptTime: { fontSize: 12, color: "#8AA79D", fontWeight: 600, marginBottom: 6 },
  adaptNote: { fontSize: 11, fontWeight: 700, color: "#7A6B62", background: "#F1ECE6", padding: "3px 9px", borderRadius: 999 },
  lifeArea: { marginTop: 12, background: "#F5FBF8", borderRadius: 14, padding: "12px 14px" },
  lifeTag: { fontSize: 11.5, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", padding: "3px 10px", borderRadius: 999 },
  lifeList: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 },
  lifeItem: { display: "flex", gap: 8, alignItems: "flex-start" },
  lifeLevel: (color, tint) => ({
    flexShrink: 0, minWidth: 22, marginTop: 1, textAlign: "center",
    fontSize: 11, fontWeight: 800, color, background: tint, padding: "3px 7px", borderRadius: 999,
  }),
  lifeText: { margin: 0, flex: 1, fontSize: 13, lineHeight: 1.6, color: "#48564F" },
  // 발달평가 총평 결과 — 영역별 문단 (입력폼의 assessField 와 이름이 겹치지 않게 2 를 붙임)
  assessArea2: { marginTop: 12, background: "#F5F9FD", borderRadius: 14, padding: "12px 14px" },
  assessTag: { fontSize: 11.5, fontWeight: 800, color: "#2C6FA6", background: "#DCEBF8", padding: "3px 10px", borderRadius: 999 },
  // 견학 계획안
  tripDot: { flexShrink: 0, color: "#7FB3E8", fontWeight: 800, marginTop: 1 },
  tripStep: { marginTop: 10 },
  tripStepHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: "#2C6FA6", marginBottom: 6 },
  tripStepNo: { width: 18, height: 18, borderRadius: 999, background: "#DCEBF8", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 800 },
  // 행사 계획안 — 구분 | 내용 두 칸짜리 표
  evTable: { display: "flex", flexDirection: "column", gap: 1, background: "#E8F4EE", borderRadius: 12, overflow: "hidden", marginTop: 8 },
  evRow: { display: "flex", gap: 1, background: "#E8F4EE", flexWrap: "wrap" },
  evHead: { flex: "0 0 132px", minWidth: 110, background: "#F1F9F5", padding: "10px 12px", fontSize: 12, fontWeight: 800, color: "#1F6B5A" },
  evCell: { flex: "1 1 200px", minWidth: 0, margin: 0, background: "#fff", padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "#48564F", whiteSpace: "pre-wrap" },
  cnslArea: { marginTop: 12, background: "#FFFBF3", borderRadius: 14, padding: "12px 14px" },
  cnslTag: { fontSize: 11.5, fontWeight: 800, color: "#9A6B1F", background: "#FDECCB", padding: "3px 10px", borderRadius: 999 },
  levelTag: (lvl) => ({
    fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
    ...(lvl === "양호" ? { color: "#1F6B5A", background: "#D8F0E2" }
      : lvl === "미흡" ? { color: "#B23A48", background: "#FBE2E5" }
      : { color: "#B08900", background: "#FFF3D1" }),
  }),

  footnote: { marginTop: 14, fontSize: 11.5, color: "#8AA79D", background: "#F1F9F5", padding: "8px 12px", borderRadius: 12, lineHeight: 1.5 },

  loading: { display: "flex", alignItems: "center", gap: 8 },
  bubbleLoad: { fontSize: 13.5, color: "#7A9A90", background: "#fff", padding: "10px 15px", borderRadius: "6px 18px 18px 18px", boxShadow: `0 2px 0 ${SH}` },

  inputBar: { display: "flex", gap: 9, padding: "12px 14px 16px" },
  input: { flex: 1, fontSize: 14, padding: "13px 17px", borderRadius: 999, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 3px 0 ${SH}` },
  sendBtn: { width: 50, height: 50, borderRadius: 999, border: "none", background: MINT, color: "#fff", display: "grid", placeItems: "center", boxShadow: `0 4px 0 ${MINT_STRONG}`, flexShrink: 0 },
  // 결과가 없을 때는 "이어 말하기" 입력창 대신 무엇을 먼저 해야 하는지 알려 줍니다
  inputHintBar: { margin: "0 14px 16px", padding: "12px 15px", background: "#F1F9F5", borderRadius: 16, fontSize: 12.5, color: "#5E7168", lineHeight: 1.6, textAlign: "center" },

  /* ── 로그인 사용자 · 사용량 ─────────────────────────── */
  userChip: { display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 150, background: "#fff", border: "none", borderRadius: 999, padding: "5px 11px 5px 5px", boxShadow: `0 3px 0 ${SH}` },
  avatar: { width: 24, height: 24, borderRadius: 999, objectFit: "cover", flexShrink: 0 },
  avatarFallback: { width: 24, height: 24, borderRadius: 999, background: "#CDEEDD", color: "#1F6B5A", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0 },
  userName: { fontSize: 12.5, fontWeight: 700, color: "#5A6B64", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  quotaBar: { margin: "0 16px 4px", padding: "8px 13px", background: "#fff", borderRadius: 12, fontSize: 12, color: "#5E7168", boxShadow: `0 2px 0 ${SH}`, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  linkBtn: { marginLeft: 6, fontSize: 12, fontWeight: 800, color: "#2E9E86", background: "transparent", border: "none", padding: 0, textDecoration: "underline" },

  /* ── 잠긴 문서 안내 ─────────────────────────────────── */
  lockPanel: { background: "#fff", borderRadius: 20, padding: "26px 20px 20px", textAlign: "center", boxShadow: `0 3px 0 ${SH}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  lockIcon: { width: 46, height: 46, borderRadius: 999, background: "#FFF3D1", color: "#B08900", display: "grid", placeItems: "center" },
  lockTitle: { fontFamily: DISPLAY, fontSize: 18, color: "#2E4A42", marginTop: 2 },
  lockDesc: { fontSize: 13, color: "#7A9A90", lineHeight: 1.65, maxWidth: 340 },
  lockCta: { width: "100%", maxWidth: 280, marginTop: 8, fontSize: 14.5, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "13px", boxShadow: `0 4px 0 ${MINT_STRONG}` },
  lockGhost: { width: "100%", maxWidth: 280, fontSize: 13.5, fontWeight: 700, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 14, padding: "11px", boxShadow: "0 3px 0 #CDEEDD" },

  /* ── 입력 안내 ──────────────────────────────────────── */
  privacyNote: { marginBottom: 11, padding: "9px 13px", background: "#F1F9F5", borderRadius: 12, fontSize: 11.5, color: "#5E7168", lineHeight: 1.6 },
  genBtnOff: { background: "#CFE6DD", boxShadow: "0 4px 0 #B6D7CC", color: "#fff" },
  needHint: { marginTop: 9, fontSize: 12, color: "#B08900", background: "#FFF8E1", borderRadius: 12, padding: "9px 13px", lineHeight: 1.6 },
  needWhy: { color: "#A08A4B", fontWeight: 400 },

  /* ── 작업 달력 ──────────────────────────────────────── */
  calWrap: { background: "#fff", borderRadius: 20, padding: "16px 16px 14px", boxShadow: `0 4px 0 ${SH}`, margin: "0 auto", maxWidth: 560 },
  calHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  calNav: { width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 12, border: "none", background: "#F1F9F5", color: "#2E9E86" },
  calTitle: { flex: 1, textAlign: "center", fontFamily: DISPLAY, fontSize: 17, color: "#2E4A42" },
  calCount: { display: "block", fontSize: 11.5, color: "#8AA79D", fontWeight: 600, marginTop: 2, fontFamily: BODY },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calWeekday: { textAlign: "center", fontSize: 11.5, fontWeight: 800, color: "#8AA79D", padding: "2px 0 6px" },
  calSun: { color: "#E08585" },
  calDay: { position: "relative", aspectRatio: "1 / 1", minHeight: 38, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, border: "none", borderRadius: 12, background: "#F7FBF9", color: "#5A6B64", fontSize: 13, fontWeight: 600 },
  calToday: { outline: "2px solid #7FD8C4", outlineOffset: -2 },
  calPicked: { background: "#CDEEDD", color: "#1F6B5A", fontWeight: 800 },
  calDot: { fontSize: 10, fontWeight: 800, color: "#fff", background: MINT, borderRadius: 999, minWidth: 16, padding: "0 4px", lineHeight: "16px" },
  calDetail: { marginTop: 12, display: "flex", flexDirection: "column", gap: 6 },
  calDetailHead: { fontSize: 12.5, fontWeight: 800, color: "#1F6B5A", marginBottom: 2 },
  calDocRow: { display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", border: "none", borderRadius: 12, background: "#F5FBF8", padding: "10px 12px" },
  calDocEmoji: { fontSize: 15, flexShrink: 0 },
  calDocLabel: { flexShrink: 0, fontSize: 11, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", padding: "3px 8px", borderRadius: 999 },
  calDocTitle: { flex: 1, minWidth: 0, fontSize: 13, color: "#48564F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  calHint: { marginTop: 12, fontSize: 12, color: "#8AA79D", textAlign: "center", lineHeight: 1.6 },

  /* ── 소셜 채널 ──────────────────────────────────────── */
  socialRow: { display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "14px 0 4px", flexWrap: "wrap" },
  // 아이콘이 자기 배경색(공식 브랜드 색)을 직접 그리므로 여기서는 색을 입히지 않습니다.
  // 색을 덧씌우면 무슨 채널인지 알아보기 어려워집니다.
  socialBtn: { width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 12, border: "none", background: "transparent", padding: 0, lineHeight: 0 },
  siteFoot: { padding: "10px 16px 26px", textAlign: "center" },
  footBrand: { marginTop: 10, fontSize: 11.5, color: "#9DB0A8" },

  /* ── 보관함 검색 ────────────────────────────────────── */
  searchRow: { display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 14, padding: "8px 12px", boxShadow: `0 2px 0 ${SH}` },
  searchInput: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 13, color: INK, fontFamily: "inherit" },
  searchClear: { display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: "#7A9A90", background: "#EEF7F3", border: "none", borderRadius: 999, padding: "5px 10px" },
  searchCount: { flex: 1, fontSize: 12, fontWeight: 700, color: "#7A9A90" },
  searchClearOn: { background: "#FFF0C4", color: "#9A6B1F" },
  emptySearch: { textAlign: "center", fontSize: 13, color: "#8AA79D", padding: "18px 0", lineHeight: 1.7 },

  /* ── 생성 중 진행 표시 ──────────────────────────────── */
  genWrap: { display: "flex", flexDirection: "column", gap: 8 },
  genTime: { display: "block", marginTop: 3, fontSize: 11.5, color: "#A9C3B9", fontWeight: 600 },
  genTrack: { height: 5, background: "#DCEEE7", borderRadius: 999, overflow: "hidden", marginLeft: 46 },
  genFill: { height: "100%", background: MINT, borderRadius: 999, transition: "width 1s linear" },

  /* ── 결과 목록 헤더 · 즐겨찾기 · 삭제 ───────────────── */
  turnHeadMain: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", padding: "13px 4px 13px 14px", textAlign: "left" },
  iconBtn: { flexShrink: 0, display: "grid", placeItems: "center", width: 32, height: 34, marginRight: 6, color: "#B7CFC6", background: "transparent", border: "none", borderRadius: 10 },
  iconBtnStar: { color: "#EFB100" },
  iconBtnOff: { color: "#DCE9E4" },
  // 접혀 있어도 "저장 안 한 수정이 있다"를 알리는 점
  dirtyDot: { flexShrink: 0, width: 7, height: 7, borderRadius: 999, background: "#EFB100" },

  /* ── 고친 내용 저장 ─────────────────────────────────── */
  saveBar: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2, padding: "10px 13px", background: "#FFF8E1", borderRadius: 14, fontSize: 12.5, color: "#8A6D1F", fontWeight: 600 },
  saveBarDone: { background: "#E5F7F0", color: "#1F6B5A" },
  saveBarFail: { background: "#FFF1EE", color: "#A8462A" },
  saveMsg: { flex: "1 1 150px", minWidth: 0, lineHeight: 1.5 },
  saveBtn: { display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0, fontSize: 12.5, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 999, padding: "8px 15px", boxShadow: `0 2px 0 ${MINT_STRONG}` },
  saveBtnOff: { background: "#CFE6DD", boxShadow: "0 2px 0 #B6D7CC" },
  saveGhost: { display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, fontSize: 12, fontWeight: 700, color: "#7A6B3F", background: "#FFEFC0", border: "none", borderRadius: 999, padding: "8px 13px" },
  // 저장에 실패한 문서 — 사용자가 잃기 전에 알아야 합니다
  docWarn: { padding: "10px 13px", background: "#FFF1EE", borderRadius: 14, fontSize: 12.5, lineHeight: 1.6, color: "#A8462A", fontWeight: 600 },

  /* ── 실패 · 재시도 ──────────────────────────────────── */
  errorBlock: { alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 10, background: "#FFF6F5", borderRadius: 16, padding: "13px 14px", boxShadow: "0 3px 0 #F6DEDC" },
  retryBtn: { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 46, fontSize: 13, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 999, padding: "9px 16px", boxShadow: `0 3px 0 ${MINT_STRONG}` },

  /* ── 내보내기 · 인라인 편집 ─────────────────────────── */
  exportBar: { display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" },
  editHint: { fontSize: 11, color: "#A9C3B9", marginBottom: 10 },
  editable: { position: "relative", padding: "2px 3px", margin: "-2px -3px" },
  editPen: { display: "inline", verticalAlign: "middle", marginLeft: 5, opacity: 0, color: "#7A9A90", transition: "opacity .12s ease" },
  // 읽기 상태의 문장(stepText·lifeText 등)은 flex:1 을 갖는데 편집 상자에는 없어서,
  // 가로로 늘어선 자리(놀이 진행단계·생활기록부 상중하·알림장 가정연계)에서 상자가
  // 글자 너비만큼 쪼그라들었습니다. flex 로 남은 폭을 채우되 minWidth:0 으로 칸을 넘지 않게 합니다.
  editWrap: { display: "flex", flexDirection: "column", gap: 7, flex: "1 1 0%", minWidth: 0, width: "100%" },
  editArea: { width: "100%", minHeight: 60, fontSize: 13.5, lineHeight: 1.6, padding: "10px 12px", borderRadius: 12, border: "1.5px solid #7FD8C4", background: "#fff", color: INK, outline: "none", resize: "vertical" },
  editBtns: { display: "flex", gap: 7, alignItems: "center" },
  editSave: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 999, padding: "7px 14px", boxShadow: `0 2px 0 ${MINT_STRONG}` },
  editCancel: { fontSize: 12, fontWeight: 700, color: "#7A9A90", background: "#EEF7F3", border: "none", borderRadius: 999, padding: "7px 13px" },
  stepText: { margin: 0, flex: 1, fontSize: 13.5, lineHeight: 1.55, color: "#48564F" },
  readItemText: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#48564F" },
  homeTipWrap: { display: "flex", alignItems: "flex-start", gap: 6, marginTop: 10, background: "#FFF3E0", padding: "10px 13px", borderRadius: 14 },
  homeTipIcon: { flexShrink: 0, fontSize: 13 },

  /* ── 랜딩 추가 요소 ─────────────────────────────────── */
  sampleWrap: { padding: "26px 20px 6px" },
  sampleSub: { fontSize: 12.5, color: "#7A9A90", textAlign: "center", marginTop: -8, marginBottom: 16, lineHeight: 1.6 },
  sampleCard: { position: "relative", maxHeight: 870, overflow: "hidden", borderRadius: 22, WebkitMaskImage: "linear-gradient(#000 93%, transparent 100%)", maskImage: "linear-gradient(#000 93%, transparent 100%)" },
  sampleCta: { display: "block", width: "100%", maxWidth: 300, margin: "-6px auto 0", fontSize: 14.5, fontWeight: 800, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 16, padding: "13px", boxShadow: "0 3px 0 #CDEEDD" },
  footLinks: { display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  footLink: { fontSize: 12, color: "#7A9A90", background: "transparent", border: "none", padding: 0, textDecoration: "underline", fontFamily: "inherit" },
  footDot: { color: "#C3D9D0", fontSize: 12 },
  authLegal: { marginTop: 16, fontSize: 11.5, color: "#8AA79D", lineHeight: 1.6 },
  authLegalLink: { fontSize: 11.5, color: "#2E9E86", fontWeight: 700, background: "transparent", border: "none", padding: 0, textDecoration: "underline", fontFamily: "inherit" },

  /* ── 약관 · 개인정보처리방침 ────────────────────────── */
  legalWrap: { padding: "12px 18px 40px", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" },
  legalTabs: { display: "flex", gap: 7, alignSelf: "center" },
  legalTab: { fontSize: 13, fontWeight: 700, color: "#7A9A90", background: "#fff", border: "none", borderRadius: 999, padding: "9px 16px", boxShadow: `0 2px 0 ${SH}` },
  legalTabOn: { background: "#CDEEDD", color: "#1F6B5A", fontWeight: 800 },
  legalCard: { width: "100%", background: "#fff", borderRadius: 20, padding: "22px 20px", boxShadow: `0 4px 0 ${SH}`, textAlign: "left" },
  legalH: { fontFamily: DISPLAY, fontSize: 21, color: "#2E4A42", margin: "0 0 4px" },
  legalH3: { fontSize: 14, fontWeight: 800, color: "#1F6B5A", margin: "18px 0 6px" },
  legalP: { margin: 0, fontSize: 13, lineHeight: 1.75, color: "#48564F" },
  legalMeta: { margin: "0 0 4px", fontSize: 12, color: "#8AA79D" },
  legalList: { margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 },
  legalLi: { fontSize: 13, lineHeight: 1.7, color: "#48564F" },
  legalTable: { display: "flex", flexDirection: "column", gap: 1, background: "#E8F4EE", borderRadius: 12, overflow: "hidden", marginTop: 8 },
  legalRow: { display: "flex", gap: 1, background: "#E8F4EE", flexWrap: "wrap" },
  legalRowKey: { flex: "0 0 132px", minWidth: 104, background: "#F1F9F5", padding: "9px 12px", fontSize: 12, fontWeight: 800, color: "#1F6B5A" },
  legalRowVal: { flex: "1 1 190px", minWidth: 0, background: "#fff", padding: "9px 12px", fontSize: 12.5, lineHeight: 1.65, color: "#48564F" },
  legalNote: { marginTop: 12, fontSize: 12.5, lineHeight: 1.7, color: "#5E7168", background: "#F1F9F5", borderRadius: 12, padding: "12px 14px" },
  legalLink: { color: "#2E9E86", fontWeight: 700 },
  legalTodo: { marginTop: 22, fontSize: 11.5, color: "#B08900", background: "#FFF8E1", borderRadius: 12, padding: "11px 13px", lineHeight: 1.6 },

  headRight: { display: "flex", alignItems: "center", gap: 8 },
  planPro: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 800, color: "#6B4E00", background: "#FFE39A", padding: "7px 12px", borderRadius: 999, boxShadow: "0 2px 0 #EFCC6A" },
  // 업그레이드 유도 버튼 — 민트색 배경에 묻히지 않도록 산뜻한 연노랑으로 대비를 줌
  planFree: { fontSize: 12, fontWeight: 800, color: "#7A5A00", background: "#FFF3B0", border: "none", padding: "8px 12px", borderRadius: 999, boxShadow: "0 2px 0 #EFD26A" },

  // 내부 스크롤 컨테이너로 두면 모바일 주소창이 접힐 때 100vh 가 흔들려 스크롤이 어색해집니다.
  // 페이지(body) 스크롤에 맡기고 높이는 dvh 로 잡습니다.
  landing: { fontFamily: BODY, color: INK, background: PAPER, minHeight: "100dvh", maxWidth: 760, margin: "0 auto", backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" },
  landNav: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, rowGap: 10, flexWrap: "wrap", padding: "13px 18px", position: "sticky", top: 0, background: "rgba(234,247,241,0.92)", backdropFilter: "blur(6px)", zIndex: 5 },
  logoMarkSm: { width: 44, height: 44, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 3px 0 #CDEBDF" },
  landNavRight: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  navGhost: { fontSize: 13, fontWeight: 700, color: "#2E9E86", background: "transparent", border: "none", padding: "9px 12px", borderRadius: 999 },
  navCta: { fontSize: 13, fontWeight: 800, color: "#fff", background: MINT, border: "none", padding: "9px 16px", borderRadius: 999, boxShadow: `0 3px 0 ${MINT_STRONG}` },

  authWrap: { display: "flex", justifyContent: "center", padding: "24px 18px 40px" },
  authCard: { width: "100%", maxWidth: 420, background: "#fff", borderRadius: 24, padding: "28px 24px 22px", boxShadow: "0 10px 40px rgba(46,74,66,0.12)", textAlign: "center" },
  authTitle: { fontFamily: DISPLAY, fontSize: 24, color: "#2E4A42", marginTop: 6 },
  authSub: { fontSize: 13.5, color: "#5E7168", marginTop: 6, marginBottom: 18 },
  authForm: { display: "flex", flexDirection: "column", gap: 13, textAlign: "left" },
  authField: { display: "flex", flexDirection: "column", gap: 6 },
  authLabel: { fontSize: 12.5, fontWeight: 700, color: "#5E7168", paddingLeft: 4 },
  authInput: { fontSize: 14.5, padding: "13px 15px", borderRadius: 14, border: "1.5px solid #DCEEE7", background: "#F7FCFA", color: INK, outline: "none" },
  // 비밀번호 칸 — 눈 아이콘이 글자를 가리지 않도록 오른쪽 여백을 비워 둡니다
  pwWrap: { position: "relative", display: "flex" },
  pwInput: { flex: 1, minWidth: 0, paddingRight: 46 },
  pwToggle: { position: "absolute", top: 0, bottom: 0, right: 4, width: 40, display: "grid", placeItems: "center", background: "transparent", border: "none", borderRadius: 12, color: "#8AA79D", padding: 0 },
  authError: { fontSize: 13, fontWeight: 700, color: "#D9645C", background: "#FCEEED", borderRadius: 12, padding: "10px 12px", textAlign: "center" },
  authSubmit: { marginTop: 4, fontSize: 15, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "14px", boxShadow: `0 4px 0 ${MINT_STRONG}` },
  authDivider: { fontSize: 13, color: "#7A9A90", marginTop: 20, marginBottom: 10 },
  authToggle: { width: "100%", fontSize: 14.5, fontWeight: 800, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 14, padding: "13px", boxShadow: "0 3px 0 #CDEEDD" },
  authInfo: { fontSize: 13, fontWeight: 700, color: "#2E7D6B", background: "#E5F7F0", borderRadius: 12, padding: "10px 12px", textAlign: "center", lineHeight: 1.5 },
  orRow: { display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px" },
  orLine: { flex: 1, height: 1, background: "#DCEEE7" },
  orText: { fontSize: 12, color: "#8AA79D", fontWeight: 700, whiteSpace: "nowrap" },
  kakaoBtn: { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#191600", background: "#FEE500", border: "none", borderRadius: 14, padding: "13px", marginBottom: 10 },
  googleBtn: { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#3C4043", background: "#fff", border: "1.5px solid #DADCE0", borderRadius: 14, padding: "13px" },
  hero: { textAlign: "center", padding: "22px 22px 8px" },

  /* ── 히어로: 반짝이는 별 · 메모→문서 변환 ─────────────── */
  twinkleWrap: { position: "relative", display: "inline-block" },
  twinkleMain: { display: "inline-block" },
  spark: { position: "absolute", color: "#7FD8C4", fontSize: 13, lineHeight: 1, pointerEvents: "none" },

  demoStage: { maxWidth: 380, margin: "18px auto 0", textAlign: "left" },
  // 교사가 휘갈긴 쪽지 — 살짝 기울여 "완성된 문서"와 한눈에 구분되게 합니다
  demoMemo: { position: "relative", background: "#FFF6D8", borderRadius: 14, padding: "13px 15px 14px", transform: "rotate(-1.2deg)", boxShadow: "0 3px 0 #EBD9A0" },
  demoMemoTape: { position: "absolute", top: -6, left: "50%", marginLeft: -18, width: 36, height: 12, borderRadius: 3, background: "#FFE9A8", boxShadow: "0 1px 0 #EBD9A0" },
  demoMemoLabel: { fontSize: 10.5, fontWeight: 800, color: "#A98A2E", marginBottom: 4 },
  demoMemoText: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#6B5A24", minHeight: 38, letterSpacing: "-0.1px" },
  demoCaret: { display: "inline-block", width: 2, height: 15, background: "#B08900", verticalAlign: "-2px", marginLeft: 1 },

  demoArrow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 4px 8px", opacity: 0.45, transition: "opacity .3s ease" },
  demoArrowOn: { opacity: 1 },
  demoArrowLine: { flex: 1, height: 2, background: "#CDEEDD", borderRadius: 999 },
  demoArrowText: { fontSize: 11.5, fontWeight: 800, color: "#2E9E86", whiteSpace: "nowrap" },

  demoDoc: { position: "relative", minHeight: 152, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: `0 4px 0 ${SH}` },
  demoDocStripe: { display: "block", height: 5, background: MINT },
  demoDocBody: { padding: "12px 14px 14px" },
  demoDocBadge: { display: "inline-block", fontSize: 10, fontWeight: 800, color: "#2E9E86", background: "#E5F7F0", padding: "3px 8px", borderRadius: 999 },
  demoDocTitle: { fontFamily: DISPLAY, fontSize: 15, color: "#2E4A42", margin: "6px 0 2px" },
  demoRow: { marginTop: 8 },
  demoRowLabel: { display: "block", fontSize: 10.5, fontWeight: 800, color: "#1F6B5A", marginBottom: 3 },
  demoRowText: { margin: 0, fontSize: 12.5, lineHeight: 1.6, color: "#48564F" },

  demoDots: { display: "flex", justifyContent: "center", gap: 5, marginTop: 10 },
  demoDot: { width: 6, height: 6, borderRadius: 999, background: "#CDEEDD", transition: "background .3s ease, width .3s ease" },
  demoDotOn: { width: 16, background: MINT },
  heroMascot: { display: "flex", justifyContent: "center", marginBottom: 6 },
  heroTitle: { fontFamily: DISPLAY, color: "#2E4A42", fontSize: 29, lineHeight: 1.28, margin: "6px 0 0" },
  heroSub: { fontSize: 14, color: "#5E7168", lineHeight: 1.7, marginTop: 12 },
  heroCtas: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 20 },
  ctaPrimary: { fontSize: 15, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "14px 24px", boxShadow: `0 4px 0 ${MINT_STRONG}`, width: "100%", maxWidth: 300 },
  ctaGhost: { fontSize: 15, fontWeight: 800, color: "#2E9E86", background: "#fff", border: "none", borderRadius: 16, padding: "14px 24px", boxShadow: `0 4px 0 ${SH}`, width: "100%", maxWidth: 300 },
  heroNote: { fontSize: 12, color: "#8AA79D", marginTop: 14 },
  featWrap: { padding: "24px 20px 6px" },
  sectionTitle: { fontFamily: DISPLAY, color: "#2E9E86", fontSize: 19, textAlign: "center", marginBottom: 16 },
  // 아이폰 홈 화면처럼 — 색 타일 + 그 아래 작은 이름. 큰 흰 카드는 자리를 너무 많이 먹었습니다.
  // ⚠ 최소 폭은 좁은 폰(360px)에서도 한 줄에 4개가 들어가도록 잡습니다.
  //    폭을 키우면 3열로 떨어져 화면이 세로로 길어집니다.
  featGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))", gap: "18px 10px", maxWidth: 520, margin: "0 auto" },
  featCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 7, width: "100%", padding: 0, border: "none", background: "transparent" },
  // 흰 타일 + 색이 담긴 마크. 색은 마크가 지고 타일은 비워 둡니다 —
  // 타일마다 색을 칠하면 12개가 한꺼번에 소리쳐서 오히려 촌스러워집니다.
  // 옅은 색 타일 + 통통한 마크. 짙게 칠하면 12개가 한꺼번에 소리쳐 부담스러워집니다.
  //
  // 광택은 세 가지가 겹쳐 만들어집니다 — 위에서 내려오는 밝은 결(배경 그라디언트),
  // 맨 윗변의 얇은 하이라이트, 아래쪽 안쪽 그늘. 여기에 스페큘러 반사(featShine)를 얹습니다.
  featTile: (tint, tint2) => ({
    position: "relative", width: "100%", maxWidth: 76, aspectRatio: "1 / 1",
    borderRadius: 22, display: "grid", placeItems: "center", overflow: "hidden",
    // ⚠ 위아래에 색 차이가 있어야 빛이 비친 티가 납니다. 같은 흰색으로 두면 광택이 사라집니다.
    background: `linear-gradient(158deg, #fff 0%, ${tint} 36%, ${tint2} 100%)`,
    boxShadow: `inset 0 1.5px 0 rgba(255,255,255,.95), inset 0 -10px 16px -10px rgba(46,74,66,.16),
                0 1px 2px rgba(46,74,66,.05), 0 6px 14px -8px rgba(46,74,66,.28)`,
  }),
  // 왼쪽 위에서 비친 빛. 타일 밖으로 새지 않게 타일에 overflow:hidden 을 두었습니다.
  featShine: {
    position: "absolute", top: "-18%", left: "-12%", width: "92%", height: "62%",
    borderRadius: "50%", pointerEvents: "none",
    background: "radial-gradient(ellipse at 42% 62%, rgba(255,255,255,.97), rgba(255,255,255,0) 66%)",
  },
  featGlyph: { position: "relative", filter: "drop-shadow(0 1px 1.5px rgba(46,74,66,.18))" },
  // 잠긴 문서 — 타일 안쪽 모서리에 작게. 크게 붙이면 마크를 가립니다.
  featFree: { position: "absolute", top: 6, right: 6, display: "grid", placeItems: "center",
    height: 15, padding: "0 5px", borderRadius: 999, background: "#2E9E86", color: "#fff",
    fontSize: 9, fontWeight: 800, letterSpacing: "-0.3px" },
  featLock: { position: "absolute", top: 6, right: 6, display: "grid", placeItems: "center",
    width: 15, height: 15, borderRadius: 999, background: "#EEF2F0", color: "#9DB0A8" },
  featLabel: { fontSize: 12, fontWeight: 700, color: "#4A5B54", textAlign: "center", lineHeight: 1.3, letterSpacing: "-0.2px" },
  priceWrap: { padding: "26px 20px 10px" },
  demoNote: { fontSize: 11.5, color: "#8AA79D", textAlign: "center", marginTop: 14, lineHeight: 1.5 },
  landFoot: { textAlign: "center", fontSize: 12, color: "#8AA79D", padding: "22px 20px 30px" },

  planGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 12 },
  planCard: { position: "relative", background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: `0 4px 0 ${SH}`, display: "flex", flexDirection: "column", textAlign: "center" },
  planCardHi: { boxShadow: `0 0 0 2px ${MINT}, 0 6px 0 ${MINT_STRONG}` },
  planTag: { position: "absolute", top: -10, right: 16, fontSize: 11, fontWeight: 800, color: "#fff", background: MINT, padding: "4px 11px", borderRadius: 999, boxShadow: `0 2px 0 ${MINT_STRONG}` },
  planName: { fontSize: 15, fontWeight: 800, color: "#2E4A42" },
  planPrice: { display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3, marginTop: 8 },
  planPriceNum: { fontFamily: DISPLAY, fontSize: 26, color: "#2E9E86" },
  planPricePer: { fontSize: 13, color: "#8AA79D", fontWeight: 700 },
  planTagline: { fontSize: 12.5, color: "#7A9A90", marginTop: 6, marginBottom: 14 },
  planFeatIcon: { color: "#2E9E86", flexShrink: 0, marginTop: 3 },
  planFeats: { display: "flex", flexDirection: "column", gap: 9, flex: 1, textAlign: "left" },
  planFeat: { display: "flex", alignItems: "flex-start", gap: 7, fontSize: 13, color: "#48564F", lineHeight: 1.45, textAlign: "left" },
  planCtaFree: { marginTop: 16, fontSize: 14, fontWeight: 800, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 14, padding: "12px", boxShadow: "0 3px 0 #CDEEDD" },
  planCtaPro: { marginTop: 16, fontSize: 14, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 14, padding: "12px", boxShadow: `0 4px 0 ${MINT_STRONG}` },

  overlay: { position: "fixed", inset: 0, background: "rgba(46,74,66,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100, overflowY: "auto" },
  modal: { position: "relative", width: "100%", maxWidth: 560, background: PAPER, borderRadius: 24, padding: "26px 22px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center", margin: "auto", backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" },
  modalClose: { position: "absolute", top: 14, right: 16, fontSize: 16, color: "#7A9A90", background: "transparent", border: "none", lineHeight: 1 },
  modalMascot: { display: "flex", justifyContent: "center", marginBottom: 6 },
  modalTitle: { fontFamily: DISPLAY, fontSize: 21, color: "#2E4A42", marginTop: 4 },
  modalSub: { fontSize: 13.5, color: "#5E7168", lineHeight: 1.7, marginTop: 8, marginBottom: 18, whiteSpace: "pre-line" },
  // ⚠ inline-flex 로 두면 안 됩니다 — 인라인 요소라 뒤따르는 버튼이 같은 줄에 붙어
  //   목록과 버튼이 2열로 나옵니다. 항목 문구가 짧아질수록 잘 생깁니다.
  //   블록으로 두고 maxWidth + margin auto 로 가운데 정렬합니다.
  paywallFeats: { display: "flex", flexDirection: "column", gap: 8, textAlign: "left", background: "#fff", borderRadius: 16, padding: "14px 18px", width: "100%", maxWidth: 340, margin: "14px auto", boxShadow: `0 3px 0 ${SH}` },
  textBtn: { display: "block", width: "100%", marginTop: 10, fontSize: 13, fontWeight: 700, color: "#7A9A90", background: "transparent", border: "none", padding: "8px" },
};
