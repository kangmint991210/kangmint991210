// 모든 화면 하단에 붙는 소셜 채널 줄.
//
// 아이콘은 각 서비스의 공식 브랜드 마크를 그대로 씁니다 — 색·모양을 바꾸면
// 무슨 채널인지 한눈에 알아보기 어렵고, 브랜드 사용 지침에도 어긋납니다.
// 그래서 단색 아이콘 묶음(lucide)을 쓰지 않고 여기에 직접 그립니다.
//
// 주소는 config.js 의 social 에 있습니다. 아직 채우지 않은 채널은 링크 대신
// 눌리지 않는 자리로 두고 "준비 중"이라고 알려 줍니다 — 없는 주소로 보내
// 오류 페이지를 보여 주는 것보다 낫습니다. (모양과 색은 그대로 둡니다)

import React, { useId } from "react";
import { social } from "../config.js";
import { styles } from "./styles.js";

const SIZE = 38;

/** 카카오톡 — 노란 바탕(#FEE500)에 검은 말풍선 */
function KakaoMark() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="12" fill="#FEE500" />
      <g transform="translate(6.5 7) scale(0.105)">
        <path fill="#000" d="M128 36C70.56 36 24 72.89 24 118.4c0 29.4 19.48 55.2 48.77 69.73-1.61 5.7-10.34 35.7-10.69 38.06 0 0-.21 1.79.95 2.47 1.16.68 2.52.15 2.52.15 3.3-.46 38.25-25.01 44.3-29.28 5.83.82 11.83 1.25 17.85 1.25 57.44 0 104-36.89 104-82.4S185.44 36 128 36z" />
      </g>
    </svg>
  );
}

/** 인스타그램 — 공식 그라디언트 바탕에 흰 카메라 */
function InstagramMark() {
  // 한 화면에 두 번 그려질 수 있어(랜딩 + 공통 푸터) 그라디언트 id 가 겹치지 않게 합니다
  const id = useId().replace(/:/g, "");
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <radialGradient id={`ig-${id}`} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#FDF497" />
          <stop offset="5%" stopColor="#FDF497" />
          <stop offset="45%" stopColor="#FD5949" />
          <stop offset="60%" stopColor="#D6249F" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#ig-${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="2.1">
        <rect x="10.5" y="10.5" width="19" height="19" rx="5.5" />
        <circle cx="20" cy="20" r="4.7" />
      </g>
      <circle cx="25.9" cy="14.1" r="1.35" fill="#fff" />
    </svg>
  );
}

/** 페이스북 — 파란 바탕(#1877F2)에 흰 f */
function FacebookMark() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="12" fill="#1877F2" />
      <path fill="#fff" d="M25.3 25.4l.83-5.4h-5.18v-3.5c0-1.48.72-2.92 3.04-2.92h2.36V8.99s-2.14-.37-4.19-.37c-4.28 0-7.07 2.59-7.07 7.28V20h-4.75v5.4h4.75v13.06a18.9 18.9 0 0 0 5.86 0V25.4z" />
    </svg>
  );
}

/** X — 검은 바탕에 흰 X */
function XMark() {
  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" rx="12" fill="#000" />
      <path fill="#fff" d="M27.1 10h3.34l-7.3 8.34L31.7 30h-6.72l-5.27-6.89L13.69 30H10.3l7.8-8.92L9.6 10h6.9l4.76 6.3L27.1 10zm-1.17 18h1.85L14.9 11.9h-1.99L25.93 28z" />
    </svg>
  );
}

const CHANNELS = [
  { key: "kakao", label: "카카오톡 채널", Mark: KakaoMark },
  { key: "instagram", label: "인스타그램", Mark: InstagramMark },
  { key: "facebook", label: "페이스북", Mark: FacebookMark },
  { key: "x", label: "X", Mark: XMark },
];

export function SocialLinks() {
  return (
    <div style={styles.socialRow}>
      {CHANNELS.map(({ key, label, Mark }) => {
        const href = social[key];
        return href ? (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener"
            style={styles.socialBtn} title={label} aria-label={label}>
            <Mark />
          </a>
        ) : (
          <span key={key} style={styles.socialBtn}
            title={`${label} — 준비 중이에요`} aria-label={`${label} 준비 중`}>
            <Mark />
          </span>
        );
      })}
    </div>
  );
}

/** 화면 맨 아래에 두는 줄. 지금은 소셜 채널만 담고 있습니다. */
export function SiteFooter() {
  return (
    <footer style={styles.siteFoot}>
      <SocialLinks />
    </footer>
  );
}
