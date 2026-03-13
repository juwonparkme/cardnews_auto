# 카드뉴스 자동화 아키텍처

## 목표

- 입력 데이터로 인스타 카드뉴스 생성
- 실행 방식은 우선 `CLI`
- Canva 안에서 최종 편집
- 결과물은 최종적으로 `PDF` 로 사용자 컴퓨터에 저장
- 참고 디자인: [`inst_cardnews.pdf`](/Users/bagjuwon/Projects/cardnews_auto/inst_cardnews.pdf)
- 총 페이지 수는 `8페이지 고정`
- 구성은 `표지 1페이지 + 앨범 7페이지`

## 확정 워크플로우 v1

1. CLI 실행
2. 사용자에게 앨범 7개 분량의 정보 입력 받음
3. 각 앨범에 대해 멜론/벅스/스포티파이 참고 검색
4. 검색 결과에서 앨범 상세 페이지 확보
5. 상세 페이지의 `앨범 소개` 추출
6. 추출한 소개글을 LLM에 보내 2줄 설명 생성
7. 앨범 커버 이미지 확보
8. 앨범 형태(정규/EP/싱글 등) 확보 가능하면 채움
9. 사용자 입력 제목/가수명과 함께 Canva 템플릿 데이터 구성
10. Canva에서 자동 생성 후 필요 시 편집
11. Canva Export API로 PDF 생성
12. PDF를 사용자 컴퓨터에 저장

입력 기준:
- 사용자 입력: 카드뉴스 메인 제목, 각 카드의 가수명, 각 카드의 앨범명
- 자동 수집: 앨범 소개, 커버 이미지, 앨범 형태
- 자동 생성: 2줄 요약 설명
- 수동 fallback: 이미지 미확보 시 사용자에게 경로 요청

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

### 수집 소스 결정

현재 기준 멜론/벅스의 공식 공개 개발자 API는 확인되지 않음.

따라서 v1은 `멜론/벅스 크롤링 + 스포티파이 메타데이터 활용` 기준으로 설계.

권장 정책:
- 1차: 멜론
- 2차: 벅스
- 3차: 스포티파이
- 이유: 멜론/벅스는 소개글 소스, 스포티파이는 이미지/메타데이터 보강 소스
- 최종 선택: 소개글은 멜론/벅스 우선, 이미지/메타데이터는 스포티파이 보강 허용

실측 결과:
- 멜론: `앨범소개` HTML 확인
- 벅스: 기본 메타는 확인, 긴 소개글은 샘플 기준 부재
- 스포티파이: 공식 API로 메타데이터 보강 가능

보수적 운영:
- robots.txt, 이용약관, 요청 빈도 확인
- rate limit 필수
- 캐시 필수
- 검색 실패 시 사용자 수동 입력 fallback

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

### 1. CLI Runner

전체 파이프라인 진입점.

역할:
- 입력 프롬프트 표시
- 7개 앨범 입력 수집
- 진행 상태 출력
- 중간 결과 확인
- 최종 PDF 저장 위치 출력

### 2. Album Source Finder

앨범명/가수명으로 멜론/벅스/스포티파이 검색 후 후보 확보.

역할:
- 사이트별 검색 URL 생성
- 검색 결과 파싱
- 상세 페이지 URL 선택
- 멜론/벅스/스포티파이 우선순위 비교

### 3. Album Scraper

상세 페이지에서 필요한 필드 추출.

필드:
- `albumTitle`
- `artistName`
- `albumType`
- `albumIntro`
- `coverImageUrl`
- `releaseDate`
- `sourceSite`
- `sourceUrl`

### 4. Content Planner

입력 원문을 카드뉴스 구조로 바꿈.

입력 예:
- 앨범 소개 원문
- 사용자 입력 제목
- 사용자 입력 가수명
- 앨범 타입
- 커버 이미지

출력 예:
- 카드별 2줄 설명
- 강조 문구
- 카드 배치용 구조화 데이터

### 5. LLM Summarizer

`앨범 소개`를 카드뉴스용 2줄 설명으로 변환.

프롬프트 규칙:
- 과장 금지
- 소개글 기반 추론만
- 2문장 또는 2줄
- 감성/장르/무드 중심
- 너무 장문 금지

입력:
- 원문 소개글
- 사용자 지정 스타일 프롬프트

출력:
- 카드 본문용 짧은 설명

### 6. Asset Resolver

앨범 커버 이미지 확보 담당.

전략:
- 상세 페이지 또는 API의 대표 이미지 URL 추출
- 이미지 다운로드 가능 시 로컬 임시 저장
- 실패 시 사용자에게 이미지 파일 경로 요청

### 7. Template Mapper

콘텐츠를 Canva 템플릿 필드에 매핑.

역할:
- `card_01_album`
- `card_01_artist`
- `card_01_type`
- `card_01_summary`
- `card_01_cover`
- `card_07_*`

처럼 고정 필드명으로 변환.

### 8. Canva Gateway

Canva OAuth, template 조회, autofill job 생성, 결과 polling 담당.

역할:
- OAuth 2.0 + PKCE
- brand template 목록 조회
- template dataset 조회
- autofill job 생성
- job 상태 polling
- `edit_url`, `view_url`, `design_id` 저장/반환
- PDF export job 실행
- export download URL 확보

### 9. Export Downloader

Canva export 결과 PDF를 사용자 컴퓨터에 저장.

역할:
- export job polling
- download URL로 PDF 저장
- 저장 경로 출력

### 10. Job Orchestrator

비동기 생성 파이프라인 관리.

상태:
- `queued`
- `searching`
- `scraping`
- `summarizing`
- `planning`
- `mapped`
- `rendering`
- `exporting`
- `ready`
- `failed`

### 11. Result UI / API

사용자가 생성 상태 확인, Canva 편집 진입, 복귀 후 결과 확인.

출력:
- `edit_url`
- `view_url`
- `design_id`
- `pdf_path`
- 썸네일
- 생성 시각

## 권장 데이터 모델

```ts
type CardnewsRequest = {
  title: string;
  albums: {
    albumName: string;
    artistName: string;
    userImagePath?: string;
  }[];
};

type AlbumSourceRecord = {
  albumTitle: string;
  artistName: string;
  albumType?: string;
  albumIntro?: string;
  coverImageUrl?: string;
  sourceSite: "melon" | "bugs" | "spotify";
  sourceUrl: string;
};

type AlbumCard = {
  albumTitle: string;
  artistName: string;
  albumType?: string;
  summary: string;
  coverAssetPath?: string;
  sourceSite?: "melon" | "bugs" | "spotify";
  sourceUrl?: string;
};

type CardnewsPlan = {
  title: string;
  cards: AlbumCard[];
};

type CanvaRenderResult = {
  designId: string;
  editUrl: string;
  viewUrl: string;
  jobId: string;
  exportJobId?: string;
  pdfPath?: string;
};
```

## 권장 사용자 플로우

1. CLI 시작
2. 사용자에게 카드뉴스 제목 입력 받음
3. 사용자에게 7개 앨범명과 7개 가수명 입력 받음
4. 각 항목별로 멜론/벅스/스포티파이 검색
5. 앨범 소개, 이미지, 앨범 타입 추출
6. 소개글을 LLM에 보내 2줄 설명 생성
7. 누락 이미지 있으면 사용자 경로 입력 받음
8. Canva template dataset 조회
9. Canva autofill job 생성
10. 필요 시 사용자가 Canva 편집
11. Canva Export API로 PDF export
12. PDF를 로컬에 저장

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

6. PDF export
   - Docs: https://www.canva.dev/docs/connect/api-reference/exports/
   - `POST /rest/v1/exports`
   - 완료 후 download URL로 PDF 저장

Fallback:
- Import API
- Docs: https://www.canva.dev/docs/connect/api-reference/design-imports/

## 권장 백엔드 구조

스택 제안:
- Node.js + TypeScript CLI
- 필요 시 로컬 companion API
- DB: SQLite/Postgres 아무거나 가능
- Queue: 초기엔 DB polling, 이후 Redis/BullMQ 가능

모듈:
- `cli/index`
- `cli/prompts`
- `sources/melon`
- `sources/bugs`
- `sources/search-router`
- `llm/summarizer`
- `assets/image-fetcher`
- `auth/canva-oauth`
- `cardnews/planner`
- `cardnews/template-mapper`
- `canva/client`
- `canva/autofill-service`
- `canva/export-service`
- `jobs/render-job-runner`
- `results/design-repository`

## API 초안

```txt
CLI    cardnews init
CLI    cardnews render
CLI    cardnews render --albums 7
CLI    cardnews render --template <id>
CLI    cardnews render --output ~/Desktop/result.pdf
```

예상 동작:
- `render`: 입력 수집 -> 검색/스크랩 -> 요약 -> Canva 생성 -> PDF 저장

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
- `export_job_id`
- `pdf_download_url`
- `pdf_local_path`
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

### 3. 멜론/벅스 API 부재 가능성

현재 공개 개발자 API는 확인되지 않음.

즉:
- 검색/상세 추출은 크롤링 전제
- 사이트 구조 변경에 취약
- anti-bot 대응 필요 가능

대응:
- HTML selector 버전 관리
- 사이트별 scraper 분리
- 실패 시 수동 입력 루트 제공

### 4. 스포티파이 데이터 한계

스포티파이는 메타데이터/이미지 보강엔 유리하지만 긴 `앨범 소개` 소스로는 제한적일 수 있음.

대응:
- 소개글은 멜론/벅스 우선
- 스포티파이는 이미지/발매일/앨범 타입 보강용

### 5. 템플릿-콘텐츠 불일치

슬라이드 수나 문장 길이가 template field 한도를 넘기면 깨짐.

대응:
- planner 단계에서 글자수 budget 적용
- 템플릿 variant 2~3개 운영
- 긴 문장은 자동 분할

### 6. 링크 만료

`edit_url`, `view_url`, thumbnail URL은 임시 URL일 수 있음.

대응:
- 영구 저장값은 `design_id`
- 필요 시 `Get design` 또는 `List designs` 재조회

## MVP 제안

### Phase 1

- 고정 1개 템플릿
- 입력: 제목 + 7개 앨범명/가수명
- 멜론/벅스/스포티파이 수집
- 소개글 2줄 요약
- 출력: 로컬 `PDF`

### Phase 2

- 검색 정확도 개선
- 이미지 fallback UX
- Canva 편집 링크 옵션화

### Phase 3

- 여러 템플릿
- 사이트 추가
- export/download 링크
- 배치 생성

## 바로 다음 액션

1. 멜론/벅스/스포티파이 검색/상세 페이지 데이터 경로 확정
2. Canva 쪽에서 참고 디자인 스타일로 `Brand Template` 1개 수동 제작
3. 8페이지 고정 dataset 필드명 설계
4. CLI 입력 포맷 확정
5. OAuth + template dataset 조회부터 구현

## 현재 결론

이 프로젝트의 정답 경로:

`CLI 입력 -> 멜론/벅스/스포티파이 검색 -> 앨범 소개/메타데이터 추출 -> 2줄 요약 생성 -> Canva Brand Template Autofill -> 필요 시 편집 -> Canva Export API -> 로컬 PDF 저장`

Autofill 접근이 막히면:

`원문 -> 외부에서 PPTX/PDF 생성 -> Canva Import -> edit_url 반환`
