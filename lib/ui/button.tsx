import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT: Record<ButtonVariant, string> = {
  // Primary CTA is solid ink — never a state color (PLAN.md §6).
  primary: "bg-ink text-white hover:opacity-90",
  secondary: "border border-hairline text-ink hover:bg-black/[0.03]",
  ghost: "text-ink hover:bg-black/[0.03]",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-control)] px-4 py-2.5 text-sm font-medium transition-opacity disabled:pointer-events-none disabled:opacity-40",
        VARIANT[variant],
        className,
      )}
      {...props}
    />
  );
}
