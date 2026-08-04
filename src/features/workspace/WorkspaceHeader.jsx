// 앱 상단 — 브랜드, 계정, 남은 횟수.
// 한도가 있다는 사실은 소진 직전이 아니라 미리 알려야 놀라지 않습니다.

import React from "react";
import { LogOut } from "lucide-react";
import { planName } from "../../domain/plans.js";
import { Brand } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";

function PlanBadge({ app }) {
  const { isGuest, isAdmin, plan, usage, quota } = app;
  if (isGuest) {
    return (
      <button style={styles.planFree} onClick={() => app.openAuth("signup")}>
        체험 중 · 가입하기
      </button>
    );
  }
  if (isAdmin) return <span style={styles.planPro} title="관리자 — 문서 6종 전체 이용">👑 관리자</span>;
  // 최상위 플랜은 더 권할 것이 없으므로 배지만
  if (plan === "pro") {
    return <span style={styles.planPro} title={`이번 달 ${usage}/${quota}회 사용`}>✨ Pro</span>;
  }
  return (
    <button style={styles.planFree} onClick={() => app.setShowPricing(true)}>
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

function QuotaBar({ app }) {
  const { isGuest, isAdmin, guest, usage, quota, quotaLeft } = app;
  // 10% 남았을 때부터 업그레이드를 권합니다(너무 일찍 권하면 광고처럼 읽힘)
  const nearLimit = quotaLeft <= Math.max(1, Math.floor(quota * 0.1));

  return (
    <div style={styles.quotaBar}>
      {isGuest ? (
        <span>
          🌿 가입 없이 <b>{guest.left}회</b> 더 만들어 볼 수 있어요.
          <button style={styles.linkBtn} onClick={() => app.openAuth("signup")}>가입하고 저장하기</button>
        </span>
      ) : isAdmin ? (
        <span>👑 관리자 — 문서 6종 · 생성 무제한</span>
      ) : (
        <span>
          이번 달 <b>{usage}</b> / {quota.toLocaleString()}회 사용
          {nearLimit && (
            <button style={styles.linkBtn} onClick={() => app.setShowPricing(true)}>요금제 올리기</button>
          )}
        </span>
      )}
    </div>
  );
}

export function WorkspaceHeader({ app }) {
  return (
    <>
      <header style={styles.header}>
        <Brand onClick={() => app.setView("landing")} title="홈으로 이동" />
        <div style={styles.headRight}>
          <PlanBadge app={app} />
          {app.user && <UserChip user={app.user} onLogout={app.logout} />}
        </div>
      </header>
      <QuotaBar app={app} />
    </>
  );
}
