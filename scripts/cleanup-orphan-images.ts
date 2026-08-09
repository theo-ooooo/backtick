import { prisma } from "../src/lib/prisma";

/** 고아 이미지 청소 — 어떤 글/유저에서도 참조되지 않는 Storage 이미지를 삭제.
 *  대상: users/{...}/inline, posts/{...} 하위. 48시간 이내 업로드분은 작성 중일 수 있어 보존. */

const FN_URL = "https://eoassqhvtplpobndyhie.supabase.co/functions/v1/img-upload";
const BASE = "https://eoassqhvtplpobndyhie.supabase.co/storage/v1/object/public/images/";
const GRACE_MS = 48 * 3600 * 1000;

async function fn(body: object) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-upload-secret": process.env.UPLOAD_SECRET! },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`fn ${res.status}`);
  return res.json();
}

async function listPrefix(prefix: string): Promise<{ path: string; created: number }[]> {
  // 2단계 폴더 구조: prefix 아래 폴더 나열 → 각 폴더 파일 나열
  const { items } = (await fn({ op: "list", prefix })) as { items: { name: string; created_at: string | null }[] };
  const out: { path: string; created: number }[] = [];
  for (const it of items) {
    if (it.created_at) {
      out.push({ path: `${prefix}/${it.name}`, created: new Date(it.created_at).getTime() });
    } else {
      // 폴더 — 한 단계 더
      const sub = (await fn({ op: "list", prefix: `${prefix}/${it.name}` })) as { items: { name: string; created_at: string | null }[] };
      for (const f of sub.items) {
        if (f.created_at) out.push({ path: `${prefix}/${it.name}/${f.name}`, created: new Date(f.created_at).getTime() });
      }
    }
  }
  return out;
}

async function main() {
  if (!process.env.UPLOAD_SECRET) throw new Error("UPLOAD_SECRET 필요");

  // 참조 수집 — 글 본문/커버, 유저 아바타
  const [posts, users] = await Promise.all([
    prisma.post.findMany({ select: { content: true, coverImage: true } }),
    prisma.user.findMany({ select: { image: true } }),
  ]);
  const referenced = new Set<string>();
  const collect = (s: string | null) => {
    if (!s) return;
    for (const m of s.matchAll(/images\/((?:users|posts)\/[a-zA-Z0-9/_.-]+)/g)) referenced.add(m[1]);
  };
  for (const p of posts) {
    collect(p.content);
    collect(p.coverImage);
  }
  for (const u of users) collect(u.image);

  // 유저/글 폴더 나열 (users/*, posts/*)
  const candidates: { path: string; created: number }[] = [];
  for (const root of ["users", "posts"]) {
    const { items } = (await fn({ op: "list", prefix: root })) as { items: { name: string; created_at: string | null }[] };
    for (const dir of items) {
      if (dir.created_at) continue; // 루트 바로 아래 파일은 없음
      candidates.push(...(await listPrefix(`${root}/${dir.name}`)));
    }
  }

  const now = Date.now();
  const orphans = candidates.filter((c) => !referenced.has(c.path) && now - c.created > GRACE_MS);
  console.log(`전체 ${candidates.length}개 중 고아 ${orphans.length}개`);
  for (const o of orphans) console.log(`  삭제: ${o.path}`);
  if (orphans.length > 0) {
    const { removed } = (await fn({ op: "remove", paths: orphans.map((o) => o.path) })) as { removed: number };
    console.log(`삭제 완료: ${removed}개`);
  }
}

main().then(() => process.exit(0));
