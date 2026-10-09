import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { industriesCopy, homeIndustries, bodyGap, dividedSection, pad } from "@/lib/content/home-b";

export default function Industries() {
  return (
    <section id="industries" className="scroll-mt-4" aria-labelledby="industries-title">
      <Container>
        <div className={dividedSection}>
          <Reveal>
            <SectionHeading
              id="industries-title"
              number={industriesCopy.number}
              eyebrow={industriesCopy.eyebrow}
              title={industriesCopy.title}
              lead={industriesCopy.lead}
            />
          </Reveal>

          <Reveal
            as="ul"
            delay={80}
            className={`${bodyGap} grid border-b border-line md:grid-cols-2 md:gap-x-12 lg:gap-x-16`}
          >
            {homeIndustries.map((industry, i) => (
              <li
                key={industry.name}
                className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-line py-5"
              >
                <span className="eyebrow tabular-nums text-accent">{pad(i + 1)}</span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium tracking-[-0.01em] break-words">{industry.name}</h3>
                  <p className="mt-1 max-w-[48ch] text-sm leading-relaxed text-muted">{industry.line}</p>
                </div>
              </li>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
