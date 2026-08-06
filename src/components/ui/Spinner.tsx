const SIZES = { sm: 18, md: 28 } as const;

/** 코랄 링 스피너. */
export function Spinner({ size = "md" }: { size?: keyof typeof SIZES }) {
  const px = SIZES[size];
  return (
    <span
      role="status"
      aria-label="로딩 중"
      style={{
        width: px,
        height: px,
        borderWidth: Math.max(2, Math.round(px / 9)),
        animation: "btSpin .7s linear infinite",
      }}
      className="inline-block rounded-full border-line border-t-acc"
    />
  );
}
