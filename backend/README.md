# Backtick Backend

NestJS 12 + TypeScript(ESM) + PostgreSQL/Prisma 기반의 독립 API 서버입니다.
Node.js 24.15 이상(24 LTS)을 사용합니다. 패키지 매니저는 기존 저장소와 같은 npm입니다.

## 실행

저장소 루트에서:

~~~bash
npm ci --prefix backend
cp backend/.env.example backend/.env
# backend/.env의 DATABASE_URL을 개발용 PostgreSQL 주소로 수정
npm run dev:backend
~~~

API: http://localhost:4000/api/v1
Swagger: http://localhost:4000/docs

기존 Next.js 앱은 루트에서 npm run dev로 실행합니다.
백엔드는 backend/.env만 읽으며 루트의 .env와 분리됩니다.

## 데이터베이스

루트 prisma/schema.prisma와 기존 migrations가 스키마의 단일 원본입니다.
백엔드 설치 시 스키마를 임시 복사하고 전용 클라이언트를 backend/generated/client에 생성합니다.
생성 파일은 커밋하지 않습니다. 스키마 변경 후 npm --prefix backend run prisma:generate를 실행하세요.

기존 DB에는 별도 스키마 변경이 필요하지 않습니다.
새 개발 DB는 저장소 루트에서 npm ci 후 DATABASE_URL을 지정하여 npx prisma migrate deploy를 실행하세요.
운영 DB 마이그레이션은 실행 스크립트에서 자동 수행하지 않습니다.

## 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| NODE_ENV | development | development / test / production |
| PORT | 4000 | API 포트 |
| DATABASE_URL | 필수 | PostgreSQL 연결 URL |
| CORS_ORIGINS | 개발: http://localhost:3000, 운영: 없음 | 쉼표로 구분한 origin, 끝 슬래시 제외 |
| SWAGGER_ENABLED | 운영: false, 그 외: true | Swagger UI/JSON 활성화 |

## 상태 확인

| 메서드 | 경로 | 동작 |
| --- | --- | --- |
| GET | /api/v1/health | 프로세스 상태 |
| GET | /api/v1/health/ready | SELECT 1로 DB 확인, 연결 오류는 503 |

서버 시작 시 DB 연결을 확인하고 종료 시 연결을 해제합니다.
공통 ValidationPipe는 DTO 타입 변환과 허용 필드 검증을 수행합니다.
JSON 응답은 성공 시 `{ status, data }`, 오류 시 `{ status, data: null, message }`입니다.
자세한 규약과 소비자 변경 사항은 [공통 API 응답](docs/api-response.md)을 참고하세요.
검색·빠른 검색·태그 목록/인기 태그/태그별 글은 [검색·태그 API](docs/discovery-api.md)에 정리되어 있습니다.

## 검증

~~~bash
npm --prefix backend run lint
npm --prefix backend run format:check
npm --prefix backend test
~~~

테스트는 실제 Nest HTTP 서버와 테스트용 Prisma 대역을 사용하므로 DB 없이 실행됩니다.
실제 PostgreSQL 연결과 기존 데이터 조회는 개발 DB로 별도 확인해야 합니다.
GitHub Actions가 백엔드 및 공유 스키마 변경 시 설치·린트·포맷·빌드·HTTP 테스트를 실행합니다.

## Vercel Preview 정책

`feat/nestjs-*`는 NestJS 백엔드 전용 브랜치입니다. 루트 `vercel.json`의
`git.deploymentEnabled` 설정으로 이 브랜치들의 Vercel 자동 배포를 끕니다.
백엔드 변경은 위의 Backend CI로 검증하므로 Vercel Preview용 `DATABASE_URL`을 추가할 필요가 없습니다.

이 설정은 변경 파일이 아닌 브랜치 이름 기준입니다. 프론트엔드 화면이나 공통 설정의
Preview 검증이 필요하면 `feat/nestjs-*` 밖의 별도 브랜치를 사용하고 테스트 DB를 설정하세요.
`main` 및 다른 브랜치의 자동 배포, 기존 리전·리다이렉트·크론 설정은 유지됩니다.

공통 기반 PR과 이에 의존하는 기능 PR 모두 이 설정을 포함해야 적용됩니다.
과거 커밋의 배포 실패 기록은 남지만, 설정 반영 후 새 커밋은 이 자동 배포를 실행하지 않습니다.

## 이번 작업 범위

독립 서버 기반을 추가합니다. 기존 Next.js API/Server Actions와 Auth.js 인증은 현재 경로에서 동작합니다.
새 기능은 controller/service/module로 분리해 추가하고, 프론트엔드 연결 및 인증 이전은 별도 기능 작업으로 진행합니다.
