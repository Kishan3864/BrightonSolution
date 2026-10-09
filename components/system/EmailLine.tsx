import { site } from "@/lib/site";

type EmailLineProps = {
  lead?: string;
  className?: string;
};

/** One quiet line with the support address — the fallback contact on every system page. */
export default function EmailLine({ lead = "Need help? Write to", className = "" }: EmailLineProps) {
  return (
    <p className={`text-[0.9375rem] text-muted ${className}`.trim()}>
      {lead}{" "}
      <a
        href={`mailto:${site.email}`}
        className="inline-flex min-h-[44px] items-center break-all font-medium text-ink underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
      >
        {site.email}
      </a>
    </p>
  );
}
