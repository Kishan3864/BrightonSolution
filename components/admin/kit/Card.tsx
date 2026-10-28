import type { ElementType, ReactNode } from "react";
import AdminIcon, { type AdminIconName } from "./AdminIcon";
import { cx, eyebrow, surface } from "./cx";
import { InfoTip } from "./Tooltip";

/**
 * Layout primitives every view uses: PageHeader (the page's h1 + actions), Card (raised panel) with
 * CardHeader, and Section (a titled group of cards inside a page).
 */

export function PageHeader({
  title,
  description,
  actions,
  eyebrow: kicker,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons on the right (wrap under the title on phones). */
  actions?: ReactNode;
  /** Small mono label above the title. */
  eyebrow?: ReactNode;
  /** Extra row under the header (tabs, filters). */
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 md:mb-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          {kicker ? <p className={cx(eyebrow, "mb-1.5")}>{kicker}</p> : null}
          <h1 className="font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)] font-medium leading-[1.1] tracking-[-0.03em] text-fg">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-[68ch] text-[0.875rem] leading-relaxed text-muted text-pretty">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

export function Card({
  as: Tag = "section",
  className,
  padding = "md",
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  /** none: the content handles its own padding (tables, lists). */
  padding?: "none" | "sm" | "md";
  children: ReactNode;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
}) {
  const pad = padding === "none" ? "" : padding === "sm" ? "p-3 sm:p-4" : "p-4 sm:p-5";
  return (
    <Tag className={cx(surface.card, "min-w-0", pad, className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
  hint,
  id,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: AdminIconName;
  /** Definition shown in an info tooltip beside the title. */
  hint?: string;
  /** Id for the title, to label the card (aria-labelledby). */
  id?: string;
  className?: string;
}) {
  return (
    <div className={cx("mb-4 flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2", className)}>
      {/* The title keeps at least 10rem; on narrow cards wide actions wrap below it instead of squeezing it. */}
      <div className="flex min-w-0 flex-[1_1_10rem] items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-[0.5rem] bg-fg/[0.06] text-muted">
            <AdminIcon name={icon} size={16} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 id={id} className="flex items-center gap-1.5 text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-fg">
            <span className="min-w-0">{title}</span>
            {hint ? <InfoTip text={hint} /> : null}
          </h2>
          {description ? <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

/** A titled group inside a page (h2 level), e.g. "Pipeline" above a row of cards. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("min-w-0", className)}>
      <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[1rem] font-semibold tracking-[-0.01em] text-fg">{title}</h2>
          {description ? <p className="text-[0.8125rem] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
