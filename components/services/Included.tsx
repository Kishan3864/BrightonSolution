import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { includedPractices, includedSection } from "@/lib/content/services";

export default function Included() {
  return (
    <section id="included" className="py-section scroll-mt-4" aria-labelledby="included-title">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={includedSection.eyebrow}
            title={includedSection.title}
            lead={includedSection.lead}
            id="included-title"
          />
        </Reveal>

        <ol className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] grid border-t border-line md:grid-cols-2 md:gap-x-12">
          {includedPractices.map((practice, index) => (
            <Reveal
              key={practice.title}
              as="li"
              delay={(index % 2) * 60}
              className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b border-line py-6"
            >
              <span className="eyebrow pt-[0.35em] tabular-nums text-accent" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <h3 className="text-[1.0625rem] font-medium leading-snug tracking-[-0.01em] text-balance">
                  {practice.title}
                </h3>
                <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">{practice.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
