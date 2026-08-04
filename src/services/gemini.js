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

/** 모델 응답에서 JSON 을 꺼냅니다. 코드펜스가 섞여 와도 견디도록. */
function parsePayload(data) {
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || "")
    .join("")
    .trim();
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    // 앞뒤에 설명이 붙어 온 경우 가장 바깥 중괄호만 다시 시도
    const m = clean.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch { return null; }
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
        thinkingConfig: { thinkingBudget: 0 }, // 사고 비활성화(속도·토큰 절약)
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
