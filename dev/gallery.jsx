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
import { Landing } from "../src/features/landing/Landing.jsx";
import { minPlanFor, isDocLocked } from "../src/domain/plans.js";
import { WorkCalendar } from "../src/features/calendar/WorkCalendar.jsx";
import { ObsPanel } from "../src/features/editor/Panels.jsx";
import { createEmptyForm } from "../src/domain/documents.js";
import { DocGlyph, GlyphDefs } from "../src/features/landing/DocGlyphs.jsx";
import { MODES } from "../src/domain/documents.js";
import { SiteFooter } from "../src/ui/SiteFooter.jsx";
import { LegalPage, LEGAL_TABS } from "../src/features/legal/LegalPage.jsx";
import { styles } from "../src/ui/styles.js";
import { css } from "../src/ui/theme.js";

/* ---------- 표본 결과물 ---------- */
// 실제 생성물과 길이·형태가 비슷해야 레이아웃 문제가 드러납니다.

const SAMPLES = {
  monthly: {
    monthly: {
      theme: "여름과 물놀이", age: "만 2세", month: "2026년 7월",
      flow: "'여름과 물놀이'를 주제로 다양한 물의 특성과 바다생물을 탐색하는 놀이가 활발하게 이루어졌음. 물감 물놀이를 통해 색이 섞이는 변화를 관찰하고, 물총 놀이에서는 물의 움직임과 힘을 경험하며 놀이를 즐겼음. 바다생물을 탐색하는 과정에서는 다양한 생물의 이름과 특징에 관심을 보이며 주제에 대한 이해가 자연스럽게 깊어졌음.",
      expansion: "계획된 놀이에서 나아가 바다생물을 흉내 내는 놀이가 반복적으로 이어졌음. 친구들과 함께 문어, 상어, 물고기 등의 움직임을 표현하며 놀이를 확장하였고, 서로의 표현을 따라 하거나 새로운 움직임을 만들어 내는 과정에서 즐겁게 상호작용하는 모습이 나타났음.",
      support: "다양한 물놀이 도구와 탐색 재료를 자유롭게 사용할 수 있도록 환경을 구성하자 스스로 놀이를 선택하고 확장하는 모습이 이어졌음. 바다생물 그림 자료와 물놀이 교구를 함께 제공한 환경은 탐색과 표현 놀이가 자연스럽게 연결될 수 있도록 도움을 주었음.",
      expression: "바다생물 사진을 보며 이름을 말하거나 특징을 표현하는 모습을 통해 관찰한 내용을 언어로 나타내고 자신의 경험과 연결하여 이해하는 모습이 나타났음. 익숙한 생물을 친구에게 소개하며 자연스럽게 의사소통하는 경험이 이루어졌음.",
      parentNote: "부모면담에서 평소 집에서도 바다생물 책을 자주 본다는 의견을 반영하여 관련 그림자료와 탐색 자료를 제공하였으며, 가정에서의 관심이 어린이집 놀이로 자연스럽게 이어져 더욱 적극적으로 참여하는 모습을 확인할 수 있었음.",
      nextMonth: "다음 달에는 다양한 감각을 활용한 여름 탐색 놀이를 계획하여 물, 자연물, 소리, 촉감 등 여러 감각을 활용한 경험을 더욱 풍부하게 제공하고자 함. 스스로 발견한 경험을 친구들과 나누며 놀이가 더 깊이 확장될 수 있도록 지원할 계획임.",
    },
  },
  safety: {
    safety: {
      age: "만 4세", topic: "교통안전", subtopic: "횡단보도 안전하게 건너기",
      record: "교실 벽면에 붙어 있는 신호등과 횡단보도 그림을 바라보던 유아들이 \"언제 건너야 해요?\"라고 관심을 보이며 자연스럽게 이야기를 나누기 시작했음. 유아들과 함께 신호등의 색깔이 의미하는 행동과 횡단보도를 안전하게 건너는 방법에 대해 이야기하며 초록불이 켜진 후 좌우를 살피고 손을 든 뒤 천천히 건너야 한다는 점을 알아보았음. 유아들은 실제 상황을 떠올리며 안전하게 길을 건너는 방법을 적극적으로 이야기하였고, 무단횡단이 위험한 이유와 교통안전 규칙의 필요성을 이해하는 모습을 보였음. 앞으로도 산책 및 야외활동 시 횡단보도와 신호등을 직접 살펴보며 올바른 교통안전 습관을 지속적으로 익힐 수 있도록 반복적으로 안내할 계획이 있음.",
    },
  },
  trip: {
    trip: {
      place: "서울상상나라", form: "전시 체험", transport: "", age: "만 4세", count: "20명", date: "",
      goals: [
        "다양한 전시를 직접 탐색하고 체험하며 호기심을 바탕으로 탐구하는 즐거움을 경험하고, 친구와 함께 의견을 나누며 협력하는 태도를 기른다.",
        "놀이 중심의 전시 체험을 통해 스스로 탐색하고 표현하는 경험을 확장하며 창의성과 문제해결력을 기른다.",
      ],
      prepare: ["견학 장소 및 이동 경로 안내", "공공장소 예절 이야기 나누기", "교사 비상연락망 및 응급약품 준비", "이름표 착용 및 인원 확인", "현장 담당자와 사전 연락"],
      preActivity: ["사진과 영상을 보며 어떤 곳인지 알아보기", "다양한 전시 체험에 대해 이야기 나누기", "전시물을 눈으로 보고 손으로 체험할 때의 약속 알아보기", "친구와 차례를 지키며 활동하는 방법 이야기하기"],
      activity: {
        check: ["출석 및 건강 상태 확인", "안전수칙 및 관람 예절 다시 확인", "인원 점검"],
        move: ["장소로 이동", "이동 중 창밖 풍경을 관찰하며 계절의 변화를 이야기 나누기"],
        onsite: ["신체놀이 공간에서 다양한 놀이 시설을 활용하여 몸을 움직이며 협동 놀이 경험하기", "역할놀이 공간에서 다양한 직업과 생활 모습을 역할놀이로 표현하기", "물 탐색 전시에서 물의 움직임과 성질을 직접 탐색하기", "자연·창의 전시 공간에서 다양한 소재를 관찰하고 놀이를 통해 창의적으로 표현하기", "친구와 함께 전시물을 탐색하며 느낀 점 이야기 나누기"],
        back: ["인원 점검 후 이동", "견학 소감 간단히 이야기 나누기", "이름표 및 소지품 확인"],
      },
      postActivity: ["견학 사진을 보며 기억에 남는 활동 회상하기", "가장 재미있었던 전시를 그림으로 표현하기", "모둠별로 경험한 내용을 발표하기", "블록과 다양한 교구를 활용하여 나만의 상상 전시관 만들기", "역할놀이로 견학 장소를 다시 꾸며보기"],
      review: "다양한 전시 공간을 자유롭게 탐색하며 스스로 놀이를 선택하고 문제를 해결하려는 모습이 나타났으며, 친구와 함께 의견을 나누고 협력하는 과정에서 사회적 상호작용이 활발했음. 다양한 전시를 직접 체험하며 호기심을 확장하고 자신의 생각을 언어와 놀이로 자연스럽게 표현하는 모습이 나타났음.",
    },
  },
  event: {
    event: {
      name: "여름 물놀이 축제", date: "2026년 8월 둘째 주 금요일 10:00~12:00 (우천 시 실내 대체 프로그램 운영)",
      group: "영아(만 0~2세) 18명 / 유아(만 3~5세) 22명 (총 40명)", teachers: "8명",
      place: "어린이집 실외 놀이터(물놀이장) + 실내 유희실(휴식 및 응급대기 공간)",
      goals: "놀이 중심의 물놀이를 통해 신체를 자유롭게 움직이며 즐거움을 경험한다.\n친구와 협력하고 순서를 지키며 사회적 관계를 형성한다.\n다양한 물의 성질을 탐색하며 호기심과 탐구력을 기른다.",
      participants: "원아 40명\n교사 8명\n학부모(참여)",
      materials: "활동 준비물\n대형 풀장 2개\n물총 40개\n스펀지공 세트\n물풍선\n부가 준비물\n블루투스 스피커(원 구비물품)\n응급약품(원 구비물품)",
      budget: "대형 풀장 2개 × 45,000원 = 90,000원\n물총 40개 × 4,000원 = 160,000원\n물풍선 세트 = 18,000원\n스펀지공 세트 = 25,000원\n소계 : 293,000원\n최종 예산 : 293,000원 (500,000원 이내 / 잔액 207,000원)",
      prepare: "행사 2주 전 가정통신문 발송(복장·준비물·안전수칙 안내)\n준비물 구입 및 점검\n교사 역할 분담 회의\n물놀이 시설 안전점검 및 소독",
      preActivity: "물의 성질 탐색 놀이\n물과 관련된 그림책 읽기\n물놀이 안전 약속 이야기 나누기",
      order: "영아반(18명) A조 9명 + 교사 2명 / B조 9명 + 교사 2명\n유아반(22명) C조 11명 + 교사 2명 / D조 11명 + 교사 2명",
      scenario: "① 오프닝 (10:00~10:20) 원장이 행사의 의미와 안전수칙을 소개한다.\n② 물놀이 체험 (10:20~11:10) 영아는 얕은 풀장에서 감각놀이를 한다.\n③ 협동 놀이 (11:10~11:40) 부모와 함께 물풍선 릴레이를 진행한다.",
      roles: "교사1 (09:30~12:00) 행사 총괄 — 전체 일정 진행 및 사회, 안전상황 점검\n교사2·3 (10:20~11:40) 영아 물감각놀이 지원",
      safety: "행사 전 미끄럼 위험 구역 점검\n영아·유아 활동 공간 분리 운영\n영아는 얕은 수심에서만 활동\n응급약품 및 비상연락망 준비\n교사는 모든 활동 시 시야 확보 및 인원 점검\n폭염 시 충분한 휴식과 수분 섭취 제공",
      parents: "부모와 함께하는 물풍선 릴레이 운영\n가정에서도 안전한 물놀이 수칙 실천하기\n행사 사진을 가정과 공유",
      duty: "행사 총괄 1명\n영아 담당 2명\n유아 담당 2명\n응급 및 안전관리 1명",
      review: "영유아가 놀이를 통해 물의 특성을 탐색하고 친구와 협력하며 즐겁게 참여했음. 안전수칙을 이해하고 스스로 실천하려는 모습을 보였음.",
      overall: "사전 준비와 역할 분담이 체계적으로 이루어져 안전사고 없이 행사가 운영될 수 있었음. 영아와 유아를 분리하여 발달 수준에 적합한 활동을 제공함으로써 참여도가 높았음.",
      ideas: "버블놀이 및 물감 물놀이 추가 운영\n물 절약 캠페인과 연계한 환경교육 실시\n가족 물놀이 운동회로 확대 운영",
    },
  },
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
        record: "· 3월 6일 — 블록으로 탑을 쌓던 중 친구가 다가옴.\n· 자리를 옆으로 옮겨 공간을 내어 줌.\n· 친구가 블록을 얹자 고개를 들어 바라봄.",
        interpretation: "· [사회관계 > 더불어 생활하기] 또래의 존재를 인식하고 있음.\n· 함께 놀이하려는 마음이 자라고 있음.",
        // ⚠ 네 항목 모두 "· " 목록으로 둡니다 — 실제 생성물이 그렇고,
        //    한 줄짜리 표본만 두면 줄바꿈이 뭉개지는 문제를 여기서 못 잡습니다.
        //    (실제로 '가정-기관 연계 방안'이 한 줄에 붙어 나오는 걸 놓쳤습니다)
        learning: "· [사회관계 > 더불어 생활하기] 공간을 나누며 함께하는 즐거움을 알아 감.\n· 자기 놀이를 지키면서도 또래를 받아들이는 방법을 시도하고 있음.\n· 말보다 몸짓으로 먼저 마음을 전하는 단계임.",
        homeConnection: "· 기관에서는 둘이 앉을 수 있는 쌓기 공간을 넓혀 둘 예정임.\n· 가정에서는 형제·부모와 블록을 나누어 쓰는 놀이를 권함.\n· \"같이 만들어 볼까?\" 처럼 함께하자는 말을 건네 주시길 권함.",
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

// 달력 표본 — 이번 달 안의 날짜여야 화면에 보입니다
const now = new Date();
const at = (day, hour = 12) => new Date(now.getFullYear(), now.getMonth(), day, hour).toISOString();
const CAL_DOCS = [
  { mode: "obs", no: 0, uid: "c1", createdAt: at(3), title: "관찰일지 · 김○○", favorite: true },
  { mode: "note", no: 0, uid: "c2", createdAt: at(3, 15), title: "알림장", favorite: false },
  { mode: "life", no: 0, uid: "c3", createdAt: at(3, 18), title: "생활기록부 · 김○○", favorite: false },
  { mode: "event", no: 0, uid: "c4", createdAt: at(11), title: "행사 계획안 · 여름 물놀이 축제", favorite: false },
];

// 입력 폼 — 결과 카드만 보다가 폼 쪽 문제를 놓쳤습니다(생년월일을 손으로 받아 적던 칸).
function ObsPanelView() {
  const [form, setForm] = useState(() => ({
    ...createEmptyForm(), child: "민준", gender: "남", birth: "2023-05-20", obsPeriod: "2026-03",
  }));
  return (
    <div style={{ ...styles.landing, padding: "20px 16px" }}>
      <ObsPanel form={form} setF={(k, v) => setForm((f) => ({ ...f, [k]: v }))} />
    </div>
  );
}

function CalendarView() {
  return (
    <div style={{ ...styles.landing, padding: "20px 16px" }}>
      <WorkCalendar docs={CAL_DOCS} onOpenDoc={() => {}} />
      <SiteFooter />
    </div>
  );
}

// 문서 마크를 크게 늘어놓고 보는 자리 — 작은 타일에서는 어디가 어색한지 알 수 없습니다
function GlyphsView() {
  return (
    <div style={{ padding: 20, background: "#EAF7F1", minHeight: "100dvh" }}>
      <GlyphDefs />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 18 }}>
        {MODES.map((m) => (
          <div key={m.key} style={{ textAlign: "center" }}>
            <div style={{ background: `linear-gradient(158deg, #fff, ${m.tint} 36%, ${m.tint2})`, borderRadius: 28, padding: 14, display: "grid", placeItems: "center" }}>
              <DocGlyph mode={m.key} size={84} />
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "#5A6B64" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegalView({ tab }) {
  const [t, setT] = useState(tab);
  return <LegalPage tab={t} setTab={setT} onHome={() => {}} />;
}

const noop = () => {};

// 랜딩 — 로그인 전/후가 달라 보여야 합니다.
// (로그인했는데도 비로그인 화면과 똑같아 보이던 문제의 검수 자리)
const LandingView = (user, plan) => () => (
  <Landing
    user={user} plan={plan} isAdmin={false} usage={12} quota={2000}
    docs={user ? CAL_DOCS : []} onOpenDoc={noop}
    onStart={noop} onOpenPricing={noop} onChoose={noop} onPickDoc={noop}
    onLogin={noop} onLogout={noop} onLegal={noop}
    // 앱(민트쌤.jsx)과 같은 규칙을 씁니다 — 검수 화면만 따로 판단하면 검증이 헛돕니다
    lockOf={(key) =>
      isDocLocked({ signedIn: Boolean(user), isAdmin: false, plan, mode: key })
        ? minPlanFor(key) : null}
  />
);

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
  calendar: () => <CalendarView />,
  "panel-obs": () => <ObsPanelView />,
  glyphs: () => <GlyphsView />,
  ...Object.fromEntries(LEGAL_TABS.map(([k]) => [`legal-${k}`, () => <LegalView tab={k} />])),
  "landing-guest": LandingView(null, "free"),
  "landing-user": LandingView({ name: "김민트", email: "mint@example.com", avatar: null }, "pro"),
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
