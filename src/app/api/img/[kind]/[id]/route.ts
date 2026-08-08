import { prisma } from "@/lib/prisma";

const DATA_RE = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i;

/** DB에 base64로 저장된 이미지를 바이너리+불변 캐시로 서빙 — CDN이 흡수해 Supabase 이그레스를 막는다.
 *  /api/img/cover/<postId> · /api/img/avatar/<userId> */
export async function GET(_req: Request, ctx: RouteContext<"/api/img/[kind]/[id]">) {
  const { kind, id } = await ctx.params;

  let raw: string | null = null;
  if (kind === "cover") {
    raw = (await prisma.post.findUnique({ where: { id }, select: { coverImage: true } }))?.coverImage ?? null;
  } else if (kind === "avatar") {
    raw = (await prisma.user.findUnique({ where: { id }, select: { image: true } }))?.image ?? null;
  }
  if (!raw) return new Response("not found", { status: 404 });

  // 외부 URL이 저장된 경우엔 그쪽으로 넘긴다
  if (/^https?:\/\//.test(raw)) return Response.redirect(raw, 302);

  const m = DATA_RE.exec(raw);
  if (!m) return new Response("unsupported", { status: 415 });

  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "content-type": m[1],
      // URL에 ?v=updatedAt 버전이 붙으므로 불변 캐시 안전
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
