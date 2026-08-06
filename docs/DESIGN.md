# 백틱 (Backtick) — 설계서 (GATE 2)

> Next.js 풀스택 멀티유저 개발 블로그 + 외부 기술블로그 큐레이션 피드.
> 최종수정 2026-08-06

---

## 1. 스택

- **Next.js 15+ (App Router, TypeScript) 풀스택** — RSC + Server Actions
- **PostgreSQL + Prisma** (로컬: brew postgresql@16, 프로덕션: Neon)
- **Auth.js(NextAuth v5) + GitHub OAuth** (개발자 타깃이라 GitHub 1순위)
- Tailwind CSS (+ 사용자 Claude Design 시안 수령 후 그 톤 적용)
- 마크다운: 에디터 = textarea + 실시간 프리뷰(react-markdown), 렌더 = react-markdown + rehype-highlight(코드 하이라이팅) + rehype-sanitize
- RSS 수집: rss-parser

## 2. 데이터 모델 (Prisma)

```prisma
User      { id, handle(@unique), name, email(@unique), image, bio, githubUrl, createdAt }
          + NextAuth 표준(Account, Session)
Post      { id, authorId→User, title, slug, content(md), excerpt, coverImage,
            status(DRAFT|PUBLISHED), publishedAt, createdAt, updatedAt
            @@unique([authorId, slug]) }
Tag       { id, name(@unique), slug(@unique) }
PostTag   { postId, tagId @@id([postId, tagId]) }
Feed      { id, name, siteUrl, rssUrl(@unique), enabled }        // 수집 대상 블로그
ExternalPost { id, feedId→Feed, title, url(@unique), excerpt, author?, publishedAt, fetchedAt }
```

## 3. 라우팅

| 경로 | 내용 |
|------|------|
| `/` | 통합 피드: 백틱 글 + 외부 수집 글 섞어서 최신순 (탭: 전체·백틱·기술블로그) |
| `/@[handle]` | 개인 블로그 홈 (프로필 + 글 목록) |
| `/@[handle]/[slug]` | 글 상세 (SSR, OG 태그) |
| `/write` | 에디터 (로그인 필요, 임시저장=DRAFT) |
| `/write/[id]` | 수정 |
| `/tags/[slug]` | 태그별 글 |
| `/login` | GitHub 로그인 |
| `/settings` | 프로필 편집 (handle 최초 설정 포함) |
| 외부 글 클릭 | **원문 새 탭 이동** (상세 페이지 없음) |

## 4. 외부 피드 수집

- `Feed` 시드: 우아한형제들, 카카오, 토스, 당근, 네이버 D2, 컬리, 뱅크샐러드, 무신사, GeekNews (RSS URL은 시드에서 관리)
- 수집기: `POST /api/ingest` (+ Vercel Cron 1시간 주기) → rss-parser로 각 피드 fetch → `url` upsert(중복 방지) → excerpt 정리(HTML strip, 200자)
- 실패 피드는 건너뛰고 로깅 (한 피드 장애가 전체를 막지 않게)
- 통합 피드 쿼리: Post(PUBLISHED)와 ExternalPost를 publishedAt 기준 머지

## 5. 인증/핸들 흐름

GitHub 로그인 → 최초 로그인 시 handle 미설정 → `/settings`로 리다이렉트해 handle 설정(영문/숫자/하이픈, 유니크) → 이후 `/@handle` 활성화. 글쓰기는 handle 설정 후 가능.

## 6. 구현 순서 (GATE 3)

1. 스캐폴드(create-next-app + Prisma + DB) → 스키마 마이그레이션
2. 외부 피드 수집기 + 통합 피드 홈 (**볼거리 먼저** — 콜드스타트 해결이 1순위)
3. GitHub OAuth + handle 설정
4. 에디터(작성/임시저장/발행) + 글 상세(하이라이팅) + `/@handle`
5. 태그, SEO(sitemap·OG)
6. 사용자 디자인 시안 수령 → 비주얼 적용
7. 배포(Vercel + Neon)

---
- [x] GATE 1 승인 (2026-08-06) — 이름 백틱, 외부피드 추가
- [x] GATE 2 설계
- [ ] GATE 3 구현 ← 진행 중
