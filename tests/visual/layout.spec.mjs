// 브라우저에서 실제 치수를 재는 배치 검증.
//
// 여기 있는 것들은 "코드는 멀쩡한데 화면에서만 틀어지는" 문제들입니다.
// 단위 테스트로는 절대 잡히지 않아, 실제로 만들어 본 사람이 알려 주기 전까지 몰랐습니다.
//   · 인라인 요소라서 버튼이 목록 옆에 붙어 2열로 보이던 요금제 안내 모달
//   · flex 를 주지 않아 글자 너비만큼 쪼그라들던 편집 상자
//
// 실행: npm run test:visual

import { test, expect } from "@playwright/test";
import { MODE_KEYS } from "../../src/domain/documents.js";

/** 혜택 목록의 첫 줄 — 문서를 추가하면 "8종 전체"처럼 숫자가 바뀌므로 실제 값에서 만듭니다 */
const DOC_COUNT_LABEL = `문서 ${MODE_KEYS.length}종 전체`;

/** 검수 페이지의 카드 종류 — 새 문서를 추가하면 여기에도 넣어 주세요. */
const CARD_KINDS = [
  "play", "daily", "obs", "note", "adapt", "counsel",
  "life", "assess", "monthly", "safety", "trip", "event",
];

/* ─────────────── 가로 넘침 ─────────────── */
// 좁은 화면에서 칸을 넘치면 가로 스크롤이 생기고 글자가 잘립니다.

for (const kind of CARD_KINDS) {
  test(`${kind} 카드는 화면 밖으로 넘치지 않는다`, async ({ page }) => {
    await page.goto(`/gallery.html?v=card-${kind}`);
    await expect(page.locator("[style*='border-radius: 22px'], h3").first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement;
      return { scroll: el.scrollWidth, client: el.clientWidth };
    });
    expect(overflow.scroll, `${kind} 카드가 가로로 넘침`).toBeLessThanOrEqual(overflow.client + 1);
  });
}

/* ─────────────── 편집 상자 너비 ─────────────── */
// 읽기 상태의 문장에는 flex:1 이 있는데 편집 상자에는 없어,
// 가로로 늘어선 자리(생활기록부 상중하·놀이 진행단계·알림장 가정연계)에서
// 상자가 글자 너비만큼 쪼그라들던 문제의 회귀 테스트.

const EDIT_ROWS = [
  { kind: "life", text: "일정한 시간에 편안한 분위기에서 스스로 잠들며" },
  { kind: "play", text: "바닥에 색테이프로 길을 만들고" },
  { kind: "note", text: "가정에서도 밀가루 반죽이나" },
];

for (const { kind, text } of EDIT_ROWS) {
  test(`${kind} 편집 상자는 그 줄의 남은 폭을 채운다`, async ({ page }) => {
    await page.goto(`/gallery.html?v=card-${kind}`);

    const target = page.getByText(text, { exact: false }).first();
    await expect(target).toBeVisible();
    await target.click();
    await expect(page.locator("textarea").first()).toBeVisible();

    // 읽기 상태의 <p> 는 음수 마진(styles.editable)으로 실제보다 넓게 잡히므로
    // 기준으로 쓸 수 없습니다. 편집 상자가 놓인 "줄" 자체와 견줍니다.
    const { box, row } = await page.evaluate(() => {
      const ta = document.querySelector("textarea");
      // 가로로 늘어선 자리: li(생활기록부·놀이 단계) 또는 편집 상자를 감싼 줄(알림장)
      const line = ta.closest("li") || ta.parentElement.parentElement;
      return { box: ta.getBoundingClientRect().width, row: line.getBoundingClientRect().width };
    });

    // 고치기 전에는 글자 너비만큼(줄의 30~60%) 쪼그라들었습니다.
    // 앞의 수준 뱃지·아이콘이 차지하는 폭을 빼고도 줄의 대부분을 써야 합니다.
    expect(box / row, `${kind} 편집 상자가 줄어듦 (${Math.round(box)} / ${Math.round(row)}px)`)
      .toBeGreaterThan(0.75);
    expect(box, `${kind} 편집 상자가 줄을 넘침`).toBeLessThanOrEqual(row + 1);

    // 그렇다고 화면 밖으로 나가서도 안 됩니다.
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow, `${kind} 편집 상자가 화면을 넘침`).toBeLessThanOrEqual(1);
  });
}

/* ─────────────── 모달 배치 ─────────────── */

test("요금제 안내 — 버튼과 혜택 목록이 한 줄에 나란히 놓이지 않는다", async ({ page }) => {
  await page.goto("/gallery.html?v=paywall");

  const cta = page.getByRole("button", { name: "요금제 보기" });
  const feats = page.getByText(DOC_COUNT_LABEL, { exact: true });
  await expect(cta).toBeVisible();
  await expect(feats).toBeVisible();

  const [c, f] = [await cta.boundingBox(), await feats.boundingBox()];
  // 혜택 목록은 버튼보다 "완전히 아래"에 있어야 합니다(겹치면 2열로 보입니다).
  expect(f.y, "혜택 목록이 버튼과 같은 줄에 있음").toBeGreaterThanOrEqual(c.y + c.height);
});

test("요금제 안내 — 버튼이 안내 문장과 혜택 목록 사이에 있다", async ({ page }) => {
  await page.goto("/gallery.html?v=paywall");

  const sub = page.getByText("플랜을 쓰면", { exact: false });
  const cta = page.getByRole("button", { name: "요금제 보기" });
  const feats = page.getByText(DOC_COUNT_LABEL, { exact: true });

  const [s, c, f] = [await sub.boundingBox(), await cta.boundingBox(), await feats.boundingBox()];
  expect(c.y).toBeGreaterThan(s.y);
  expect(f.y).toBeGreaterThan(c.y);
});

for (const view of ["paywall", "paywall-quota", "signup", "pricing"]) {
  test(`${view} 모달은 화면 밖으로 넘치지 않는다`, async ({ page }) => {
    await page.goto(`/gallery.html?v=${view}`);
    await expect(page.locator("button").first()).toBeVisible();

    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement;
      return el.scrollWidth - el.clientWidth;
    });
    expect(overflow, `${view} 모달이 가로로 넘침`).toBeLessThanOrEqual(1);
  });
}

/* ─────────────── 비밀번호 보기 ─────────────── */
// 가려진 글자만 보이면 오타를 확인할 방법이 없어 눈 아이콘을 붙였습니다.
// 눈 버튼이 폼 안에서 submit 으로 동작하면 누를 때마다 로그인이 시도되므로 그것도 함께 봅니다.

test("비밀번호는 눈 아이콘으로 보였다 숨겼다 할 수 있다", async ({ page }) => {
  await page.goto("/gallery.html?v=password");

  const input = page.locator("input").first();
  const eye = page.getByRole("button", { name: "비밀번호 보기", exact: true });
  await expect(input).toHaveAttribute("type", "password");

  await eye.click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "비밀번호 숨기기", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "비밀번호 숨기기", exact: true }).click();
  await expect(input).toHaveAttribute("type", "password");
});

test("눈 버튼은 폼을 전송하지 않는다", async ({ page }) => {
  await page.goto("/gallery.html?v=password");
  // type="button" 이 아니면 폼 안에서 기본값이 submit 이라, 눈을 누를 때마다 로그인이 시도됩니다.
  const type = await page.getByRole("button", { name: "비밀번호 보기", exact: true }).getAttribute("type");
  expect(type, "눈 버튼에 type=\"button\" 이 없음").toBe("button");
});

test("두 비밀번호 칸은 서로 독립적으로 보인다", async ({ page }) => {
  await page.goto("/gallery.html?v=password");
  const inputs = page.locator("input");

  await page.getByRole("button", { name: "비밀번호 보기", exact: true }).click();
  await expect(inputs.nth(0)).toHaveAttribute("type", "text");
  await expect(inputs.nth(1)).toHaveAttribute("type", "password");
});

test("눈 아이콘이 입력 글자를 가리지 않는다", async ({ page }) => {
  await page.goto("/gallery.html?v=password");
  const input = page.locator("input").first();
  const eye = page.getByRole("button", { name: "비밀번호 보기", exact: true });

  const [i, e] = [await input.boundingBox(), await eye.boundingBox()];
  // 눈 버튼은 입력칸 안 오른쪽에 있어야 하고, 글자 영역(오른쪽 여백 46px)을 침범하면 안 됩니다.
  expect(e.x + e.width).toBeLessThanOrEqual(i.x + i.width + 1);
  expect(e.x).toBeGreaterThan(i.x + i.width - 50);
});

/* ─────────────── 저장 바 ─────────────── */

test("저장 바는 상태마다 버튼이 한 줄에 들어간다", async ({ page }) => {
  await page.goto("/gallery.html?v=savebar");
  await expect(page.getByRole("button", { name: /저장/ }).first()).toBeVisible();

  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
});
