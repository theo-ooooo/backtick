# 공통 API 응답

NestJS `/api/v1` JSON API는 실제 HTTP 상태코드와 동일한 숫자 `status`를 반환합니다.
성공 데이터는 `data`에 담고 TypeScript에서는 `ApiResponse<T>`로 타입을 유지합니다.
컨트롤러는 원래 데이터를 반환하고 전역 인터셉터가 한 번만 감쌉니다.

~~~json
{ "status": 200, "data": { "items": [], "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } } }
~~~

오류는 전역 예외 필터가 처리합니다. `data`는 항상 `null`이며 `message`는 문자열,
DTO 검증 실패 시에는 검증 메시지 배열입니다. 오류를 HTTP 200으로 바꾸지 않습니다.

~~~json
{ "status": 400, "data": null, "message": ["page must not be less than 1"] }
~~~

~~~json
{ "status": 404, "data": null, "message": "Post not found" }
~~~

예상하지 못한 오류는 500, DB 준비 상태 오류는 503입니다. 5xx 응답은 표준 메시지만
노출하고 원인은 서버 로그에 기록합니다. 파서 오류·없는 경로에도 동일 구조를 적용합니다.
헤더 전송이 끝난 오류는 새 JSON을 쓰지 않습니다.

- 배열은 `data: []`, 데이터가 없으면 `data: null`입니다.
- 201·202 등 실제 성공 상태코드를 유지합니다. 204·205·HEAD는 HTTP 규칙에 따라 본문이 없습니다.
- 헬스체크의 기존 `status: "ok"`는 `data.status`로 이동합니다.
- Swagger `/docs`, `/docs-json`은 표준 문서 형식을 유지합니다.
- 새 JSON 컨트롤러에는 `ApiSuccessResponse` / `ApiErrorResponse`로 실제 응답을 문서화합니다.
- `StreamableFile`, `@Sse()`, `@Redirect()`는 인터셉터가 그대로 통과시킵니다.
- 직접 `@Res()`를 쓰는 응답은 프레임워크가 자동 직렬화하지 않으므로 이 JSON 규약의 대상이 아닙니다.
- 아직 이전하지 않은 Next.js API와 Server Actions의 응답은 이번 변경 대상이 아닙니다.

기존 NestJS 소비자는 `body.items` 대신 `body.data.items`를 읽도록 변경해야 합니다.
