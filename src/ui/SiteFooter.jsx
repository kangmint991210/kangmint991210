// 모든 화면 하단에 붙는 소셜 채널 줄.
//
// 주소는 config.js 의 social 에 있습니다. 아직 계정을 만들지 않아 비어 있으면
// 아이콘은 보여 주되 누를 수 없게 합니다 — 없는 주소로 보내 오류 페이지를 보여 주는 것보다
// "준비 중"이라고 말해 주는 편이 낫습니다.

import React from "react";
import { Instagram, Facebook } from "lucide-react";
import { social } from "../config.js";
import { styles } from "./styles.js";

// 카카오톡·X 는 아이콘 묶음에 없어 직접 그립니다.
function KakaoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
      <path d="M128 36C70.56 36 24 72.89 24 118.4c0 29.4 19.48 55.2 48.77 69.73-1.61 5.7-10.34 35.7-10.69 38.06 0 0-.21 1.79.95 2.47 1.16.68 2.52.15 2.52.15 3.3-.46 38.25-25.01 44.3-29.28 5.83.82 11.83 1.25 17.85 1.25 57.44 0 104-36.89 104-82.4S185.44 36 128 36z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.7l7.9-9.1L1 2h7l4.8 6.4L18.9 2zm-2.4 18h1.9L7.6 3.9H5.6L16.5 20z" />
    </svg>
  );
}

const CHANNELS = [
  { key: "kakao", label: "카카오톡 채널", Icon: KakaoIcon },
  { key: "instagram", label: "인스타그램", Icon: () => <Instagram size={17} /> },
  { key: "facebook", label: "페이스북", Icon: () => <Facebook size={17} /> },
  { key: "x", label: "X", Icon: XIcon },
];

export function SocialLinks() {
  return (
    <div style={styles.socialRow}>
      {CHANNELS.map(({ key, label, Icon }) => {
        const href = social[key];
        return href ? (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener"
            style={styles.socialBtn} title={label} aria-label={label}>
            <Icon />
          </a>
        ) : (
          <span key={key} style={{ ...styles.socialBtn, ...styles.socialOff }}
            title={`${label} — 준비 중이에요`} aria-label={`${label} 준비 중`}>
            <Icon />
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
