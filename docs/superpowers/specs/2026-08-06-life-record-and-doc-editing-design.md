# 생활기록부 추가 · 결과물 수정/저장/즐겨찾기 — 설계

작성일: 2026-08-06

## 배경

민트쌤은 현재 문서 6종(놀이활동·보육일지·관찰일지·알림장·적응일지·상담일지)을 만들어 줍니다.
여기에 **생활기록부**를 더하고, 모든 문서에 공통으로 **수정 → 저장 → 즐겨찾기** 흐름을 붙입니다.

지금 상태의 문제:

- 결과 문장을 눌러 고칠 수는 있지만(`ui/primitives.jsx`의 `Editable`), **고치는 즉시 DB에 반영**되고
  저장 버튼도 저장됐다는 표시도 없습니다. 사용자는 저장 여부를 알 수 없고, 잘못 고친 것을 되돌릴 수도 없습니다.
- 즐겨찾기가 없습니다. 보육교사는 "특이사항이 있던 날"의 기록을 나중에 다시 찾아봐야 하는데,
  문서가 쌓이면 검색만으로는 찾기 어렵습니다.
- 앞으로 기능이 5개 더 추가될 예정이라, 수정·저장·즐겨찾기는 **문서 종류를 모르는 자리**에 넣어야 합니다.

## 결정 사항 (사용자 확인 완료)

| 항목 | 결정 |
|---|---|
| 저장 방식 | **초안 방식** — 고친 내용은 화면에만 반영, `저장` 을 눌러야 DB 반영 |
| 생활기록부 입력 | 필수 = 연령 · 아이의 특징 / 선택 = 아동명 · 반 · 기록일 |
| 요금제 | Basic·Pro **모두 문서 전체 개방**, 월 생성 횟수로만 구분 |
| 무료 플랜 | 지금대로 놀이 활동 1종 · 월 3회 |

---

## A. 요금제 개편

`src/domain/plans.js` 한 곳만 고치면 화면(안내)과 서버(`api/_guard.js`)가 함께 따라옵니다.

| 플랜 | 문서 | 월 생성 | 파일 저장 |
|---|---|---|---|
| 무료 ₩0 | 놀이 활동 1종 | 3회 | ✕ |
| Basic ₩9,900 | 전체 7종 | 500회 | ✓ |
| Pro ₩19,900 | 전체 7종 | 2,000회 | ✓ |

```js
const DOCS = {
  free:  ["play"],
  basic: MODE_KEYS,
  pro:   MODE_KEYS,
};
```

### 부작용과 대응

`newDocsIn("pro")` 가 빈 배열이 됩니다. 지금 페이월·잠금 안내는 "이 플랜을 쓰면 ○○·○○ 가 함께 열려요"
라고 쓰고 있어서, Pro 를 권할 때 빈 문장이 됩니다.

→ 안내 문구를 **"무엇이 열리는가"에서 "얼마나 만들 수 있는가"로** 옮깁니다.
`plans.js` 에 `upgradeCopy(fromPlan, toPlan)` 을 두어, 화면은 이 함수만 부릅니다.

- 무료 → Basic: `문서 7종 전체가 열리고, 월 500회까지 만들 수 있어요.`
- Basic → Pro: `월 2,000회까지 늘어나요.`

`minPlanFor(modeKey)` 는 그대로 동작합니다 (놀이활동 외 전부 `basic` 을 돌려줌).

### 요금제 카드 문구

- Basic: `문서 7종 전체`, `월 500회 생성`, `워드·한글 파일 내려받기`, `문서 보관함 · 수정 · 즐겨찾기`
- Pro: `문서 7종 전체`, `월 2,000회 생성`, `워드·한글 파일 내려받기`, `문서 보관함 · 수정 · 즐겨찾기`, `우선 처리`

---

## B. 생활기록부 (`life`)

### 입력 폼

| 필드 | 폼 키 | 필수 |
|---|---|---|
| 연령 | `age` (기존 공용) | ✓ |
| 아이의 특징 | `lifeMemo` | ✓ |
| 아동명(이니셜) | `child` (기존 공용) | |
| 반 | `klass` (기존 공용) | |
| 기록일 | `lifeDate` | |

`date` 는 상담일지가 이미 쓰고 있어 `lifeDate` 로 분리합니다 (폼은 문서 전체가 한 벌을 나눠 쓰는 구조).

### 결과 구조

항목 8개 고정, 각 항목마다 상/중/하 **정확히 3줄**.

```json
{
  "reply": "1문장 안내",
  "life": {
    "child": "", "klass": "", "age": "", "date": "",
    "items": [
      { "area": "수면",     "high": "…함", "mid": "…함", "low": "…함" },
      { "area": "배변",     "high": "", "mid": "", "low": "" },
      { "area": "식사",     "high": "", "mid": "", "low": "" },
      { "area": "신체운동", "high": "", "mid": "", "low": "" },
      { "area": "사회관계", "high": "", "mid": "", "low": "" },
      { "area": "의사소통", "high": "", "mid": "", "low": "" },
      { "area": "자연탐구", "high": "", "mid": "", "low": "" },
      { "area": "예술경험", "high": "", "mid": "", "low": "" }
    ]
  }
}
```

`high/mid/low` 를 배열이 아닌 **고정 키**로 둔 이유: 배열이면 모델이 2줄만 쓰거나 순서를 뒤집을 수 있습니다.
고정 키는 그 실수를 구조적으로 막고, `Editable` 의 경로(`["life","items",i,"high"]`)도 안정적입니다.

### 프롬프트 규정 (`src/prompts/life.js`)

- 문체: **개조식** — `~함`, `~임`, `~보임`. 존댓말·설명체 금지. 첨부 서식과 같은 형태.
- 각 줄 길이: 한글 25~60자. 관찰 가능한 행동으로 씁니다.
- 상 = 스스로 / 중 = 교사의 도움을 받아 / 하 = 익숙한 환경에서 시도하며 익혀 가는 중.
  **'못한다'로 쓰지 않고 '~을 시도함 / ~해 감' 으로 씁니다.** (학부모가 보는 문서)
- 연령 기준: 만 0~2세는 표준보육과정, 만 3~5세는 누리과정.
  `src/domain/curriculum.js` 의 `CURRICULUM_GUIDE` 를 그대로 끼워 넣습니다.
- 만 3~5세에서도 항목 이름 8개는 고정하되, 내용은 연령에 맞게 씁니다
  (예: 배변 → 스스로 화장실 사용, 수면 → 휴식·낮잠).
- `tokens: 8000`, `thinkingBudget: 2048`, `eta: 30`

### 화면·내보내기

- `LifeCard` (`features/results/Card.jsx`) — 항목별 블릿 목록. 상/중/하 뱃지 + 문장.
- `buildLife` (`domain/document-export.js`) — 「영역 | 상 | 중 | 하」 4열 표.
  각 칸이 짧아(25~60자) 가로 표가 눌리지 않습니다.
- `docTitle` 의 `DETAIL_OF` 에 `life: (l) => [l.child, l.date].filter(Boolean).join(" · ")`
- `EMPTY_COPY.life`, `MODES` 에 `{ key:"life", label:"생활기록부", emoji:"📗" }`

### DB

`supabase/schema.sql` 의 `kind` 제약에 `'life'` 추가 → 재실행 필요.

---

## C. 수정 · 저장 · 즐겨찾기 (7종 공통)

세 기능 모두 **문서 종류를 모르는 자리**에만 들어갑니다:
`useThreads`(기록 상태) · `DocTurn`(문서 1건의 껍데기) · 새 컴포넌트 2개.
문서를 새로 추가해도 이 코드는 손대지 않습니다.

### C-1. 초안 방식 수정

`useThreads` 에 `drafts` 상태를 둡니다: `{ [msgUid]: payload }`

```
문장 수정 → drafts[msgUid] 갱신 (DB 접근 없음)
카드 렌더 → draft ?? payload 를 그림
저장      → documents.updatePayload(docId, draft) → threads 의 payload 확정 → draft 제거
되돌리기   → draft 제거
```

| 함수 | 하는 일 |
|---|---|
| `editField(msgUid, path, value)` | 초안에만 반영 (DB 안 씀) |
| `saveDoc(mode, msgUid, docId)` | DB 저장 + 초안 확정. 성공 여부를 돌려줍니다 |
| `revertDoc(msgUid)` | 초안 버리기 |
| `payloadOf(msg)` | `drafts[msg.uid] ?? msg.payload` |
| `isDirty(msgUid)` | 저장 안 된 수정이 있는가 |

**저장 안 한 수정 지키기**

- 문서를 접을 때 / 다른 메뉴로 옮길 때 → 확인창
- 브라우저를 닫을 때 → `beforeunload`
- 초안이 하나라도 있으면 걸립니다 (`hasAnyDraft`)

### C-2. 저장 바 — `features/results/SaveBar.jsx`

문서 종류를 모릅니다. props: `dirty · saving · savedAt · onSave · onRevert · guest · onNeedSignup`

```
✏️ 저장하지 않은 수정이 있어요        [되돌리기] [💾 저장]
                    ↓ 저장 후
✓ 저장했어요 · 방금
```

- **고친 게 있을 때만** 나타납니다 (평소에는 화면을 어지럽히지 않음)
- 저장 실패 시 초안을 유지한 채 `저장하지 못했어요. 다시 시도해 주세요.` — 고친 내용이 사라지면 안 됩니다
- 게스트는 저장할 DB 행이 없으므로 가입 안내(`onNeedSignup`)로 연결
- 위치: `DocTurn` 본문 맨 아래 (문서 1건 = 1 turn). 놀이활동은 카드가 여러 장이라
  카드마다 저장 버튼을 두면 무엇이 저장되는지 헷갈립니다

### C-3. 즐겨찾기

**DB** — `documents` 테이블에 컬럼 추가. RLS 는 이미 본인 행 update 를 허용하므로 정책 변경 없음.

```sql
alter table public.documents
  add column if not exists is_favorite boolean not null default false;

create index if not exists documents_user_favorite_idx
  on public.documents (user_id, kind, created_at) where is_favorite;
```

**서비스** — `repository.js` 에 `documents.setFavorite(docId, value)`

**상태** — `useThreads`
- `rowToMessages` 가 `favorite: row.is_favorite` 를 실어 옵니다
- `toggleFavorite(mode, msgUid, docId)` — 화면 먼저 바꾸고 DB 반영, 실패하면 되돌립니다

**화면**
- `FavoriteButton` (`features/results/FavoriteButton.jsx`) — props: `on · onToggle · disabled`
  문서 목록 각 줄, 삭제 버튼 왼쪽. ☆ / ★(노랑)
- 보관함 도구줄(`ArchiveTools`)에 `⭐ 즐겨찾기만` 토글
- 검색과 **함께** 걸립니다 → `filterTurns(turns, query, favOnly)`
- 즐겨찾기가 하나도 없는데 토글을 켜면 `아직 즐겨찾기한 문서가 없어요. 목록의 ☆ 를 눌러 보세요.`
- 저장 전(게스트) 문서는 `docId` 가 없어 별을 비활성 + 가입 안내

---

## 손대는 파일

| 파일 | 하는 일 |
|---|---|
| `src/domain/documents.js` | `life` 등록 · 필수입력 · 폼 초기값 · 빈 화면 문구 |
| `src/domain/plans.js` | 문서 개방 범위 · 요금제 문구 · `upgradeCopy()` |
| `src/domain/threads.js` | `docTitle` 의 `life` · `filterTurns` 즐겨찾기 인자 |
| `src/domain/document-export.js` | `buildLife` |
| `src/prompts/life.js` (신규) · `index.js` | 생활기록부 프롬프트 |
| `src/features/editor/Panels.jsx` | `LifePanel` |
| `src/features/results/Card.jsx` | `LifeCard` |
| `src/features/results/SaveBar.jsx` (신규) | 저장 바 |
| `src/features/results/FavoriteButton.jsx` (신규) | 별표 버튼 |
| `src/features/results/DocList.jsx` | `DocTurn` 에 저장 바·별표 연결 |
| `src/features/workspace/ResultList.jsx` | 즐겨찾기 토글 · 초안 경고 |
| `src/hooks/useThreads.js` | 초안 · 저장 · 즐겨찾기 상태 |
| `src/hooks/useMintApp.js` | 메뉴 이동 시 초안 경고 · `favOnly` |
| `src/services/repository.js` | `setFavorite` |
| `src/ui/styles.js` | 새 컴포넌트 스타일 |
| `supabase/schema.sql` | `kind` 에 `life` · `is_favorite` 컬럼 |
| `README.md` | 요금제표 · 문서 목록 · 재실행 안내 |
| `tests/domain.test.mjs` | 요금제·필수입력·내보내기 회귀 |

## 테스트

`npm test` (의존성 없는 순수 규칙 테스트)에 다음을 더합니다.

- 요금제: `planIncludes("basic", "counsel") === true`, `planIncludes("free","life") === false`,
  `minPlanFor("life") === "basic"`, `upgradeCopy` 가 빈 문장을 만들지 않을 것
- 생활기록부: 필수입력 2개가 비면 `missingFields` 가 둘 다 돌려줄 것
- 내보내기: `buildDoc("life", payload)` 가 8행 표를 만들 것, 항목이 빠진 옛 payload 에도 깨지지 않을 것
- 즐겨찾기 필터: `filterTurns` 가 검색어와 즐겨찾기를 함께 걸 것

## 하지 않는 것 (YAGNI)

- 즐겨찾기 폴더·태그 — 별표 하나로 충분합니다
- 수정 이력·버전 관리 — 되돌리기는 "저장 전 초안 버리기"까지만
- 서버 측 문서 종류 검증 — 지금도 클라이언트 게이팅이고, 유료 플랜이 전체 개방이라
  실질 위험은 무료 사용자의 문서 종류뿐입니다. 월 한도는 이미 서버가 막고 있습니다
