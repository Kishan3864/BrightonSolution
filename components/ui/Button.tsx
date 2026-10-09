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
  "group inline-flex min-h-[44px] items-center justify-center gap-2.5 whitespace-nowrap rounded-sharp py-2.5 text-[0.9375rem] font-medium leading-none tracking-[-0.01em] transition-colors duration-200";

const variants: Record<ButtonVariant, string> = {
  primary: "px-5 bg-accent text-paper hover:bg-ink",
  dark: "px-5 bg-ink text-paper hover:bg-accent",
  outline:
    "px-5 border border-ink text-ink hover:bg-ink hover:text-paper [.section-dark_&]:border-paper [.section-dark_&]:text-paper [.section-dark_&]:hover:bg-paper [.section-dark_&]:hover:text-ink",
  ghost: "text-ink underline-offset-[6px] decoration-1 hover:underline [.section-dark_&]:text-paper",
  light: "px-5 bg-paper text-ink hover:bg-accent-soft hover:text-ink",
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
  const newTab = /^https?:/.test(href);
  const classes = `${base} ${variants[variant]} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {arrow ? (
        <Icon
          name={newTab ? "arrowUpRight" : "arrow"}
          size={16}
          className={`transition-transform duration-200 ${
            newTab ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5" : "group-hover:translate-x-0.5"
          }`}
        />
      ) : null}
      {newTab ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        aria-label={ariaLabel}
        {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
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
