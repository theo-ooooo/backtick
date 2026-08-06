import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const VARIANTS = {
  primary: "bg-ink text-white hover:opacity-85",
  accent: "bg-acc text-white hover:opacity-90",
  outline: "border border-line bg-white text-sub hover:border-ink hover:text-ink",
  soft: "bg-acc-soft text-acc hover:opacity-80",
} as const;

const SIZES = {
  sm: "px-4 py-1.5 text-[13px]",
  md: "px-4.5 py-2 text-[13.5px]",
  lg: "w-full px-4 py-3.5 text-[15px]",
} as const;

type Variant = keyof typeof VARIANTS;
type Size = keyof typeof SIZES;

function cls(variant: Variant, size: Size, extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-full font-bold transition ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className = "", ...rest }: ButtonProps) {
  return <button className={cls(variant, size, className)} {...rest} />;
}

interface ButtonLinkProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function ButtonLink({ variant = "primary", size = "md", className = "", ...rest }: ButtonLinkProps) {
  return <Link className={cls(variant, size, className)} {...rest} />;
}
