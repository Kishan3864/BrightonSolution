import type { ReactNode } from "react";
import Container from "@/components/ui/Container";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  id?: string;
};

export default function PageHero({ eyebrow, title, lead, children, id = "page-hero" }: PageHeroProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="pt-[clamp(2.75rem,1.75rem+3.5vw,5rem)] pb-[clamp(2.25rem,1.5rem+2.5vw,3.75rem)]"
    >
      <Container>
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow text-accent md:pt-3">{eyebrow}</p>
          </div>
          <div className="min-w-0 md:col-span-8 lg:col-span-9">
            <h1 id={`${id}-title`} className="text-h1 max-w-[18ch] text-balance">
              {title}
            </h1>
            {lead ? <p className="text-lead mt-5 max-w-[60ch] text-muted">{lead}</p> : null}
            {children}
          </div>
        </div>
        <div className="hairline mt-[clamp(2.25rem,1.5rem+2.5vw,3.75rem)]" />
      </Container>
    </section>
  );
}
