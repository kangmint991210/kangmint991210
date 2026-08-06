// 문서 생성 요청 — 화면은 "무엇을 만들지"만 알려주고, 통신과 파싱은 전부 여기서 처리합니다.

import { ai } from "../config.js";
import { promptFor } from "../prompts/index.js";

/** 요금제·체험 한도에 걸렸을 때. 화면은 이 오류를 보고 안내 모달을 띄웁니다. */
export class QuotaExceededError extends Error {
  constructor(message) {
    super(message || "이용 가능한 횟수를 모두 사용했어요.");
    this.name = "QuotaExceededError";
  }
}

/**
 * 문자열에서 "첫 번째 완전한 JSON 객체"만 잘라냅니다.
 *
 * 정규식(/\{[\s\S]*\}/)으로는 안 됩니다 — 모델이 응답 끝을 반복 출력하거나
 * 뒤에 설명을 덧붙이면, 욕심 많은 매칭이 뒤쪽 중괄호까지 삼켜 통째로 깨집니다.
 * 실제로 그런 응답이 관측돼서, 중괄호 균형을 세어 첫 객체만 꺼냅니다.
 * (문자열 안의 중괄호와 이스케이프된 따옴표를 건너뜁니다)
 */
export function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inString = false, escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null; // 끝까지 닫히지 않음 = 출력이 잘린 응답
}

/** 모델 응답에서 JSON 을 꺼냅니다. 코드펜스나 뒤에 붙은 군더더기가 있어도 견딥니다. */
function parsePayload(data) {
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const only = extractFirstJsonObject(clean);
    if (!only) return null;
    try { return JSON.parse(only); } catch { return null; }
  }
}

/**
 * 문서 한 건을 생성합니다.
 * @param {object} p
 * @param {string} p.mode    문서 종류 (play/daily/…)
 * @param {object} p.form    입력 폼 값
 * @param {string} p.extra   사용자가 이어 말한 요청 (없으면 "")
 * @param {Array<{role:'user'|'model', text:string}>} p.history 이전 대화
 * @param {string} [p.accessToken] 로그인 상태면 서버가 요금제 한도를 검증하도록 함께 보냄
 * @returns {Promise<{payload:object, usageCounted:boolean}>}
 * @throws {QuotaExceededError} 한도 초과
 * @throws {Error} 통신 실패 또는 결과를 이해하지 못한 경우
 */
export async function generateDocument({ mode, form, extra = "", history = [], accessToken }) {
  const cfg = promptFor(mode);
  if (!cfg) throw new Error(`알 수 없는 문서 종류: ${mode}`);

  // 마지막 사용자 발화를 "설정 + 메모 + 요청"이 담긴 완전한 지시문으로 교체합니다.
  const turns = history.map((m) => ({ ...m }));
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].role === "user") { turns[i] = { role: "user", text: cfg.buildUserMessage(form, extra) }; break; }
  }

  const res = await fetch(ai.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      model: ai.model,
      kind: mode,
      systemInstruction: { parts: [{ text: cfg.system }] },
      contents: turns.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: {
        maxOutputTokens: cfg.tokens || ai.defaultMaxTokens,
        responseMimeType: "application/json", // JSON 형식 강제 → 파싱 안정화
        // 사고는 기본적으로 끕니다(속도·토큰 절약). 다만 "항목마다 몇 자 이상" 같은
        // 분량 규정이 있는 문서는 사고 없이는 규정을 지키지 못해, 문서별로 예산을 켭니다.
        thinkingConfig: { thinkingBudget: cfg.thinkingBudget ?? ai.defaultThinkingBudget },
        // 온도는 문서별 선택입니다. 분량·문체 규정이 빡빡한 문서는 낮춰야 편차가 줄어듭니다
        // (기본값으로 두면 같은 입력에도 분량이 1.5배까지 벌어집니다).
        ...(cfg.temperature != null ? { temperature: cfg.temperature } : {}),
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (res.status === 429) throw new QuotaExceededError(data?.error?.message);
  if (!res.ok || data.error) throw new Error(data?.error?.message || "api error");

  const payload = parsePayload(data);
  if (!payload) throw new Error("결과를 이해하지 못했어요."); // 깨진 결과를 그대로 보여주지 않음

  return { payload, usageCounted: res.headers.get("X-Usage-Counted") === "1" };
}
