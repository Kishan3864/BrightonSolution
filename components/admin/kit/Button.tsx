"use client";

import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { cx } from "./cx";

/**
 * Buttons for the admin app. One look for <button> (Button, IconButton) and <a> (LinkButton).
 * Sizes are dense on desktop and grow to a 44px touch target on coarse pointers (phones, tablets).
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-sharp font-medium leading-none transition-[background-color,border-color,color,opacity] duration-150 select-none disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-canvas font-semibold hover:bg-accent-2 active:bg-accent-2",
  secondary: "border border-line-strong bg-surface-2 text-fg hover:border-fg/45 hover:bg-[#20232c]",
  ghost: "text-muted hover:bg-fg/[0.06] hover:text-fg",
  danger: "border border-[#ff8a7a]/45 bg-[#ff8a7a]/10 text-[#ff8a7a] hover:bg-[#ff8a7a]/18",
  subtle: "bg-fg/[0.06] text-fg hover:bg-fg/[0.1]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-2.5 text-[0.8125rem] pointer-coarse:min-h-11 pointer-coarse:px-3.5",
  md: "min-h-10 px-3.5 text-[0.875rem] pointer-coarse:min-h-11",
  lg: "min-h-12 px-5 text-[0.9375rem]",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "size-8 pointer-coarse:size-11",
  md: "size-10 pointer-coarse:size-11",
  lg: "size-12",
};

const iconPx: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 20 };

export function buttonClass({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cx(base, variants[variant], sizes[size], className);
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. */
  icon?: AdminIconName;
  /** Trailing icon. */
  iconRight?: AdminIconName;
  /** Shows a spinner in place of the leading icon and disables the button. */
  loading?: boolean;
  /** Stretch to the container width. */
  block?: boolean;
};

function Spinner({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="animate-spin" style={{ width: size, height: size }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & CommonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, loading = false, block = false, className, type = "button", disabled, children, ...props },
  ref,
) {
  const px = iconPx[size];
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass({ variant, size, className: cx(block && "w-full", className) })}
      {...props}
    >
      {loading ? <Spinner size={px} /> : icon ? <AdminIcon name={icon} size={px} /> : null}
      {children}
      {iconRight ? <AdminIcon name={iconRight} size={px} /> : null}
    </button>
  );
});

export const LinkButton = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & Omit<CommonProps, "loading">>(
  function LinkButton({ variant = "secondary", size = "md", icon, iconRight, block = false, className, children, ...props }, ref) {
    const px = iconPx[size];
    return (
      <a ref={ref} className={buttonClass({ variant, size, className: cx(block && "w-full", className) })} {...props}>
        {icon ? <AdminIcon name={icon} size={px} /> : null}
        {children}
        {iconRight ? <AdminIcon name={iconRight} size={px} /> : null}
      </a>
    );
  },
);

/** Square icon-only button. `label` is required: it is the accessible name and the native tooltip. */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    icon: AdminIconName;
    label: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Small count bubble on the top-right corner (hidden when 0). */
    badge?: number;
    /** Extra content after the icon (rare). */
    children?: ReactNode;
  }
>(function IconButton({ icon, label, variant = "ghost", size = "md", badge, className, type = "button", children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={badge ? `${label} (${badge})` : label}
      title={label}
      className={cx(base, variants[variant], iconSizes[size], "relative px-0", className)}
      {...props}
    >
      <AdminIcon name={icon} size={iconPx[size]} />
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 font-mono text-[0.625rem] font-semibold leading-[1.125rem] text-canvas tabular-nums ring-2 ring-canvas"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      {children}
    </button>
  );
});
