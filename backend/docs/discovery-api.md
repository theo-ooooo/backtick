# 검색·태그 API

모든 응답은 [공통 응답 규약](api-response.md)을 따릅니다. 인증 없는 읽기 전용 API입니다.

| 메서드 | 경로 | 쿼리 | `data` |
| --- | --- | --- | --- |
| GET | `/api/v1/search` | `q` 필수, `limit=30` | `{ items: DiscoveryItem[] }` |
| GET | `/api/v1/search/quick` | `q` 선택 | `{ items: QuickSearchItem[] }` |
| GET | `/api/v1/tags` | `limit=100` | `{ name, count }[]` |
| GET | `/api/v1/tags/trending` | `limit=6` | `{ name, count }[]` |
| GET | `/api/v1/tags/posts` | `tag` 필수, `limit=40` | `{ items: DiscoveryItem[] }` |

`limit`는 1~100 정수입니다. `q`와 `tag`는 앞뒤 공백을 제거하고 최대 100자까지 받습니다.
빠른 검색은 검색어가 없거나 두 글자 미만이면 DB 조회 없이 빈 결과를 반환하고, 그 외에는 최대 8개입니다.
그 외 검색의 빈 검색어, 빈 태그, 중복·알 수 없는 쿼리, 잘못된 limit는 공통 400 응답입니다.

## 검색·태그 글 목록

- 자체 글은 `PUBLISHED`이면서 작성자 handle이 있는 글, 외부 글은 활성 피드의 글만 조회합니다.
- 검색은 자체 글의 제목/본문, 외부 글의 제목/요약에 대해 대소문자를 구분하지 않습니다.
  `%`, `_`, 역슬래시는 와일드카드가 아닌 입력 문자 그대로 검색합니다.
- 두 소스를 발행일 최신순으로 합친 뒤 최종 `limit`를 적용합니다. 소스마다 최대 `limit`개만 가져옵니다.
  같은 시각이면 자체 글 우선, 같은 종류면 ID 내림차순입니다. 발행일 없는 자체 글은 마지막에 놓입니다.
- 태그는 대소문자를 구분하여 정확히 일치해야 합니다. URLSearchParams로 `tag`를 인코딩하세요.
  서버는 프레임워크가 해석한 쿼리를 다시 URL 디코딩하지 않습니다.
- 목록은 기존 서버 쿼리의 최대 개수 조회를 옮긴 형태로, 페이지/전체 개수는 제공하지 않습니다.

`DiscoveryItem`은 `id`, `kind`, `title`, `url`, `excerpt`, `author`, `authorHandle`,
`authorImage`, `source`, `thumbnail`, `likes`, `views`, `readMinutes`, `tags`, `publishedAt`을 제공합니다.
`kind`는 `native` 또는 `external`입니다. 자체 글 URL은 `/@handle/slug`, 외부 글은 원문 URL입니다.
`source`는 자체 글에서는 null, 외부 글에서는 피드 이름입니다. 이미지 경로는 DB 원본 값입니다.
해당하지 않는 필드는 null이며 날짜는 ISO 8601 또는 null입니다. `content`는 응답에 포함하지 않습니다.
빠른 검색은 `title`, `url`, `kind`, `source`만 반환하고 자체 글의 source에는 작성자 이름을 사용합니다.
자체 글 작성자 이름이 없으면 기존 화면과 동일하게 handle을 대신 사용합니다.

## 태그 집계

태그 목록은 공개 자체 글과 활성 외부 글을 합쳐 태그별 게시글 수를 셉니다.
한 외부 글의 태그 배열에 같은 태그가 중복되어도 한 번만 계산합니다.
인기 태그는 기존 규칙대로 최근 30일 외부 글에 한정하며, 활성 피드에서 최소 2개의 글에 등장한 태그입니다.
모두 게시글 수 내림차순, 동률이면 PostgreSQL `C` 정렬 기준의 태그 이름 오름차순입니다.
집계는 DB에서 수행하고 limit는 파라미터로 바인딩합니다.

## 이전 상태와 검증

기존 `src/lib/queries/search.ts`, `src/lib/queries/tag.ts`, 인기 태그 집계 및 빠른 검색에 대응하는
Nest API를 추가했습니다. Next.js 화면/Server Actions/API는 아직 이 서버로 전환하지 않았습니다.
이번 작업에 인증·쓰기 API·피드 수집·서버 배포는 포함되지 않습니다.

HTTP 테스트는 Prisma 대역으로 응답, 요청 검증, 공개 조건, 정렬/개수, 쿼리 파라미터를 확인합니다.
SQL 집계의 실제 실행 및 운영 데이터 결과는 PostgreSQL 개발 DB에서 별도 검증해야 합니다.
