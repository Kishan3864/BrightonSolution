import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { includedPractices, includedSection } from "@/lib/content/services";

export default function Included() {
  return (
    <section id="included" className="py-section scroll-mt-24" aria-labelledby="included-title">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={includedSection.eyebrow}
            title={includedSection.title}
            lead={includedSection.lead}
            id="included-title"
          />
        </Reveal>

        <ul className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] border-t border-line">
          {includedPractices.map((practice, index) => (
            <Reveal
              key={practice.title}
              as="li"
              delay={index * 60}
              className="grid gap-3 border-b border-line py-6 md:grid-cols-12 md:gap-8 lg:py-7"
            >
              <h3 className="min-w-0 text-[clamp(1.125rem,1.05rem+0.4vw,1.375rem)] font-semibold leading-snug tracking-tight text-balance md:col-span-5">
                {practice.title}
              </h3>
              <p className="min-w-0 max-w-[58ch] leading-relaxed text-muted md:col-span-7">
                {practice.description}
              </p>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
