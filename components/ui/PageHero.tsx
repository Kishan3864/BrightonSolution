import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: ReactNode;
  id?: string;
  /** Hairline under the hero. Turn off when the next section opens with its own title band. */
  divider?: boolean;
};

export default function PageHero({
  eyebrow,
  title,
  lead,
  children,
  id = "page-hero",
  divider = true,
}: PageHeroProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`pt-[clamp(2.75rem,1.75rem+3.5vw,5rem)] ${divider ? "pb-[clamp(2.25rem,1.5rem+2.5vw,3.75rem)]" : "pb-section"}`}
    >
      <Container>
        <SectionTitle variant="page">{eyebrow}</SectionTitle>
        <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] md:grid md:grid-cols-12 md:gap-8">
          <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
            <h1 id={`${id}-title`} className="text-h1 max-w-[18ch] text-balance">
              {title}
            </h1>
            {lead ? <p className="text-lead mt-5 max-w-[60ch] text-muted">{lead}</p> : null}
            {children}
          </div>
        </div>
        {divider ? <div className="hairline mt-[clamp(2.25rem,1.5rem+2.5vw,3.75rem)]" /> : null}
      </Container>
    </section>
  );
}
