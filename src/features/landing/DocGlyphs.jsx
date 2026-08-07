// 문서 12종의 아이콘 마크.
//
// 이모지를 타일에 얹으면 손쉽지만 촌스럽습니다 — 크기·굵기·색이 제각각이고
// 기기마다 다르게 그려집니다. 문서마다 뜻이 담긴 기하 도형을 직접 그려,
// 12개가 한 벌로 보이게 합니다.
//
// 규칙 — 도형은 2~3개까지. 겹치는 도형은 같은 색을 투명도로 겹쳐 깊이를 냅니다.
//        선 굵기는 3.4, 끝은 둥글게. 여백은 32 기준 안쪽 4 이상.
//
// 색은 domain/documents.js 의 MODES(color, color2)에서 옵니다 — 문서 정체성이 있는 곳.

import React from "react";
import { MODES } from "../../domain/documents.js";

/** 그라디언트는 한 번만 정의하고 모든 마크가 함께 씁니다 (인스턴스마다 만들면 낭비입니다) */
export function GlyphDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        {MODES.map((m) => (
          <linearGradient key={m.key} id={`g-${m.key}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={m.color} />
            <stop offset="100%" stopColor={m.color2} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

/* ---------- 마크 ---------- */
// c = 주 색, 보조 도형은 같은 색을 옅게 겹칩니다.

const SHAPES = {
  // 놀이 활동 — 겹쳐 놓은 놀이 블록
  play: (c) => (<>
    <rect x="4" y="11" width="16" height="16" rx="5.5" fill={c} opacity=".5" />
    <rect x="12" y="5" width="16" height="16" rx="5.5" fill={c} />
  </>),
  // 보육일지 — 차곡차곡 쌓인 기록
  daily: (c) => (<>
    <rect x="5" y="7" width="22" height="4.6" rx="2.3" fill={c} />
    <rect x="5" y="14.7" width="22" height="4.6" rx="2.3" fill={c} opacity=".5" />
    <rect x="5" y="22.4" width="13" height="4.6" rx="2.3" fill={c} />
  </>),
  // 관찰일지 — 들여다보는 렌즈
  obs: (c) => (<>
    <circle cx="14" cy="14" r="8.4" fill="none" stroke={c} strokeWidth="3.4" />
    <path d="M20.4 20.4 L27 27" stroke={c} strokeWidth="3.4" strokeLinecap="round" opacity=".5" />
  </>),
  // 알림장 — 건네는 말풍선
  note: (c) => (<>
    <rect x="4" y="6" width="24" height="17" rx="6.5" fill={c} />
    <path d="M10.5 21.5 L10.5 28.5 L17.5 22 Z" fill={c} opacity=".5" />
  </>),
  // 신입원아 적응일지 — 돋아나는 새싹
  adapt: (c) => (<>
    <path d="M16 28 V15" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
    <path d="M16 16 C16 10 12 6.5 6.5 6.5 C6.5 12 10 16 16 16 Z" fill={c} opacity=".5" />
    <path d="M16 17 C16 11.5 19.5 8 25 8 C25 13.5 21.5 17 16 17 Z" fill={c} />
  </>),
  // 학부모 상담일지 — 마주 보는 두 말풍선
  counsel: (c) => (<>
    <rect x="3" y="5" width="18" height="14" rx="6" fill={c} opacity=".5" />
    <rect x="11" y="13" width="18" height="14" rx="6" fill={c} />
  </>),
  // 생활기록부 — 상·중·하 세 단계
  life: (c) => (<>
    <rect x="5" y="19" width="5.6" height="8" rx="2.8" fill={c} opacity=".5" />
    <rect x="13.2" y="13" width="5.6" height="14" rx="2.8" fill={c} opacity=".75" />
    <rect x="21.4" y="6" width="5.6" height="21" rx="2.8" fill={c} />
  </>),
  // 발달평가 총평 — 자라나는 곡선
  assess: (c) => (<>
    <path d="M5 24 C10 24 11.5 12 18 12 C22 12 23.5 8 26.5 7"
      fill="none" stroke={c} strokeWidth="3.4" strokeLinecap="round" />
    <circle cx="26.5" cy="7" r="3.6" fill={c} />
    <path d="M5 24 H27" stroke={c} strokeWidth="3.4" strokeLinecap="round" opacity=".35" />
  </>),
  // 월간 평가 — 한 달의 날들
  monthly: (c) => (<>
    <rect x="4" y="7" width="24" height="21" rx="6" fill={c} opacity=".45" />
    <rect x="4" y="7" width="24" height="7" rx="3.5" fill={c} />
    <circle cx="11" cy="20" r="2.1" fill={c} />
    <circle cx="16" cy="20" r="2.1" fill={c} />
    <circle cx="21" cy="20" r="2.1" fill={c} />
  </>),
  // 안전교육일지 — 지키는 방패
  safety: (c) => (<>
    <path d="M16 3.5 L27 7.5 V15.5 C27 21.5 22.2 26.3 16 28.5 C9.8 26.3 5 21.5 5 15.5 V7.5 Z" fill={c} opacity=".45" />
    <path d="M11 16.2 L14.8 20 L21.5 12.6" fill="none" stroke={c} strokeWidth="3.4"
      strokeLinecap="round" strokeLinejoin="round" />
  </>),
  // 견학 계획안 — 찾아가는 자리
  trip: (c) => (<>
    <path d="M16 3.5 C21.5 3.5 26 8 26 13.5 C26 20.5 16 28.5 16 28.5 S6 20.5 6 13.5 C6 8 10.5 3.5 16 3.5 Z" fill={c} />
    <circle cx="16" cy="13.2" r="4" fill="#fff" opacity=".92" />
  </>),
  // 행사 계획안 — 터지는 축하
  event: (c) => (<>
    <path d="M6.5 27.5 L13 10 L24 21 Z" fill={c} />
    <circle cx="23" cy="7.5" r="3.2" fill={c} opacity=".5" />
    <circle cx="28" cy="14" r="2.2" fill={c} opacity=".5" />
    <circle cx="16.5" cy="5" r="2.2" fill={c} opacity=".5" />
  </>),
};

/**
 * @param {string} mode  문서 종류
 * @param {boolean} light 색 타일 위에 흰 마크로 그릴지 (기본은 흰 타일 위 색 마크)
 */
export function DocGlyph({ mode, size = 30, light = false }) {
  const draw = SHAPES[mode];
  if (!draw) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      {draw(light ? "#fff" : `url(#g-${mode})`)}
    </svg>
  );
}
