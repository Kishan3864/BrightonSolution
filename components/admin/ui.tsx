import type { ButtonHTMLAttributes, ReactNode } from "react";
import SectionTitle from "@/components/ui/SectionTitle";

/** Small building blocks shared by the admin dashboard (dark surfaces, 12px controls, 20px panels, mono numbers). */

/** Raised panel for a chart, a table or a group of controls. */
export const panelClass = "rounded-[var(--radius-card)] border border-line bg-surface";

type Variant = "primary" | "outline" | "ghost";

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-sharp px-4 text-[0.8125rem] font-medium leading-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants: Record<Variant, string> = {
  primary: "bg-accent font-semibold text-canvas hover:bg-accent-2",
  outline: "border border-line-strong bg-surface text-fg hover:border-fg/60 hover:bg-surface-2",
  ghost: "px-2 text-fg underline-offset-4 hover:text-accent hover:underline",
};

export function AdminButton({
  variant = "outline",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${buttonBase} ${buttonVariants[variant]} ${className}`.trim()} {...props} />;
}

export function Section({
  number,
  title,
  actions,
  children,
  id,
}: {
  number: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  id: string;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className="pb-12 md:pb-16">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <SectionTitle as="h2" variant="sub" number={number} id={`${id}-title`} className="min-w-0 flex-1">
          {title}
        </SectionTitle>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  role,
}: {
  tone?: "neutral" | "error";
  title?: string;
  children: ReactNode;
  role?: "alert" | "status";
}) {
  // Error red is a light red for the dark theme (about 8:1 on surface).
  const border = tone === "error" ? "border-l-[#ff8a7a]" : "border-l-accent";
  return (
    <div
      role={role}
      className={`rounded-sharp border border-line border-l-[3px] ${border} bg-surface-2 px-4 py-3 text-[0.875rem] leading-relaxed`}
    >
      {title ? <p className={`font-medium ${tone === "error" ? "text-[#ff8a7a]" : "text-fg"}`}>{title}</p> : null}
      <div className={`${tone === "error" ? "text-fg" : "text-muted"} [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-fg`}>{children}</div>
    </div>
  );
}

export const inputClass =
  "block min-h-[44px] w-full min-w-0 rounded-sharp border border-fg/35 bg-surface-2 px-3 text-[0.9375rem] text-fg [color-scheme:dark] placeholder:text-muted hover:border-fg/60 focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const labelClass = "eyebrow mb-2 block text-muted";
