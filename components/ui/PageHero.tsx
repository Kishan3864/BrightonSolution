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
      className="pt-[clamp(3rem,2rem+4vw,6rem)] pb-[clamp(2.5rem,1.5rem+3vw,4.5rem)]"
    >
      <Container>
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow text-accent">{eyebrow}</p>
          </div>
          <div className="min-w-0 md:col-span-8 lg:col-span-9">
            <h1 id={`${id}-title`} className="text-h1 max-w-[16ch] text-balance tracking-tight">
              {title}
            </h1>
            {lead ? <p className="text-lead mt-6 max-w-[62ch] text-muted">{lead}</p> : null}
            {children}
          </div>
        </div>
        <div className="hairline mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)]" />
      </Container>
    </section>
  );
}
