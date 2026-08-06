import type { User } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { ButtonLink } from "@/components/ui/Button";

/** Sticky author profile card on post pages (design screen 02). */
export function AuthorCard({ author }: { author: User }) {
  return (
    <div className="sticky top-[84px] rounded-2xl border border-line p-5">
      <Avatar name={author.name ?? author.handle ?? "?"} image={author.image} size="lg" tone="neutral" />
      <div className="mt-3 text-[15.5px] font-extrabold">{author.name ?? author.handle}</div>
      <div className="font-mono text-[12px] text-muted">@{author.handle}</div>
      {author.bio && <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{author.bio}</p>}
      <ButtonLink href={`/@${author.handle}`} size="sm" className="mt-4 w-full rounded-xl py-2.5">
        글 더 보기
      </ButtonLink>
    </div>
  );
}
