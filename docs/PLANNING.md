# 백틱 (Backtick) — 멀티유저 개발 블로그 플랫폼 기획서 (GATE 1)

> 누구나 계정을 만들고 글을 쓰는 개발자 블로그 플랫폼 (velog류) + 외부 기술블로그 큐레이션 피드.
> 이름: **백틱(Backtick)** 확정 (backtick.blog 미등록 확인). 마크다운 코드 기호 `에서 따옴.
> 문서 상태: **GATE 1 승인 완료 (2026-08-06)** · 이름 백틱 확정, 외부 피드 수집 기능 추가

---

## 1. 한 줄 정의

**개발자 누구나 가입해서 마크다운으로 글을 쓰고, 자기 블로그 주소를 갖는 블로그 플랫폼.**
— 개인 블로그(kwkang.log)와 달리 **멀티유저**: 회원가입 → `/@닉네임` 블로그 개설 → 글 발행 → 전체 피드 노출.

## 2. 이름 후보 (도메인 .com 미등록 확인됨)

| 후보 | 도메인 | 컨셉 |
|------|--------|------|
| **글로그 (geullog)** ⭐추천 | geullog.com | 글+log, "블로그"와 발음이 겹치는 말장난. 한국 개발자 타깃 딱 |
| 데브글 (devgeul) | devgeul.com | dev+글, 직관적 |
| 글허브 (geulhub) | geulhub.com | GitHub 오마주 |
| 적로그 (jeoklog) | jeoklog.com | "적다"+log |

## 3. MVP 범위

### 핵심 (GATE 3 구현 대상)
1. **계정**: 회원가입/로그인 — **GitHub OAuth**(개발자 플랫폼이니 1순위) + 이메일/비밀번호. 닉네임(핸들) 설정
2. **글 작성**: 마크다운 에디터(실시간 프리뷰), **코드블록 하이라이팅**, 이미지 업로드, 임시저장
3. **발행/관리**: 발행·수정·삭제, 슬러그 URL (`/@handle/글-제목`)
4. **개인 블로그 홈**: `/@handle` — 프로필(사진·소개·GitHub 링크) + 글 목록
5. **전체 피드**: 홈 = 최신글/트렌딩 피드, 태그별 탐색
6. **태그**: 글에 태그 부착, 태그 페이지
7. **SEO**: SSR, OG 태그, sitemap — 블로그는 검색 유입이 생명
8. **외부 기술블로그 수집 피드 (콜드스타트 해결)** ⭐사용자 요청:
   - 국내 기업 기술블로그 RSS 수집(우아한형제들·카카오·토스·당근·네이버 D2·컬리 등) + GeekNews
   - 피드에 백틱 글과 섞어 노출(출처 배지 표시), 클릭 시 **원문으로 이동**(새 탭)
   - 주기적 수집(크론), 중복 제거(guid/링크 기준)

### Phase 2 (비범위)
댓글, 좋아요/북마크, 팔로우/구독, 시리즈(연재), 검색, 알림, RSS, 커스텀 도메인, 통계(조회수), 어드민/신고

## 4. 스택 (추천)

- **Next.js(App Router) 풀스택 + PostgreSQL + Prisma + NextAuth(GitHub OAuth)** ⭐추천
  - 블로그는 SEO/SSR이 핵심이라 Next가 필수급 → 백엔드 분리 없이 풀스택이 가장 빠르고 배포 간단(Vercel)
  - 실시간성 없음 → 별도 API 서버 불필요
- 대안: Spring Boot API + Next.js (본업 스택 학습 목적이면)

## 5. 디자인

- **사용자가 Claude Design으로 디자인 시안 제공 예정** → 그 시안 그대로 구현
- 시안 나오기 전까지는 구조(라우팅·DB·인증)부터 구현

## 6. 데이터 모델 (초안)

User(id, handle, name, bio, avatar, githubUrl) / Post(id, authorId, title, slug, content(md), excerpt, coverImage, status[DRAFT|PUBLISHED], publishedAt) / Tag(name) / PostTag

## 7. 결정 필요 (GATE 1 리뷰)

1. **이름**: 글로그(geullog) 추천 — OK?
2. **스택**: Next.js 풀스택 추천 — OK? (Spring 학습 목적이면 말해줘)
3. **로그인**: GitHub OAuth + 이메일 둘 다? GitHub만? (MVP는 GitHub만도 충분)
4. 배포: Vercel + Neon(무료 Postgres) 추천 — 실서비스 URL 바로 나옴

---

## GATE 진행 상태
- [ ] **GATE 1 (기획서) 승인** ← 현재
- [ ] GATE 2 (설계서 DESIGN.md) — 디자인 시안 수령 후
- [ ] GATE 3 (구현)
