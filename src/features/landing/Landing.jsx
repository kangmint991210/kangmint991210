// 랜딩 화면.
//
// 여기서 하는 약속(가입 없이 체험 · 어떤 문서가 어느 플랜인지 · 결과물이 어떻게 생겼는지)이
// 앱 안의 실제 동작과 어긋나면 신뢰를 잃습니다. 잠금 뱃지와 샘플 카드를 함께 보여 주는 이유입니다.

import React from "react";
import { Lock } from "lucide-react";
import { brand, contact } from "../../config.js";
import { MODES } from "../../domain/documents.js";
import { planName } from "../../domain/plans.js";
import { Brand, Mascot } from "../../ui/primitives.jsx";
import { ObsCard } from "../results/Card.jsx";
import { PlanCards } from "../pricing/index.jsx";
import { styles } from "../../ui/styles.js";
import { css } from "../../ui/theme.js";

/* ---------- 랜딩 / 구독 ---------- */
// 랜딩에 그대로 렌더할 결과 샘플. "뭐가 나오는지" 못 보고 가입을 결정하게 두지 않기 위함.

const SAMPLE_OBS = {
  "child": "○○",
  "gender": "남",
  "birth": "2024.03.10",
  "period": "2026.03.01 ~ 2026.03.31",
  "recorder": "김민트",
  "areas": [
    {
      "area": "자연탐구",
      "datePlace": "3월 10일, 17일 원내 놀이실",
      "record": "3월 10일 — 하빈이가 자동차 놀잇감을 바닥에 내려놓고 손으로 앞뒤로 밀어봄. 멈춘 자동차의 바퀴 부분을 뚫어지게 응시함. 손가락으로 바퀴를 살짝 건드려 돌려보고 다시 멈추는 과정을 반복함. 3월 17일 — 공룡 모형을 양손에 하나씩 쥐고 바닥에 쾅 찍어봄. 모형을 바닥에 놓았다가 다시 집어 들어 높이 올린 뒤 떨어뜨리는 동작을 반복함. 떨어진 공룡의 위치를 고개를 숙여 확인하고 다시 손을 뻗어 집음. 공룡의 꼬리 부분을 만지며 질감을 느껴보고 등 부분을 손가락으로 훑어봄. 교사가 다가가자 공룡을 등 뒤로 숨겼다가 다시 꺼내어 보여줌. 놀잇감을 탐색하며 스스로 새로운 동작을 시도해보는 모습이 나타남. 정적인 탐색과 동적인 조작 활동을 골고루 수행함.",
      "interpretation": "[자연탐구 > 탐구과정 즐기기] 및 [자연탐구 > 생활 속에서 탐구하기] 영역임. 자동차 바퀴의 회전이나 공룡 모형의 움직임을 반복 확인하는 모습에서 사물에 대한 지적 호기심이 발달하고 있음을 알 수 있음. 구체적인 사물을 조작하며 물리적 특성을 익히고 있음. 반복적인 탐구 과정을 통해 사물의 인과관계를 이해하려는 시도가 관찰됨. 주변 환경 속 사물에 흥미를 느끼고 능동적으로 접근하는 태도가 보임. 향후 더 복잡한 구조의 놀잇감이나 다양한 재질의 사물을 제공하여 탐구 범위를 넓혀줄 필요가 있음. 사물을 다루는 소근육 조절 능력이 점차 정교해지고 있음.",
      "learning": "[자연탐구 > 탐구과정 즐기기] 하빈이는 놀잇감을 통해 주변 세상과 상호작용하는 법을 익히는 중임. 자동차의 바퀴가 움직이는 원리를 시각적으로 확인하며 자신의 행동이 결과에 미치는 영향을 스스로 발견하고 있음. 공룡 모형을 떨어뜨리거나 집는 과정을 통해 사물의 위치 변화를 인지하고 자신의 의지대로 대상을 통제하는 즐거움을 느낌. 정해진 놀이 방식에 얽매이지 않고 자신의 방식대로 자유롭게 놀잇감을 탐색하며 창의성을 발휘함. 사물을 관찰하고 조작하는 경험을 쌓아가며 대상에 대한 몰입 시간을 점차 늘려가는 과정에 있음. 하빈이가 스스로 발견한 즐거움을 놀이의 원동력으로 삼아 더 넓은 탐구 영역으로 나아가길 기대함.",
      "homeConnection": "교사는 하빈이가 다양한 재질의 놀잇감을 탐색할 수 있도록 환경을 조성함. 바퀴가 달린 기차나 굴러가는 공 등 움직이는 놀잇감을 추가로 배치하여 호기심을 충족시킬 계획임. 가정에서는 아이가 좋아하는 사물을 투명한 비닐 지퍼백에 넣어보고 속이 비치는 변화를 관찰하는 놀이를 권장함. \"하빈아, 공룡이 어디로 도망갔을까? 여기 쏙 숨었네\"와 같은 표현을 사용하여 사물의 위치 변화를 언어로 상호작용함. 아이와 함께 산책하며 길가에 있는 돌이나 나뭇잎을 주워보고 관찰하는 경험도 추천함. 부모는 아이가 사물을 충분히 살펴볼 수 있도록 기다려주는 여유를 가지는 것이 중요함. 일상의 평범한 사물들도 아이에게는 호기심의 대상이 될 수 있음을 인지하고 반응해주길 제안함."
    }
  ],
  "summary": "만 2세 발달 수준에 맞춰 신체 조작, 사회적 상호작용, 인지 탐구 측면에서 전반적으로 고른 발달을 보임. 자동차와 공룡 등 관심 대상에 대한 깊은 몰입과 탐색 의지가 강하게 나타남. 사회관계 측면에서는 낯선 상황에서 보호자를 찾거나 또래를 의식하는 등 정서적 안정감을 바탕으로 주변을 인식하는 변화가 보임. 의사소통 발달 또한 그림책을 가리키며 능동적으로 의미를 전달하려는 노력이 관찰됨. 안정된 애착 관계를 바탕으로 독립적인 탐색 활동을 시도하는 시기임. 앞으로 하빈이가 자신의 관심을 다양한 방식으로 표현하고 또래와 함께 놀이를 확장해 나갈 수 있도록 격려할 예정임. 하빈이의 개별적인 놀이 속도를 존중하며 긍정적인 상호작용을 지속하겠음."
};

export function Landing({ user, plan, onStart, onOpenPricing, onChoose, onPickDoc, onLogin, onLegal, lockOf }) {
  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <Brand />
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.navGhost} onClick={onOpenPricing}>요금제</button>
          {!user && <button style={styles.navGhost} onClick={onLogin}>로그인</button>}
          <button style={styles.navCta} onClick={onStart}>
            {user ? "이어서 작업하기" : "무료로 시작"}
          </button>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroMascot}><Mascot size={104} /></div>
        <h1 style={styles.heroTitle}>보육교사의 하루,<br />민트쌤이 함께해요</h1>
        <p style={styles.heroSub}>놀이 아이디어부터 관찰일지 · 알림장 · 상담일지까지.<br />간단한 메모만 적으면, 제출용 문서로 정리해 드려요.</p>
        <div style={styles.heroCtas}>
          <button style={styles.ctaPrimary} onClick={onStart}>
            {user ? "이어서 작업하기" : "가입 없이 만들어 보기"}
          </button>
          <button style={styles.ctaGhost} onClick={onOpenPricing}>요금제 보기</button>
        </div>
        <div style={styles.heroNote}>
          {user ? "다시 오셨네요! 하던 작업이 그대로 있어요 🌿" : "회원가입 없이 1건 바로 만들어 볼 수 있어요 · 신용카드 불필요"}
        </div>
      </section>

      <section style={styles.featWrap}>
        <div style={styles.sectionTitle}>이런 걸 만들어 드려요</div>
        <div style={styles.featGrid}>
          {MODES.map((m) => {
            // 어떤 문서가 어떤 플랜인지 여기서 미리 알려야, 가입한 뒤에 막히는 일이 없습니다
            const need = lockOf(m.key);
            return (
              <button key={m.key} className="feat-card" style={styles.featCard}
                onClick={() => onPickDoc(m.key)} title={`${m.label} 만들러 가기`}>
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <span style={styles.featLabel}>{m.label}</span>
                {need
                  ? <span style={styles.featLock}><Lock size={9} /> {planName(need)}</span>
                  : <span style={styles.featFree}>무료 체험</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 결과물 미리보기 — 무엇이 나오는지 보고 결정할 수 있게 실제 카드를 그대로 보여줍니다 */}
      <section style={styles.sampleWrap}>
        <div style={styles.sectionTitle}>이렇게 나와요</div>
        <div style={styles.sampleSub}>아래는 실제 생성 결과 화면이에요. 표 서식 그대로 한글·워드에 붙일 수 있어요.</div>
        <div style={styles.sampleCard}>
          <ObsCard o={SAMPLE_OBS} />
        </div>
        <button style={styles.sampleCta} onClick={onStart}>나도 만들어 보기</button>
      </section>

      <section style={styles.priceWrap}>
        <div style={styles.sectionTitle}>요금제</div>
        <PlanCards plan={user ? plan : undefined} onChoose={onChoose} />
        <div style={styles.demoNote}>
          * 지금은 베타 기간이라 유료 플랜도 결제 없이 바로 이용 상태로 전환됩니다. 결제는 곧 연결될 예정이에요.
        </div>
      </section>

      <footer style={styles.landFoot}>
        <div>{brand.name} · {brand.description}</div>
        <div style={styles.footLinks}>
          <button style={styles.footLink} onClick={() => onLegal("terms")}>이용약관</button>
          <span style={styles.footDot}>·</span>
          <button style={styles.footLink} onClick={() => onLegal("privacy")}>개인정보처리방침</button>
          <span style={styles.footDot}>·</span>
          <a style={styles.footLink} href={`mailto:${contact.email}`}>문의하기</a>
        </div>
      </footer>
    </div>
  );
}
