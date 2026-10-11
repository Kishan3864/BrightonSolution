import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import { intro } from "@/lib/content/home-a";

export default function Intro() {
  return (
    <section id="intro" className="scroll-mt-4" aria-labelledby="intro-title">
      <Container>
        <div className="pb-section">
          <Reveal>
            <SectionTitle>{intro.eyebrow}</SectionTitle>
          </Reveal>
          <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] md:grid md:grid-cols-12 md:gap-8">
            <Reveal delay={100} className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              <h2 id="intro-title" className="text-h2 max-w-[30ch] text-balance">
                {intro.statement}
              </h2>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
