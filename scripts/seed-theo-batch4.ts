import { prisma } from "../src/lib/prisma";

function toExcerpt(md: string, max = 160): string {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 80);
}

interface Draft { title: string; tags: string[]; daysAgo: number; content: string }

const POSTS: Draft[] = [
  {
    title: "WebSocket vs SSE, 실시간 기능 선택 기준",
    tags: ["websocket", "sse", "realtime"],
    daysAgo: 2,
    content: `실시간 기능을 붙일 때 반사적으로 WebSocket을 고르는 경우가 많은데, 절반 이상은 SSE로 충분하고 운영은 훨씬 편하다.

## 방향부터 따져라

핵심 질문은 하나다. 클라이언트→서버 실시간 전송이 필요한가?

- 알림, 피드 갱신, 진행률, 주가/시세: 서버→클라이언트 단방향 → **SSE**
- 채팅, 협업 편집, 게임: 양방향 → **WebSocket**

클라이언트가 보내는 건 어차피 HTTP POST로 하면 되는 경우가 대부분이다. "실시간처럼 보이는 기능"의 다수는 단방향이다.

## SSE의 운영상 장점

\`\`\`ts
// 서버 (Next.js route handler)
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(\`data: \${JSON.stringify(data)}\\n\\n\`);
      // 구독 로직...
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream" },
  });
}
\`\`\`

그냥 HTTP다. 프록시, 로드밸런서, CDN, 인증 미들웨어가 전부 그대로 동작한다. 재연결도 브라우저 EventSource가 Last-Event-ID까지 챙겨서 알아서 해 준다. WebSocket은 이 모든 걸 직접 챙겨야 한다.

## WebSocket을 골랐다면

- 하트비트(ping/pong)와 재연결 백오프는 1일차에 구현하라. 안 하면 모바일 네트워크에서 유령 연결이 쌓인다
- 스케일아웃 시 연결이 서버에 고정되므로 브로드캐스트용 Redis pub/sub이 사실상 필수
- 서버리스와 궁합이 나쁘다. 연결 유지 비용이 과금과 직결된다

## 정리

단방향이면 SSE, 양방향이면 WebSocket, 둘 다 애매하면 폴링부터. 3초 폴링이 부끄러운 선택 같지만 유저 수백 명 규모에선 가장 견고한 선택인 경우도 많다.`,
  },
  {
    title: "Prisma N+1, include가 만능이 아닌 이유",
    tags: ["prisma", "n+1", "성능"],
    daysAgo: 3,
    content: `ORM을 쓰면 N+1은 피할 수 없는 주제다. Prisma는 기본기가 좋은 편이지만, 그래서 오히려 방심하다 당한다.

## Prisma의 기본 방어선

\`\`\`ts
const posts = await prisma.post.findMany({
  include: { author: true, tags: { include: { tag: true } } },
});
\`\`\`

include는 내부적으로 관계별 배치 쿼리로 풀린다. posts 1번 + authors 1번 + tags 1번. 루프 안에서 findUnique를 부르는 고전적 N+1은 include만 써도 사라진다.

## 함정 1 — 루프 안의 개별 쿼리

\`\`\`ts
// 이러면 도로 N+1
for (const post of posts) {
  const count = await prisma.comment.count({ where: { postId: post.id } });
}
\`\`\`

집계는 include에 _count로 태우자.

\`\`\`ts
include: { _count: { select: { comments: true, likes: true } } }
\`\`\`

## 함정 2 — 과도한 include

include는 관계 테이블의 전 컬럼을 다 가져온다. 카드 목록에 본문(content)까지 실려 오는 식이다. 목록 화면은 select로 필요한 필드만 고르는 게 맞다. 우리 피드 API는 select 전환만으로 응답 크기가 70% 줄었다.

## 함정 3 — 직렬 await

\`\`\`ts
// 순차 — 총 지연 = 합
const user = await getUser();
const posts = await getPosts();

// 병렬 — 총 지연 = 최대값
const [user2, posts2] = await Promise.all([getUser(), getPosts()]);
\`\`\`

N+1은 아니지만 체감은 비슷하다. 서로 의존 없는 조회는 Promise.all이 기본값이어야 한다.

## 탐지

개발 중에는 로그로 잡는 게 제일 빠르다. \`log: ["query"]\`를 켜고 화면 하나 그릴 때 같은 모양의 쿼리가 반복되면 그게 N+1이다. 쿼리 수가 데이터 수에 비례하면 무조건 버그라고 생각하자.`,
  },
  {
    title: "Zod 런타임 검증, 어디에 넣고 어디에 빼야 하나",
    tags: ["zod", "typescript", "검증"],
    daysAgo: 4,
    content: `TypeScript의 타입은 컴파일 타임에만 존재한다. 런타임에 들어오는 데이터(요청 바디, 외부 API 응답, 환경변수)는 타입이 보장해 주지 않는다. 이 경계를 지키는 게 Zod의 역할이다.

## 신뢰 경계에만 세워라

Zod를 모든 함수에 바르면 코드가 스키마 지옥이 된다. 원칙은 하나 — **신뢰할 수 없는 데이터가 들어오는 경계에서 한 번만** 검증한다.

- API 라우트의 요청 바디 ✅
- 외부 API 응답 ✅
- 환경변수 (부팅 시 1회) ✅
- 내부 함수 간 인자 전달 ❌ — 여긴 타입 시스템의 영역

## 스키마에서 타입을 뽑아라

\`\`\`ts
const CreatePost = z.object({
  title: z.string().min(1).max(150),
  content: z.string(),
  tags: z.array(z.string().max(24)).max(5).default([]),
});

type CreatePostInput = z.infer<typeof CreatePost>;
\`\`\`

타입을 따로 정의하고 스키마도 따로 만들면 반드시 어긋난다. 스키마가 원본, 타입은 z.infer로 파생 — 방향을 고정하자.

## safeParse로 흐름 제어

\`\`\`ts
const parsed = CreatePost.safeParse(await req.json());
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.issues[0].message },
    { status: 400 },
  );
}
// 여기부터 parsed.data는 완전한 타입
\`\`\`

parse는 throw하기 때문에 예외 처리가 흩어진다. 요청 처리처럼 실패가 정상 흐름인 곳은 safeParse가 맞다.

## 환경변수 검증은 공짜 보험

\`\`\`ts
const Env = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
});
export const env = Env.parse(process.env);
\`\`\`

배포 후 런타임 500 대신 부팅 시점에 즉사한다. 오타 난 환경변수를 배포 10분 만에 찾는 것과 첫 로그에서 찾는 것의 차이다.`,
  },
  {
    title: "HTTP 캐시 헤더 실전 — ETag와 stale-while-revalidate",
    tags: ["http", "캐싱", "성능"],
    daysAgo: 5,
    content: `서버 캐시, CDN, 브라우저 캐시가 모두 HTTP 캐시 헤더 하나로 조율된다. 헤더 몇 줄이 Redis 도입보다 효과가 클 때가 많다.

## Cache-Control 3대 패턴

\`\`\`
# 1. 불변 자산 (해시 붙은 JS/CSS/이미지)
Cache-Control: public, max-age=31536000, immutable

# 2. 자주 바뀌는 API/페이지
Cache-Control: private, no-cache

# 3. 조금 낡아도 되는 것
Cache-Control: public, max-age=60, stale-while-revalidate=300
\`\`\`

no-cache는 "캐시하지 마"가 아니라 "쓰기 전에 재검증해"라는 뜻이다. 진짜 저장 금지는 no-store다. 이 둘을 헷갈리면 디버깅이 산으로 간다.

## ETag — 재검증을 싸게

no-cache여도 ETag가 있으면 서버가 304 Not Modified로 본문 없이 응답할 수 있다. 수백 KB짜리 JSON이 수십 바이트가 된다. 대부분의 프레임워크가 정적 파일에는 자동으로 붙여 주지만, API 응답에는 직접 챙겨야 한다.

## stale-while-revalidate — 체감 지연 제거

max-age가 지나도 지정 시간 동안은 낡은 응답을 즉시 주고, 뒤에서 조용히 갱신한다. 유저는 항상 캐시 속도를 경험하고 데이터는 곧 최신이 된다. 피드, 랭킹, 통계처럼 "1분 낡아도 되는" 데이터에 최적이다. Vercel/CloudFront/Cloudflare 모두 지원한다.

## 실무 배치

- 해시 파일명 정적 자산: immutable 1년
- HTML/페이지: no-cache + ETag (또는 ISR)
- 목록/피드 API: s-maxage=60, stale-while-revalidate=300 (CDN만 캐시)
- 개인화 응답: private, no-cache

s-maxage는 CDN 전용 max-age다. 브라우저에는 신선하게, CDN에는 관대하게 — 이 분리가 실무의 핵심이다.`,
  },
  {
    title: "Tailwind 3년 운영, 유지보수가 무너지지 않는 규칙",
    tags: ["tailwind", "css", "frontend"],
    daysAgo: 7,
    content: `Tailwind는 시작이 빠른 만큼 방치하면 클래스 수프가 된다. 3년 운영하면서 코드베이스가 무너지지 않게 지켜 준 규칙들이다.

## 1. 디자인 토큰을 theme에 박아라

\`\`\`ts
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      ink: "#1a1815",
      acc: "#e0533d",
      "acc-soft": "#fbeae6",
      line: "#e8e4de",
    },
  },
}
\`\`\`

text-[#e0533d] 같은 arbitrary 색상이 코드에 3번 이상 등장하면 토큰 승격 대상이다. 색을 바꾸는 리브랜딩이 config 한 줄이 되느냐, 전역 찾아바꾸기가 되느냐의 차이다.

## 2. 반복 3회 = 컴포넌트화

@apply로 CSS 클래스를 만드는 것보다 React 컴포넌트로 묶는 게 낫다. @apply는 "Tailwind로 쓰는 CSS"라서 두 세계의 단점만 모은다. Button, Card, TagChip처럼 시각 단위로 컴포넌트를 만들면 클래스 중복이 자연히 사라진다.

## 3. 클래스 순서는 도구에 맡겨라

prettier-plugin-tailwindcss 하나 넣으면 순서 논쟁이 끝난다. 사람이 정렬 규칙을 기억하게 하지 말자.

## 4. 조건부 클래스는 문자열 조립 금지

\`\`\`tsx
// 탐지 불가능한 버그의 온상
className={"text-" + (error ? "red" : "green") + "-500"}

// 전체 클래스명이 소스에 있어야 purge가 산다
className={error ? "text-red-500" : "text-green-500"}
\`\`\`

Tailwind는 소스에서 완전한 클래스 문자열을 찾아 CSS를 생성한다. 동적 조립은 프로덕션 빌드에서 스타일이 증발하는 클래식한 사고다.

## 5. arbitrary value는 예외로 남겨라

w-[137px]가 필요할 때는 있다. 하지만 그게 기본이 되면 Tailwind를 쓰는 의미(제약된 스케일)가 사라진다. PR 리뷰에서 arbitrary가 눈에 띄게 많으면 디자인 시스템과 대화할 시점이다.`,
  },
  {
    title: "서버리스 콜드 스타트, 실측으로 배운 것들",
    tags: ["serverless", "vercel", "성능"],
    daysAgo: 9,
    content: `서버리스의 숨은 세금이 콜드 스타트다. 트래픽이 적은 서비스일수록 더 자주 맞는다는 게 역설이다. 실측하며 배운 것들을 정리한다.

## 콜드 스타트의 구성

전체 지연 = 컨테이너 기동 + 런타임 초기화 + **모듈 로드** + 핸들러 실행. 통제 가능한 건 모듈 로드다. 우리 측정에서 전체 800ms 중 500ms가 import 비용이었다.

## 1. import 다이어트가 본질

\`\`\`ts
// 파일 상단 — 콜드 스타트마다 로드됨
import { HeavySDK } from "heavy-sdk"; // 300ms

// 핸들러 안 dynamic import — 쓰는 요청만 부담
const { HeavySDK } = await import("heavy-sdk");
\`\`\`

AWS SDK, 이미지 처리, PDF 생성 같은 무거운 모듈은 함수 최상단 import에서 빼는 것만으로 콜드 스타트가 수백 ms 준다. 번들 분석기로 함수별 번들 크기를 보는 게 첫걸음이다.

## 2. 커넥션은 핸들러 밖에서 재사용

\`\`\`ts
// 모듈 스코프 — 웜 인스턴스에서 재사용
const prisma = globalThis.prisma ?? new PrismaClient();
\`\`\`

핸들러 안에서 매번 커넥션을 만들면 웜 요청까지 느려진다. 반대로 모듈 스코프에 두면 콜드엔 어쩔 수 없지만 웜은 0ms다. 서버리스 + DB는 커넥션 풀러(pgbouncer 등)와 조합해야 커넥션 고갈을 피한다.

## 3. 리전이 절반이다

함수와 DB가 다른 리전이면 왕복마다 수십~수백 ms를 낸다. 함수-DB-사용자를 같은 지역에 모으는 게 코드 최적화 전부를 합친 것보다 효과가 컸다. 우리는 서울 리전 통일로 p95가 60% 내려갔다.

## 4. 예열은 마지막 수단

크론으로 주기 호출하는 예열은 동시 요청이 오면 결국 새 인스턴스가 뜨므로 근본 해결이 아니다. 트래픽이 진짜 중요한 엔드포인트 한두 개에만, 그것도 위 3가지를 다 한 뒤에 고려하자.`,
  },
  {
    title: "PostgreSQL JSONB, 스키마리스의 유혹과 계약",
    tags: ["postgresql", "jsonb", "database"],
    daysAgo: 10,
    content: `"이 필드는 구조가 자주 바뀌니까 JSONB로 하자"는 결정은 달콤하다. 마이그레이션 없이 필드를 늘릴 수 있으니까. 하지만 공짜가 아니다.

## JSONB가 맞는 자리

- 외부 API의 원본 응답 보관 (웹훅 페이로드, 수집 데이터)
- 사용자 정의 속성처럼 구조를 서비스가 통제하지 않는 데이터
- 읽기 전용에 가깝고, 조건 검색이 드문 메타데이터

공통점은 "구조의 주인이 내가 아니다"라는 것. 반대로 우리 도메인의 핵심 데이터를 JSONB에 넣는 건 대부분 후회로 끝난다.

## 컬럼이 맞는 자리

JSONB 안의 특정 키로 자주 WHERE/ORDER BY/JOIN 한다면 그건 컬럼이어야 한다. 통계도, 제약(NOT NULL, FK, CHECK)도, 타입 보장도 컬럼에만 있다. "tags를 JSONB로 넣을까 조인 테이블로 뺄까" 고민이라면 — 태그로 검색할 거면 테이블이다.

## 그래도 쓸 때의 계약

\`\`\`sql
-- 존재/포함 검색은 GIN 인덱스
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- 특정 키만 자주 찾으면 표현식 인덱스가 더 가볍다
CREATE INDEX idx_events_type ON events ((payload->>'type'));
\`\`\`

- 연산자를 구분하자: \`->\`는 JSONB 반환, \`->>\`는 텍스트 반환. 비교 시 타입이 달라 인덱스를 놓치는 흔한 원인
- GIN 인덱스는 쓰기 비용이 크다. 쓰기 많은 테이블엔 표현식 인덱스로 좁혀서
- 애플리케이션에서 Zod 등으로 스키마 검증을 걸어라. DB가 안 지켜주는 구조는 코드가 지켜야 한다

## 한 줄 요약

JSONB는 "구조를 모르는 데이터의 보관함"이지 "마이그레이션 회피 수단"이 아니다. 검색하는 순간 컬럼으로 승격 — 이 규칙 하나면 대부분의 후회를 피한다.`,
  },
  {
    title: "프론트엔드 에러 추적, 도구 없이 시작하는 법",
    tags: ["에러추적", "frontend", "운영"],
    daysAgo: 12,
    content: `Sentry를 붙이면 좋지만, 사이드 프로젝트나 초기 서비스라면 도구 없이도 에러 추적의 80%를 만들 수 있다. 핵심은 수집 창구를 하나로 모으는 것이다.

## 전역 핸들러 두 개면 시작된다

\`\`\`ts
window.addEventListener("error", (e) => {
  report({ type: "error", message: e.message, stack: e.error?.stack });
});

window.addEventListener("unhandledrejection", (e) => {
  report({ type: "rejection", message: String(e.reason) });
});

function report(data: Record<string, unknown>) {
  navigator.sendBeacon(
    "/api/client-errors",
    JSON.stringify({ ...data, url: location.href, ua: navigator.userAgent, at: Date.now() }),
  );
}
\`\`\`

sendBeacon은 페이지 이탈 중에도 전송이 보장되고 응답을 기다리지 않는다. 에러 리포트에 정확히 맞는 도구다.

## React 경계도 한 곳으로

Error Boundary의 componentDidCatch, Next.js의 error.tsx에서도 같은 report()를 호출한다. 수집 창구가 하나면 나중에 Sentry로 갈아탈 때도 이 함수 하나만 바꾸면 된다.

## 서버 쪽 최소 구성

받은 에러는 DB 테이블 하나에 쌓는다. message + stack 해시로 그룹핑하고 count를 올리면 "무슨 에러가 몇 번"이 바로 보인다. 하루 한 번 새 그룹만 슬랙/디스코드로 쏘면 알림도 끝.

## 노이즈 필터는 처음부터

- 브라우저 확장 프로그램發 에러 (stack에 chrome-extension:// 포함)
- 크로스 오리진 스크립트의 "Script error." (정보가 없어 액션 불가)
- 봇 UA

이 세 가지만 걸러도 수집량의 절반이 준다. 노이즈를 방치하면 알림을 끄게 되고, 알림을 끄면 시스템 전체가 무의미해진다.

## 언제 도구로 가나

소스맵 복원, 릴리즈별 회귀 추적, 이슈 할당이 필요해지는 시점 — 대략 팀이 생기고 배포가 잦아질 때다. 그전까지는 위 구성이 비용 0원으로 충분히 일한다.`,
  },
  {
    title: "모노레포, 언제 도입하고 언제 참아야 하나",
    tags: ["monorepo", "turborepo", "아키텍처"],
    daysAgo: 13,
    content: `모노레포는 유행이지만 공짜가 아니다. 도입해서 좋았던 경우와 후회한 경우를 모두 겪고 나서 정리한 기준이다.

## 도입 신호

- **코드 공유가 실제로 일어난다**: 웹/어드민/앱이 같은 타입, 같은 API 클라이언트, 같은 UI 컴포넌트를 쓴다
- **원자적 변경이 필요하다**: API 스키마 변경이 서버와 클라이언트에 동시에 반영돼야 한다. 레포가 나뉘면 이게 PR 2개 + 배포 순서 조율이 된다
- **버전 지옥을 겪고 있다**: 내부 패키지를 npm에 올려 쓰는데 "shared 0.3.2가 어디까지 배포됐더라"를 매주 확인한다

세 개 중 두 개에 해당하면 도입이 맞다.

## 참아야 하는 신호

- 서비스가 하나뿐이다 — 폴더 구조로 충분하다
- 팀/서비스 간 배포 주기가 완전히 다르고 공유 코드가 거의 없다
- CI 인프라에 손댈 여력이 없다 — 모노레포의 비용은 대부분 CI에서 나온다

## 도입한다면 최소 구성

\`\`\`json
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": {},
    "test": { "dependsOn": ["build"] }
  }
}
\`\`\`

pnpm workspace + turborepo면 충분하다. 처음부터 changesets, 원격 캐시, 커스텀 제너레이터까지 깔지 말자. 핵심은 두 가지 — ①영향 범위 빌드(바뀐 패키지만) ②태스크 캐시. 이것만으로 CI가 레포 통합 이전보다 빨라져야 정상이다.

## 흔한 실패 패턴

shared 패키지가 "잡동사니 서랍"이 되는 것. 유틸, 타입, 컴포넌트, 상수가 한 패키지에 뒤엉키면 아무 앱이나 건드려도 전체가 재빌드된다. shared는 용도별로 잘게(ui / types / config) 나누고, 의존 방향을 한쪽으로만 흐르게 하자.`,
  },
  {
    title: "pnpm으로 갈아탄 뒤 알게 된 것들",
    tags: ["pnpm", "npm", "tooling"],
    daysAgo: 15,
    content: `npm → pnpm 전환을 몇 개 프로젝트에서 반복하며 배운 것들. 결론은 "새 프로젝트면 pnpm, 기존 프로젝트는 아픈 데 없으면 그대로"다.

## 왜 빠른가 — 하드링크 저장소

pnpm은 패키지를 전역 저장소(~/.pnpm-store)에 한 번만 풀고, 각 프로젝트의 node_modules에는 하드링크를 건다. 프로젝트 10개가 같은 react를 써도 디스크에는 1부다. 설치 속도와 디스크 사용량이 동시에 좋아진다.

## 진짜 차이 — 유령 의존성 차단

npm의 평탄화(flat) node_modules에서는 package.json에 없는 패키지도 import가 된다. 간접 의존성이 우연히 끌려와 있기 때문이다. 이게 유령 의존성이고, 간접 의존성이 사라지는 순간 빌드가 깨진다.

pnpm은 심링크 구조라 선언한 패키지만 접근 가능하다. 전환 직후 빌드가 깨진다면 대부분 이 유령들이 드러난 것 — 사실 버그를 미리 잡아 준 거다.

\`\`\`bash
# 전환은 이게 전부
corepack enable
pnpm import   # package-lock.json → pnpm-lock.yaml
rm -rf node_modules package-lock.json
pnpm install
\`\`\`

## 주의할 것들

- **postinstall 의존 패키지**: pnpm은 기본적으로 의존성의 빌드 스크립트를 차단한다(보안). sharp, esbuild 같은 네이티브 패키지는 pnpm.onlyBuiltDependencies에 명시 허용
- **Docker**: corepack enable을 이미지에 넣고, store를 캐시 마운트하면 npm ci보다 빨라진다
- **일부 도구의 호환성**: 심링크를 못 따라가는 낡은 도구가 아직 가끔 있다. node-linker=hoisted로 탈출구는 있지만, 그 순간 pnpm의 장점 절반이 사라진다

## 정리

속도 때문에 갈아탔다가 유령 의존성 차단 때문에 남게 된다. 모노레포(workspace)까지 갈 계획이 있다면 더더욱 pnpm이 기본값이다.`,
  },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { handle: "theo" } });
  if (!user) throw new Error("theo 없음");
  for (const d of POSTS) {
    const publishedAt = new Date(Date.now() - d.daysAgo * 86400000 - Math.floor(Math.random() * 8 + 1) * 3600000);
    const slug = slugify(d.title);
    const dupe = await prisma.post.findFirst({ where: { authorId: user.id, slug } });
    if (dupe) { console.log(`skip: ${d.title}`); continue; }
    const post = await prisma.post.create({
      data: {
        authorId: user.id, title: d.title, slug, content: d.content,
        excerpt: toExcerpt(d.content), status: "PUBLISHED",
        publishedAt, createdAt: publishedAt,
        views: Math.floor(Math.random() * 60 + 10),
      },
    });
    for (const name of d.tags) {
      const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name, slug: encodeURIComponent(name.replace(/\s+/g, "-")) } });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
    console.log(`발행: ${d.title}`);
  }
}
main().then(() => process.exit(0));
