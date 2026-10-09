type SectionHeadingProps = {
  number?: string;
  eyebrow: string;
  title: string;
  lead?: string;
  dark?: boolean;
  className?: string;
  id?: string;
};

export default function SectionHeading({
  number,
  eyebrow,
  title,
  lead,
  dark = false,
  className = "",
  id,
}: SectionHeadingProps) {
  const eyebrowColor = dark ? "text-accent-soft" : "text-accent";
  const leadColor = dark ? "text-muted-dark" : "text-muted";

  return (
    <div className={`grid gap-6 md:grid-cols-12 md:gap-8 ${className}`.trim()}>
      <div className="md:col-span-4 lg:col-span-3">
        <p className={`eyebrow flex items-baseline gap-3 md:pt-2 ${eyebrowColor}`}>
          {number ? <span className="tabular-nums">{number}</span> : null}
          <span>{eyebrow}</span>
        </p>
      </div>
      <div className="min-w-0 md:col-span-8 lg:col-span-9">
        <h2 id={id} className="text-h2 max-w-[22ch] text-balance">
          {title}
        </h2>
        {lead ? <p className={`text-lead mt-4 max-w-[60ch] ${leadColor}`}>{lead}</p> : null}
      </div>
    </div>
  );
}
