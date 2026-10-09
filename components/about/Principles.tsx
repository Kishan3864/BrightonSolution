import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { principles, principlesIntro } from "@/lib/content/about";

export default function Principles() {
  return (
    <section
      id="principles"
      className="border-t border-line py-section scroll-mt-24"
      aria-labelledby="principles-title"
    >
      <Container>
        <SectionHeading
          number="02"
          eyebrow="What we believe"
          title={principlesIntro.title}
          lead={principlesIntro.lead}
          id="principles-title"
        />

        <ol className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] list-none border-b border-line">
          {principles.map((principle, i) => (
            <Reveal
              as="li"
              key={principle.number}
              delay={i * 60}
              className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-t border-line py-[clamp(1.5rem,1rem+1.5vw,2.5rem)] md:grid-cols-12 md:gap-8"
            >
              <p className="text-h3 col-start-1 tabular-nums text-accent md:col-span-1 lg:col-span-3">
                {principle.number}
              </p>
              <h3 className="text-h3 col-start-2 max-w-[18ch] text-balance tracking-tight md:col-span-4 md:col-start-auto lg:col-span-4">
                {principle.title}
              </h3>
              <p className="col-start-2 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted md:col-span-7 md:col-start-auto lg:col-span-5">
                {principle.description}
              </p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
