type LogoProps = {
  variant?: "dark" | "light";
  compact?: boolean;
  titled?: boolean;
  className?: string;
};

export function LogoMark({
  variant = "dark",
  titled = false,
  size = 28,
}: {
  variant?: "dark" | "light";
  titled?: boolean;
  size?: number;
}) {
  const accent = variant === "light" ? "var(--color-accent-soft)" : "var(--color-accent)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden={titled ? undefined : "true"}
      role={titled ? "img" : undefined}
      focusable="false"
      className="shrink-0"
    >
      {titled ? <title>BrightonSolution</title> : null}
      <rect x="0.75" y="0.75" width="26.5" height="26.5" />
      <path d="M9 6.5v15" />
      <path d="M9 6.5h7v6.5H9" />
      <path d="M9 13h8.5v8.5H9" />
      <rect x="20" y="18" width="3.5" height="3.5" fill={accent} stroke="none" />
    </svg>
  );
}

export default function Logo({ variant = "dark", compact = false, titled = false, className = "" }: LogoProps) {
  const color = variant === "light" ? "text-paper" : "text-ink";
  return (
    <span className={`inline-flex items-center gap-2.5 ${color} ${className}`.trim()}>
      <LogoMark variant={variant} titled={titled} />
      {compact ? null : (
        <span className="whitespace-nowrap text-[1rem] leading-none tracking-[-0.02em]" aria-hidden={titled ? "true" : undefined}>
          <span className="font-semibold">Brighton</span>
          <span className="font-normal">Solution</span>
        </span>
      )}
    </span>
  );
}
