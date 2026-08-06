// 화면 조각 검수용 페이지 (개발 전용).
//
// 결과 카드나 모달의 레이아웃이 어긋나도, 실제로 만들어 보기 전에는 눈에 띄지 않습니다.
// 로그인·요금제·AI 호출 없이 각 조각을 그대로 띄워 두고 눈으로 보거나
// 자동 검증(tests/visual.spec.mjs)이 치수를 재도록 하는 자리입니다.
//
//   npm run dev  →  http://localhost:5173/gallery.html?v=paywall
//
// ⚠ vite build 는 index.html 만 묶으므로 이 페이지는 배포본에 들어가지 않습니다.
// ⚠ Supabase 를 부르는 모듈은 import 하지 않습니다 — 환경변수 없이도 떠야 합니다.

import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { setPath } from "../src/lib/utils.js";
import { Card } from "../src/features/results/Card.jsx";
import { SaveBar } from "../src/features/results/SaveBar.jsx";
import { PaywallModal, SignupWallModal, PricingModal } from "../src/features/pricing/index.jsx";
import { PasswordField } from "../src/ui/fields.jsx";
import { styles } from "../src/ui/styles.js";
import { css } from "../src/ui/theme.js";

/* ---------- 표본 결과물 ---------- */
// 실제 생성물과 길이·형태가 비슷해야 레이아웃 문제가 드러납니다.

const SAMPLES = {
  assess: {
    assess: {
      child: "김○○", klass: "새싹반", age: "만 1세", period: "3~8월",
      areas: [
        { area: "신체운동·건강", content: "영아는 일상생활과 놀이 속에서 신체를 적극적으로 움직이며 다양한 경험을 통해 성장하는 모습을 나타냄. 혼자 계단을 한 칸씩 오르려고 시도하며 자신의 신체 능력을 스스로 확인하려는 모습을 보였고, 교사의 손을 잡고 안전하게 내려오는 경험을 반복하면서 신체 조절 능력과 균형감이 점차 향상되었음. 공을 던지고 굴리는 놀이를 즐기며 눈과 손의 협응력이 발달하는 모습을 보였고, 움직임을 반복하면서 신체활동에 대한 자신감도 함께 형성되었음." },
        { area: "의사소통", content: "놀이와 일상 속에서 자신의 생각과 요구를 다양한 방법으로 표현하는 모습이 두드러지게 나타남. “주세요”, “엄마”, “더” 등 친숙한 단어를 연결하여 표현하기 시작하였으며, 말과 손짓을 함께 사용하여 자신의 의사를 전달할 수 있었음. 교사의 질문이나 이야기에도 관심을 보여 눈을 맞추고 반응하는 빈도가 증가하였고, 반복적인 상호작용을 통해 표현의 폭이 넓어졌음." },
        { area: "사회관계", content: "친구가 가지고 있는 장난감에 관심을 보이며 함께 놀이하려고 시도하는 모습이 늘어남. 교사에게 안기며 애정을 표현하고 필요할 때 도움을 요청하는 등 안정적인 애착을 바탕으로 관계를 넓혀 가고 있었음. 또래와 같은 공간에서 놀이하는 시간이 길어지면서 함께하는 즐거움을 경험하였음." },
        { area: "예술경험", content: "동요가 나오면 몸을 흔들고 손뼉을 치며 리듬에 맞춰 표현하는 모습을 자주 보였음. 크레파스로 자유롭게 끼적이기를 즐기며 손의 움직임에 따라 달라지는 흔적에 흥미를 나타냄. 소리와 색을 감각적으로 경험하며 자신을 표현하는 방법을 넓혀 가고 있었음." },
        { area: "자연탐구", content: "물놀이와 모래놀이를 즐기며 컵에 담고 옮기는 놀이를 반복함. 곤충이나 꽃을 발견하면 가까이 다가가 관찰하며 교사의 설명을 들으려는 모습을 보였고, 새로운 자연물을 탐색하는 과정에서 지속적인 호기심과 탐구 태도를 형성하였음." },
        { area: "기본생활습관", content: "숟가락을 사용하여 스스로 식사하려는 모습을 지속적으로 보였으며, 손 씻기와 정리정돈에도 관심을 가지고 교사의 안내에 따라 참여할 수 있었음. 반복적인 생활 경험을 통해 스스로 해보려는 태도가 증가하였음." },
      ],
      supportPlan: "이와 같은 관찰을 바탕으로 영아가 스스로 신체를 움직이며 다양한 놀이를 충분히 경험할 수 있도록 실내외 신체활동을 지속적으로 제공할 계획임. 일상 속에서 영아의 말과 몸짓에 민감하게 반응하며 언어적 상호작용을 확장하고, 또래와 함께하는 놀이를 자연스럽게 지원하여 긍정적인 사회적 경험을 지속적으로 제공하고자 함.",
      parentMeeting: "면담에서는 영아가 스스로 해보려는 시도가 부쩍 늘었다는 점을 강점으로 전하고자 함. 가정에서도 계단 오르내리기나 숟가락 사용처럼 스스로 해볼 기회를 기다려 주시기를 권유드리고, 아이의 짧은 말에 문장으로 되받아 주시면 표현이 자연스럽게 늘어남을 안내하고자 함.",
    },
  },
  life: {
    life: {
      child: "김○○", klass: "햇살반", age: "만 0세", date: "2026-03-06",
      items: [
        { area: "수면", high: "일정한 시간에 편안한 분위기에서 스스로 잠들며 충분한 휴식을 취함.", mid: "교사의 토닥임과 부드러운 노래를 들으며 안정감을 느끼고 잠을 청함.", low: "익숙한 환경과 교사의 따뜻한 상호작용 속에서 차분하게 수면을 시도함." },
        { area: "배변", high: "기저귀가 젖었을 때 소리나 몸짓으로 불편함을 알리며 의사소통함.", mid: "교사의 도움을 받아 기저귀를 갈며 청결하고 쾌적한 상태를 경험함.", low: "기저귀 갈이 과정에서 교사의 부드러운 접촉을 통해 안정감을 느끼며 익숙해짐." },
        { area: "의사소통", high: "물이나 안아와 같은 단어를 명확히 사용하여 자신의 필요를 구체적으로 표현함.", mid: "간단한 단어나 몸짓을 사용하여 자신의 의사를 전달하려고 노력함.", low: "교사가 들려주는 말에 집중하고 소리 내어 반응하며 언어 경험을 쌓아 감." },
      ],
    },
  },
  play: {
    activities: [{
      title: "알록달록 풍선 놀이", age: "만 3세", place: "실내", duration: "20분",
      domains: ["신체운동·건강", "예술경험"],
      goal: "풍선을 다양한 방법으로 움직이며 신체 조절력을 기르고 즐거움을 느낀다.",
      materials: ["풍선", "색테이프", "바구니"],
      steps: [
        "바닥에 색테이프로 길을 만들고 풍선을 하나씩 나누어 줍니다.",
        "손바닥으로 통통 치며 풍선이 떨어지지 않게 이동해 봅니다.",
        "친구와 마주 보고 풍선을 주고받으며 놀이를 이어 갑니다.",
      ],
      extension: "풍선에 얼굴을 그려 이름을 붙여 주고 역할 놀이로 이어 갑니다.",
      safety: "터진 풍선 조각은 바로 치워 삼킴 사고를 예방합니다.",
    }],
  },
  note: {
    note: {
      message: "오늘 ○○이는 모래놀이터에서 친구와 함께 커다란 케이크를 만들었어요.\n모래를 꾹꾹 눌러 담고 나뭇잎으로 장식까지 더하며 한참을 몰두했답니다.",
      homeTip: "가정에서도 밀가루 반죽이나 찰흙으로 모양 만들기를 해보시면 오늘의 즐거움이 이어질 거예요.",
    },
  },
  obs: {
    observation: {
      child: "○○", gender: "여", birth: "2023.02.20", period: "2026년 3월", recorder: "김교사",
      areas: [{
        area: "사회관계", datePlace: "2026.3.6 / 교실 쌓기 영역",
        record: "블록으로 탑을 쌓던 중 친구가 다가오자 자리를 옆으로 옮겨 공간을 내어 주었다.",
        interpretation: "또래의 존재를 인식하고 함께 놀이하려는 마음이 자라고 있음을 보여 준다.",
        learning: "더불어 생활하기 — 친구와 공간을 나누며 함께하는 즐거움을 알아 간다.",
        homeConnection: "가정에서도 형제나 부모와 물건을 나누어 쓰는 경험을 자주 만들어 주세요.",
      }],
      summary: "또래와의 상호작용이 늘고 있으며, 갈등 상황에서도 교사의 중재를 받아들인다.",
    },
  },
  daily: {
    daily: {
      week: "3월 2주", klass: "햇살반", age: "만 3세", theme: "봄을 느껴요", nextTheme: "새싹이 자라요",
      schedule: [{ time: "09:00", name: "등원 및 맞이하기", content: "교사와 인사를 나누고 스스로 가방을 정리함." }],
      areas: [{ area: "쌓기", content: "봄 나들이 길을 블록으로 만들며 구성 놀이를 확장함." }],
      days: [{ day: "월", playEval: "블록 놀이에 몰입하며 친구와 역할을 나누었다.", supportPlan: "다양한 크기의 블록을 추가로 제공한다.", reading: ["공간 구성 능력이 자라고 있다."] }],
      weekEval: "봄 주제에 관심을 보이며 자연물 탐색이 활발했다.",
      safety: "봄철 황사 대비 손 씻기 지도",
    },
  },
  adapt: {
    adapt: {
      child: "○○", age: "만 1세", klass: "새싹반", birth: "2025.01.10", period: "3/2 ~ 3/6",
      days: [{
        day: "1일차", date: "3/2(월)", level: "중", arrive: "09:30", leave: "11:30", health: "-",
        record: "보호자와 헤어질 때 잠시 울었으나 교사가 안아 주자 곧 진정하였다.",
        interpretation: "낯선 환경에 대한 불안이 있으나 교사의 신체 접촉으로 안정을 찾는다.",
        homeConnection: "가정에서 어린이집 이야기를 즐겁게 나누어 주세요.",
      }],
      summary: "짧은 시간부터 점진적으로 늘려 가며 안정적인 적응을 지원한다.",
    },
  },
  counsel: {
    counsel: {
      child: "○○", klass: "햇살반", birth: "2022.05.11", age: "만 3세",
      guardian: "○○ 모", teacher: "김교사", date: "2026-03-06", method: "방문",
      domains: [{ area: "기본생활", content: "스스로 손을 씻고 자리를 정리하는 습관이 자리 잡아 가고 있습니다." }],
      parentNote: "가정에서 잠자리에 드는 시간이 늦어지는 점을 걱정하고 계십니다.",
      homeConnection: "일정한 시간에 잠자리 준비를 시작하는 저녁 루틴을 함께 만들어 보시면 좋겠습니다.",
      summary: "또래 관계가 넓어지고 있으며 언어 표현이 부쩍 늘었습니다.",
    },
  },
};

/* ---------- 조각들 ---------- */

function CardView({ kind }) {
  const [payload, setPayload] = useState(SAMPLES[kind]);
  return (
    <div style={{ ...styles.wrap, padding: "20px 16px" }}>
      <Card
        kind={kind}
        p={payload}
        guest={false}
        canExport
        onEdit={(path, value) => setPayload((p) => setPath(p, path, value))}
      />
    </div>
  );
}

function SaveBarView() {
  return (
    <div style={{ ...styles.wrap, padding: "20px 16px", gap: 12, display: "flex", flexDirection: "column" }}>
      <SaveBar dirty stored onSave={() => {}} onRevert={() => {}} />
      <SaveBar dirty saving stored onSave={() => {}} onRevert={() => {}} />
      <SaveBar dirty failed stored onSave={() => {}} onRevert={() => {}} />
      <SaveBar dirty stored={false} guest onNeedSignup={() => {}} onRevert={() => {}} />
      <SaveBar dirty stored={false} onRevert={() => {}} />
      <SaveBar saved />
    </div>
  );
}

function PasswordView() {
  const [pw, setPw] = useState("mint1234");
  const [pw2, setPw2] = useState("");
  return (
    <div style={{ ...styles.authWrap }}>
      <div style={{ ...styles.authCard, textAlign: "left" }}>
        <div style={styles.authForm}>
          <PasswordField label="비밀번호" value={pw} onChange={setPw} placeholder="6자 이상" autoComplete="new-password" />
          <PasswordField label="비밀번호 확인" value={pw2} onChange={setPw2} placeholder="한 번 더 입력" autoComplete="new-password" />
        </div>
      </div>
    </div>
  );
}

const noop = () => {};

const VIEWS = {
  paywall: () => <PaywallModal info={{ need: "basic", reason: "lock", modeLabel: "생활기록부" }}
    onOpenPricing={noop} onClose={noop} onFallback={noop} />,
  "paywall-quota": () => <PaywallModal info={{ need: "pro", reason: "quota" }}
    onOpenPricing={noop} onClose={noop} onFallback={noop} />,
  signup: () => <SignupWallModal info={{ kind: "lockedDoc", modeLabel: "생활기록부" }}
    onSignup={noop} onLogin={noop} onClose={noop} onFallback={noop} />,
  pricing: () => <PricingModal plan="free" onChoose={noop} onClose={noop} />,
  savebar: () => <SaveBarView />,
  password: () => <PasswordView />,
  ...Object.fromEntries(Object.keys(SAMPLES).map((k) => [`card-${k}`, () => <CardView kind={k} />])),
};

function Gallery() {
  const want = new URLSearchParams(location.search).get("v");
  const View = VIEWS[want];

  if (!View) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui", lineHeight: 2 }}>
        <h1 style={{ fontSize: 18 }}>화면 조각 검수 (개발 전용)</h1>
        <p style={{ color: "#666", fontSize: 14 }}>보고 싶은 조각을 고르세요. 배포본에는 포함되지 않습니다.</p>
        {Object.keys(VIEWS).map((k) => (
          <div key={k}><a href={`?v=${k}`}>{k}</a></div>
        ))}
      </div>
    );
  }
  return <><style>{css}</style><View /></>;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Gallery />);
