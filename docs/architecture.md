# 카드뉴스 자동화 아키텍처

## 목표

- 입력 데이터로 인스타 카드뉴스 생성
- Canva 안에서 최종 편집
- 결과물은 Canva 편집 링크/뷰 링크로 반환
- 참고 디자인: [`inst_cardnews.pdf`](/Users/bagjuwon/Projects/cardnews_auto/inst_cardnews.pdf)

## 참고 디자인 관찰

- PDF 메타데이터 기준 `8 pages`
- 페이지 비율 `810 x 1020` pt, 즉 `4:5`
- 인스타 피드용 세로형 카드뉴스 비율과 일치
- 표지 기준 스타일
  - 짙은 회색 그리드 배경
  - 파스텔 스티커형 일러스트
  - 굵은 외곽선
  - 큰 타이포 제목 블록

주의:
- 현재 로컬에선 PDF 전체 텍스트 추출 도구가 없어, 시각 스타일/메타데이터 기준으로 설계
- 내부 페이지 카피 구조는 템플릿 슬롯 기반으로 일반화하는 쪽이 안전

## 핵심 결정

### 권장안: Canva Brand Template + Autofill

이 방식이 가장 맞음.

이유:
- 참고 카드뉴스 같은 레이아웃을 Canva 안에서 직접 템플릿화 가능
- 자동화는 텍스트/이미지 필드만 채우면 됨
- 생성 직후 `edit_url` 로 Canva 에디터 이동 가능
- 유저가 Canva에서 마지막 손질 가능

전제:
- Canva Connect API 사용
- Canva Enterprise 조직 사용자 필요
- Autofill API 접근 등록 필요

### 차선책: Design Import

Enterprise/Autofill 불가면 fallback.

흐름:
- 우리 쪽에서 PPTX/PDF 생성
- Canva `design import` API로 가져오기
- 생성된 디자인의 `edit_url` 반환

한계:
- Canva 네이티브 템플릿보다 수정 경험이 떨어질 수 있음
- 레이아웃 슬롯 제어가 약함
- 텍스트/이미지 교체를 데이터 필드 단위로 다루기 어려움

## 시스템 구성

### 1. Content Planner

입력 원문을 카드뉴스 구조로 바꿈.

입력 예:
- 기사 URL
- 블로그 글
- 유튜브 스크립트
- 수동 입력 텍스트

출력 예:
- 제목
- 부제
- 톤/카테고리
- 슬라이드 배열
- 각 슬라이드의 헤드라인
- 본문 요약
- 강조 문구
- 이미지 프롬프트 또는 이미지 URL

### 2. Template Mapper

콘텐츠를 Canva 템플릿 필드에 매핑.

역할:
- `slide_01_title`
- `slide_02_heading`
- `slide_02_body`
- `slide_02_image`
- `slide_08_cta`

처럼 고정 필드명으로 변환.

### 3. Canva Gateway

Canva OAuth, template 조회, autofill job 생성, 결과 polling 담당.

역할:
- OAuth 2.0 + PKCE
- brand template 목록 조회
- template dataset 조회
- autofill job 생성
- job 상태 polling
- `edit_url`, `view_url`, `design_id` 저장/반환

### 4. Job Orchestrator

비동기 생성 파이프라인 관리.

상태:
- `queued`
- `planning`
- `mapped`
- `rendering`
- `ready`
- `failed`

### 5. Result UI / API

사용자가 생성 상태 확인, Canva 편집 진입, 복귀 후 결과 확인.

출력:
- `edit_url`
- `view_url`
- `design_id`
- 썸네일
- 생성 시각

## 권장 데이터 모델

```ts
type CardnewsRequest = {
  sourceType: "text" | "url" | "manual";
  source: string;
  theme?: string;
  slideCount?: number;
  tone?: "playful" | "editorial" | "bold";
};

type Slide = {
  kind: "cover" | "content" | "quote" | "summary" | "cta";
  title?: string;
  body?: string;
  caption?: string;
  imageUrl?: string;
  emphasis?: string;
};

type CardnewsPlan = {
  title: string;
  subtitle?: string;
  slides: Slide[];
  palette?: string[];
  visualKeywords?: string[];
};

type CanvaRenderResult = {
  designId: string;
  editUrl: string;
  viewUrl: string;
  jobId: string;
};
```

## 권장 사용자 플로우

1. 사용자가 원문/주제 입력
2. 시스템이 카드뉴스용 `CardnewsPlan` 생성
3. 사용자가 템플릿 선택
4. 시스템이 Canva template dataset 조회
5. 시스템이 필드 매핑 검증
6. Canva autofill job 생성
7. job 완료 시 `edit_url` 반환
8. 사용자가 Canva에서 편집
9. Canva return navigation으로 우리 서비스 복귀
10. 최종 `view_url` 또는 export 후 배포

## Canva API 매핑

권장 흐름:

1. OAuth 인증
   - Docs: https://www.canva.dev/docs/connect/authentication/
   - Token: `POST /rest/v1/oauth/token`

2. Brand template 확인
   - List/Get brand templates
   - Docs: https://www.canva.dev/docs/connect/api-reference/brand-templates/

3. Dataset 확인
   - `GET /rest/v1/brand-templates/{brandTemplateId}/dataset`
   - autofill 가능한 필드명/타입 확인

4. Autofill 실행
   - Docs: https://www.canva.dev/docs/connect/api-reference/autofills/
   - `Create design autofill job`
   - 완료 후 생성된 design의 URL 획득

5. Edit in Canva
   - 반환된 `edit_url` 사용
   - return navigation 설정 권장
   - Docs: https://www.canva.dev/docs/connect/return-navigation-guide/

Fallback:
- Import API
- Docs: https://www.canva.dev/docs/connect/api-reference/design-imports/

## 권장 백엔드 구조

스택 제안:
- Next.js 또는 Express 백엔드 + TypeScript
- DB: SQLite/Postgres 아무거나 가능
- Queue: 초기엔 DB polling, 이후 Redis/BullMQ 가능

모듈:
- `auth/canva-oauth`
- `cardnews/planner`
- `cardnews/template-mapper`
- `canva/client`
- `canva/autofill-service`
- `jobs/render-job-runner`
- `results/design-repository`

## API 초안

```txt
POST   /api/cardnews/plan
POST   /api/cardnews/render
GET    /api/cardnews/jobs/:jobId
GET    /api/cardnews/designs/:designId
GET    /api/oauth/canva/start
GET    /api/oauth/canva/callback
GET    /api/canva/return
```

예상 동작:
- `/plan`: 원문 -> 슬라이드 구조 생성
- `/render`: template 매핑 후 Canva job 시작
- `/jobs/:jobId`: polling
- `/canva/return`: Canva 편집 후 복귀 처리

## 필수 저장 데이터

- 사용자 Canva 연결 정보
  - `access_token`
  - `refresh_token`
  - `expires_at`
- 선택한 `brand_template_id`
- template dataset snapshot
- render request 원본
- 매핑된 autofill payload
- `job_id`
- `design_id`
- `edit_url`
- `view_url`
- `correlation_state`

## 리스크

### 1. 제일 큰 리스크

`참고 PDF 같은 형식`을 API만으로 바로 조립하기 어렵다.

이유:
- `Create design` API는 빈 디자인/커스텀 사이즈 생성 중심
- 완성형 레이아웃 복제엔 약함
- 그래서 템플릿 기반 접근이 사실상 정석

### 2. 계정 플랜 제약

Brand Template / Autofill API는 Enterprise 전제가 붙음.

즉:
- Canva 요금제/조직 상태 확인 먼저 필요
- private integration으로 시작하는 게 안전

### 3. 템플릿-콘텐츠 불일치

슬라이드 수나 문장 길이가 template field 한도를 넘기면 깨짐.

대응:
- planner 단계에서 글자수 budget 적용
- 템플릿 variant 2~3개 운영
- 긴 문장은 자동 분할

### 4. 링크 만료

`edit_url`, `view_url`, thumbnail URL은 임시 URL일 수 있음.

대응:
- 영구 저장값은 `design_id`
- 필요 시 `Get design` 또는 `List designs` 재조회

## MVP 제안

### Phase 1

- 고정 1개 템플릿
- 입력: 수동 텍스트
- 출력: Canva `edit_url`

### Phase 2

- URL/article 입력
- 자동 요약 + 슬라이드 분할
- return navigation 복귀

### Phase 3

- 여러 템플릿
- 이미지 추천/업로드
- export/download 링크
- 배치 생성

## 바로 다음 액션

1. Canva 쪽에서 참고 디자인 스타일로 `Brand Template` 1개 수동 제작
2. Data autofill 필드명 설계
3. 필요한 scopes 확정
4. OAuth + template dataset 조회부터 구현

## 현재 결론

이 프로젝트의 정답 경로:

`원문 -> 카드뉴스 플랜 생성 -> Canva Brand Template Autofill -> edit_url 반환 -> Canva에서 최종 편집 -> return navigation으로 복귀`

Autofill 접근이 막히면:

`원문 -> 외부에서 PPTX/PDF 생성 -> Canva Import -> edit_url 반환`
