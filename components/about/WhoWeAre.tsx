import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import { whoWeAre } from "@/lib/content/about";

/** First section after the page hero: PageHero supplies the space above, so only bottom padding here. */
export default function WhoWeAre() {
  return (
    <section
      id="who-we-are"
      className="pb-section scroll-mt-4"
      aria-labelledby="who-we-are-title"
    >
      <Container>
        <Reveal>
          <SectionTitle as="h2" id="who-we-are-title" number="01">
            Who we are
          </SectionTitle>
        </Reveal>

        <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] md:grid md:grid-cols-12 md:gap-8">
          <Reveal delay={100} className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
            <p className="max-w-[36ch] text-balance text-[clamp(1.25rem,1.05rem+0.9vw,1.75rem)] font-medium leading-[1.3] tracking-[-0.02em]">
              {whoWeAre.statement}
            </p>
            <div className="mt-7 space-y-5">
              {whoWeAre.paragraphs.map((text) => (
                <p key={text.slice(0, 24)} className="max-w-[62ch] leading-relaxed text-muted">
                  {text}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
