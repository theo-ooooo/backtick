/** 라우트 전환 중 표시되는 기본 로딩 화면 (Next.js loading 컨벤션). */
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-32">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[20px] font-semibold text-acc" style={{ animation: "btBlink 1s ease infinite" }}>
          `
        </span>
        <span className="text-[13.5px] font-bold text-muted">불러오는 중…</span>
      </div>
      <style>{`@keyframes btBlink { 0%,100% { opacity: 1 } 50% { opacity: .25 } }`}</style>
    </div>
  );
}
