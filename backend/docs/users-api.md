# 공개 프로필·블로그 조회 API

[공통 API 응답](api-response.md)을 사용하는 인증 없는 읽기 전용 API입니다.

| 메서드 | 경로 | 쿼리 | `data` |
| --- | --- | --- | --- |
| GET | `/api/v1/users/:handle` | 없음 | 공개 프로필 |
| GET | `/api/v1/users/:handle/posts` | `page=1`, `limit=12` | `{ items: PostSummary[], pagination }` |
| GET | `/api/v1/users/:handle/popular-posts` | `limit=3` | `PostSummary[]` |

핸들은 현재 프로필 저장 규칙과 같은 영문 소문자·숫자·하이픈 3~20자입니다.
입력의 앞뒤 공백과 선택적인 `@`를 제거하고 소문자로 조회합니다. `theo`, `THEO`, `@Theo`는 같은 프로필입니다.
프레임워크가 디코딩한 경로를 다시 URL 디코딩하지 않습니다.

## 프로필

`id`, `handle`, `name`, `image`, `bio`, `readme`, `githubUrl`, `websiteUrl`, `publicEmail`,
`createdAt`, `publishedPostCount`만 반환합니다. 발행 글 수에는 초안이 포함되지 않습니다.
`publicEmail`은 사용자가 공개 연락처로 설정한 값이며 로그인 이메일로 대체하지 않습니다.
로그인 이메일·비밀번호 해시·인증 토큰·세션은 DB 조회 대상에서도 제외합니다.
선택 필드는 null을 유지하므로 표시 이름은 프론트에서 `name ?? handle`을 사용할 수 있습니다.
이미지는 DB 원본 경로, 날짜는 ISO 8601입니다.

## 글 목록과 인기 글

해당 공개 핸들을 가진 작성자의 `PUBLISHED` 글만 반환합니다.
일반 목록은 기존 `/api/v1/posts` 서비스의 필드·정렬·페이지 규약을 재사용하며 기본 개수만 12개입니다.
첫 페이지는 1이고, page는 1~10000, limit는 1~100 정수입니다.
본문은 제외하고 작성자 공개 정보, 태그, 좋아요 수를 포함한 `PostSummary`를 반환합니다.
정확한 필드는 Swagger와 [게시글 API](posts-api.md)를 참고하세요.

인기 글은 조회수 내림차순, 동률이면 발행일 내림차순(날짜 없는 글은 뒤), ID 내림차순입니다.
DB에서 limit를 적용하며 페이지/전체 개수는 제공하지 않습니다.

존재하지 않는 프로필은 세 경로 모두 동일한 공통 404입니다. 프로필이 존재하고 글만 없으면
정상 200과 빈 목록을 반환합니다. 잘못된 핸들·페이지·개수, 목록 API의 중복·미지원 쿼리는 공통 400입니다.
목록의 작성자는 경로로 고정되며 쿼리의 `author`나 `status`로 덮어쓸 수 없습니다.

## 기존 Next.js 코드와의 대응

- `getUserWithPosts`: 공개 프로필과 첫 페이지 글을 두 API로 나눠 제공합니다.
- `getBlogPostsPage`: 기존 0부터 시작하는 page 대신 Nest 공통 규약인 1부터 시작하는 page를 사용합니다.
- `getPopularPosts`: 공개 작성자의 인기 글 조회를 제공합니다.

이번 PR은 공개 프로필·블로그 글·인기 글의 Nest API를 추가합니다. 기존 Next.js 페이지와
`/api/blog-posts`는 아직 새 서버로 전환하지 않았습니다. 컬렉션·팀·작성 활동·댓글 및 인증/쓰기 이전은 남아 있습니다.

테스트는 실제 Nest HTTP 서버와 Prisma 대역을 사용합니다. 실제 PostgreSQL 데이터의
공개 조건/정렬 결과, 프론트 연결, 배포 환경 검증은 별도로 진행해야 합니다.
