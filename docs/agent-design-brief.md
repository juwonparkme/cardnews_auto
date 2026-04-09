# 카드뉴스 AI 에이전트 설계서

`카드뉴스 AI 에이전트 가이드북 1편(기초&설계)` 기준을 현재 `cardnews_auto` 구조에 맞게 적용한 설계 요약이다.

## 1. 이 에이전트가 정확히 해야 하는 일

입력:

- 카드뉴스 제목
- 앨범명/아티스트명 목록
- 필요 시 이미지 경로 override

처리:

1. 앨범 검색 후보 수집
2. 앨범 메타데이터/소개글 확보
3. 커버 이미지 확보
4. 카드뉴스용 summary 생성
5. Canva autofill 또는 PPTX/PDF fallback 렌더
6. 실행 결과와 산출물 경로 기록

출력:

- Canva `designId`, `editUrl`, `viewUrl`
- PDF 또는 PPTX 결과물
- 실행별 `run-summary.json`

## 2. 외부 서비스와 내부 모듈

외부 서비스:

- OpenAI Responses API: summary 생성
- Spotify API: 메타/이미지 보강
- 멜론/벅스: 소개글/검색 보강
- Canva API: autofill, export

내부 모듈:

- [CLI](../src/cli/index.ts)
- [Planner](../src/cardnews/planner.ts)
- [Summarizer](../src/llm/summarizer.ts)
- [Canva Runner](../src/jobs/render-job-runner.ts)
- [PPTX Renderer](../src/pptx/inst-cardnews-renderer.ts)

## 3. 가이드북에서 바로 적용한 원칙

### 설계서 분리

- 프로젝트 수준 설계 문서를 코드 밖에서 관리
- 현재 기준 문서:
  - [architecture.md](./architecture.md)
  - [agent-design-brief.md](./agent-design-brief.md)
  - [pptx-keynote-plan.md](./pptx-keynote-plan.md)

### 프롬프트 분리

- LLM 지시문을 코드에서 분리
- summary 프롬프트:
  - [album-summary.md](../prompts/album-summary.md)

### 실행 산출물 구조화

- 실행마다 `run-summary.json` 생성
- 기본 위치:
  - `~/Desktop/cardnews-runs/<timestamp>-<slug>/run-summary.json`
- 기록 내용:
  - 입력 제목/앨범 목록
  - 준비된 카드 데이터
  - Canva 디자인 정보
  - 최종 PDF 경로
  - 실패 시 에러 메시지

## 4. 현재 실행 흐름

```text
CLI 입력
-> 앨범 준비
-> summary 생성
-> Canva 렌더 또는 fallback
-> PDF export
-> run-summary.json 기록
```

## 5. 다음 확장 포인트

- 마케팅 앵글/P.D.A. 모드 분리
- prompt 파일 다중화
- 배치 실행 모드
- 사람 검토 승인 단계 추가
