// 요금제 카드와 "여기서 막힙니다"를 알려 주는 화면들.
//
// 벽은 두 종류입니다.
//  · PaywallModal   — 회원에게: 이 플랜부터 열린다 / 이번 달 횟수를 다 썼다
//  · SignupWallModal — 체험 중인 게스트에게: 가입하면 저장된다
// 어느 쪽이든 "무엇을 얻는지"를 문서 이름으로 구체적으로 보여 줍니다.

import React from "react";
import { Check } from "lucide-react";
import { PLANS, planName, upgradeCopy, planBenefits } from "../../domain/plans.js";
import { MODES } from "../../domain/documents.js";
import { Mascot, ModalShell } from "../../ui/primitives.jsx";
import { styles } from "../../ui/styles.js";

export function PlanCards({ plan, onChoose }) {
  return (
    <div style={styles.planGrid}>
      {PLANS.map((pl) => {
        const paid = pl.key !== "free";
        const active = plan === pl.key;
        return (
          <div key={pl.key} style={{ ...styles.planCard, ...(pl.highlight ? styles.planCardHi : {}) }}>
            {pl.highlight && <span style={styles.planTag}>추천</span>}
            <div style={styles.planName}>{pl.name}</div>
            <div style={styles.planPrice}><span style={styles.planPriceNum}>{pl.price}</span><span style={styles.planPricePer}>{pl.period}</span></div>
            <div style={styles.planTagline}>{pl.tagline}</div>
            <div style={styles.planFeats}>
              {pl.features.map((f, i) => (
                <div key={i} style={styles.planFeat}><Check size={14} style={styles.planFeatIcon} /> <span>{f}</span></div>
              ))}
            </div>
            <button
              style={paid ? styles.planCtaPro : styles.planCtaFree}
              onClick={() => onChoose(pl.key)}
              disabled={active}>
              {active ? "이용 중" : pl.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function PricingModal({ plan, onChoose, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>요금제를 선택하세요</div>
      <div style={styles.modalSub}>필요할 때 언제든 바꿀 수 있어요.</div>
      <PlanCards plan={plan} onChoose={onChoose} />
      <div style={styles.demoNote}>* 베타 기간 — 유료 플랜을 누르면 결제 없이 바로 이용 상태로 전환돼요.</div>
    </ModalShell>
  );
}

export function PaywallModal({ info, onOpenPricing, onClose, onFallback }) {
  const need = info.need || "basic";
  const quotaOver = info.reason === "quota";
  const exportWall = info.reason === "export";

  const title = quotaOver ? "이번 달 생성 횟수를 다 썼어요"
    : exportWall ? "파일로 내려받기는 유료 플랜 기능이에요"
    : `${info.modeLabel || "이 문서"}는 ${planName(need)} 플랜부터예요`;

  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>{title}</div>
      <div style={styles.modalSub}>
        {quotaOver
          ? (info.msg || `요금제를 올리면 바로 이어서 만들 수 있어요.\n${planName(need)} 는 ${upgradeCopy(need)}`)
          : exportWall
            ? "표 복사는 무료 플랜에서도 쓸 수 있어요.\n워드·한글 파일 내려받기는 Basic 부터 열려요."
            : `${planName(need)} 플랜을 쓰면 ${upgradeCopy(need)}`}
      </div>
      <div style={styles.paywallFeats}>
        {planBenefits(need).map((label) => (
          <div key={label} style={styles.planFeat}>
            <Check size={14} style={styles.planFeatIcon} /> {label}
          </div>
        ))}
      </div>
      <button style={styles.ctaPrimary} onClick={onOpenPricing}>요금제 보기</button>
      {!quotaOver && !exportWall && (
        <button style={styles.textBtn} onClick={onFallback}>
          지금은 무료로 되는 {MODES[0].label} 쓸래요
        </button>
      )}
      <button style={styles.textBtn} onClick={onClose}>다음에 할게요</button>
    </ModalShell>
  );
}

export function SignupWallModal({ info, onSignup, onLogin, onClose, onFallback }) {
  const copy = {
    guestOver: {
      t: "체험 문서를 다 만들었어요",
      d: "가입하시면 방금 만든 문서가 그대로 저장되고,\n이어서 계속 만들 수 있어요. (무료 · 월 3회)",
    },
    lockedDoc: {
      t: `${info.modeLabel || "이 문서"}는 가입 후에 열려요`,
      d: "가입은 30초면 끝나요. 카카오·구글로 바로 시작할 수 있어요.\n체험으로 만든 문서도 같이 옮겨 드려요.",
    },
    save: {
      t: "저장하려면 가입이 필요해요",
      d: "가입하시면 만든 문서가 계정에 보관되고,\n다음에 들어와도 그대로 남아 있어요.",
    },
    copy: {
      t: "복사하려면 가입이 필요해요",
      d: "가입하시면 표 서식 그대로 복사해서\n한글·워드에 바로 붙일 수 있어요.",
    },
  }[info.kind] || { t: "가입하고 이어서 쓰기", d: "" };

  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>{copy.t}</div>
      <div style={styles.modalSub}>{copy.d}</div>
      <div style={styles.paywallFeats}>
        <div style={styles.planFeat}><Check size={14} style={styles.planFeatIcon} /> 만든 문서 자동 저장 · 다시 불러오기</div>
        <div style={styles.planFeat}><Check size={14} style={styles.planFeatIcon} /> 결과를 직접 고쳐 저장 · 즐겨찾기</div>
        <div style={styles.planFeat}><Check size={14} style={styles.planFeatIcon} /> 무료로 월 3회 생성</div>
      </div>
      <button style={styles.ctaPrimary} onClick={onSignup}>30초 만에 가입하기</button>
      <button style={styles.textBtn} onClick={onLogin}>이미 계정이 있어요</button>
      {info.kind === "lockedDoc" && (
        <button style={styles.textBtn} onClick={onFallback}>지금은 {MODES[0].label} 체험할래요</button>
      )}
    </ModalShell>
  );
}
