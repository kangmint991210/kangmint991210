// 민트쌤 — 보육교사를 위한 문서 작성 도우미.
//
// 이 파일은 "어느 화면을 보여 줄지"만 정합니다. 상태와 규칙은 아래에 나뉘어 있습니다.
//
//   src/config.js        브랜드·모델·체험 한도 같은 설정값
//   src/domain/          문서 종류, 요금제, 기록 규칙, 내보내기 (화면을 모르는 순수 규칙)
//   src/prompts/         문서별 AI 프롬프트
//   src/services/        Gemini 호출, Supabase 접근
//   src/hooks/           계정·체험·기록 상태와 그 조합(useMintApp)
//   src/ui/              디자인 토큰, 공통 조각, 입력 필드
//   src/features/        화면 단위 (landing / auth / legal / workspace / results / pricing)

import React from "react";
import { useMintApp } from "./src/hooks/useMintApp.js";
import { DEFAULT_MODE } from "./src/domain/documents.js";
import { DEFAULT_PLAN, minPlanFor } from "./src/domain/plans.js";
import { Landing } from "./src/features/landing/Landing.jsx";
import { AuthPage } from "./src/features/auth/AuthPage.jsx";
import { LegalPage } from "./src/features/legal/LegalPage.jsx";
import { Workspace } from "./src/features/workspace/Workspace.jsx";
import { PricingModal, PaywallModal, SignupWallModal } from "./src/features/pricing/index.jsx";

export default function MintSsaem() {
  const app = useMintApp();
  const { view, user, plan, showPricing, paywall, signupWall } = app;

  // 요금제 카드를 눌렀을 때: 비로그인 + 무료는 체험으로, 그 밖에는 로그인으로.
  const chooseFromLanding = (key) =>
    key === DEFAULT_PLAN && !user ? app.startTrial() : app.goAuth(key);

  if (view === "landing") {
    return (
      <>
        <Landing
          user={user}
          plan={plan}
          isAdmin={app.isAdmin}
          usage={app.usage}
          quota={app.quota}
          onLogout={app.logout}
          onStart={app.startTrial}
          onOpenPricing={() => app.setShowPricing(true)}
          onChoose={chooseFromLanding}
          onPickDoc={app.pickDoc}
          onLogin={() => app.openAuth("login")}
          onLegal={app.openLegal}
          // "지금 이 사용자에게" 잠겼는지를 봅니다.
          // 예전에는 요금제와 무관하게 최소 플랜만 표시해, Pro 회원에게도 자물쇠가 붙었습니다.
          lockOf={(key) => (app.isLocked(key) ? minPlanFor(key) : null)}
        />
        {showPricing && (
          <PricingModal
            plan={user ? plan : undefined}
            onChoose={chooseFromLanding}
            onClose={() => app.setShowPricing(false)}
          />
        )}
      </>
    );
  }

  if (view === "auth") {
    return (
      <AuthPage
        mode={app.authMode}
        setMode={app.setAuthMode}
        onHome={() => { app.setAuthError(null); app.setView("landing"); }}
        onLegal={app.openLegal}
        initialError={app.authError}
      />
    );
  }

  if (view === "legal") {
    return <LegalPage tab={app.legalTab} setTab={app.setLegalTab} onHome={app.closeLegal} />;
  }

  return (
    <>
      <Workspace app={app} />

      {showPricing && (
        <PricingModal plan={plan} onChoose={app.choosePlan} onClose={() => app.setShowPricing(false)} />
      )}
      {paywall && (
        <PaywallModal
          info={paywall}
          onOpenPricing={() => { app.setPaywall(null); app.setShowPricing(true); }}
          onClose={() => app.setPaywall(null)}
          onFallback={() => { app.setPaywall(null); app.setMode(DEFAULT_MODE); }}
        />
      )}
      {signupWall && (
        <SignupWallModal
          info={signupWall}
          onSignup={() => { app.setSignupWall(null); app.openAuth("signup"); }}
          onLogin={() => { app.setSignupWall(null); app.openAuth("login"); }}
          onClose={() => app.setSignupWall(null)}
          onFallback={() => { app.setSignupWall(null); app.setMode(DEFAULT_MODE); }}
        />
      )}
    </>
  );
}
