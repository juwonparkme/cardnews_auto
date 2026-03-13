# 카드뉴스 자동화 작업 계획

## 목표

- CLI 기반 카드뉴스 자동화 구축
- 입력: 카드뉴스 제목 + 7개 앨범명/가수명
- 페이지 구성: 총 8페이지 고정
- 표지 1페이지 + 앨범 7페이지
- 수집: 멜론/벅스/스포티파이에서 앨범 소개, 커버, 앨범 형태 확보
- 생성: 소개글 기반 2줄 요약 생성
- 렌더: Canva 템플릿 자동 채우기
- 결과: PDF를 사용자 컴퓨터에 저장

## 전체 단계

1. 요구사항 고정
2. 데이터 소스 검증
3. Canva 템플릿 준비
4. CLI 골격 구현
5. 검색/스크래핑 구현
6. LLM 요약 구현
7. 이미지 fallback 구현
8. Canva 연동 구현
9. PDF export 구현
10. 통합 검증
11. 배포/운영 정리

## 1. 요구사항 고정

할 일:
- 입력 포맷 확정
- 7개 앨범 고정 여부 확정
- 사용자 직접 입력 필드와 자동 수집 필드 구분
- 결과 PDF 저장 경로 기본값 확정

결정할 것:
- CLI 명령 형태
- 앨범 입력 방식
  - 순차 prompt
  - JSON 파일
  - CSV 파일
- Canva 편집 단계를 필수로 둘지 옵션으로 둘지

산출물:
- CLI UX 초안
- 입력 스키마 초안

## 2. 데이터 소스 검증

할 일:
- 멜론 검색 페이지 구조 확인
- 멜론 앨범 상세 페이지 구조 확인
- 벅스 검색 페이지 구조 확인
- 벅스 앨범 상세 페이지 구조 확인
- 스포티파이 데이터 접근 방식 확인
- `앨범 소개`, `커버 이미지`, `앨범 형태` selector 추출
- robots/차단 여부 확인

핵심 목표:
- 사이트별로 안정적으로 뽑을 수 있는 필드 확인
- 멜론/벅스/스포티파이 역할 분담 구조 확보

산출물:
- 사이트별 selector 문서
- scraper 입출력 스펙
- 실패 fallback 정책

## 3. Canva 템플릿 준비

할 일:
- 참고 PDF 스타일로 Canva 템플릿 제작
- 총 8페이지 고정 레이아웃 구성
- 표지 1페이지 + 앨범 7페이지 구성
- cover/title/body/type/image 필드 확정
- Brand Template 생성
- autofill dataset 필드명 확정

권장 필드 예:
- `main_title`
- `cover_title`
- `card_01_album`
- `card_01_artist`
- `card_01_type`
- `card_01_summary`
- `card_01_cover`
- `card_07_*`

산출물:
- Canva Brand Template
- dataset field 목록
- 템플릿 ID

## 4. CLI 골격 구현

할 일:
- TypeScript CLI 초기화
- 명령 구조 설계
- prompt 입력 모듈 작성
- 로그/진행상태 출력 형식 정의

권장 명령:
- `cardnews render`
- `cardnews render --output ~/Desktop/cardnews.pdf`
- `cardnews render --template <template-id>`

산출물:
- CLI 엔트리포인트
- prompt 모듈
- config 로더

## 5. 검색/스크래핑 구현

할 일:
- `melon` scraper 구현
- `bugs` scraper 구현
- `spotify` metadata fetcher 구현
- 공통 `search-router` 구현
- 검색 결과 score 로직 구현
- 앨범 상세 파서 구현
- 캐시 추가

처리 순서:
1. 앨범명 + 가수명 검색
2. 후보 결과 수집
3. 가장 적합한 상세 페이지 선택
4. 소개글/이미지/형태 추출
5. 소개글은 멜론/벅스 우선
6. 이미지/메타데이터는 스포티파이 보강
7. 실패 시 다른 사이트 재시도

산출물:
- `sources/melon`
- `sources/bugs`
- `sources/spotify`
- `sources/search-router`
- 샘플 fixture

## 6. LLM 요약 구현

할 일:
- 소개글 -> 2줄 요약 프롬프트 확정
- 요약 길이 제한 규칙 추가
- 실패 시 재시도 정책 추가
- 원문 없을 때 fallback 문구 정책 추가

프롬프트 목표:
- 장르/무드/정서 중심
- 과장 금지
- 소개글 기반 추론만
- 카드뉴스용 짧은 톤

산출물:
- summarizer 모듈
- 프롬프트 템플릿
- 샘플 입출력

## 7. 이미지 fallback 구현

할 일:
- 사이트 이미지 URL 다운로드 구현
- 로컬 임시 저장 구현
- 이미지 누락 시 사용자 입력 prompt 추가
- 잘못된 파일 경로 검증

fallback 규칙:
- 자동 수집 성공 시 자동 사용
- 실패 시 사용자 경로 요청
- 끝까지 없으면 템플릿 빈칸 유지

산출물:
- image fetcher
- local asset resolver

## 8. Canva 연동 구현

할 일:
- Canva OAuth 구현
- access token 저장
- Brand Template dataset 조회
- autofill payload 생성
- autofill job 생성
- job 상태 polling
- `edit_url`, `view_url`, `design_id` 수집

전제:
- Canva Enterprise
- Connect API access
- Brand Template 준비 완료

산출물:
- `canva/client`
- `canva/autofill-service`
- OAuth callback 처리

## 9. PDF export 구현

할 일:
- Canva Export API 연동
- PDF export job 생성
- export 상태 polling
- PDF download URL 확보
- 로컬 저장 구현

저장 정책:
- 기본 저장 경로 지정
- 파일명 규칙 지정
- 기존 파일 충돌 시 suffix 처리

산출물:
- `canva/export-service`
- local download/save 모듈

## 10. 통합 검증

할 일:
- 8페이지 기준 end-to-end 테스트
- 멜론 성공/벅스 fallback/스포티파이 보강 케이스 검증
- 소개글 누락 케이스 검증
- 이미지 누락 케이스 검증
- Canva export 성공 검증
- 최종 PDF 저장 검증

체크 항목:
- CLI 중단 없이 끝나는지
- 표지 1장 + 앨범 7장 모두 채워지는지
- 텍스트 길이로 디자인이 깨지지 않는지
- 저장된 PDF가 실제 열리는지

산출물:
- 수동 테스트 체크리스트
- 가능하면 regression test

## 11. 배포/운영 정리

할 일:
- `.env` 항목 문서화
- Canva 토큰 관리 방식 정리
- rate limit / retry 정책 정리
- 에러 메시지 정리
- README 업데이트

산출물:
- 실행 방법 문서
- 운영 주의사항
- 장애 대응 메모

## 권장 구현 순서

1. 멜론/벅스/스포티파이 데이터 검증
2. Canva Brand Template 준비
3. CLI 입력 골격 구현
4. scraper 구현
5. summarizer 구현
6. Canva autofill 구현
7. PDF export 구현
8. end-to-end 검증

## 단계별 완료 기준

### Phase 1

- CLI에서 7개 앨범 입력 가능
- 총 8페이지 데이터 구조 생성 가능
- 멜론/벅스/스포티파이에서 필요한 정보 추출 가능
- 2줄 요약 생성 가능

### Phase 2

- Canva 템플릿 자동 채우기 가능
- edit/view 링크 확인 가능

### Phase 3

- PDF export 후 로컬 저장 가능
- 실패 케이스 fallback 동작 확인

## 리스크 메모

- 멜론/벅스는 공개 API보다 크롤링 가능성이 큼
- 스포티파이는 소개글보다 메타데이터 보강에 적합할 가능성이 큼
- 사이트 구조 변경 시 scraper 깨질 수 있음
- Canva Autofill/Export는 플랜 및 권한 제약 있음
- 텍스트 길이 초과 시 템플릿 깨질 수 있음

## 현재 바로 할 일

1. 멜론/벅스 실제 selector 조사
2. 스포티파이 데이터 접근 경로 확인
3. Canva 템플릿 필드 설계
4. CLI 프로젝트 스캐폴드 시작
