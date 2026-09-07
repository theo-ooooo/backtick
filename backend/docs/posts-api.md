# 게시글 조회 API

공통 경로: /api/v1

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | /posts | 발행된 게시글 목록 |
| GET | /posts/:id | 발행된 게시글 상세 |

목록 쿼리: page(1부터, 최대 10000), limit(기본 20, 최대 100), author(핸들, @ 제외), tag(이름 일치), q(제목/요약 검색).
발행 시각 내림차순, 같은 시각에는 id 내림차순으로 정렬합니다.
응답은 items와 pagination(page, limit, total, totalPages)으로 구성됩니다.
목록에서는 마크다운 본문을 제외하고, 상세에서 content와 summary를 제공합니다.

공개 핸들을 가진 작성자의 PUBLISHED 글만 반환합니다. 초안·없는 글 상세는 모두 404입니다.
작성자는 id/handle/name/image만 반환하며 로그인 이메일, 비밀번호 해시, OAuth 정보는 조회하지 않습니다.
기존 Next.js API와 응답 계약은 별개이며 프론트엔드 연결은 후속 작업입니다.

예시:

~~~bash
curl 'http://localhost:4000/api/v1/posts?page=1&limit=20&author=theo'
curl 'http://localhost:4000/api/v1/posts/POST_ID'
~~~

Swagger: /docs
