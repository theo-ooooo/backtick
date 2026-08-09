import { prisma } from "../src/lib/prisma";

function toExcerpt(md: string, max = 160): string {
  return md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()!-]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
function slugify(title: string): string {
  return title.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").replace(/\s+/g, "-").slice(0, 80);
}

interface Draft { title: string; tags: string[]; hoursAgo: number; content: string }

const POSTS: Draft[] = [
  {
    title: "useOptimistic으로 낙관적 업데이트 제대로 쓰기",
    tags: ["react", "useoptimistic", "ux"],
    hoursAgo: 1,
    content: `좋아요 버튼을 눌렀는데 0.5초 뒤에 하트가 채워진다면, 그 0.5초는 사용자에게 "고장났나?"의 시간이다. 낙관적 업데이트는 서버 응답을 기다리지 않고 UI를 먼저 바꾸는 기법이고, React 19의 useOptimistic은 이걸 공식 패턴으로 만들었다.

## 수동 구현의 함정

useState로 직접 하면 이렇게 된다.

\`\`\`tsx
setLiked(true);          // 낙관적 반영
const res = await toggleLike(id);
if (!res.ok) setLiked(false);  // 롤백
\`\`\`

문제는 연타다. 두 번 빠르게 누르면 요청 두 개가 경쟁하고, 늦게 도착한 응답이 최신 상태를 덮어쓴다. 롤백 로직이 상태 꼬임의 진원지가 된다.

## useOptimistic의 핵심

\`\`\`tsx
const [optimisticLikes, addOptimistic] = useOptimistic(
  likes,                                   // 서버가 준 진짜 값
  (current, delta: number) => current + delta,
);

function onLike() {
  startTransition(async () => {
    addOptimistic(1);
    await toggleLike(id);   // 끝나면 서버 값으로 자동 복귀
  });
}
\`\`\`

포인트는 **롤백 코드가 없다**는 것. 낙관적 상태는 트랜지션이 진행되는 동안만 존재하는 오버레이고, 액션이 끝나면 서버에서 리밸리데이트된 진짜 값이 그 자리를 차지한다. 실패해도 진짜 값으로 돌아갈 뿐이다.

## 실무 체크리스트

- 낙관적 반영이 어울리는 곳: 좋아요, 북마크, 팔로우 — **실패해도 피해가 없는 토글**
- 어울리지 않는 곳: 결제, 발행, 삭제 — 실패가 심각하면 기다리는 게 맞다
- 서버 액션과 함께 쓸 때는 revalidatePath까지 해야 "진짜 값"이 갱신된다
- 연타 대응은 서버에서도: 토글 API는 멱등적으로 설계하자

낙관적 업데이트는 UX 기법이기 전에 상태 소유권 문제다. "진짜 상태는 서버 것, 화면은 잠깐 앞서갈 뿐" — 이 원칙만 지키면 꼬일 일이 없다.`,
  },
  {
    title: "pgbouncer 앞에서 Prisma가 이상해지는 이유",
    tags: ["pgbouncer", "prisma", "postgresql"],
    hoursAgo: 2,
    content: `서버리스에서 Postgres를 쓰면 커넥션 풀러(pgbouncer)가 사실상 필수다. 그런데 풀러를 끼우는 순간 잘 되던 것들이 조용히 이상해진다. 원리를 알면 전부 설명되는 현상들이다.

## 왜 풀러가 필요한가

Postgres 커넥션은 비싸다(프로세스 하나씩). 서버리스는 인스턴스가 수십 개로 늘어날 수 있고, 각자 커넥션을 잡으면 max_connections(보통 100)가 순식간에 마른다. pgbouncer는 클라이언트 커넥션 수천 개를 실제 DB 커넥션 몇십 개로 다중화해 준다.

## transaction 모드의 대가

pgbouncer의 핵심 설정이 pool_mode다. 서버리스에선 대부분 **transaction 모드**를 쓰는데, 이는 "트랜잭션 하나 끝날 때마다 커넥션을 다른 클라이언트에게 재배정"한다는 뜻이다. 그래서:

- **prepared statement가 깨진다** — 내가 준비한 문장이 남의 커넥션에 가 있다. Prisma가 URL에 \`pgbouncer=true\`를 요구하는 이유 (prepared statement를 끈다)
- **세션 상태가 증발한다** — SET, advisory lock, 임시 테이블처럼 커넥션에 붙는 것들은 전부 신뢰 불가
- **LISTEN/NOTIFY 불가** — 커넥션을 계속 갈아타니까

\`\`\`
# Prisma + pgbouncer 연결 문자열
postgresql://user:pw@pooler-host:6543/db?pgbouncer=true&connection_limit=5
\`\`\`

## connection_limit은 왜 낮게?

Prisma는 기본적으로 CPU 수 기반으로 풀을 잡는데, 서버리스 인스턴스가 N개면 총 커넥션은 N × limit이 된다. 풀러가 받아주는 클라이언트 수에도 한계가 있으니 인스턴스당 3~5로 낮게 잡는 게 안전하다.

## 마이그레이션은 직결로

DDL이나 마이그레이션은 세션 의존이 있어서 풀러를 거치면 안 된다. 그래서 directUrl(5432 직결)을 따로 두는 게 정석이다. 풀러 주소로 migrate를 돌리다 만나는 기괴한 에러의 90%가 이거다.

정리: 풀러는 "커넥션을 아껴 쓰는 대신 커넥션의 개인화를 포기"하는 거래다. 세션에 기대는 기능을 쓰고 있진 않은지만 점검하면 나머지는 공짜 확장성이다.`,
  },
  {
    title: "서버 액션 보안 체크리스트 — use server는 public API다",
    tags: ["nextjs", "서버액션", "보안"],
    hoursAgo: 3,
    content: `Next.js 서버 액션은 편하다. 너무 편해서 위험하다. "use server"를 붙이는 순간 그 함수는 **네트워크에 노출된 엔드포인트**가 된다는 사실을 잊기 쉽다.

## 1. 모든 액션의 첫 줄은 인증이다

액션은 버튼에 연결돼 있어도, 버튼 없이도 호출할 수 있다. 액션 ID만 알면 curl로도 부른다.

\`\`\`ts
"use server";
export async function deletePost(postId: string) {
  const me = await currentUser();
  if (!me) throw new Error("unauthorized");   // ← 이 줄이 없으면 사고
  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: me.id },   // ← 소유권까지
  });
  if (!post) throw new Error("not found");
  ...
}
\`\`\`

"UI에서 내 글에만 버튼이 보이니까"는 보안이 아니다. **인증(누구냐) + 인가(네 것이냐)** 둘 다 액션 안에서 다시 확인해야 한다.

## 2. 입력은 전부 불신

formData, 인자 전부 클라이언트가 조작 가능하다. 특히 id류 — 남의 리소스 id를 넣는 IDOR가 서버 액션 사고의 단골이다. where 절에 항상 소유자 조건을 함께 건다.

## 3. 반환값도 노출이다

액션이 반환하는 객체는 직렬화돼 클라이언트로 간다. User 객체를 통째로 반환하면 passwordHash도 함께 간다. 필요한 필드만 골라 반환하자.

## 4. redirect 함정 두 가지

- redirect()는 throw 기반이라 try/catch로 감싸면 삼켜진다 — catch에서 rethrow 필요
- 리다이렉트 URL은 HTTP 헤더에 실리므로 한글 등 non-ASCII는 encodeURIComponent 필수 (안 하면 500)

## 5. 뮤테이션 뒤 revalidate

보안은 아니지만 짝으로 기억하자. revalidatePath 없으면 "됐는데 화면은 그대로"가 된다.

요약: 서버 액션은 이름만 함수지 실체는 POST 엔드포인트다. API 라우트에 하던 검증을 하나도 빼놓지 말 것.`,
  },
  {
    title: "개발자가 놓치기 쉬운 웹 접근성 최소 세트",
    tags: ["접근성", "a11y", "frontend"],
    hoursAgo: 4,
    content: `접근성은 "나중에 여유 되면"의 영역으로 밀리기 쉽다. 그런데 최소 세트만 지켜도 스크린리더 사용자뿐 아니라 키보드 유저, 저시력 유저, 그리고 **검색엔진**까지 이득을 본다. 비용 대비 효과 순으로 정리한다.

## 1. 버튼과 링크를 구별하라 (5분)

- 페이지 이동 → \`<a>\`, 동작 실행 → \`<button>\`
- div에 onClick을 붙이면 키보드로 도달할 수 없고(Tab 불가), 스크린리더가 뭔지 모른다
- 아이콘만 있는 버튼엔 aria-label 하나 붙이기: \`<button aria-label="닫기">✕</button>\`

## 2. 폼에는 라벨 (10분)

placeholder는 라벨이 아니다 — 입력을 시작하면 사라지고, 스크린리더가 못 읽는 경우도 있다. label과 input을 htmlFor/id로 묶거나, 시각적으로 숨긴 라벨이라도 넣자.

## 3. 이미지 alt의 3분법 (10분)

- 정보가 있는 이미지: 내용을 설명하는 alt
- 장식 이미지: \`alt=""\` (비우면 스크린리더가 건너뜀 — 생략과 다르다!)
- 링크 안의 유일한 콘텐츠가 이미지면: alt가 곧 링크 텍스트

## 4. 키보드로 한 바퀴 돌아보기 (15분)

마우스를 치우고 Tab / Enter / Esc만으로 핵심 플로우를 완주해 보자.
- 포커스가 어디 있는지 안 보인다 → outline을 지웠다면 :focus-visible 스타일을 돌려놓기
- 모달이 열렸는데 뒤 콘텐츠로 Tab이 샌다 → 포커스 트랩 필요
- Esc로 모달이 안 닫힌다 → keydown 핸들러 추가

## 5. 색 대비 4.5:1 (검사 1분)

회색 글자(#999 on #fff)는 대부분 기준 미달이다. 개발자 도구의 색상 피커가 대비율을 바로 보여준다. 본문 텍스트만이라도 4.5:1을 맞추자.

## 마무리

이 다섯 개는 다 합쳐도 반나절이 안 걸린다. 완벽한 접근성은 멀지만, "키보드로 쓸 수 있고, 라벨이 있고, 대비가 충분한" 사이트는 오늘 만들 수 있다. 시맨틱 HTML을 쓰는 습관이 이 모든 것의 8할이다.`,
  },
  {
    title: "크론 작업 설계 — 멱등성이 전부다",
    tags: ["cron", "배치", "backend"],
    hoursAgo: 5,
    content: `크론 작업은 "한 시간에 한 번 실행된다"고 믿고 짜기 쉽다. 현실은 다르다. 겹쳐 돌고, 건너뛰고, 중간에 죽는다. 이 셋을 전제하고 설계하면 크론은 평화롭다.

## 전제 1 — 두 번 실행된다

재시도, 배포 중 중복 스케줄, 수동 실행… 같은 작업이 두 번 돌 경로는 얼마든지 있다. 대응은 **멱등성**: 몇 번 실행해도 결과가 같게.

\`\`\`ts
// 나쁨: 실행마다 insert — 두 번 돌면 두 배
await db.insert(rows);

// 좋음: 자연키 기준 upsert — 몇 번 돌아도 동일
for (const row of rows) {
  await db.upsert({ where: { url: row.url }, create: row, update: {...} });
}
\`\`\`

수집기, 정산, 알림 발송 — 전부 "이미 처리했는가"를 데이터로 판별할 수 있어야 한다.

## 전제 2 — 겹쳐 돈다

이전 실행이 안 끝났는데 다음 스케줄이 온다. 같은 데이터를 두 프로세스가 만지면 멱등성으로도 못 막는 경합이 생긴다.

- 앱 레벨: 실행 시작 시 락 획득 (Postgres advisory lock, Redis SET NX)
- 인프라 레벨: GitHub Actions라면 concurrency 그룹, K8s CronJob이라면 concurrencyPolicy: Forbid

락은 반드시 **만료 시간**을 두자. 락 잡고 죽은 프로세스가 영원히 다음 실행을 막는 게 최악의 시나리오다.

## 전제 3 — 안 돈다

크론이 조용히 멈추는 건 흔한 장애다(스케줄러 장애, 큐 정체, 잘못된 배포). 문제는 **아무 일도 안 일어나서 아무도 모른다**는 것.

- 각 실행이 끝날 때 "마지막 성공 시각"을 기록
- 그 시각이 주기의 2배를 넘으면 알림 (헬스체크 서비스나 간단한 모니터링 쿼리로)
- 실패 알림보다 **부재 알림**이 크론에선 더 중요하다

## 보너스 — 시간대

서버는 UTC, 사용자는 KST. "매일 자정 정산"의 자정이 어느 자정인지 코드에 명시하자. DST 없는 한국만 서비스해도, 클라우드 스케줄러는 UTC 기준이다.

멱등성 · 중복 방지 · 부재 감지. 크론의 신뢰성은 이 세 단어로 요약된다.`,
  },
];

async function main() {
  const user = await prisma.user.findUnique({ where: { handle: "theo" } });
  if (!user) throw new Error("theo 없음");
  for (const d of POSTS) {
    const publishedAt = new Date(Date.now() - d.hoursAgo * 3600000);
    const slug = slugify(d.title);
    const dupe = await prisma.post.findFirst({ where: { authorId: user.id, slug } });
    if (dupe) { console.log(`skip: ${d.title}`); continue; }
    const post = await prisma.post.create({
      data: {
        authorId: user.id, title: d.title, slug, content: d.content,
        excerpt: toExcerpt(d.content), status: "PUBLISHED",
        publishedAt, createdAt: publishedAt,
        views: Math.floor(Math.random() * 30 + 5),
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
