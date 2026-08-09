import { prisma } from "./prisma";

/** 알림 생성 — 자기 자신에겐 안 만들고, 좋아요는 같은 (행위자, 글) 중복을 막는다. */
export async function notify(input: {
  userId: string;
  actorId: string;
  type: "comment" | "reply" | "like";
  postId: string;
}) {
  if (input.userId === input.actorId) return;
  if (input.type === "like") {
    const dup = await prisma.notification.findFirst({
      where: { userId: input.userId, actorId: input.actorId, postId: input.postId, type: "like" },
    });
    if (dup) return;
  }
  await prisma.notification.create({ data: input }).catch(() => {});
}
