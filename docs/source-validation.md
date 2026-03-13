# 데이터 소스 검증

작성일:
- 2026-03-13

목표:
- `멜론`, `벅스`, `스포티파이` 중 어디서 어떤 필드를 가져올지 확정
- 검색 경로, 상세 경로, selector 후보, 리스크 정리

## 결론

권장 수집 전략:

1. 멜론
   - 앨범 소개 1순위
   - 앨범명/가수명/커버/발매일/유형 추출 가능
2. 벅스
   - 커버/유형/발매일 fallback
   - 앨범 소개 소스로는 약함
3. 스포티파이
   - 공식 API 기반 메타데이터 보강
   - 커버 이미지, `album_type`, `release_date`, `label`, `total_tracks` 보강용
   - 긴 앨범 소개 소스로는 부적합

최종 운영안:
- 소개글: `멜론 우선`
- 소개글 실패 시: `벅스 확인`, 없으면 빈칸 또는 사용자 수동 입력
- 이미지/유형/발매일: `멜론 -> 벅스 -> 스포티파이`

## 요약 표

| 소스 | 접근 방식 | 강점 | 약점 | v1 역할 |
|---|---|---|---|---|
| 멜론 | HTML 페이지 파싱 | 앨범소개 존재, 커버/유형/발매일 노출 | 공개 API 불명확, robots 제약 큼 | 소개글 1순위 |
| 벅스 | HTML 페이지 파싱 | 커버/유형/발매일 노출 | 샘플 기준 앨범소개 부재, robots 제약 큼 | 메타데이터 fallback |
| 스포티파이 | 공식 Web API | 검색/앨범 조회 공식 지원, 이미지/album_type 안정적 | 긴 한국어 앨범 소개 기대 어려움, 토큰 필요 | 공식 메타데이터 보강 |

## 1. 멜론

### 접근성

확인 내용:
- `https://www.melon.com/search/total/index.htm?q=Endless%20Sun` 접근 가능
- `https://www.melon.com/album/detail.htm?albumId=12916325` 접근 가능
- `robots.txt` 기준 `User-agent: *` 는 전체 `Disallow: /`
- 다만 일부 특정 봇에는 `/album` 허용

해석:
- 일반적인 대규모 크롤링은 보수적으로 봐야 함
- v1은 사용자 직접 실행형 CLI, 저빈도 요청, 캐시 전제로만 운영

### 검색 경로

샘플:

```txt
https://www.melon.com/search/total/index.htm?q=<query>
```

관찰:
- 검색 탭 이동 스크립트 존재
- 앨범 상세 이동은 `javascript:melon.link.goAlbumDetail('<albumId>')` 패턴 사용

### 상세 경로

샘플:

```txt
https://www.melon.com/album/detail.htm?albumId=<albumId>
```

### 추출 가능 필드

샘플 페이지 기준:
- 앨범명
- 가수명
- 유형
- 발매일
- 장르
- 발매사
- 기획사
- 커버 이미지
- 앨범 소개

### selector 후보

상세 페이지 기준:
- 앨범명: `.section_info .entry .song_name`
- 가수명: `.section_info .entry .artist .artist_name span`
- 유형: `.section_info .entry .gubun`
- 커버: `.section_info .thumb img`
- 메타 정보: `.section_info .meta dl.list`
- 앨범 소개: `#d_video_summary > div`

메모:
- 소개글은 `<br>` 포함 HTML
- 요약 전에 HTML decode + 줄바꿈 정리 필요

### 판정

- 소개글 소스로 사용 가능
- v1 1순위 소스 확정

## 2. 벅스

### 접근성

확인 내용:
- `https://music.bugs.co.kr/search/integrated?q=Endless%20Sun` 접근 가능
- `https://music.bugs.co.kr/album/259539` 접근 가능
- `robots.txt` 기준 `User-agent: *` 는 전체 `Disallow: /`

해석:
- 멜론보다 더 보수적으로 다뤄야 함
- 사용자 실행형 CLI, 저빈도, 캐시, 실패 허용 전제 필요

### 검색 경로

샘플:

```txt
https://music.bugs.co.kr/search/integrated?q=<query>
```

관찰:
- 통합 검색 결과 페이지 접근 가능
- 페이지 내 `albumId` 관련 속성/스크립트 확인됨

### 상세 경로

샘플:

```txt
https://music.bugs.co.kr/album/<albumId>
```

### 추출 가능 필드

샘플 페이지 기준:
- 앨범명
- 가수명
- 유형
- 스타일
- 발매일
- 커버 이미지

샘플 페이지 기준 부족한 필드:
- 긴 앨범 소개 본문

### selector 후보

상세 페이지 기준:
- 커버: `.summaryAlbum .photos img`
- 기본정보 테이블: `.summaryAlbum .basicInfo table.info`
- 아티스트: `th=아티스트` 인접 `td`
- 유형: `th=유형` 인접 `td`
- 발매일: `th=발매일` 인접 `td time`

메모:
- 소개글 대신 기본 정보 위주 페이지가 많음
- 샘플 페이지 메타 description 도 일반 문구 수준

### 판정

- 소개글 소스로는 약함
- 이미지/유형/발매일 fallback 용도로 사용

## 3. 스포티파이

### 접근성

공식 경로:
- Search reference: `https://developer.spotify.com/documentation/web-api/reference/search`
- Album reference: `https://developer.spotify.com/documentation/web-api/reference/get-an-album`
- Access token: `https://developer.spotify.com/documentation/web-api/concepts/access-token`

확인 내용:
- 공식 Web API 존재
- `Search for Item` 문서 존재
- Album 응답에 `album_type`, `images`, `release_date`, `label`, `total_tracks` 필드 존재
- access token 필요
- 문서상 `Client credentials`, `Authorization Code` 개념 확인

### 활용 방식

권장:
- 서버 또는 CLI에서 token 발급
- 검색 API로 album id 확보
- album API로 메타데이터 조회

### 추출 가능 필드

- 앨범명
- 아티스트
- `album_type`
- `images`
- `release_date`
- `label`
- `total_tracks`
- external URL

### 한계

- 멜론식 긴 한국어 `앨범 소개`는 기대하기 어려움
- 소개글 소스보다는 메타데이터 소스

### 판정

- 공식성 가장 좋음
- 커버 이미지/유형/발매일 보강용으로 적합

## 구현 우선순위

### 검색

1. 멜론 HTML 검색
2. 벅스 HTML 검색
3. 스포티파이 API 검색

### 필드별 우선순위

- 소개글: `멜론 -> 벅스 -> 수동 입력`
- 커버 이미지: `멜론 -> 벅스 -> 스포티파이 -> 사용자 파일`
- 앨범 유형: `멜론 -> 벅스 -> 스포티파이`
- 발매일: `멜론 -> 벅스 -> 스포티파이`

## 구현 메모

필수:
- 사이트별 scraper 분리
- selector 상수 분리
- HTML decode 유틸 추가
- rate limit 추가
- 요청 캐시 추가
- 실패 시 수동 fallback

권장:
- 검색 후보 score 계산
- `albumName + artistName` 기준 fuzzy match
- source provenance 저장

## 리스크

1. 멜론/벅스는 공개 API보다 HTML 파싱 의존도가 큼
2. 두 사이트 모두 `robots.txt` 기준 일반 크롤러 허용 범위가 좁음
3. HTML 구조 변경 시 selector 깨질 수 있음
4. 벅스는 소개글 데이터가 부족할 수 있음
5. 스포티파이는 한국어 소개글 대체재가 아님

## 2번부 완료 기준 점검

- 멜론 검색/상세 경로 확인 완료
- 멜론 소개글 selector 확인 완료
- 벅스 검색/상세 경로 확인 완료
- 벅스 기본 메타 selector 확인 완료
- 스포티파이 공식 API 활용 범위 확인 완료
- 소스별 역할 분담 확정 완료

## 확정 결론

v1 데이터 소스 정책:

- `멜론`: 소개글 중심 메인 소스
- `벅스`: HTML fallback 메타데이터 소스
- `스포티파이`: 공식 API 기반 메타데이터 보강 소스
