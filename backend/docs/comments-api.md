# 공개 댓글·답글 조회 API

[공통 응답 규약](api-response.md)을 사용하는 읽기 전용 API입니다.

| 메서드 | 경로 | `data` |
| --- | --- | --- |
| GET | `/api/v1/posts/:postId/comments` | `{ items: CommentThread[], pagination, commentCount }` |
| GET | `/api/v1/posts/:postId/comments/:threadId/replies` | `{ items: Comment[], pagination }` |

두 경로 모두 `page=1`, `limit=20`을 기본값으로 사용합니다. page는 1~10000, limit는 1~100 정수입니다.
댓글·답글은 작성 시각 오름차순, 동률이면 ID 오름차순입니다. ID는 영문·숫자·하이픈·밑줄로 된
1~100자 문자열입니다. 잘못된 ID·페이지·중복/미지원 쿼리는 공통 400입니다.

## 공개 범위와 삭제 표시

- 글이 `PUBLISHED`이고 글 작성자의 공개 handle이 있어야 합니다. 없는 글·초안·핸들 없는 작성자의 글은 404입니다.
- 답글은 URL의 게시글에 속한 최상위 댓글로만 조회합니다. 다른 글의 스레드, 답글 ID를 스레드로 사용한 요청,
  숨겨진 삭제 댓글은 동일한 404입니다.
- 공개 글 조건은 존재 확인뿐 아니라 실제 댓글 조회·건수 쿼리에도 적용됩니다.
- 삭제된 댓글·답글의 `content`는 빈 문자열, `deleted`는 true입니다. 삭제 시각과 원문은 응답에 포함하지 않습니다.
- 삭제된 최상위 댓글은 같은 글의 답글이 하나라도 있으면 맥락을 위해 표시하고, 없으면 숨깁니다.
  삭제된 답글도 삭제 표시로 남기므로 모든 답글이 삭제된 스레드도 기존처럼 표시됩니다.
- 작성자는 공개 이름·핸들·이미지와 ID만 반환합니다. 표시 이름은 `name ?? handle ?? "익명"`입니다.
  로그인 이메일·해시·인증 정보는 조회하지 않습니다. 이미지는 DB 원본 값입니다.

## 응답 필드와 건수

`Comment`는 `id`, `authorId`, `authorName`, `authorHandle`, `authorImage`, `replyToName`,
`content`, `deleted`, `createdAt`을 제공합니다. 최상위 `CommentThread`에는 `replyCount`가 추가됩니다.

- 최상위 목록의 `pagination.total`: 표시되는 최상위 댓글 수
- `replyCount`와 답글 목록의 `pagination.total`: 해당 스레드의 같은 글 답글 수, 삭제 표시 포함
- `commentCount`: 글 전체의 삭제되지 않은 최상위 댓글과 유효한 2단계 답글 수

다른 글의 부모에 연결됐거나 답글을 다시 부모로 가리키는 비정상 관계는 공개 목록과 commentCount에 포함하지 않습니다.
프로필이 없는 댓글 작성자도 공개 글에 남긴 댓글은 볼 수 있습니다.
존재하는 공개 글/스레드의 빈 목록이나 마지막 페이지를 넘어선 조회는 200과 빈 배열입니다.

## 이전 상태

기존 `getComments`의 2단계 관계·작성자 표시·삭제 규칙과 `countComments`에 대응합니다.
전체 댓글을 한 번에 중첩해서 내려주던 방식에서 최상위 댓글/답글을 별도로 페이지 조회하는 계약으로 바뀝니다.
프론트 연결 시 각 스레드의 `replyCount`와 답글 API를 사용해 더 보기를 구현해야 합니다.
`replyToName`은 기존 답글 대상 표시를 유지합니다. 댓글 작성·삭제, 인증 및 기존 Next.js 화면 연결은 이번 PR 범위 밖입니다.

## 검증

HTTP 테스트는 Prisma 대역으로 응답·검증·오류·공개 조건을 확인합니다.
추가 PostgreSQL 통합 테스트는 기존 migrations로 만든 임시 DB에 실제 관계 데이터를 넣어
초안/핸들 없는 글/다른 글 차단, 삭제 표시, 댓글 수와 페이지 경계를 확인합니다.
통합 테스트는 `BACKEND_TEST_DATABASE_URL`이 없으면 건너뛰며, 로컬 `backtick_test` DB만 허용합니다.
Backend CI는 PostgreSQL 16 서비스를 띄우고 migrations 적용 후 전체 테스트를 실행합니다.
테스트는 자신이 만든 사용자·글·댓글만 정리합니다. 운영 데이터·성능·프론트 연결·배포 검증은 별도입니다.
