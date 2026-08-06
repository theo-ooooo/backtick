/* eslint-disable @next/next/no-img-element */

const SIZES = {
  sm: "h-[22px] w-[22px] text-[10.5px]",
  md: "h-9 w-9 text-[13px]",
  lg: "h-[52px] w-[52px] text-[20px]",
  xl: "h-[84px] w-[84px] text-[30px]",
} as const;

interface Props {
  name: string;
  image?: string | null;
  size?: keyof typeof SIZES;
  /** coral tint (default) or neutral paper */
  tone?: "accent" | "neutral";
}

/** Initial avatar circle — image when available, tinted initial otherwise. */
export function Avatar({ name, image, size = "md", tone = "accent" }: Props) {
  const base = `flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold ${SIZES[size]}`;
  if (image) {
    return (
      <span className={base}>
        <img src={image} alt={name} className="h-full w-full object-cover" />
      </span>
    );
  }
  const toneCls = tone === "accent" ? "bg-acc-soft text-acc" : "bg-paper text-sub";
  return <span className={`${base} ${toneCls}`}>{name.charAt(0)}</span>;
}
