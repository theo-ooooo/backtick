import Link from "next/link";
import { BackButton } from "@/components/layout/BackButton";

/** 에디터 전용 셸 — 몰입형: 뒤로가기 + 로고만, 푸터/탭바 없음. */
export default function EditorLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-[52px] w-full max-w-[1200px] items-center gap-3 px-4">
          <BackButton />
          <Link href="/" aria-label="백틱 홈" className="flex items-center">
            <span className="font-mono text-[24px] font-semibold leading-none text-acc transition hover:opacity-75">`</span>
          </Link>
          <span className="text-[13.5px] font-bold text-muted">글쓰기</span>
        </div>
      </header>
      {children}
    </>
  );
}
