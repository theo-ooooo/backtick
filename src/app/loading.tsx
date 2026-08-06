import { Spinner } from "@/components/ui/Spinner";

/** 라우트 전환 중 표시되는 기본 로딩 화면 (Next.js loading 컨벤션). */
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-32">
      <Spinner />
    </div>
  );
}
