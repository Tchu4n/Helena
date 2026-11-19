import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  variant: "primary" | "secondary";
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  name?: string;
  value?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-6 text-base font-medium disabled:cursor-not-allowed disabled:bg-line disabled:text-muted";
const VARIANTS = {
  primary: "bg-primary text-background",
  secondary: "border border-control bg-card text-primary",
};

// The main button is always `primary`; `sale` is never a button color (DESIGN.md, section 4).
export function Button({ variant, children, href, type = "button", name, value, className = "", disabled, onClick }: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} name={name} value={value} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
