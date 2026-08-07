// 요금제 정의 — 화면(안내)과 서버(실제 차단)가 "같은 파일"을 봅니다.
// 예전에는 클라이언트와 api/_guard.js 에 한도가 따로 적혀 있어 한쪽만 고치면 어긋났습니다.
//
// 문서 개방 범위를 "앞에서부터 N개"가 아니라 문서 키 목록으로 적어 둡니다.
// 메뉴 순서를 바꿨다고 과금 범위가 따라 바뀌면 안 되기 때문입니다.

import { MODE_KEYS, labelOf, DEFAULT_MODE } from "./documents.js";

/** 월 생성 한도 */
const QUOTA = { free: 3, basic: 500, pro: 2000 };

/**
 * 플랜별로 열리는 문서 키.
 * 유료(Basic·Pro)는 문서를 나누지 않고 "전체 개방"이며, 둘의 차이는 월 생성 횟수뿐입니다.
 * 무료는 맛보기라 놀이 활동 하나만 엽니다.
 */
const DOCS = {
  free: ["play"],
  basic: MODE_KEYS,
  pro: MODE_KEYS,
};

/**
 * 가격 옆에 늘 함께 보여 줄 말.
 *
 * ⚠ 표시 가격이 부가세 포함인지 별도인지는 밝혀야 합니다.
 *    한 화면에만 적어 두면 다른 화면에서 빠집니다 — 실제로 요금제 카드는
 *    랜딩과 요금제 창 두 곳에 나옵니다. 카드를 그리는 곳에서 함께 그립니다.
 */
export const PRICE_NOTE = "모든 가격은 부가세(VAT) 포함입니다.";

/** 낮은 등급 → 높은 등급 순. 화면의 카드 순서이기도 합니다. */
export const PLANS = [
  {
    key: "free", name: "무료", price: "₩0", period: "",
    tagline: "먼저 가볍게 써보세요",
    features: ["놀이 활동 1종", `월 ${QUOTA.free}회 생성`, "표 서식 그대로 복사"],
    cta: "무료로 시작",
  },
  {
    key: "basic", name: "Basic", price: "₩9,900", period: "/월", highlight: true,
    tagline: "매주 서류를 쓰는 선생님께",
    features: [
      `문서 ${DOCS.basic.length}종 전체`,
      `월 ${QUOTA.basic.toLocaleString()}회 생성`,
      "워드·한글 파일 내려받기",
      "문서 보관함 · 수정 · 즐겨찾기",
    ],
    cta: "Basic 시작하기",
  },
  {
    key: "pro", name: "Pro", price: "₩19,900", period: "/월",
    tagline: "매일 여러 반을 맡는 선생님께",
    features: [
      `문서 ${DOCS.pro.length}종 전체`,
      `월 ${QUOTA.pro.toLocaleString()}회 생성`,
      "워드·한글 파일 내려받기",
      "문서 보관함 · 수정 · 즐겨찾기",
      "우선 처리",
    ],
    cta: "Pro 시작하기",
  },
];

export const PLAN_KEYS = PLANS.map((p) => p.key);
export const DEFAULT_PLAN = PLAN_KEYS[0];
/** 등급 비교용 순위 (배열 순서에서 자동 도출) */
const RANK = Object.fromEntries(PLAN_KEYS.map((k, i) => [k, i]));

export const planOf = (key) => PLANS.find((p) => p.key === key);
export const planName = (key) => planOf(key)?.name || planOf(DEFAULT_PLAN).name;
export const quotaOf = (key) => QUOTA[key] ?? QUOTA[DEFAULT_PLAN];
export const docsOf = (key) => DOCS[key] || DOCS[DEFAULT_PLAN];

/** 이 플랜으로 그 문서를 쓸 수 있는가 */
export const planIncludes = (planKey, modeKey) => docsOf(planKey).includes(modeKey);

/**
 * "지금 이 사용자에게" 그 문서가 잠겨 있는가.
 *
 * 화면(작업 화면의 잠금 안내, 랜딩의 자물쇠 배지)이 각자 판단하면 서로 다른 말을 합니다.
 * 실제로 랜딩은 요금제를 보지 않고 최소 플랜만 표시해, Pro 회원에게도 자물쇠를 붙였습니다.
 *
 * ⚠ 요금제를 아직 모르는 시점에 부르면 안 됩니다 — canJudgePlan 으로 먼저 확인하세요.
 */
export const isDocLocked = ({ signedIn, isAdmin, plan, mode }) =>
  signedIn ? !isAdmin && !planIncludes(plan, mode) : mode !== DEFAULT_MODE;

/** 그 문서를 쓰려면 최소 어떤 플랜이 필요한가 (없으면 최상위) */
export const minPlanFor = (modeKey) =>
  PLAN_KEYS.find((k) => planIncludes(k, modeKey)) || PLAN_KEYS[PLAN_KEYS.length - 1];

/**
 * 그 플랜으로 "새로" 열리는 문서 이름들.
 * ⚠ Basic·Pro 가 모두 전체 개방이라 Pro 에서는 빈 배열입니다.
 *    화면에서 "무엇이 열리는지" 안내할 때는 이 배열을 직접 늘어놓지 말고
 *    아래 upgradeCopy() 를 쓰세요 — 빈 문장이 생기지 않습니다.
 */
export function newDocsIn(planKey) {
  const i = RANK[planKey] ?? 0;
  const previous = i > 0 ? docsOf(PLAN_KEYS[i - 1]) : [];
  return docsOf(planKey).filter((k) => !previous.includes(k)).map(labelOf);
}

/**
 * "이 플랜으로 올리면 무엇이 좋아지는가" 한 문장.
 *
 * 예전에는 새로 열리는 문서 이름을 늘어놨지만, 유료 플랜이 모두 전체 개방이 되면서
 * Pro 를 권할 때 빈 문장이 나왔습니다. 그래서 "무엇이 열리는가"와 "얼마나 만들 수 있는가"를
 * 상황에 맞게 고릅니다.
 */
export function upgradeCopy(toPlan) {
  const quota = quotaOf(toPlan).toLocaleString();
  const opened = newDocsIn(toPlan);
  return opened.length
    ? `문서 ${docsOf(toPlan).length}종 전체가 열리고, 월 ${quota}회까지 만들 수 있어요.`
    : `월 ${quota}회까지 만들 수 있어요.`;
}

/** 페이월·잠금 안내에 늘어놓을 혜택 목록 (문서 이름을 다 적으면 길어져서 한 줄로 묶습니다) */
export function planBenefits(planKey) {
  return [
    `문서 ${docsOf(planKey).length}종 전체`,
    `월 ${quotaOf(planKey).toLocaleString()}회 생성`,
    "워드·한글 파일 내려받기",
    "문서 보관함 · 수정 · 즐겨찾기",
  ];
}

/** 두 플랜 중 상위 등급 */
export const higherPlan = (a, b) => ((RANK[a] ?? -1) > (RANK[b] ?? -1) ? a : b);

/**
 * DB 에 남아 있을 수 있는 옛 이름을 현재 이름으로 정리합니다.
 * 구 max(6종) → 신 pro. 구 pro 와 신 pro 는 이름이 같아 구분할 수 없으므로,
 * schema.sql 마이그레이션을 돌린 뒤 상태(= 신 Pro)로 봅니다.
 */
export function normalizePlan(raw) {
  const v = raw || DEFAULT_PLAN;
  if (v === "max") return "pro";
  return PLAN_KEYS.includes(v) ? v : DEFAULT_PLAN;
}

/**
 * 요금제로 무언가를 막아도 되는 시점인가.
 *
 * ⚠ 세션이 복원되는 것과 요금제를 알게 되는 것은 시점이 다릅니다.
 *    새로고침하면 세션은 즉시 되살아나지만 profiles.plan 조회는 한 박자 뒤라,
 *    그 사이에 판단하면 Pro 회원을 무료로 취급해 "이 문서는 Basic 플랜부터예요" 를
 *    띄우게 됩니다. 실제로 그 버그가 났습니다.
 *
 * @param {boolean} authReady  저장된 세션을 확인했는가
 * @param {boolean} signedIn   로그인 상태인가
 * @param {boolean} planLoaded 그 회원의 요금제를 서버에서 받아왔는가
 */
export const canJudgePlan = ({ authReady, signedIn, planLoaded }) =>
  Boolean(authReady && (!signedIn || planLoaded));

/** 파일 내려받기처럼 유료 플랜에서만 열리는 기능인지 */
export const canExportFiles = (planKey) => (RANK[planKey] ?? 0) > RANK[DEFAULT_PLAN];
