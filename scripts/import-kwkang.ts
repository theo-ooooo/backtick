// kwkang.log 마크다운 글을 백틱(@kwkang)으로 이전
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIR = `${process.env.HOME}/Workspace/kwkang.log/contents/articles/ai`;
const AUTHOR = "cmshb81jb0000js04j1k45zpk";

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
  return { meta, body: raw.slice(m[0].length) };
}

const toExcerpt = (md: string) =>
  md.replace(/```[\s\S]*?```/g, " ").replace(/[#>*_`\[\]()!|-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
const firstImage = (md: string) => /!\[[^\]]*\]\((https?:\/\/[^)\s]+)/.exec(md)?.[1] ?? null;

async function main() {
let inserted = 0, skipped = 0;
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".md"))) {
  const slug = file.replace(/\.md$/, "");
  const { meta, body } = parseFrontmatter(readFileSync(join(DIR, file), "utf-8"));
  const exists = await prisma.post.findFirst({ where: { authorId: AUTHOR, slug } });
  if (exists) { skipped++; continue; }

  const publishedAt = meta.date ? new Date(`${meta.date}T09:00:00+09:00`) : new Date();
  const post = await prisma.post.create({
    data: {
      authorId: AUTHOR,
      title: meta.title ?? slug,
      slug,
      content: body.trim(),
      excerpt: toExcerpt(body),
      coverImage: firstImage(body),
      status: "PUBLISHED",
      publishedAt,
      createdAt: publishedAt,
    },
  });
  const tags = (meta.tag ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  for (const name of tags) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, slug: encodeURIComponent(name.replace(/\s+/g, "-")) },
    });
    await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
  }
  inserted++;
  console.log("+", meta.title);
}
console.log(`done: ${inserted} inserted, ${skipped} skipped`);
await prisma.$disconnect();
}
void main();
