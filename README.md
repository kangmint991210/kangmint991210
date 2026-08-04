# 민트쌤 🌿

유치원 교사 보조 웹앱 (놀이안 · 일일계획 · 관찰기록 · 알림장 · 적응일지 · 상담) — React + Vite.

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경변수 설정 (`.env`)
`.env` 파일에 아래 3개 값을 채웁니다. (`.env.example` 참고)
```
GEMINI_API_KEY=...                     # AI 문서 생성 (Gemini)
VITE_SUPABASE_URL=https://moudhssidpgbpeuihzsr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # Supabase 대시보드 → Settings → API → anon public
```
- Gemini 키: https://aistudio.google.com/apikey — Vite 프록시가 서버 쪽에서 붙여 브라우저에 노출되지 않음.
- Supabase `anon` 키: 프론트엔드 노출 OK(RLS 로 보호). `VITE_` 접두사 필수.

### 3. Supabase 준비 (인증 + DB)
1. **테이블 생성** — 대시보드 → SQL Editor 에서 [`supabase/schema.sql`](supabase/schema.sql) 전체를 실행. (`profiles` 회원 추적 테이블 + 가입 자동 트리거, `admins` 관리자 명단, `documents` 결과물 테이블 + RLS 정책)
2. **이메일 로그인** — Authentication → Providers → Email 활성화. (빠른 테스트를 위해 "Confirm email"을 끄면 가입 즉시 로그인됩니다. 켜두면 확인 메일 링크를 눌러야 함)
3. **소셜 로그인** — Authentication → Providers 에서 **Google**, **Kakao** 활성화 후 각 콘솔의 Client ID/Secret 입력.
   - 각 공급자 콘솔의 **Redirect URI** 에 `https://moudhssidpgbpeuihzsr.supabase.co/auth/v1/callback` 등록.
4. **Redirect URL 허용** — Authentication → URL Configuration → Redirect URLs 에 `http://localhost:5173` (배포 시 실제 도메인) 추가.

> 회원 추적: 회원가입(이메일/구글/카카오)이 일어나면 트리거가 `profiles` 테이블에 회원 행을 자동 생성해
> 이름·이메일·**가입경로(`provider`)**·프로필사진·요금제·가입일·마지막 접속을 기록합니다. 관리자는 Supabase 대시보드 → Table Editor → `profiles` 에서 전체 회원을 조회·관리할 수 있습니다.
>
> ⚠ `profiles` 테이블이 없으면 회원 정보가 **하나도 저장되지 않습니다**(앱은 화면 흐름을 막지 않으려고 조용히 넘어갑니다).
> `documents` 테이블만 보인다면 `schema.sql` 을 아직 실행하지 않은 것이니 전체를 실행해 주세요.
> 실행하면 트리거가 없던 시절에 가입한 기존 회원(SNS 포함)도 소급 등록됩니다. 저장 실패 시 브라우저 콘솔에 경고가 찍힙니다.
>
> 데이터 저장: 로그인한 사용자가 6종 문서(놀이활동·보육일지·관찰일지·알림장·적응일지·상담일지)를 생성하면
> 자동으로 `documents` 테이블에 저장되고, 다음 로그인 시 다시 불러옵니다. 각자 본인 데이터만 접근 가능(RLS).

> ⚠ **요금제 개편(무료 / Basic / Pro) 반영에는 `schema.sql` 재실행이 필요합니다.**
> `profiles.plan` 의 허용값이 `free/pro/max` → `free/basic/pro` 로 바뀌었고,
> 기존 회원은 문서 종류 수 기준으로 자동 이관됩니다(구 pro→basic, 구 max→pro).
> 재실행하지 않으면 유료 플랜 저장이 실패합니다. 같은 파일에 월 사용량 원장(`usage_events`)도 함께 들어 있습니다.

### 3-1. 관리자 권한 (선택)
`admins` 테이블에 들어 있는 회원은 **요금제와 상관없이 문서 6종 전체**를 이용할 수 있고, 헤더에 `👑 관리자` 배지가 표시됩니다.

기존 회원 전원에게 한 번에 부여하려면 SQL Editor 에서 [`supabase/grant-admin-existing.sql`](supabase/grant-admin-existing.sql) 실행:
```sql
insert into public.admins (id, note)
select id, '기존 회원 일괄 부여' from auth.users
on conflict (id) do nothing;
```
- **실행 시점에 가입돼 있는 회원만** 대상입니다. 이후 신규 가입자는 자동으로 관리자가 되지 않습니다.
- 개별 부여/회수는 Table Editor → `admins` 에서 행을 추가·삭제하면 됩니다.
- `admins` 에는 **select 정책만** 있고 insert/update/delete 정책이 없어, 클라이언트(anon 키)로는 쓸 수 없습니다.
  관리자 표시를 `profiles` 컬럼으로 두지 않은 이유 — `profiles` 는 본인 행 수정이 허용돼 있어 자기 승격이 가능해집니다.

### 4. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 http://localhost:5173 자동 오픈.

### 5. 프로덕션 빌드
```bash
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 미리보기
```

## 구조

한 파일에 몰려 있던 코드를 역할별로 나눴습니다. 위에서 아래로 의존하며, 반대 방향 참조는 없습니다.
(도메인은 화면을 모르고, 화면은 통신 방법을 모릅니다)

```
민트쌤.jsx              어느 화면을 보여 줄지만 정하는 진입점
src/
  config.js            브랜드·모델·체험 한도 등 설정값 (하드코딩을 모으는 자리)
  domain/              화면을 모르는 순수 규칙 — 테스트하기 쉬운 곳
    documents.js         문서 6종 정의, 필수 입력, 폼 초기값
    plans.js             요금제·문서 개방 범위·월 한도  ※ 서버도 이 파일을 씁니다
    threads.js           생성 기록 묶기·검색·요약
    document-export.js   표 HTML 생성, 클립보드 복사, 워드/한글 파일 저장
  prompts/             문서별 AI 프롬프트 (문서를 추가하려면 파일 하나 + index 등록)
  services/            바깥 세계와의 통신
    gemini.js            생성 요청과 응답 파싱
    repository.js        Supabase 접근 (테이블·컬럼을 아는 유일한 곳)
  hooks/               React 상태
    useAccount.js        세션·요금제·관리자·사용량
    useGuestTrial.js     가입 없는 체험
    useThreads.js        생성 기록 CRUD
    useMintApp.js        위를 화면의 흐름으로 엮음
  ui/                  도메인을 모르는 표현 요소
    theme.js             색·폰트·전역 CSS
    styles.js            화면 스타일
    primitives.jsx       Mascot · Brand · Editable · ModalShell · Sec
    fields.jsx           드롭다운·날짜·라벨 등 입력 필드
  features/            화면 단위
    landing/ auth/ legal/ pricing/ editor/ results/ workspace/
api/
  gemini.js            Vercel 서버리스 진입점 (HTTP 어댑터)
  _gemini-proxy.js     실제 처리 — 개발 서버(vite.config.js)와 공유
  _guard.js            남용 방어 + 요금제 한도 정책
  _rate-limit.js       IP 레이트리밋 (교체 가능하도록 분리)
  _supabase-admin.js   service_role 전용 서버 질의
tests/
  domain.test.mjs      규칙 회귀 테스트 — `npm test`
```

### 고칠 때 어디를 보면 되는지
| 하고 싶은 일 | 고칠 파일 |
|---|---|
| 요금제·가격·월 한도 변경 | `src/domain/plans.js` (화면과 서버가 함께 참조) |
| 문서 종류 추가 | `src/domain/documents.js` + `src/prompts/<새문서>.js` + `prompts/index.js` |
| 프롬프트·분량 규정 손보기 | `src/prompts/<문서>.js` |
| 색·폰트 | `src/ui/theme.js` |
| 브랜드 문구·문의처·모델명 | `src/config.js` |
| 약관·개인정보처리방침 | `src/features/legal/LegalPage.jsx` |
| DB 질의 | `src/services/repository.js` |

## 테스트
```bash
npm test      # 요금제·필수입력·날짜·내보내기 규칙 회귀 테스트 (의존성 없음)
```
요금제 범위나 문서 내보내기를 손볼 때는 이 테스트를 먼저 돌려 보세요.

## 요금제와 이용 한도

| 플랜 | 가격 | 문서 종류 | 월 생성 |
|---|---|---|---|
| 무료 | ₩0 | 1종 (놀이 활동) | 3회 |
| Basic | ₩9,900/월 | 3종 (＋보육일지·관찰일지) | 500회 |
| Pro | ₩19,900/월 | 6종 전체 (＋알림장·적응일지·상담일지) | 2,000회 |

- **가입 없는 체험**: 로그인하지 않아도 놀이 활동 **1건**을 만들어 볼 수 있습니다. 결과는 브라우저에
  임시 보관되었다가, 가입하면 계정으로 자동 이관됩니다. 복사·파일 저장·다른 문서는 가입 후에 열립니다.
- 값은 `민트쌤.jsx` 의 `PLAN_DOCS` / `PLAN_QUOTA` 와 `api/_guard.js` 의 `PLAN_QUOTA` **두 곳**에 있습니다.
  바꿀 때는 반드시 함께 수정하세요(화면 안내용 / 실제 차단용).
- 사용량은 `usage_events` 테이블에 append-only 로 쌓입니다. 문서를 지워도 사용량은 줄지 않습니다
  (documents 를 세면 삭제로 한도를 무한 우회할 수 있기 때문).

### 서버 측 한도 검증 (권장)
`/api/gemini` 는 요청의 `Authorization: Bearer <supabase access_token>` 을 확인해 요금제 한도를 검사하고
사용량을 기록합니다. 이 검증에는 **서비스 롤 키**가 필요합니다.

| 이름 | 설명 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` 키. **`VITE_` 접두사 없이** 서버 전용으로 설정 |

- 설정하지 않으면 서버 검증이 생략되고 **클라이언트 게이팅만** 동작합니다(개발 중에는 문제없지만,
  운영에서는 개발자 도구로 우회할 수 있으니 반드시 설정하세요).
- 비로그인 체험은 토큰이 없으므로 IP 기준 레이트리밋(시간당 5회 / 하루 20회)이 적용됩니다.
  ⚠ 서버리스는 인스턴스별 메모리를 쓰므로 이 카운터는 근사치입니다. 정밀 차단이 필요해지면
  Upstash Redis 등 외부 저장소로 옮기세요.

## 결과물 내보내기
- **표로 복사** — 클립보드에 `text/html` 을 함께 넣어 한글(HWP)·워드에 **표 서식 그대로** 붙습니다.
- **파일 저장** — 워드·한글이 여는 `.doc`(HTML 기반 문서)로 내려받습니다. 유료 플랜 전용입니다.
  진짜 OOXML `.docx` 가 아니라, 외부 라이브러리 없이 표 서식을 유지하려고 택한 방식입니다.
- 두 기능 모두 `src/export.js` 의 `buildDoc(kind, payload)` 이 만든 결과를 씁니다.

## 참고
- API 호출 모델: `gemini-3.1-flash-lite` (`민트쌤.jsx` 상단 `GEMINI_MODEL` 에서 교체 가능)
- 결과 카드의 문장은 눌러서 바로 수정할 수 있고, 수정 내용은 `documents.payload` 에 반영됩니다.
- **이용약관·개인정보처리방침**은 `민트쌤.jsx` 의 `LegalPage` 안에 있습니다.
  정식 공개 전 사업자 정보·개인정보 보호책임자·문의 이메일(`help@mintssaem.kr` 자리)을 채워야 합니다.

## Vercel 배포
- **빌드**: 프레임워크 `Vite` 자동 감지 (Build `vite build`, Output `dist`).
- **환경변수** (Vercel → Settings → Environment Variables):
  | 이름 | 설명 | 노출 |
  |---|---|---|
  | `GEMINI_API_KEY` | Gemini 키. **`VITE_` 접두사 없이** 설정 → 서버리스 함수만 사용(브라우저 비노출) | 서버 전용 |
  | `VITE_SUPABASE_URL` | Supabase URL (빌드 시 번들에 주입) | 프론트 |
  | `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 (RLS 로 보호) | 프론트 |
  | `SUPABASE_SERVICE_ROLE_KEY` | 서버에서 요금제 한도를 검증·기록. **`VITE_` 없이** 설정 | 서버 전용 |
- ⚠️ `VITE_` 변수는 **빌드 시점**에 번들에 박히므로, 값을 바꾸면 **재배포(Redeploy)** 해야 반영됩니다. `GEMINI_API_KEY` 는 런타임에 읽지만, 추가/변경 후에는 마찬가지로 재배포하세요.
- 개발 서버의 `vite.config.js` 프록시는 **배포본에 존재하지 않습니다.** 배포본의 `/api/gemini/*` 요청은 위 서버리스 함수가 처리합니다.
