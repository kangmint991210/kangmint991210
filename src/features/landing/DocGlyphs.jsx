// 문서 12종의 아이콘 마크.
//
// 이 서비스의 얼굴은 볼터치가 있는 별 마스코트와 둥근 손글씨체입니다.
// 각지고 추상적인 기하 도형은 그 얼굴과 싸웁니다. 그래서 "통통한 사물"로 그립니다.
//
// 한 벌로 묶는 규칙
//   · 모서리는 넉넉히 둥글게, 선은 굵게(3.6~4.4) 끝은 둥글게 — 통통해 보입니다
//   · 문서마다 반짝임(✦) 이나 하트, 볼터치 중 하나를 딱 하나만 곁들입니다
//   · 도형은 겹칠 때 같은 색을 옅게 써서 깊이를 냅니다
//
// 색은 domain/documents.js 의 MODES(color, color2)에서 옵니다 — 문서 정체성이 있는 곳.

import React from "react";
import { MODES } from "../../domain/documents.js";

const BLUSH = "#FF9AA2";

// 적응일지의 두 아이에게만 쓰는 색 (아이로 읽히려면 제 색이 필요합니다)
const HAIR = "#6E4C36";
const SKIN = "#FBE3D8";
const EYE = "#3B2A22";
const BLUSH2 = "#F3A9A9";
const MOUTH = "#EF5A4C";
const RIBBON = "#F0605E";

/** 그라디언트는 한 번만 정의하고 모든 마크가 함께 씁니다 */
export function GlyphDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden focusable="false">
      <defs>
        {MODES.map((m) => (
          <linearGradient key={m.key} id={`g-${m.key}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor={m.color} />
            <stop offset="100%" stopColor={m.color2} />
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}

/** 네 갈래 반짝임 — 여러 마크가 함께 쓰는 곁들임 */
const Spark = ({ x, y, s = 1, c, o = 1 }) => (
  <path
    d={`M${x} ${y - 4 * s} Q${x + 0.8 * s} ${y - 0.8 * s} ${x + 4 * s} ${y}
        Q${x + 0.8 * s} ${y + 0.8 * s} ${x} ${y + 4 * s}
        Q${x - 0.8 * s} ${y + 0.8 * s} ${x - 4 * s} ${y}
        Q${x - 0.8 * s} ${y - 0.8 * s} ${x} ${y - 4 * s} Z`}
    fill={c} opacity={o}
  />
);

/** 작은 하트 */
const Heart = ({ x, y, s = 1, c, o = 1 }) => (
  <path
    d={`M${x} ${y + 3.4 * s} C${x - 5 * s} ${y - 1} ${x - 2.6 * s} ${y - 4.4 * s} ${x} ${y - 1.6 * s}
        C${x + 2.6 * s} ${y - 4.4 * s} ${x + 5 * s} ${y - 1} ${x} ${y + 3.4 * s} Z`}
    fill={c} opacity={o}
  />
);

const SHAPES = {
  // 놀이 활동 — 동그라미·네모·세모 놀이 블록
  // (크레용으로 그렸더니 작은 크기에서 물방울처럼 보여 블록으로 바꿨습니다)
  play: (c) => (<>
    <path d="M16.5 5 L23.5 16 H9.5 Z" fill={c} stroke={c} strokeWidth="4.5"
      strokeLinejoin="round" opacity=".85" />
    <rect x="3.5" y="17.5" width="12" height="11" rx="4" fill={c} />
    <circle cx="23.5" cy="23" r="5.6" fill={c} opacity=".55" />
  </>),

  // 보육일지 — 리본 갈피를 끼운 통통한 공책
  daily: (c) => (<>
    <rect x="6" y="4.5" width="21" height="23" rx="6.5" fill={c} />
    <rect x="6" y="4.5" width="6.5" height="23" rx="3.25" fill={c} opacity=".45" />
    <path d="M19 4.5 H23.5 V15 L21.25 12.6 L19 15 Z" fill="#fff" opacity=".85" />
    <Spark x={5.5} y={25.5} s={0.85} c={c} o={0.6} />
  </>),

  // 관찰일지 — 손잡이가 굵은 돋보기
  obs: (c) => (<>
    <circle cx="14" cy="13.5" r="8" fill={c} opacity=".4" />
    <circle cx="14" cy="13.5" r="8" fill="none" stroke={c} strokeWidth="3.6" />
    <path d="M19.8 19.5 L25.5 25.2" stroke={c} strokeWidth="5" strokeLinecap="round" />
    <Spark x={24.5} y={7} s={1} c={c} o={0.8} />
  </>),

  // 알림장 — 하트를 붙인 편지
  note: (c) => (<>
    <rect x="3.5" y="8" width="25" height="18" rx="6" fill={c} />
    <path d="M5.5 11 L16 18.5 L26.5 11" fill="none" stroke="#fff" strokeWidth="2.6"
      strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
    <Heart x={25} y={7} s={1.25} c={BLUSH} />
  </>),

  // 신입원아 적응일지 — 마주 붙은 두 아이
  //
  // ⚠ 이 마크만 문서 색을 쓰지 않고 제 색을 갖습니다.
  //    아이 얼굴은 살결·머리색이 있어야 아이로 읽힙니다.
  // ⚠ 얼굴은 세로보다 가로가 넓어야 합니다. 세로가 길면 찌그러져 보입니다.
  adapt: () => (<>
    <circle cx="16" cy="16.5" r="13" fill="#FBD9A5" />

    {/* 왼쪽 아이 — 묶은 머리와 리본 */}
    <circle cx="7.6" cy="7.4" r="2.5" fill={HAIR} />
    <path d="M5.6 7.2 L3.3 5.8 Q2.6 7.3 3.3 8.9 Z" fill={RIBBON} />
    <ellipse cx="6.2" cy="21.8" rx="2.2" ry="3" fill={HAIR} />
    <circle cx="9.9" cy="16" r="7.4" fill={HAIR} />
    <circle cx="4.6" cy="18" r="1.5" fill={SKIN} />
    <ellipse cx="9.9" cy="18.4" rx="5.9" ry="5.2" fill={SKIN} />
    <path d="M4.3 16.4 Q4.9 11 9.9 11 Q14.9 11 15.5 16.4 Q13.9 13.9 12.1 14.6
             Q11.2 12.8 9.6 13.7 Q7.2 13.1 4.3 16.4 Z" fill={HAIR} />
    <circle cx="7.6" cy="17.9" r="1.05" fill={EYE} />
    <circle cx="12.2" cy="17.9" r="1.05" fill={EYE} />
    <circle cx="5.8" cy="20.2" r="1.5" fill={BLUSH2} />
    <circle cx="14" cy="20.2" r="1.5" fill={BLUSH2} />
    <path d="M8 20.2 A2.2 2.2 0 0 0 11.8 20.2 Z" fill={MOUTH} />

    {/* 오른쪽 아이 — 뻗친 머리 */}
    <path d="M26.6 9.4 Q29 8.9 29.6 11.2 Q28.3 9.9 26.7 10.6 Z" fill={HAIR} />
    <circle cx="22.1" cy="16" r="7.4" fill={HAIR} />
    <circle cx="27.4" cy="18" r="1.5" fill={SKIN} />
    <ellipse cx="22.1" cy="18.4" rx="5.9" ry="5.2" fill={SKIN} />
    <path d="M16.5 16.4 Q17.1 11 22.1 11 Q27.1 11 27.7 16.4 Q26.3 13.8 24.4 14.6
             Q23.4 12.7 21.6 13.8 Q19.2 12.9 16.5 16.4 Z" fill={HAIR} />
    <circle cx="19.8" cy="17.9" r="1.05" fill={EYE} />
    <circle cx="24.4" cy="17.9" r="1.05" fill={EYE} />
    <circle cx="18" cy="20.2" r="1.5" fill={BLUSH2} />
    <circle cx="26.2" cy="20.2" r="1.5" fill={BLUSH2} />
    <path d="M20.2 20.2 A2.2 2.2 0 0 0 24 20.2 Z" fill={MOUTH} />
  </>),

  // 학부모 상담일지 — 오가는 두 말풍선
  counsel: (c) => (<>
    <rect x="2.5" y="5" width="18" height="13.5" rx="6" fill={c} opacity=".45" />
    <rect x="11.5" y="13" width="18" height="13.5" rx="6" fill={c} />
    <circle cx="17" cy="19.8" r="1.5" fill="#fff" opacity=".9" />
    <circle cx="20.5" cy="19.8" r="1.5" fill="#fff" opacity=".9" />
    <circle cx="24" cy="19.8" r="1.5" fill="#fff" opacity=".9" />
  </>),

  // 생활기록부 — 체크가 찍힌 통통한 서류판
  life: (c) => (<>
    <rect x="5" y="6" width="22" height="22" rx="6.5" fill={c} opacity=".4" />
    <rect x="11.5" y="2.5" width="9" height="6" rx="3" fill={c} />
    <path d="M10.5 15.5 L13 18 L17.5 13" fill="none" stroke={c} strokeWidth="3.2"
      strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10.5 22.5 L13 25 L17.5 20" fill="none" stroke={c} strokeWidth="3.2"
      strokeLinecap="round" strokeLinejoin="round" opacity=".55" />
  </>),

  // 발달평가 총평 — 별까지 자라난 세 걸음
  assess: (c) => (<>
    <rect x="4.5" y="19" width="6" height="8.5" rx="3" fill={c} opacity=".45" />
    <rect x="13" y="14" width="6" height="13.5" rx="3" fill={c} opacity=".7" />
    <rect x="21.5" y="9.5" width="6" height="18" rx="3" fill={c} />
    <Spark x={24.5} y={4.5} s={1.15} c={c} />
  </>),

  // 월간 평가 — 하트가 찍힌 달력
  monthly: (c) => (<>
    <rect x="4" y="6" width="24" height="22" rx="7" fill={c} opacity=".4" />
    <rect x="4" y="6" width="24" height="7.5" rx="3.75" fill={c} />
    <rect x="9" y="2.5" width="3.2" height="6" rx="1.6" fill={c} />
    <rect x="19.8" y="2.5" width="3.2" height="6" rx="1.6" fill={c} />
    <circle cx="11" cy="21" r="1.9" fill={c} opacity=".8" />
    <Heart x={20} y={20.5} s={1.15} c={BLUSH} />
  </>),

  // 안전교육일지 — 볼터치가 있는 방패
  safety: (c) => (<>
    <path d="M16 3 L26.5 7 V15 C26.5 21.2 21.8 25.9 16 28.5 C10.2 25.9 5.5 21.2 5.5 15 V7 Z" fill={c} />
    <path d="M11.2 15.8 L14.6 19.2 L21 12.6" fill="none" stroke="#fff" strokeWidth="3.2"
      strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
    <circle cx="9" cy="20.5" r="1.7" fill={BLUSH} opacity=".55" />
    <circle cx="23" cy="20.5" r="1.7" fill={BLUSH} opacity=".55" />
  </>),

  // 견학 계획안 — 옆에서 본 나들이 버스
  // (앞모습으로 창 두 개를 그렸더니 눈처럼 보여 로봇 얼굴이 됐습니다)
  trip: (c) => (<>
    <rect x="2.5" y="8" width="27" height="13.5" rx="4.5" fill={c} />
    <rect x="5" y="10.5" width="6.2" height="5" rx="1.8" fill="#fff" opacity=".9" />
    <rect x="12.6" y="10.5" width="6.2" height="5" rx="1.8" fill="#fff" opacity=".9" />
    <rect x="20.2" y="10.5" width="4.4" height="8.4" rx="1.8" fill="#fff" opacity=".62" />
    <rect x="26.2" y="13" width="3" height="2.4" rx="1.2" fill="#fff" opacity=".85" />
    <circle cx="8.5" cy="22.4" r="3.3" fill={c} />
    <circle cx="8.5" cy="22.4" r="1.35" fill="#fff" opacity=".8" />
    <circle cx="22" cy="22.4" r="3.3" fill={c} />
    <circle cx="22" cy="22.4" r="1.35" fill="#fff" opacity=".8" />
    <Spark x={27.5} y={5.5} s={1} c={c} o={0.7} />
  </>),

  // 행사 계획안 — 줄무늬 고깔과 흩날리는 색종이
  event: (c) => (<>
    <path d="M16 9 L25 25.5 H7 Z" fill={c} stroke={c} strokeWidth="4" strokeLinejoin="round" />
    <path d="M13.2 15.5 L18.8 15.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".55" />
    <path d="M11 21 L21 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".55" />
    <circle cx="16" cy="5.2" r="3.5" fill={c} opacity=".6" />
    <rect x="3.5" y="9.5" width="4" height="2.6" rx="1.3" fill={c} opacity=".5" transform="rotate(-28 5.5 10.8)" />
    <rect x="25" y="11.5" width="4" height="2.6" rx="1.3" fill={c} opacity=".5" transform="rotate(24 27 12.8)" />
    <circle cx="4.5" cy="18.5" r="1.5" fill={BLUSH} opacity=".8" />
    <Spark x={27.5} y={6.5} s={1} c={c} o={0.75} />
  </>),
};

/** @param {string} mode 문서 종류 */
export function DocGlyph({ mode, size = 32 }) {
  const draw = SHAPES[mode];
  if (!draw) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      {draw(`url(#g-${mode})`)}
    </svg>
  );
}
