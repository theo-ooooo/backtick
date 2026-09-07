# 외부 피드 조회 API

공통 경로: /api/v1

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | /feeds | 활성 수집 소스 목록과 글 수 |
| GET | /feeds/posts | 활성 소스의 수집 글 목록 |

목록 쿼리: page(1부터, 최대 10000), limit(기본 20, 최대 100), feedId(소스 ID), tag(태그 정확히 일치), q(제목/요약 검색).
발행 시각 내림차순, 같은 시각에는 id 내림차순으로 정렬합니다.
응답은 items와 pagination(page, limit, total, totalPages)으로 구성됩니다.
각 글은 원문 url과 source(id/name/siteUrl)를 포함합니다.
필터에 맞는 글이 없으면 items는 빈 배열, total/totalPages는 0입니다.

소스와 수집 글 조회 모두 enabled=true 조건을 강제합니다.
RSS 수집 실행, 소스 관리 및 기존 통합 피드 API 연결은 후속 기능 작업입니다.

~~~bash
curl 'http://localhost:4000/api/v1/feeds'
curl 'http://localhost:4000/api/v1/feeds/posts?page=1&limit=20&tag=typescript'
~~~

Swagger: /docs
