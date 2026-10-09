import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { howWeHelpSection as copy, howWeHelpItems } from "@/lib/content/home-a";
import { bodyGap, dividedSection, pad } from "@/lib/content/home-b";

/** Typographic list of the six kinds of work: a verb and one line each. */
export default function HowWeHelp() {
  return (
    <section id="how-we-help" className="scroll-mt-4" aria-labelledby="how-we-help-title">
      <Container>
        <div className={dividedSection}>
          <Reveal>
            <SectionHeading
              id="how-we-help-title"
              number={copy.number}
              eyebrow={copy.eyebrow}
              title={copy.title}
              lead={copy.lead}
            />
          </Reveal>

          <ul
            role="list"
            className={`${bodyGap} grid border-b border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3 lg:gap-x-14`}
          >
            {howWeHelpItems.map((item, i) => (
              <Reveal
                as="li"
                key={item.title}
                delay={i * 50}
                className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-line py-6"
              >
                <span className="eyebrow tabular-nums text-accent" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-h3">{item.title}</h3>
                  <p className="mt-1.5 max-w-[40ch] text-sm leading-relaxed text-muted">{item.line}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
