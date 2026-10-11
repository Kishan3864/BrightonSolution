import SectionTitle from "@/components/ui/SectionTitle";

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
  const leadColor = dark ? "text-muted-dark" : "text-muted";

  return (
    <div className={className}>
      <SectionTitle number={number}>{eyebrow}</SectionTitle>
      {/* The statement keeps the column the section body uses (4 of 12, 3 from lg). */}
      <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] md:grid md:grid-cols-12 md:gap-8">
        <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
          <h2 id={id} className="text-h2 max-w-[22ch] text-balance">
            {title}
          </h2>
          {lead ? <p className={`text-lead mt-4 max-w-[60ch] ${leadColor}`}>{lead}</p> : null}
        </div>
      </div>
    </div>
  );
}
