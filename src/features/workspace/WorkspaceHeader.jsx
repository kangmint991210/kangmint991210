// 앱 상단 — 브랜드, 계정, 남은 횟수.
// 한도가 있다는 사실은 소진 직전이 아니라 미리 알려야 놀라지 않습니다.

import React from "react";
import { Brand } from "../../ui/primitives.jsx";
import { AccountChip } from "../account/AccountChip.jsx";
import { styles } from "../../ui/styles.js";

/** 체험 중인 손님에게만 보여 주는 자리 — 회원의 상태는 AccountChip 이 그립니다 */
function GuestBadge({ onSignup }) {
  return (
    <button style={styles.planFree} onClick={onSignup}>
      체험 중 · 가입하기
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
          {app.isGuest
            ? <GuestBadge onSignup={() => app.openAuth("signup")} />
            : <AccountChip
                user={app.user} plan={app.plan} isAdmin={app.isAdmin}
                usage={app.usage} quota={app.quota}
                onLogout={app.logout} onOpenPricing={() => app.setShowPricing(true)} />}
        </div>
      </header>
      <QuotaBar app={app} />
    </>
  );
}
