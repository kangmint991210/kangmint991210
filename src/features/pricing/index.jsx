// 요금제 카드와 "여기서 막힙니다"를 알려 주는 화면들.
//
// 벽은 두 종류입니다.
//  · PaywallModal   — 회원에게: 이 플랜부터 열린다 / 이번 달 횟수를 다 썼다
//  · SignupWallModal — 체험 중인 게스트에게: 가입하면 저장된다
// 어느 쪽이든 "무엇을 얻는지"를 문서 이름으로 구체적으로 보여 줍니다.

import React from "react";
import { Check } from "lucide-react";
import { PLANS, planName, upgradeCopy, planBenefits, PRICE_NOTE } from "../../domain/plans.js";
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
      {/* 부가세 안내는 카드와 함께 다닙니다 — 요금제 창과 랜딩 두 곳에서 모두 보여야 합니다 */}
      <div style={styles.priceNote}>{PRICE_NOTE}</div>
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
      <div style={styles.demoNote}>
        * 결제는 Paddle 에서 안전하게 처리돼요. 언제든 해지할 수 있고, 해지해도 결제한 기간까지는 그대로 쓰실 수 있어요.
      </div>
    </ModalShell>
  );
}

/**
 * 결제 직후의 몇 초를 설명하는 창.
 *
 * ⚠ 결제창이 닫혔다고 요금제가 바로 오르지 않습니다 — Paddle 이 우리 서버로
 *    알림을 보내야 반영됩니다. 그 사이에 아무 말이 없으면 선생님은
 *    "돈은 냈는데 그대로네" 라고 생각하게 됩니다. 그래서 상태를 그대로 보여 줍니다.
 */
export function BillingModal({ info, onClose }) {
  const VIEW = {
    waiting: {
      title: "결제를 확인하고 있어요",
      body: "잠시만 기다려 주세요. 보통 몇 초 안에 끝나요.",
      closable: false,
    },
    done: {
      title: `${planName(info.plan)} 플랜이 시작됐어요 🌿`,
      body: "이제 모든 문서를 만드실 수 있어요. 영수증은 결제하신 이메일로 갑니다.",
      closable: true,
    },
    slow: {
      title: "결제는 접수됐어요",
      body: "요금제 반영이 조금 늦어지고 있어요. 잠시 뒤 새로고침하면 적용된 걸 보실 수 있어요. " +
            "10분이 지나도 그대로면 문의해 주세요 — 결제 내역은 이미 남아 있으니 안전해요.",
      closable: true,
    },
    unavailable: {
      title: "결제 준비 중이에요",
      body: "지금은 결제를 받을 수 없어요. 조금 뒤에 다시 시도해 주세요.",
      closable: true,
    },
    error: {
      title: "결제를 시작하지 못했어요",
      body: info.message || "잠시 뒤 다시 시도해 주세요.",
      closable: true,
    },
  }[info.state] || { title: "결제", body: "", closable: true };

  return (
    <ModalShell onClose={VIEW.closable ? onClose : undefined}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>{VIEW.title}</div>
      <div style={styles.modalSub}>{VIEW.body}</div>
      {VIEW.closable && (
        <button style={styles.ctaPrimary} onClick={onClose}>확인</button>
      )}
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
      {/* 버튼을 혜택 목록 위에 둡니다 — 안내 문장을 읽은 직후가 누를 마음이 가장 큰 지점이고,
          목록은 "무엇이 열리는지" 확인하려는 사람만 이어서 보면 됩니다. */}
      <button style={styles.ctaPrimary} onClick={onOpenPricing}>요금제 보기</button>
      <div style={styles.paywallFeats}>
        {planBenefits(need).map((label) => (
          <div key={label} style={styles.planFeat}>
            <Check size={14} style={styles.planFeatIcon} /> {label}
          </div>
        ))}
      </div>
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
