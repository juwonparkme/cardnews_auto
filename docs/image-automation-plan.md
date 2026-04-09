# 이미지 자동화 작업 계획

작성일:
- 2026-03-22

목표:
- 앨범 커버 이미지를 `입력 -> 수집 -> 정규화 -> Canva 주입 -> 검증` 흐름으로 자동화
- 현재의 단순 다운로드 fallback 을 `재현 가능` 한 파이프라인으로 승격
- 수동 개입 지점을 최소화하고, 실패 시 원인과 대체 경로를 명확히 남김

## 현재 상태

이미 구현된 것:
- `src/assets/asset-resolver.ts`
  - 사용자 입력 `imagePath` 우선 사용
  - 소스 레코드의 `coverImageUrl` 이 있으면 다운로드 시도
  - 실패 시 TTY 환경에서 수동 파일 경로 fallback
- `src/assets/image-fetcher.ts`
  - 원격 이미지 단건 다운로드
  - 임시 디렉토리 저장
- `src/canva/autofill-service.ts`
  - 카드별 cover asset 업로드
  - `card_0n_cover` dataset field 에 `asset_id` 주입

현재 한계:
- 첫 URL 1개만 바로 내려받음. 후보 비교 없음
- 해상도, 비율, 파일 크기, MIME 검증 없음
- 동일 이미지 재사용/캐시 기준 없음
- 정사각형이 아닌 커버를 Canva 프레임에 넣기 전 정규화 없음
- 실패 원인이 `다운로드 실패` 수준으로만 남음
- 이미지 단계만 따로 검증/리포트하는 구조 없음

## 목표 상태

v2 이미지 자동화는 아래를 만족해야 한다.

- 입력 앨범 7개에 대해 cover image 후보를 자동 수집
- 후보별 품질 점수 계산 후 최적 이미지 선택
- Canva 업로드 전에 크기/포맷/비율을 표준화
- 어떤 이미지가 왜 선택됐는지 manifest 로 남김
- 실패한 카드만 수동 보정 가능

즉, 텍스트 자동화와 별개로 이미지도 `결정 가능`, `재시도 가능`, `검증 가능` 해야 한다.

## 범위

이번 계획의 대상:
- 앨범 커버 이미지 자동 수집
- 커버 이미지 정규화
- Canva dataset image field 주입
- 실패 카드 수동 fallback
- 실행 결과 manifest/report

이번 계획의 비대상:
- 배경 일러스트 생성
- 앨범 커버 자체를 AI로 새로 생성
- Canva 내부 장식 요소 자동 편집

## 설계 원칙

- 사용자 명시 입력이 항상 최우선
- 원본 훼손보다 안전한 padding 우선
- 다운로드 성공보다 `템플릿 안에서 덜 깨지는 결과` 우선
- 7장 중 일부 실패해도 나머지 진행 가능해야 함
- 실패 이유는 카드 단위로 출력

## 목표 파이프라인

### 1. 후보 수집

입력 우선순위:
1. 사용자가 직접 준 `imagePath`
2. Spotify `coverImageUrl`
3. 멜론 상세 `coverImageUrl`
4. 벅스 상세 `coverImageUrl`
5. 수동 입력 fallback

수집 단계에서 남길 정보:
- `sourceSite`
- `sourceUrl`
- `imageUrl`
- 응답 status
- `content-type`
- 파일 크기
- 원본 가로/세로

규칙:
- 후보는 최대 3개까지만 유지
- 같은 URL, 같은 hash 는 dedupe
- 소스별 timeout/retry 분리

### 2. 다운로드 및 로컬 캐시

목표:
- 임시 파일이 아니라 `추적 가능한 캐시` 로 저장

권장 형태:
- 작업 디렉토리: `/tmp/cardnews-auto-assets/<job-id>/`
- 파일명: `<card-index>-<source>-<content-hash>.<ext>`
- manifest: `images.json`

manifest 예시 필드:
- `albumTitle`
- `artistName`
- `selectedSource`
- `selectedPath`
- `selectedHash`
- `candidates`
- `failureReason`

효과:
- Canva 업로드 실패 시 원본 파일 재사용 가능
- 나중에 어떤 소스가 자주 깨지는지 통계 가능

### 3. 이미지 정규화

Canva 템플릿 기준으로 cover 이미지를 표준화한다.

필수 체크:
- MIME sniff
- 이미지 decode 가능 여부
- 최소 해상도
- 너무 작은 썸네일 제외
- 비정상 종횡비 제외

정규화 규칙 초안:
- 기본 출력: `jpg` 또는 `png`
- 최소 한 변: `1080px`
- 색상 프로파일/metadata 제거
- 정사각형 아닌 이미지는 중앙 기준으로 fit
- crop 보다 letterbox/padding 우선

이유:
- 앨범 커버는 crop 시 정보 손실이 커서 padding 이 안전
- Canva 내부 frame 차이로 인한 예측 불가 변형을 줄일 수 있음

추가 옵션:
- `--image-fit contain|cover`
- v1 기본값은 `contain`

## 4. 선택 로직

후보가 여러 개면 아래 규칙으로 점수화한다.

가점:
- 해상도 큼
- 정사각형에 가까움
- 공식 소스 우선
- MIME 정상

감점:
- 파일 크기 과도하게 작음
- 리다이렉트 반복
- placeholder/blank 가능성
- 너무 긴 가로형/세로형

선택 결과는 반드시 로그와 manifest 에 남긴다.

예시:
- `card_03 image selected: spotify score=0.91 1280x1280 image/jpeg`
- `card_05 image fallback: user path`

## 5. Canva 업로드

업로드 전 조건:
- 선택된 `normalizedPath` 존재
- 파일 크기 허용 범위 이내
- hash 계산 완료

업로드 개선 포인트:
- 동일 hash 이미지 중복 업로드 방지
- asset upload retry 1~2회
- 카드별 업로드 결과 로그

Canva 매핑:
- `card_01_cover` ~ `card_07_cover`
- 실패한 카드는 field 미주입보다 placeholder 정책 여부를 먼저 결정

권장 기본값:
- v1 은 placeholder 자동 생성하지 않음
- 이미지 없으면 카드만 경고하고 계속 진행

## 6. 검증 및 리포트

실행 종료 시 출력:
- 성공 카드 수
- 실패 카드 수
- 수동 fallback 사용 카드
- Canva 업로드 성공/실패
- manifest 저장 경로

추가 산출물:
- `images.json`
- `selected/` 정규화된 최종 이미지
- `rejected/` 탈락 후보

## 구현 단계

### Phase 1. 관측 가능성 확보

목표:
- 현재 단순 다운로드 흐름을 깨지 않고 manifest/log 먼저 추가

작업:
- `src/assets/asset-resolver.ts`
  - 선택 경로와 실패 이유 구조화
- `src/assets/image-fetcher.ts`
  - 응답 헤더, 파일 크기, 저장 경로 반환 확장
- `src/types.ts`
  - image candidate / image selection result 타입 추가

완료 기준:
- 어떤 이미지가 선택됐는지 카드별 출력 가능

### Phase 2. 정규화 파이프라인

목표:
- Canva 넣기 전 이미지 품질 최소 기준 확보

작업:
- `src/assets/image-normalizer.ts` 신설
- decode/resize/fit/padding 구현
- MIME sniff 및 최소 해상도 검사

완료 기준:
- 선택된 이미지는 모두 표준 크기/포맷으로 저장

### Phase 3. 다중 후보 선택

목표:
- 한 URL 실패에 덜 민감한 구조

작업:
- `src/sources/*`
  - cover image 후보 1개 이상 수집 가능하게 확장
- `src/assets/image-selector.ts` 신설
- source priority + score 계산

완료 기준:
- 카드별 후보 목록과 최종 선택 근거 출력 가능

### Phase 4. CLI/운영 옵션

작업:
- `src/cli/index.ts`
  - `--image-fit`
  - `--image-cache-dir`
  - `--image-report`
  - `--fail-on-missing-image`
- `README.md`
  - 실제 사용 예시 추가

완료 기준:
- 이미지 자동화 정책을 CLI 에서 제어 가능

### Phase 5. 테스트

테스트 범위:
- 작은 썸네일 reject
- 정사각형 아닌 이미지 contain 처리
- 잘못된 MIME reject
- 후보 점수화
- 수동 fallback 유지

후보 테스트 파일:
- `src/assets/image-selector.test.ts`
- `src/assets/image-normalizer.test.ts`

완료 기준:
- 네트워크 없이 핵심 로직 단위 테스트 가능

## 실패 정책

기본 정책:
- 이미지 1~2장 실패해도 전체 작업은 계속
- 단, `--fail-on-missing-image` 시 즉시 실패

실패 메시지는 아래 수준까지 보여야 한다.

- 다운로드 실패
- decode 실패
- 해상도 부족
- 후보 없음
- Canva upload 실패

## 수동 개입 지점

자동화가 막혀도 작업을 끝낼 수 있어야 한다.

허용하는 수동 개입:
- 특정 카드만 `imagePath` 직접 지정
- 실패 카드만 재시도
- 최종 Canva 에서 위치/크롭만 손수정

허용하지 않는 방향:
- 7장 전체를 매번 수동으로 다시 고르는 흐름

## 권장 완료 순서

1. manifest/log 추가
2. 정규화기 추가
3. 후보 점수화
4. CLI 옵션 노출
5. 테스트 fixture 추가
6. Canva 실제 e2e 검증

## 완료 기준

아래가 되면 이미지 자동화 v2 완료로 본다.

- 7개 카드 중 6개 이상이 수동 개입 없이 cover 선택
- Canva 업로드 전 이미지 정규화 완료
- 실패 카드와 이유가 report 에 남음
- 재실행 시 동일 입력이면 대체로 동일 결과
- PDF export 전까지 이미지 단계에서 막힌 카드 식별 가능

## 관련 파일

- [asset-resolver.ts](../src/assets/asset-resolver.ts)
- [image-fetcher.ts](../src/assets/image-fetcher.ts)
- [autofill-service.ts](../src/canva/autofill-service.ts)
- [types.ts](../src/types.ts)
- [canva-template-prep.md](./canva-template-prep.md)
