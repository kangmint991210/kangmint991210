# 민트쌤 🌿

유치원 교사 보조 웹앱 (놀이안 · 일일계획 · 관찰기록 · 알림장 · 적응일지 · 상담) — React + Vite.

## 실행 방법

### 1. 의존성 설치
```bash
npm install
```

### 2. API 키 설정 (AI 기능용)
`.env.example` 를 `.env` 로 복사하고 Anthropic API 키를 넣으세요.
```bash
cp .env.example .env
```
```
ANTHROPIC_API_KEY=sk-ant-...
```
키 발급: https://console.anthropic.com/settings/keys

> 키는 Vite 개발 서버(프록시)가 서버 쪽에서 붙이므로 브라우저 번들에 노출되지 않습니다.
> 키가 없어도 화면/UI는 뜨지만, 놀이안·서류 생성 버튼을 누르면 오류가 납니다.

### 3. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 http://localhost:5173 자동 오픈.

### 4. 프로덕션 빌드
```bash
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 미리보기
```

## 구조
- `민트쌤.jsx` — 앱 전체 (단일 컴포넌트)
- `src/main.jsx` — React 진입점
- `index.html` — HTML 셸
- `vite.config.js` — `/api/anthropic` → `api.anthropic.com` 프록시 (API 키 주입)

## 참고
- API 호출 모델: `claude-sonnet-5` (기존 `claude-sonnet-4-6` 은 존재하지 않아 수정됨)
- 프로덕션 배포 시에는 `vite preview`가 아니라, 프록시 역할을 하는 서버리스 함수(Vercel/Netlify 등)로 `/api/anthropic` 요청에 키를 붙여야 합니다.
