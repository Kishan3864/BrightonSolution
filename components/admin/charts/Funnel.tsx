import { cx } from "../kit/cx";

/**
 * Step funnel (contact page -> form started -> submitted -> enquiry). Each step is a bar sized to
 * the first step, with its count, its share of the first step and the step-to-step conversion.
 * Plain HTML, so it reflows on any width and reads as a list without the bars.
 */

export type FunnelStep = { key: string; label: string; value: number; /** Small note under the label. */ hint?: string };

export default function Funnel({
  steps,
  format = (n: number) => n.toLocaleString(),
  ariaLabel,
}: {
  steps: readonly FunnelStep[];
  format?: (value: number) => string;
  ariaLabel: string;
}) {
  const first = steps[0]?.value ?? 0;
  return (
    <ol aria-label={ariaLabel} className="space-y-1">
      {steps.map((step, i) => {
        const pct = first ? step.value / first : 0;
        const prev = i > 0 ? steps[i - 1].value : null;
        const conv = prev ? step.value / prev : null;
        return (
          <li key={step.key} className="min-w-0">
            {conv !== null ? (
              <p className="flex items-center gap-1.5 py-0.5 pl-3 font-mono text-[0.6875rem] tabular-nums text-muted">
                <span aria-hidden="true">↓</span>
                {(conv * 100).toFixed(conv < 0.1 ? 1 : 0)}% continued
              </p>
            ) : null}
            <div className="relative overflow-hidden rounded-[0.6rem] border border-line bg-fg/[0.02]">
              <span
                aria-hidden="true"
                className={cx("absolute inset-y-0 left-0 transition-[width] duration-300", i === steps.length - 1 ? "bg-accent/30" : "bg-accent/15")}
                style={{ width: `${Math.max(pct * 100, step.value ? 1 : 0)}%` }}
              />
              <div className="relative flex min-h-11 items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.8125rem] font-medium text-fg">{step.label}</p>
                  {step.hint ? <p className="truncate text-[0.6875rem] text-muted">{step.hint}</p> : null}
                </div>
                <div className="shrink-0 text-right font-mono tabular-nums">
                  <span className="text-[0.9375rem] text-fg">{format(step.value)}</span>
                  {i > 0 ? <span className="ml-2 text-[0.75rem] text-muted">{(pct * 100).toFixed(pct < 0.1 ? 1 : 0)}%</span> : null}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
