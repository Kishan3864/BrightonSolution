import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { principles, principlesIntro } from "@/lib/content/about";

export default function Principles() {
  return (
    <section
      id="principles"
      className="border-t border-line py-section scroll-mt-4"
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

        <ol className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] list-none border-b border-line">
          {principles.map((principle, i) => (
            <Reveal
              as="li"
              key={principle.number}
              delay={i * 50}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-line py-[clamp(1.25rem,1rem+0.8vw,1.875rem)] md:grid-cols-12 md:gap-x-8"
            >
              <span
                className="eyebrow col-start-1 pt-[0.45em] tabular-nums text-accent md:col-span-3"
                aria-hidden="true"
              >
                {principle.number}
              </span>
              <h3 className="text-h3 col-start-2 max-w-[22ch] text-balance md:col-span-4 md:col-start-auto">
                {principle.title}
              </h3>
              <p className="col-start-2 max-w-[54ch] leading-relaxed text-muted md:col-span-5 md:col-start-auto">
                {principle.description}
              </p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
