import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { whoWeAre } from "@/lib/content/about";

/** First section after the page hero: PageHero already supplies the top spacing, so only bottom padding here. */
export default function WhoWeAre() {
  return (
    <section
      id="who-we-are"
      className="pb-[clamp(3.5rem,2rem+6vw,7.5rem)] scroll-mt-4"
      aria-labelledby="who-we-are-title"
    >
      <Container>
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          <Reveal className="min-w-0 md:col-span-4 lg:col-span-3">
            <h2 id="who-we-are-title" className="eyebrow flex items-baseline gap-3 text-accent">
              <span className="tabular-nums" aria-hidden="true">
                01
              </span>
              <span>Who we are</span>
            </h2>
          </Reveal>

          <Reveal delay={100} className="min-w-0 md:col-span-8 lg:col-span-9">
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
