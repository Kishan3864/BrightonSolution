import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { intro } from "@/lib/content/home-a";

export default function Intro() {
  return (
    <section id="intro" className="scroll-mt-24" aria-labelledby="intro-title">
      <Container>
        <div className="hairline" />
        <div className="grid gap-6 py-[clamp(3.5rem,2rem+5vw,7rem)] md:grid-cols-12 md:gap-8">
          <Reveal className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow text-accent">{intro.eyebrow}</p>
          </Reveal>
          <Reveal delay={100} className="min-w-0 md:col-span-8 lg:col-span-9">
            <h2 id="intro-title" className="text-h2 max-w-[28ch] text-balance tracking-tight">
              {intro.statement}
            </h2>
            <p className="text-lead mt-8 max-w-[58ch] text-muted">{intro.body}</p>
          </Reveal>
        </div>
        <div className="hairline" />
      </Container>
    </section>
  );
}
