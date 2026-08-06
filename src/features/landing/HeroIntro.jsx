// 히어로 첫인상 — 반짝이는 별과, 한 글자씩 떨어지는 제목.
//
// 처음 열었을 때 화면이 "살아 있다"는 인상을 주는 자리입니다.
// 다만 한 번만 일어나고 멈춥니다 — 계속 움직이면 읽는 데 방해가 됩니다.
// (별의 반짝임만 은은하게 이어집니다)
//
// ⚠ 움직임에 어지러움을 느끼는 분들이 있습니다.
//    prefers-reduced-motion 이 켜져 있으면 처음부터 완성된 모습으로 보여 줍니다.

import React from "react";
import { Mascot } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";

/** 마스코트 별이 은은하게 반짝입니다. 곁의 작은 별들은 엇갈린 박자로 깜빡입니다. */
export function TwinkleMascot({ size = 104 }) {
  return (
    <div style={styles.heroMascot}>
      <span style={styles.twinkleWrap}>
        <span className="twinkle-star" style={styles.twinkleMain}><Mascot size={size} /></span>
        <span className="twinkle-spark s1" style={{ ...styles.spark, top: 2, right: 6 }}>✦</span>
        <span className="twinkle-spark s2" style={{ ...styles.spark, bottom: 12, left: 0 }}>✦</span>
        <span className="twinkle-spark s3" style={{ ...styles.spark, top: 26, left: 8, fontSize: 10 }}>✦</span>
      </span>
    </div>
  );
}

/**
 * 제목이 한 글자씩 떨어집니다.
 *
 * 글자마다 span 을 두므로, 화면 낭독기가 한 자씩 읽지 않도록
 * 제목 전체를 aria-label 로 주고 조각들은 숨깁니다.
 */
export function DropTitle({ lines, style }) {
  let index = 0;
  return (
    <h1 style={style} aria-label={lines.join(" ")}>
      {lines.map((line, li) => (
        <span key={li} style={{ display: "block" }} aria-hidden>
          {[...line].map((ch, ci) => (
            <span
              key={ci}
              className="drop-char"
              style={{ animationDelay: `${index++ * 105}ms` }}
            >
              {ch === " " ? " " : ch}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
