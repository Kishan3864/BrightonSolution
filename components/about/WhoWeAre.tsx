import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import { whoWeAre } from "@/lib/content/about";

/** First section after the page hero: PageHero supplies the space above, so only bottom padding here.
 *  A large typographic statement, with the supporting paragraph set off to the right underneath. */
export default function WhoWeAre() {
  return (
    <section id="who-we-are" className="pb-section scroll-mt-4" aria-labelledby="who-we-are-title">
      <Container>
        <Reveal>
          <SectionTitle as="h2" id="who-we-are-title" number="01">
            Who we are
          </SectionTitle>
        </Reveal>

        <div className="mt-[clamp(2rem,1.25rem+2.5vw,3.75rem)] md:grid md:grid-cols-12 md:gap-8">
          <Reveal delay={80} className="min-w-0 md:col-span-11 xl:col-span-10">
            <p className="max-w-[30ch] text-balance font-display text-[clamp(1.5rem,1.05rem+2vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.035em]">
              {whoWeAre.statement}
            </p>
          </Reveal>
          <Reveal
            delay={160}
            className="mt-8 min-w-0 md:col-span-7 md:col-start-6 md:mt-10 lg:col-span-6 lg:col-start-7 xl:col-span-5 xl:col-start-7"
          >
            <div className="space-y-5 border-t border-line-strong pt-6">
              {whoWeAre.paragraphs.map((text) => (
                <p key={text.slice(0, 24)} className="max-w-[58ch] text-[1.0625rem] leading-relaxed text-muted">
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
