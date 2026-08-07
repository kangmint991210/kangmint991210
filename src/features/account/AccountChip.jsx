// 로그인한 회원의 상태 — 요금제 배지 + 사용자 칩.
//
// 랜딩과 작업 화면이 "같은 사실"을 각자 그리면 서로 다른 말을 하게 됩니다.
// (실제로 랜딩에는 로그인 상태가 아예 안 보여서, 로그인한 분이 비로그인 화면을 보고 있었습니다)
// 두 화면이 이 조각을 함께 씁니다.
//
// 비로그인 상태에서는 아무것도 그리지 않습니다 — 그때 무엇을 보여 줄지는 화면마다 다릅니다.
// (작업 화면은 "체험 중 · 가입하기", 랜딩은 "로그인 / 무료로 시작")

import React from "react";
import { LogOut, Sparkles } from "lucide-react";
import { planName } from "../../domain/plans.js";
import { styles } from "../../ui/styles.js";

function PlanBadge({ plan, isAdmin, usage, quota, onOpenPricing }) {
  if (isAdmin) return <span style={styles.planPro} title="관리자 — 문서 전체 이용">👑 관리자</span>;
  // 최상위 플랜은 더 권할 것이 없으므로 배지만
  if (plan === "pro") {
    // ⚠ ✨ 이모지를 쓰면 안 됩니다. 이모지는 제 색으로 그려져 CSS 로 바꿀 수 없는데,
    //    노란 이모지가 노란 배지 위에 얹혀 거의 보이지 않았습니다.
    //    글자와 같은 진한 금색을 물려받는 아이콘으로 그립니다.
    return (
      <span style={styles.planPro} title={`이번 달 ${usage}/${quota}회 사용`}>
        <Sparkles size={13} strokeWidth={2.6} /> Pro
      </span>
    );
  }
  return (
    <button style={styles.planFree} onClick={onOpenPricing}
      title={`이번 달 ${usage}/${quota}회 사용 — 눌러서 요금제 보기`}>
      {planName(plan)} · 업그레이드
    </button>
  );
}

function UserChip({ user, onLogout }) {
  return (
    <button style={styles.userChip} onClick={onLogout} title={`${user.email || user.name} · 눌러서 로그아웃`}>
      {user.avatar
        ? <img src={user.avatar} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
        : <span style={styles.avatarFallback}>{(user.name || "쌤").slice(0, 1)}</span>}
      <span style={styles.userName}>{user.name}</span>
      <LogOut size={13} style={{ color: "#A9C3B9", flexShrink: 0 }} />
    </button>
  );
}

export function AccountChip({ user, plan, isAdmin, usage, quota, onLogout, onOpenPricing }) {
  if (!user) return null;
  return (
    <>
      <PlanBadge plan={plan} isAdmin={isAdmin} usage={usage} quota={quota} onOpenPricing={onOpenPricing} />
      <UserChip user={user} onLogout={onLogout} />
    </>
  );
}
