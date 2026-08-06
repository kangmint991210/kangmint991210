// 랜딩 히어로의 시그니처 — "휘갈긴 메모가 제출용 문서가 되는 순간".
//
// 이 서비스가 파는 것은 기능 목록이 아니라 그 변환 자체입니다.
// 글로 설명하면 읽어야 하지만, 눈앞에서 한 번 일어나면 8초면 이해됩니다.
// 그래서 히어로에서 실제로 보여 줍니다 — 교사 메모가 타이핑되고, 문서로 바뀝니다.
//
// 세 종류를 차례로 보여 주어 "여러 서류를 다 써 준다"는 것도 목록 없이 전달하고,
// 마지막 장면에서 멈춥니다. 끝없이 되풀이하면 눈길을 계속 빼앗아 아래 내용을 읽기 어렵습니다.
//
// ⚠ 움직임을 싫어하거나 어지러움을 느끼는 분들이 있습니다.
//    prefers-reduced-motion 이 켜져 있으면 타이핑·전환 없이 완성된 한 쌍을 그대로 보여 줍니다.

import React, { useEffect, useRef, useState } from "react";
import { styles } from "../../ui/styles.js";

/** 실제 생성물에서 가져온 장면들. 지어낸 문장을 쓰면 첫인상부터 거짓이 됩니다. */
const SCENES = [
  {
    memo: "오늘 모래놀이터에서 친구랑 케이크 만듦. 엄청 좋아함",
    badge: "학부모님께",
    title: "오늘의 알림장",
    rows: [
      ["", "오늘 ○○이는 모래놀이터에서 친구와 함께 커다란 케이크를 만들었어요. 모래를 꾹꾹 눌러 담고 나뭇잎으로 장식까지 더하며 한참을 몰두했답니다."],
    ],
  },
  {
    memo: "하빈이가 자동차 바퀴를 한참 돌려봄. 멈추면 또 돌림",
    badge: "원장님 제출용",
    title: "영유아 관찰기록 · 자연탐구",
    rows: [
      ["관찰내용", "자동차 놀잇감의 바퀴를 손가락으로 돌려 보고, 멈추면 다시 돌리는 과정을 반복함."],
      ["해석 및 평가", "사물의 움직임에 호기심을 보이며 인과관계를 스스로 탐색하고 있음."],
    ],
  },
  {
    memo: "어머님이 잠자는 시간 늦어서 걱정된다고 하심",
    badge: "학부모 상담",
    title: "상담일지 · 기본생활",
    rows: [
      ["부모 의견", "가정에서 취침 시간이 늦어지는 점을 염려하고 계심."],
      ["가정-기관 연계", "일정한 시간에 잠자리 준비를 시작하는 저녁 루틴을 함께 만들어 보시기를 권유드림."],
    ],
  },
];

const TYPE_MS = 38;     // 한 글자
const BEFORE_DOC = 420; // 다 적고 나서 잠깐 (읽을 틈). 길면 빈 자리만 오래 보입니다
const HOLD_DOC = 3000;  // 문서를 보여 주는 시간

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function HeroDemo() {
  const still = useRef(prefersReducedMotion()).current;
  const [scene, setScene] = useState(0);
  const [typed, setTyped] = useState(still ? SCENES[0].memo.length : 0);
  const [showDoc, setShowDoc] = useState(still);

  useEffect(() => {
    if (still) return;
    const timers = [];
    setTyped(0);
    setShowDoc(false);

    const memo = SCENES[scene].memo;
    const typing = setInterval(() => {
      setTyped((n) => {
        if (n >= memo.length) {
          clearInterval(typing);
          timers.push(setTimeout(() => setShowDoc(true), BEFORE_DOC));
          // 마지막 장면이면 그대로 둡니다 (되풀이하지 않음)
          if (scene < SCENES.length - 1) {
            timers.push(setTimeout(() => setScene((s) => s + 1), BEFORE_DOC + HOLD_DOC));
          }
          return n;
        }
        return n + 1;
      });
    }, TYPE_MS);

    return () => { clearInterval(typing); timers.forEach(clearTimeout); };
  }, [scene, still]);

  const s = SCENES[scene];
  const typing = !still && typed < s.memo.length;

  return (
    <div style={styles.demoStage} aria-label="메모를 적으면 문서가 만들어지는 예시">
      <div style={styles.demoMemo}>
        <span style={styles.demoMemoTape} />
        <div style={styles.demoMemoLabel}>교사 메모</div>
        <p style={styles.demoMemoText}>
          {s.memo.slice(0, typed)}
          {typing && <span className="demo-caret" style={styles.demoCaret} />}
        </p>
      </div>

      <div style={{ ...styles.demoArrow, ...(showDoc ? styles.demoArrowOn : {}) }}>
        <span style={styles.demoArrowLine} />
        <span style={styles.demoArrowText}>민트쌤이 정리해요</span>
        <span style={styles.demoArrowLine} />
      </div>

      <div className={`demo-doc${showDoc ? " on" : ""}`} style={styles.demoDoc}>
        <span style={styles.demoDocStripe} />
        <div style={styles.demoDocBody}>
          <span style={styles.demoDocBadge}>{s.badge}</span>
          <div style={styles.demoDocTitle}>{s.title}</div>
          {s.rows.map(([label, text], i) => (
            <div key={i} style={styles.demoRow}>
              {label && <span style={styles.demoRowLabel}>{label}</span>}
              <p style={styles.demoRowText}>{text}</p>
            </div>
          ))}
        </div>
      </div>

      {!still && scene < SCENES.length - 1 && (
        <div style={styles.demoDots} aria-hidden>
          {SCENES.map((_, i) => (
            <span key={i} style={{ ...styles.demoDot, ...(i === scene ? styles.demoDotOn : {}) }} />
          ))}
        </div>
      )}
    </div>
  );
}
