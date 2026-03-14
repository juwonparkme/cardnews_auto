# cardnews_auto

## CLI

```bash
pnpm build
node dist/cli/index.js render
```

## 준비

```bash
cp .env.example .env
pnpm build
```

필수 또는 권장 env:
- `OPENAI_API_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `CANVA_ACCESS_TOKEN` 또는 `CANVA_REFRESH_TOKEN` + `CANVA_CLIENT_ID` + `CANVA_CLIENT_SECRET`
- `CANVA_BRAND_TEMPLATE_ID`

## 명령

```bash
node dist/cli/index.js render
node dist/cli/index.js render --prepare-only --skip-canva-edit
node dist/cli/index.js render --output ~/Desktop/cardnews.pdf
node dist/cli/index.js render --template <brand-template-id>
```

## 현재 동작

- 제목 + 앨범 7개 입력
- 멜론/벅스/스포티파이 조회
- 앨범 소개 기반 요약 생성
- 커버 이미지 자동 다운로드
- Canva Brand Template autofill
- Canva PDF export

## 검증 상태

- 로컬 검증 완료
  - `pnpm build`
  - `render --prepare-only --skip-canva-edit`
- 미검증
  - 실제 Canva autofill/export
  - 실제 OpenAI Responses 호출

이유:
- 현재 로컬 세션에 실사용 API key/token 미설정
