import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Small building blocks shared by the admin dashboard (hairlines, sharp corners, mono numbers). */

type Variant = "primary" | "outline" | "ghost";

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-sharp px-4 text-[0.8125rem] font-medium leading-none transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-accent",
  outline: "border border-line text-ink hover:border-ink",
  ghost: "px-2 text-ink underline-offset-4 hover:underline",
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
    <section aria-labelledby={`${id}-title`} className="border-t border-line pt-6 pb-12 md:pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-baseline gap-4">
          <span className="eyebrow text-muted" aria-hidden="true">
            {number}
          </span>
          <h2 id={`${id}-title`} className="text-h3 min-w-0">
            {title}
          </h2>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
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
  const border = tone === "error" ? "border-l-[#B42318]" : "border-l-accent";
  return (
    <div role={role} className={`border border-line border-l-2 ${border} bg-paper px-4 py-3 text-[0.875rem] leading-relaxed`}>
      {title ? <p className="font-medium text-ink">{title}</p> : null}
      <div className="text-muted [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-ink">{children}</div>
    </div>
  );
}

export const inputClass =
  "block min-h-[44px] w-full min-w-0 rounded-sharp border border-line bg-paper px-3 text-[0.9375rem] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export const labelClass = "eyebrow mb-2 block text-muted";
