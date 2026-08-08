import { prisma } from "../src/lib/prisma";

function toExcerpt(md: string, max = 160): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

interface Draft {
  title: string;
  tags: string[];
  daysAgo: number;
  content: string;
}

const POSTS: Draft[] = [
  {
    title: "Next.js App Router 캐싱 4계층 완전 정리",
    tags: ["nextjs", "캐싱", "성능"],
    daysAgo: 0,
    content: `Next.js App Router의 캐싱은 처음 보면 마법 같고, 조금 쓰다 보면 저주 같다. "왜 데이터가 안 바뀌지?"의 90%는 캐시 때문이다. 네 개 층을 분리해서 이해하면 대부분의 미스터리가 풀린다.

## 1. Request Memoization

같은 렌더링 패스 안에서 동일한 fetch를 여러 컴포넌트가 호출하면 실제 요청은 한 번만 나간다. 레이아웃과 페이지에서 같은 유저 정보를 각각 불러도 괜찮은 이유다. 이건 끄고 싶어도 끌 수 없고, 사실 끌 이유도 없다.

## 2. Data Cache

fetch 결과를 서버에 지속 저장하는 층이다. 문제의 주범이기도 하다.

\`\`\`ts
// 매번 새로 가져오기
fetch(url, { cache: "no-store" });

// 60초마다 갱신
fetch(url, { next: { revalidate: 60 } });
\`\`\`

Prisma처럼 fetch를 안 쓰는 데이터 소스는 이 캐시를 안 탄다. 대신 라우트 세그먼트의 \`export const revalidate\`가 페이지 단위로 같은 역할을 한다.

## 3. Full Route Cache

빌드 타임에 정적으로 렌더된 HTML/RSC 페이로드를 통째로 캐싱한다. 동적 API(cookies, headers)를 쓰는 순간 해당 라우트는 여기서 빠진다. revalidatePath를 호출하면 이 캐시가 무효화된다.

## 4. Router Cache

브라우저 메모리에 있는 클라이언트 캐시다. 뒤로 가기가 즉시 뜨는 이유이자, 서버에서 revalidate를 해도 화면이 안 바뀌는 것처럼 보이는 이유다. router.refresh()가 이 캐시를 날린다.

## 디버깅 순서

데이터가 안 바뀌면 아래 순서로 의심하자. ① Router Cache(새로고침으로 확인) ② Full Route Cache(revalidatePath 호출 여부) ③ Data Cache(fetch 옵션) ④ 진짜 데이터 문제. 경험상 ①에서 절반, ②에서 나머지 절반이 잡힌다.`,
  },
  {
    title: "Prisma 트랜잭션, $transaction 배열과 인터랙티브의 차이",
    tags: ["prisma", "database", "트랜잭션"],
    daysAgo: 1,
    content: `Prisma의 $transaction은 두 가지 형태가 있고, 둘의 동작이 꽤 다르다. 잘못 고르면 데드락이나 롱 트랜잭션으로 고생한다.

## 배열 형태 — 순차 배치

\`\`\`ts
await prisma.$transaction([
  prisma.postLike.deleteMany({ where: { postId } }),
  prisma.post.delete({ where: { id: postId } }),
]);
\`\`\`

쿼리 목록을 한 트랜잭션으로 묶는다. 중간 결과를 다음 쿼리에서 쓸 수 없다는 게 핵심 제약이다. 대신 커넥션을 잡고 있는 시간이 짧고 예측 가능하다.

## 인터랙티브 형태 — 콜백

\`\`\`ts
await prisma.$transaction(async (tx) => {
  const from = await tx.account.update({
    where: { id: fromId },
    data: { balance: { decrement: amount } },
  });
  if (from.balance < 0) throw new Error("잔액 부족");
  await tx.account.update({
    where: { id: toId },
    data: { balance: { increment: amount } },
  });
});
\`\`\`

중간 결과로 분기할 수 있다. 대신 콜백이 끝날 때까지 커넥션과 락을 계속 잡는다. 콜백 안에서 외부 API를 호출하는 순간 그 API의 지연이 그대로 DB 락 유지 시간이 된다. 절대 하지 말자.

## 실무 기준

- 단순히 "다 되거나 다 안 되거나"만 필요하면 배열 형태
- 중간 값으로 검증/분기가 필요하면 인터랙티브, 단 안에서는 DB 작업만
- 인터랙티브에 timeout 옵션(기본 5초)을 명시해서 최악을 제한

pgbouncer 같은 커넥션 풀러 뒤에서는 트랜잭션 모드 설정도 확인해야 한다. 세션 기반 기능(advisory lock 등)은 풀러와 조합하면 조용히 깨진다.`,
  },
  {
    title: "PostgreSQL 인덱스가 안 타는 5가지 이유",
    tags: ["postgresql", "인덱스", "성능"],
    daysAgo: 1,
    content: `인덱스를 만들었는데 EXPLAIN을 보면 Seq Scan이 나온다. 당황하기 전에 아래 다섯 가지를 순서대로 확인하자.

## 1. 테이블이 작다

수천 행짜리 테이블은 인덱스를 타는 것보다 전체 스캔이 싸다. 플래너가 옳다. 운영 데이터 규모로 테스트하지 않으면 인덱스 검증은 의미가 없다.

## 2. 함수를 씌웠다

\`\`\`sql
-- 인덱스 못 탐
WHERE lower(email) = 'a@b.com'

-- 표현식 인덱스를 만들면 탐
CREATE INDEX idx_users_email_lower ON users (lower(email));
\`\`\`

컬럼에 함수나 연산을 적용하면 일반 인덱스는 무용지물이다. 표현식 인덱스를 만들거나 쿼리를 바꿔야 한다.

## 3. 타입이 다르다

varchar 컬럼을 숫자와 비교하면 암묵적 캐스팅이 일어나면서 인덱스를 못 쓴다. ORM이 파라미터 타입을 애매하게 보낼 때도 생긴다. EXPLAIN에서 ::text 같은 캐스트가 보이면 의심하자.

## 4. 선두 컬럼이 빠졌다

복합 인덱스 (a, b)는 WHERE b = ? 만으로는 못 쓴다. 왼쪽 접두어 규칙이다. 쿼리 패턴을 보고 컬럼 순서를 정해야 하고, 반대 패턴이 많으면 인덱스를 따로 하나 더 만드는 게 맞다.

## 5. 통계가 낡았다

대량 INSERT/DELETE 직후에는 플래너 통계가 현실과 다르다. ANALYZE 한 번이면 해결되는 문제로 몇 시간 삽질할 수 있다. autovacuum이 따라오지 못하는 배치 작업 뒤에는 수동 ANALYZE를 습관화하자.

## 정리

인덱스 문제의 진단 도구는 결국 EXPLAIN (ANALYZE, BUFFERS) 하나다. 추측하지 말고 실행 계획을 읽자. rows 추정치와 실제 값의 차이가 크면 통계 문제, 캐스트가 보이면 타입 문제다.`,
  },
  {
    title: "GitHub Actions 캐시로 CI 3배 빠르게 만들기",
    tags: ["github-actions", "ci", "devops"],
    daysAgo: 2,
    content: `CI가 느리면 아무도 CI를 기다리지 않고, 기다리지 않으면 머지 전 확인이 사라진다. CI 속도는 개발 문화 문제다. GitHub Actions에서 체감이 큰 순서대로 정리한다.

## 의존성 캐시가 기본

\`\`\`yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: npm
\`\`\`

setup-node의 cache 옵션 한 줄이면 npm 캐시가 붙는다. 직접 actions/cache를 쓰는 것보다 관리가 편하다. lockfile 해시가 키가 되므로 의존성이 안 바뀌면 install이 수십 초에서 몇 초로 준다.

## node_modules 자체를 캐싱하지 말 것

npm 캐시(~/.npm)가 아니라 node_modules를 통째로 캐싱하는 예제가 많은데, OS/노드 버전이 바뀌면 네이티브 모듈이 깨진다. 복원 후 npm ci를 생략하는 구성은 특히 위험하다.

## 빌드 캐시

Next.js라면 .next/cache를 별도로 캐싱하면 빌드가 크게 빨라진다.

\`\`\`yaml
- uses: actions/cache@v4
  with:
    path: .next/cache
    key: next-\${{ hashFiles('package-lock.json') }}-\${{ hashFiles('src/**') }}
    restore-keys: next-\${{ hashFiles('package-lock.json') }}-
\`\`\`

restore-keys 덕분에 소스가 바뀌어도 가장 가까운 캐시에서 시작한다.

## 잡 분리와 concurrency

lint / typecheck / test를 병렬 잡으로 나누면 벽시계 시간이 준다. 그리고 같은 브랜치의 이전 실행을 취소하는 concurrency 설정은 러너 낭비를 막는 필수 옵션이다.

\`\`\`yaml
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true
\`\`\`

우리 프로젝트는 이 네 가지로 평균 6분짜리 CI가 2분 안쪽으로 들어왔다.`,
  },
  {
    title: "TypeScript 제네릭, 어디까지 써야 할까",
    tags: ["typescript", "제네릭"],
    daysAgo: 3,
    content: `제네릭은 처음 배우면 어디에나 쓰고 싶어지고, 코드 리뷰를 몇 번 받고 나면 무서워서 못 쓴다. 내 기준은 하나다. "타입 관계를 보존해야 하는가?"

## 제네릭이 필요한 순간

입력 타입과 출력 타입 사이에 관계가 있을 때다.

\`\`\`ts
function firstOrNull<T>(arr: T[]): T | null {
  return arr[0] ?? null;
}
\`\`\`

string[]을 넣으면 string | null이 나온다는 관계가 보존된다. 이걸 unknown이나 any로 쓰면 호출부에서 타입이 죽는다.

## 필요 없는 순간

관계가 없으면 유니온이나 그냥 구체 타입이 낫다.

\`\`\`ts
// 과함 — T가 아무 관계도 안 만든다
function log<T extends string>(msg: T): void {}

// 충분
function log(msg: string): void {}
\`\`\`

시그니처에 T가 한 번만 등장하면 대부분 불필요한 제네릭이다.

## 추론을 살리는 설계

제네릭의 가치는 호출부에서 타입 인자를 안 써도 추론되는 데 있다. 명시적으로 \`fn<MyType>()\`을 매번 써야 한다면 파라미터 설계가 추론에 불리하게 되어 있다는 신호다. 인자 위치를 조정하거나 satisfies를 활용해 추론 경로를 열어주자.

## 제약(extends)은 최소로

\`T extends { id: string }\`처럼 필요한 최소 형태만 요구하면 재사용성이 올라간다. 특정 인터페이스 전체를 extends로 요구하는 순간 그 함수는 사실상 그 타입 전용이 된다.

정리하면 — 관계가 있으면 제네릭, 없으면 구체 타입, 추론이 안 살면 설계 재검토. 이 세 문장이면 리뷰에서 대부분 방어된다.`,
  },
  {
    title: "React Server Components 1년 써보고 정리하는 멘탈 모델",
    tags: ["react", "rsc", "nextjs"],
    daysAgo: 4,
    content: `RSC를 처음 접하면 "서버에서 렌더링되는 컴포넌트"라는 설명이 오히려 혼란을 준다. SSR과 뭐가 다른데? 1년 운영해 보고 정착한 멘탈 모델을 공유한다.

## HTML이 아니라 데이터를 만든다

SSR은 HTML 문자열을 만들어 보낸다. RSC는 컴포넌트 트리를 직렬화한 데이터(RSC 페이로드)를 보낸다. 클라이언트는 이 데이터를 받아 기존 트리에 병합한다. 그래서 내비게이션 시 화면 전체가 갈리지 않고 바뀐 부분만 교체된다.

## 서버 컴포넌트는 "실행 위치"가 아니라 "번들 경계"

'use client'가 붙은 파일과 그 import 트리만 브라우저 번들에 들어간다. 서버 컴포넌트의 코드(마크다운 파서, DB 클라이언트, 무거운 유틸)는 클라이언트에 1바이트도 안 간다. 이게 실질적인 성능 이득의 대부분이다.

\`\`\`tsx
// 서버 — prisma가 번들에 안 들어감
export default async function Page() {
  const posts = await prisma.post.findMany();
  return <PostList posts={posts} />;
}
\`\`\`

## 경계에서만 직렬화 비용을 낸다

서버 → 클라이언트로 넘기는 props는 직렬화 가능해야 한다. Date는 되고 함수는 안 된다. 거대한 객체를 통째로 넘기지 말고 화면에 필요한 필드만 골라 넘기는 습관이 여기서 중요해진다.

## 실무에서 정한 규칙

- 페이지/레이아웃은 기본 서버. 데이터 조회는 전부 여기서
- 'use client'는 이벤트 핸들러, useState, 브라우저 API가 필요한 잎(leaf)에만
- 클라이언트 컴포넌트가 서버 데이터를 다시 fetch하지 않도록 props로 내려주기
- children 패턴으로 서버 컴포넌트를 클라이언트 컴포넌트 안에 끼워 넣기

이 네 줄만 지켜도 "왜 번들이 커졌지"와 "왜 이 코드가 브라우저에서 터지지"의 대부분을 예방한다.`,
  },
  {
    title: "Redis 캐싱 전략 — Cache-Aside만 알아도 충분한 이유",
    tags: ["redis", "캐싱", "backend"],
    daysAgo: 5,
    content: `캐싱 전략 글을 보면 Write-Through, Write-Behind, Read-Through 같은 패턴이 쏟아진다. 결론부터 말하면 웹 서비스의 95%는 Cache-Aside 하나로 충분하다.

## Cache-Aside 기본형

\`\`\`ts
async function getPost(id: string) {
  const cached = await redis.get(\`post:\${id}\`);
  if (cached) return JSON.parse(cached);

  const post = await db.post.findUnique({ where: { id } });
  if (post) await redis.set(\`post:\${id}\`, JSON.stringify(post), "EX", 300);
  return post;
}
\`\`\`

읽을 때 캐시를 먼저 보고, 없으면 DB에서 읽어 채운다. 쓸 때는 캐시를 지운다(갱신이 아니라 삭제). 다음 읽기가 자연스럽게 최신 값을 채워 넣는다.

## 갱신이 아니라 삭제인 이유

쓰기 시점에 캐시를 "갱신"하면 동시 쓰기에서 순서가 꼬였을 때 낡은 값이 캐시에 남는다. 삭제는 최악의 경우가 "캐시 미스 한 번"으로 끝난다. 실패 모드가 훨씬 안전하다.

## TTL은 보험이다

무효화 로직이 완벽해도 TTL은 꼭 건다. 버그, 배포 중 유실, 예외 경로 어디선가 삭제가 누락됐을 때 TTL이 최후의 방어선이 된다. 데이터 특성에 따라 1분~1시간 사이에서 정하면 된다.

## 스탬피드 방지

인기 키가 만료되는 순간 수백 요청이 동시에 DB로 몰리는 게 캐시 스탬피드다. 대응은 두 가지면 충분하다. ① TTL에 지터(무작위 ±10%)를 줘서 동시 만료를 분산 ② 재계산에 락(SET NX)을 걸어 한 요청만 DB에 가게 하기.

Write-Through가 필요해지는 건 쓰기 직후 읽기가 극단적으로 많고 미스 비용이 클 때인데, 그 정도 규모가 되면 그때 도입해도 늦지 않다. 미리 복잡도를 사지 말자.`,
  },
  {
    title: "Docker 멀티스테이지 빌드로 Next.js 이미지 1.2GB → 180MB",
    tags: ["docker", "nextjs", "devops"],
    daysAgo: 6,
    content: `Next.js 앱을 순진하게 도커라이즈하면 1GB가 우습게 넘는다. node_modules와 빌드 도구가 전부 실려 있기 때문이다. 멀티스테이지 빌드와 standalone 출력으로 180MB까지 줄인 과정을 기록한다.

## 핵심 1 — output: "standalone"

\`\`\`ts
// next.config.ts
const nextConfig = {
  output: "standalone",
};
\`\`\`

이 옵션을 켜면 빌드 시 .next/standalone에 실행에 필요한 파일과 node_modules의 사용분만 트레이싱해서 복사해 준다. 전체 node_modules를 실을 필요가 없어진다.

## 핵심 2 — 스테이지 분리

\`\`\`dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

runner 스테이지에는 빌드 도구도, devDependencies도, 소스 코드도 없다. standalone 산출물과 정적 파일뿐이다.

## 덤 — 캐시 순서

package*.json 복사와 npm ci를 소스 복사보다 앞에 두는 게 레이어 캐시의 핵심이다. 코드만 바뀌면 의존성 레이어는 재사용된다. CI에서 buildx의 --cache-from까지 붙이면 재빌드가 1분 안쪽으로 들어온다.

결과: 1.2GB → 180MB, 콜드 풀 시간 4분의 1, ECS 배포 롤링 속도 체감 2배. 옵션 하나와 Dockerfile 구조만으로 얻는 이득치고는 크다.`,
  },
  {
    title: "JWT vs 세션, 2026년의 결론",
    tags: ["auth", "jwt", "보안"],
    daysAgo: 7,
    content: `"JWT가 모던하고 세션은 구식"이라는 인식이 아직도 있는데, 실제로는 트레이드오프의 문제고, 심지어 대부분의 웹 서비스에는 세션(또는 하이브리드)이 낫다.

## JWT의 진짜 장점과 진짜 비용

장점은 하나다 — 서버가 상태를 안 들고 있어도 된다. 검증이 로컬 연산이라 인증 서버 없이 여러 서비스가 토큰을 신뢰할 수 있다. MSA나 서드파티 API에는 확실히 유리하다.

비용은 무효화다. 로그아웃, 강제 탈퇴, 권한 변경을 즉시 반영하려면 결국 서버 측 상태(블랙리스트, 버전 체크)가 필요해지고, 그 순간 "무상태"라는 장점이 사라진다.

## 세션의 재평가

세션은 무효화가 공짜다. Redis에서 키 하나 지우면 끝. 요즘은 세션 저장소 성능이 병목이 되는 규모 자체가 드물다. Redis 단일 인스턴스로도 초당 수만 조회를 버틴다.

## 실무 하이브리드 — 짧은 JWT + 서버 검증 포인트

우리가 정착한 구성은 이렇다.

- JWT에는 유저 id만 담고 수명을 짧게 (분 단위)
- 민감한 판단(권한, 탈퇴 여부)은 요청 시점에 DB/캐시에서 재확인
- 프로필 같은 가변 데이터는 절대 토큰에 넣지 않기

토큰에 프로필을 넣으면 이름 하나 바꿔도 재로그인 전까지 낡은 값이 떠다니고, 아바타 URL 같은 걸 넣었다가는 쿠키가 헤더 한도를 넘겨 494 에러를 만난다. 직접 겪었다.

## 결론

- 단일 웹 서비스: 세션 또는 "짧은 JWT + DB 확인" 하이브리드
- 서비스 간 인증, 서드파티 API: JWT
- 어느 쪽이든 토큰/세션에는 식별자만, 데이터는 저장소에서

인증은 유행이 아니라 실패 모드로 골라야 한다.`,
  },
  {
    title: "LCP 4.2초 → 1.8초, 실제로 효과 있었던 것만",
    tags: ["성능", "lcp", "web-vitals"],
    daysAgo: 8,
    content: `성능 최적화 글은 많지만 대부분 체크리스트 나열이다. 실제 서비스에서 LCP를 4.2초에서 1.8초로 줄이며 효과가 컸던 순서대로만 적는다.

## 1. LCP 요소부터 특정하라 (30분)

크롬 개발자 도구 Performance 탭에서 LCP 마커를 클릭하면 어떤 요소가 LCP인지 바로 보여준다. 우리는 히어로 이미지였다. LCP 요소가 뭔지 모르고 하는 최적화는 전부 도박이다.

## 2. 히어로 이미지 priority + preload (–1.2초)

\`\`\`tsx
<Image src={hero} alt="" priority />
\`\`\`

next/image는 기본이 lazy다. 첫 화면 이미지에 priority를 주면 preload 링크가 생성되고 fetchpriority=high가 붙는다. 이 한 줄이 가장 컸다.

## 3. 웹폰트 — 서브셋 + font-display: swap (–0.6초)

한글 폰트 전체는 2MB가 넘는다. 서브셋 woff2로 줄이고 swap을 줘서 텍스트가 폰트를 기다리지 않게 했다. next/font를 쓰면 서브셋과 self-hosting이 자동이다.

## 4. 서버 응답(TTFB) — 리전과 캐시 (–0.4초)

서울 유저에게 미국 리전 서버는 그 자체로 300ms 페널티다. 엣지/리전을 사용자 가까이로 옮기고, 동적 페이지에 revalidate 캐시를 걸었다. 코드 최적화보다 인프라 배치가 쌌다.

## 5. 클라이언트 JS 다이어트 (–0.2초, 그러나 INP에 큼)

번들 분석으로 차트 라이브러리를 dynamic import로 밀어냈다. LCP에는 생각보다 영향이 작았지만 INP가 눈에 띄게 좋아졌다.

## 효과 없던 것

- 이미 작던 CSS의 추가 압축
- 서드파티 스크립트 defer(이미 defer였음)
- 메모이제이션 남발 — 렌더 성능과 로딩 성능은 다른 문제다

측정 → LCP 요소 특정 → 그 요소의 병목만 제거. 이 루프 세 번이면 대부분의 사이트는 2초 안에 들어온다.`,
  },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { handle: "theo" } });
  if (!user) throw new Error("theo 사용자를 찾을 수 없음");

  for (const d of POSTS) {
    const publishedAt = new Date(Date.now() - d.daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 6 + 2) * 3600 * 1000);
    let slug = slugify(d.title);
    const dupe = await prisma.post.findFirst({ where: { authorId: user.id, slug } });
    if (dupe) {
      console.log(`skip (있음): ${d.title}`);
      continue;
    }
    const post = await prisma.post.create({
      data: {
        authorId: user.id,
        title: d.title,
        slug,
        content: d.content,
        excerpt: toExcerpt(d.content),
        status: "PUBLISHED",
        publishedAt,
        createdAt: publishedAt,
        views: Math.floor(Math.random() * 40 + 5),
      },
    });
    for (const name of d.tags) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, slug: encodeURIComponent(name.replace(/\s+/g, "-")) },
      });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
    console.log(`발행: ${d.title}`);
  }
}

main().then(() => process.exit(0));
