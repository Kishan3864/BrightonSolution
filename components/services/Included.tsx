import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { includedPractices, includedSection } from "@/lib/content/services";

/**
 * Standard practice as a clean list: each item hangs from its own rule.
 *   < 768px   one column
 *   768px+    two columns
 *   1024px+   three columns (2 rows of 3)
 */
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

        <ol className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] grid gap-x-10 gap-y-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-y-14">
          {includedPractices.map((practice, index) => (
            <Reveal
              key={practice.title}
              as="li"
              delay={(index % 3) * 60}
              className="min-w-0 border-t border-line-strong pt-5"
            >
              <span className="eyebrow tabular-nums text-accent" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-[1.125rem] font-medium leading-snug tracking-[-0.015em] text-balance">
                {practice.title}
              </h3>
              <p className="mt-2.5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">{practice.description}</p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
