import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

export type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "light";

type ButtonProps = {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
  ariaLabel?: string;
};

const base =
  "group inline-flex min-h-[44px] items-center justify-center gap-3 whitespace-nowrap rounded-sharp py-2.5 text-[0.9375rem] font-semibold tracking-tight transition-colors duration-200";

const variants: Record<ButtonVariant, string> = {
  primary: "px-6 bg-accent text-paper hover:bg-ink",
  dark: "px-6 bg-ink text-paper hover:bg-accent",
  outline:
    "px-6 border border-ink text-ink hover:bg-ink hover:text-paper [.section-dark_&]:border-paper [.section-dark_&]:text-paper [.section-dark_&]:hover:bg-paper [.section-dark_&]:hover:text-ink",
  ghost: "text-ink underline-offset-8 decoration-1 hover:underline [.section-dark_&]:text-paper",
  light: "px-6 bg-paper text-ink hover:bg-accent-soft hover:text-ink",
};

export default function Button({
  href,
  variant = "primary",
  children,
  className = "",
  arrow = true,
  ariaLabel,
}: ButtonProps) {
  const external = /^(https?:|mailto:|tel:)/.test(href);
  const classes = `${base} ${variants[variant]} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {arrow ? (
        <Icon
          name="arrow"
          size={18}
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      ) : null}
    </>
  );

  if (external) {
    return (
      <a href={href} className={classes} aria-label={ariaLabel}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel}>
      {content}
    </Link>
  );
}
