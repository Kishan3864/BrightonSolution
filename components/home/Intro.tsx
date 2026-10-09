import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { intro } from "@/lib/content/home-a";

export default function Intro() {
  return (
    <section id="intro" className="scroll-mt-4" aria-labelledby="intro-title">
      <Container>
        <div className="hairline" />
        <div className="grid gap-5 py-[clamp(2.75rem,1.5rem+4vw,5.5rem)] md:grid-cols-12 md:gap-8">
          <Reveal className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow pt-[0.45em] text-accent">{intro.eyebrow}</p>
          </Reveal>
          <Reveal delay={100} className="min-w-0 md:col-span-8 lg:col-span-9">
            <h2 id="intro-title" className="text-h2 max-w-[30ch] text-balance">
              {intro.statement}
            </h2>
          </Reveal>
        </div>
        <div className="hairline" />
      </Container>
    </section>
  );
}
