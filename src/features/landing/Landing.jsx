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
  child: "○○", gender: "여", birth: "2021.5.12 / 47개월",
  period: "2026년 3월 1일 ~ 3월 31일", recorder: "김민트",
  areas: [
    {
      area: "사회관계",
      datePlace: "3월 12일 · 교실 역할놀이 영역",
      record: "친구가 병원놀이를 하는 곳으로 다가가 “나도 같이 해도 돼?” 하고 물어본 뒤, 친구가 고개를 끄덕이자 청진기를 들고 의사 역할을 맡았습니다. 인형을 눕히고 “아프지 마세요, 금방 나아요”라고 말하며 친구와 번갈아 진료하는 모습을 보였습니다.",
      interpretation: "또래에게 먼저 놀이를 제안하고 역할을 나누어 맡으며 협동 놀이에 참여하고 있습니다. 상대의 반응을 기다린 뒤 놀이에 들어가는 모습에서 또래 관계 형성 기술이 자라고 있음을 볼 수 있습니다.",
    },
    {
      area: "의사소통",
      datePlace: "3월 19일 · 교실 언어 영역",
      record: "그림책 『코끼리와 친구들』을 보며 “코끼리가 왜 혼자 있어?”라고 묻고, 교사의 대답을 들은 뒤 “나는 친구가 많아서 안 심심해”라고 자기 경험과 연결해 이야기했습니다.",
      interpretation: "이야기 속 상황을 자신의 경험과 연결지어 표현하고 있으며, 궁금한 점을 문장으로 묻는 등 언어를 통한 상호작용이 활발합니다.",
    },
  ],
  summary: "또래와의 놀이에서 먼저 다가가 제안하고 역할을 나누는 모습이 꾸준히 관찰됩니다. 자신의 생각을 문장으로 표현하는 힘도 함께 자라고 있어, 앞으로는 여러 명이 함께하는 협동 놀이 상황을 더 마련해 주려고 합니다.",
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
