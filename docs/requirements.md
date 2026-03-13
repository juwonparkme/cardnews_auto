# 카드뉴스 자동화 요구사항 고정안

## 범위

v1 범위:
- CLI로 실행
- 카드뉴스 1건 생성
- 총 8페이지 고정
- 표지 1페이지 + 앨범 7페이지
- 입력 대상은 앨범 7개
- 최종 결과는 로컬 PDF 저장

v1 제외:
- 웹 UI
- 카드 수 가변
- 여러 템플릿 동시 지원
- 배치 다건 처리
- 사용자 계정 시스템

## 사용자 입력 규칙

사용자가 직접 입력:
- 카드뉴스 메인 제목 1개
- 앨범명 7개
- 가수명 7개

사용자가 필요 시 입력:
- 커버 이미지 파일 경로
- PDF 저장 경로
- Canva template id

자동 수집 대상:
- 앨범 소개
- 커버 이미지 URL
- 앨범 형태
- 상세 페이지 URL
- 소스 사이트 정보

자동 생성 대상:
- 카드 본문 2줄 요약

## 입력 방식 결정

v1 기본 입력 방식:
- `interactive prompt`

이유:
- 사용 흐름이 가장 단순
- 7개 고정 입력에 적합
- 수집 실패 시 즉시 fallback 질문 가능

v2 후보:
- JSON 파일 입력
- CSV 파일 입력

## CLI 명령 결정

v1 기본 명령:

```bash
cardnews render
```

지원 옵션:

```bash
cardnews render --output ~/Desktop/cardnews.pdf
cardnews render --template <template-id>
cardnews render --skip-canva-edit
```

옵션 의미:
- `--output`: PDF 저장 경로
- `--template`: 사용할 Canva Brand Template 지정
- `--skip-canva-edit`: 자동 생성 후 편집 단계 없이 바로 export 시도

## 기본 실행 흐름

1. CLI 실행
2. 메인 제목 입력
3. 7개 앨범명/가수명 입력
4. 각 앨범에 대해 멜론 검색
5. 필요 시 벅스/스포티파이 참고
6. 소개글/이미지/형태 추출
7. 소개글 기반 2줄 요약 생성
8. 이미지 누락 시 사용자 경로 입력
9. Canva 템플릿에 데이터 주입
10. 표지 1페이지 + 앨범 7페이지 구성으로 디자인 생성
11. 편집 옵션 처리
12. PDF export
13. 로컬 저장

## 8페이지 고정 규칙

v1은 총 8페이지 고정.

의미:
- 입력 앨범 수도 7개 고정
- 첫 페이지는 제목/표지 페이지
- 나머지 7페이지는 앨범 페이지
- Canva 템플릿도 총 8페이지 기준
- 템플릿 dataset도 표지 1세트 + 앨범 7세트 기준

이유:
- 사용자 요구와 일치
- 템플릿 설계 단순화
- 텍스트 budget 관리 쉬움

## Canva 편집 단계 결정

v1 기준:
- 기본값은 `편집 옵션`
- 즉, 자동 생성 후 바로 export 가능
- 필요하면 `edit_url` 출력 후 사용자가 수정 가능

정책:
- `--skip-canva-edit` 있으면 바로 export
- 옵션이 없으면 `edit_url` 출력 후 짧은 확인 단계 제공 가능

이유:
- 자동 파이프라인 유지
- Canva 손수정도 허용

## 데이터 수집 우선순위

우선순위:
1. 멜론
2. 벅스
3. 스포티파이
4. 사용자 수동 입력

사이트 선택 기준:
- 소개글 존재 여부
- 커버 이미지 확보 가능 여부
- 앨범 형태 추출 가능 여부
- 결과 정확도

사이트별 역할:
- 멜론: 앨범 소개 우선 소스
- 벅스: 커버/형태/발매일 fallback 소스
- 스포티파이: 커버 이미지/메타데이터 보강 소스

## 텍스트 생성 규칙

목표:
- 소개글 기반으로 어떤 음악일지 짧게 설명
- 카드뉴스 본문에 바로 넣을 수 있어야 함

제약:
- 2줄 수준
- 장문 금지
- 홍보 문구 톤 과도 금지
- 소개글에 없는 사실 추가 금지

예상 출력 톤:
- 장르
- 무드
- 정서
- 사운드 인상

## 이미지 처리 규칙

기본:
- 음악 사이트에서 커버 이미지 확보 시 자동 사용

fallback:
- 추출 실패 시 사용자에게 파일 경로 요청
- 사용자도 제공 못하면 템플릿 빈칸 유지

v1 결정:
- 별도 이미지 생성 기능 없음

## 앨범 형태 처리 규칙

기본:
- 사이트에서 추출 가능하면 사용

fallback:
- 추출 실패 시 빈칸 유지

추출 예:
- 정규
- EP
- 싱글
- 미니앨범

## PDF 저장 정책

기본 저장 경로:
- `~/Desktop/cardnews-{timestamp}.pdf`

파일명 규칙:
- 영문/숫자/하이픈 위주 slug 사용
- 충돌 시 suffix 추가

출력해야 할 것:
- 저장 절대 경로
- Canva design id
- 필요 시 edit url

## 에러 처리 정책

입력 단계:
- 빈 입력이면 재질문
- 7개 미만 입력이면 진행 금지

검색 단계:
- 멜론 실패 시 벅스 재시도
- 소개/형태 부족 시 스포티파이로 메타데이터 보강
- 전부 실패면 수동 입력 모드 전환

요약 단계:
- 1회 재시도
- 계속 실패면 원문 축약 fallback 또는 빈칸

Canva 단계:
- 인증 실패면 즉시 종료
- export 실패면 edit_url 출력 후 수동 저장 안내

## 환경 변수 초안

예상 필요값:
- `OPENAI_API_KEY`
- `CANVA_CLIENT_ID`
- `CANVA_CLIENT_SECRET`
- `CANVA_REDIRECT_URI`
- `CANVA_BRAND_TEMPLATE_ID`

추후 추가 가능:
- `CARDNEWS_OUTPUT_DIR`
- `CARDNEWS_CACHE_DIR`

## 출력 데이터 초안

```ts
type AlbumInput = {
  albumName: string;
  artistName: string;
  imagePath?: string;
};

type CardnewsInput = {
  title: string;
  albums: [AlbumInput, AlbumInput, AlbumInput, AlbumInput, AlbumInput, AlbumInput, AlbumInput];
  outputPath?: string;
  templateId?: string;
  skipCanvaEdit?: boolean;
};
```

## 완료 기준

1번부 완료로 보는 조건:
- CLI 입력 방식 확정
- 총 8페이지 고정 확정
- 자동/수동 필드 경계 확정
- PDF 기본 저장 정책 확정
- Canva 편집 단계 정책 확정

## 현재 확정 결론

- v1은 `interactive CLI`
- 앨범 수는 `7개 고정`
- 총 페이지 수는 `8개 고정`
- 구성은 `표지 1 + 앨범 7`
- 기본 명령은 `cardnews render`
- 데이터 소스는 `멜론, 벅스, 스포티파이`
- Canva 편집은 `옵션`
- 최종 결과는 `Desktop 기본 경로 PDF 저장`
