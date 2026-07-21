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
1. **테이블 생성** — 대시보드 → SQL Editor 에서 [`supabase/schema.sql`](supabase/schema.sql) 전체를 실행. (`profiles` 회원 추적 테이블 + 가입 자동 트리거, `documents` 결과물 테이블 + RLS 정책)
2. **이메일 로그인** — Authentication → Providers → Email 활성화. (빠른 테스트를 위해 "Confirm email"을 끄면 가입 즉시 로그인됩니다. 켜두면 확인 메일 링크를 눌러야 함)
3. **소셜 로그인** — Authentication → Providers 에서 **Google**, **Kakao** 활성화 후 각 콘솔의 Client ID/Secret 입력.
   - 각 공급자 콘솔의 **Redirect URI** 에 `https://moudhssidpgbpeuihzsr.supabase.co/auth/v1/callback` 등록.
4. **Redirect URL 허용** — Authentication → URL Configuration → Redirect URLs 에 `http://localhost:5173` (배포 시 실제 도메인) 추가.

> 회원 추적: 회원가입(이메일/구글/카카오)이 일어나면 트리거가 `profiles` 테이블에 회원 행을 자동 생성해
> 이름·이메일·요금제·가입일·마지막 접속을 기록합니다. 관리자는 Supabase 대시보드 → Table Editor → `profiles` 에서 전체 회원을 조회·관리할 수 있습니다.
>
> 데이터 저장: 로그인한 사용자가 6종 문서(놀이활동·보육일지·관찰일지·알림장·적응일지·상담일지)를 생성하면
> 자동으로 `documents` 테이블에 저장되고, 다음 로그인 시 다시 불러옵니다. 각자 본인 데이터만 접근 가능(RLS).

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
- `민트쌤.jsx` — 앱 전체 (단일 컴포넌트) · 인증/DB 연동 포함
- `src/main.jsx` — React 진입점
- `src/supabaseClient.js` — Supabase 클라이언트 (env 로 URL/키 주입)
- `supabase/schema.sql` — DB 테이블 + RLS 정책
- `index.html` — HTML 셸
- `vite.config.js` — (개발 전용) `/api/gemini` 미들웨어. 요청 body 의 model 로 Gemini 호출 + 키 주입
- `api/gemini.js` — (프로덕션) Vercel 서버리스 함수. 배포본에서 `/api/gemini` 에 키를 붙여 Gemini 로 전달
- 프론트는 `POST /api/gemini` 로 `{ model, systemInstruction, contents, generationConfig }` 전송 (URL 에 콜론 없음 → Vercel 라우팅 안정)

## 참고
- API 호출 모델: `gemini-3.1-flash-lite` (`민트쌤.jsx` 상단 `GEMINI_MODEL` 에서 교체 가능)

## Vercel 배포
- **빌드**: 프레임워크 `Vite` 자동 감지 (Build `vite build`, Output `dist`).
- **환경변수** (Vercel → Settings → Environment Variables):
  | 이름 | 설명 | 노출 |
  |---|---|---|
  | `GEMINI_API_KEY` | Gemini 키. **`VITE_` 접두사 없이** 설정 → 서버리스 함수만 사용(브라우저 비노출) | 서버 전용 |
  | `VITE_SUPABASE_URL` | Supabase URL (빌드 시 번들에 주입) | 프론트 |
  | `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 (RLS 로 보호) | 프론트 |
- ⚠️ `VITE_` 변수는 **빌드 시점**에 번들에 박히므로, 값을 바꾸면 **재배포(Redeploy)** 해야 반영됩니다. `GEMINI_API_KEY` 는 런타임에 읽지만, 추가/변경 후에는 마찬가지로 재배포하세요.
- 개발 서버의 `vite.config.js` 프록시는 **배포본에 존재하지 않습니다.** 배포본의 `/api/gemini/*` 요청은 위 서버리스 함수가 처리합니다.
