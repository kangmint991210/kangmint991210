// 즐겨찾기 별표.
//
// 문서 종류를 모릅니다 — 보관함 목록의 어느 줄에나 붙습니다.
// 아직 계정에 저장되지 않은 문서(체험)는 표시해 둘 곳이 없으므로 가입 안내로 보냅니다.

import React from "react";
import { Star } from "lucide-react";
import { styles } from "../../ui/styles.js";

/**
 * @param {boolean} stored 계정(DB)에 들어가 있는 문서인가 — 아니면 별표를 남길 곳이 없습니다.
 * @param {boolean} guest  로그인하지 않은 상태인가.
 *
 * ⚠ stored 가 아닌 이유는 두 가지이고, 둘을 섞으면 안 됩니다.
 *    체험 중(guest)이면 가입하면 되지만, 로그인했는데도 저장이 안 된 것은 서버 문제라
 *    "가입하세요" 라고 안내하면 로그인한 사용자에게 거짓말이 됩니다.
 */
export function FavoriteButton({ on, stored = true, guest = false, onToggle, onNeedSignup }) {
  const title = stored
    ? (on ? "즐겨찾기 해제" : "즐겨찾기에 담기 — 나중에 별표만 모아 볼 수 있어요")
    : guest
      ? "가입하시면 즐겨찾기에 담을 수 있어요"
      : "이 문서가 계정에 저장되지 않아 즐겨찾기에 담을 수 없어요";

  return (
    <button
      style={{ ...styles.iconBtn, ...(on ? styles.iconBtnStar : {}), ...(stored ? {} : styles.iconBtnOff) }}
      title={title}
      aria-pressed={on}
      aria-label={title}
      disabled={!stored && !guest}
      onClick={() => (stored ? onToggle() : onNeedSignup?.("save"))}>
      <Star size={15} fill={on ? "currentColor" : "none"} />
    </button>
  );
}
