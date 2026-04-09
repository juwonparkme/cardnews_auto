# Canva 템플릿 준비

작성일:
- 2026-03-13

목표:
- `8페이지 고정` 카드뉴스용 Canva Brand Template 명세 확정
- Autofill dataset field 이름 확정
- Canva 내부 수동 제작 절차 확정

## 결론

v1 템플릿은 다음으로 고정:

- 총 8페이지
- 1페이지: 표지
- 2~8페이지: 앨범 카드 7장
- Canva `Brand Template` 로 발행
- `Autofill dataset` 기반으로 텍스트/이미지 주입

## Canva 전제

필수:
- Canva Enterprise 조직 사용자
- Connect API 사용 가능 상태
- Brand Template 접근 가능
- Data Autofill 필드 설정 가능 상태

참고:
- Brand template API: https://www.canva.dev/docs/connect/api-reference/brand-templates/
- Dataset API: https://www.canva.dev/docs/connect/api-reference/brand-templates/get-brand-template-dataset/
- Autofill API: https://www.canva.dev/docs/connect/api-reference/autofills/
- Export API: https://www.canva.dev/docs/connect/api-reference/exports/

확인한 제약:
- dataset field type은 `text`, `image`, `chart`
- Brand Template / dataset 조회는 Enterprise 전제
- Export download URL은 임시 URL

## 디자인 방향

참고 파일:
- [`inst_cardnews.pdf`](../src/inst_cardnews.pdf)

고정 방향:
- 4:5 비율
- 진회색 배경 + 그리드
- 파스텔 스티커형 오브젝트
- 두꺼운 검정 라인
- 큰 타이포 블록
- 페이지 간 구조 통일

## 페이지 구조

### Page 1. 표지

역할:
- 카드뉴스 메인 제목 표시
- 전체 톤 고정

필드:
- `cover_title`

권장 레이아웃:
- 상단 또는 중앙에 큰 제목
- 하단 장식 블록
- 스티커 장식은 고정 요소

### Page 2~8. 앨범 카드

역할:
- 앨범 1개당 1페이지

필드 구조:
- 앨범명
- 가수명
- 앨범 형태
- 2줄 설명
- 커버 이미지

권장 레이아웃:
- 상단: 앨범명
- 중단: 가수명 / 앨범 형태
- 본문: 2줄 설명
- 하단 또는 우측: 커버 이미지

## dataset field 명세

### 표지

- `cover_title`: `text`

### 앨범 페이지 공통 규칙

페이지 번호는 2~8이지만 dataset index는 1~7로 간다.

즉:
- 2페이지 = `card_01_*`
- 3페이지 = `card_02_*`
- ...
- 8페이지 = `card_07_*`

### 앨범 필드

- `card_01_album`: `text`
- `card_01_artist`: `text`
- `card_01_type`: `text`
- `card_01_summary`: `text`
- `card_01_cover`: `image`

- `card_02_album`: `text`
- `card_02_artist`: `text`
- `card_02_type`: `text`
- `card_02_summary`: `text`
- `card_02_cover`: `image`

- `card_03_album`: `text`
- `card_03_artist`: `text`
- `card_03_type`: `text`
- `card_03_summary`: `text`
- `card_03_cover`: `image`

- `card_04_album`: `text`
- `card_04_artist`: `text`
- `card_04_type`: `text`
- `card_04_summary`: `text`
- `card_04_cover`: `image`

- `card_05_album`: `text`
- `card_05_artist`: `text`
- `card_05_type`: `text`
- `card_05_summary`: `text`
- `card_05_cover`: `image`

- `card_06_album`: `text`
- `card_06_artist`: `text`
- `card_06_type`: `text`
- `card_06_summary`: `text`
- `card_06_cover`: `image`

- `card_07_album`: `text`
- `card_07_artist`: `text`
- `card_07_type`: `text`
- `card_07_summary`: `text`
- `card_07_cover`: `image`

총 field 수:
- text 29개
- image 7개
- total 36개

## 텍스트 budget

템플릿 깨짐 방지 기준:

- `cover_title`
  - 권장 최대: 18자 x 2줄 정도
- `card_nn_album`
  - 권장 최대: 20자
- `card_nn_artist`
  - 권장 최대: 20자
- `card_nn_type`
  - 권장 최대: 10자
- `card_nn_summary`
  - 권장 최대: 65~90자
  - 2문장 또는 2줄

운영 규칙:
- 길면 summarizer 단계에서 재요약
- 런타임에서도 album/artist/summary를 템플릿 budget 기준으로 한 번 더 정규화
- type이 비면 빈칸 허용

## Canva 수동 제작 절차

### 1. 새 디자인 생성

- 크기: `1080 x 1350`
- 총 페이지: 8

이유:
- 인스타 피드 4:5 표준
- 참고 PDF 비율과 동일

### 2. 기본 스타일 시스템 고정

- 배경색
- 그리드 선 색/두께
- 포인트 색 3~4개
- 타이포 크기 계층
- 고정 스티커 장식

권장:
- 페이지마다 장식 위치만 조금 다르게
- 본문 구조는 동일하게

### 3. 표지 페이지 제작

필수 요소:
- 큰 제목 텍스트 박스 1개
- 데이터 필드명: `cover_title`

### 4. 앨범 페이지 1개 완성

필수 요소:
- 앨범명 텍스트
- 가수명 텍스트
- 유형 텍스트
- 요약 텍스트
- 커버 이미지 프레임

필드명:
- `card_01_album`
- `card_01_artist`
- `card_01_type`
- `card_01_summary`
- `card_01_cover`

### 5. 나머지 6페이지 복제

복제 후 field 이름만 변경:
- `card_02_*`
- `card_03_*`
- `card_04_*`
- `card_05_*`
- `card_06_*`
- `card_07_*`

주의:
- field 이름 중복 금지
- 복제 후 기존 `card_01_*` 그대로 남기지 말 것

### 6. Data Autofill 연결 확인

확인 항목:
- 모든 텍스트 field가 dataset에 노출되는지
- 모든 이미지 field가 dataset에 노출되는지
- 이름 오타 없는지

기준 API:
- `GET /rest/v1/brand-templates/{brandTemplateId}/dataset`

### 7. Brand Template 발행

작업:
- 디자인을 Brand Template로 발행
- template id 확보
- dataset 확인 결과 저장

## page-field 매핑표

| 페이지 | 역할 | field |
|---|---|---|
| 1 | 표지 | `cover_title` |
| 2 | 앨범 1 | `card_01_album`, `card_01_artist`, `card_01_type`, `card_01_summary`, `card_01_cover` |
| 3 | 앨범 2 | `card_02_album`, `card_02_artist`, `card_02_type`, `card_02_summary`, `card_02_cover` |
| 4 | 앨범 3 | `card_03_album`, `card_03_artist`, `card_03_type`, `card_03_summary`, `card_03_cover` |
| 5 | 앨범 4 | `card_04_album`, `card_04_artist`, `card_04_type`, `card_04_summary`, `card_04_cover` |
| 6 | 앨범 5 | `card_05_album`, `card_05_artist`, `card_05_type`, `card_05_summary`, `card_05_cover` |
| 7 | 앨범 6 | `card_06_album`, `card_06_artist`, `card_06_type`, `card_06_summary`, `card_06_cover` |
| 8 | 앨범 7 | `card_07_album`, `card_07_artist`, `card_07_type`, `card_07_summary`, `card_07_cover` |

## Autofill payload shape

예시 payload 구조:

```json
{
  "title": "내 맘대로 추천하는 인디 추천곡",
  "data": {
    "cover_title": "내 맘대로 추천하는\n인디 추천곡",
    "card_01_album": "Endless Sun",
    "card_01_artist": "Stray Kids",
    "card_01_type": "싱글",
    "card_01_summary": "경쾌한 EDM 팝 사운드와 청량한 신스 멜로디로, 빛나는 청춘의 에너지를 시원하게 펼쳐내는 곡. 자신만의 길을 두려움 없이 밀고 나가자는 응원이 선명하게 담겨 있다.",
    "card_01_cover": {
      "asset_id": "canva-asset-id"
    }
  }
}
```

메모:
- 실제 API 요청 shape은 이후 구현 시 `Create design autofill job` 문서에 맞춰 조립
- 여기서는 field key와 값 타입만 고정

## 템플릿 검수 체크리스트

필수:
- 표지 포함 총 8페이지인지
- field 이름 36개 모두 고유한지
- 이미지 field가 실제로 `image` 타입으로 잡히는지
- type 빈값일 때 레이아웃이 깨지지 않는지
- 요약문 2줄 수준에서 overflow 없는지
- cover 이미지 비율이 정사각형/직사각형 모두 버티는지

권장:
- 긴 앨범명 20자 근처 샘플로 확인
- 한글/영문 혼합 샘플로 확인
- 이미지 없는 페이지도 확인

## 산출물

3번부 완료 산출물:
- Canva Brand Template 수동 제작 명세
- dataset field 이름 확정
- page-field 매핑 확정
- autofill payload shape 초안

다음 단계 입력값:
- `brandTemplateId`
- dataset API 응답 캡처 또는 JSON

## 확정 결론

v1 Canva 템플릿은:

- `1080x1350`
- `8페이지 고정`
- `cover_title + card_01~07`
- `text 29 + image 7`
- `Brand Template + Autofill` 전제
