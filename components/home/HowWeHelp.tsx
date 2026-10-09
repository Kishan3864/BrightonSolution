import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { howWeHelp } from "@/lib/site";
import { howWeHelpSection as copy } from "@/lib/content/home-a";

export default function HowWeHelp() {
  return (
    <section id="how-we-help" className="border-t border-line py-section scroll-mt-24" aria-labelledby="how-we-help-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="how-we-help-title"
            number={copy.number}
            eyebrow={copy.eyebrow}
            title={copy.title}
            lead={copy.lead}
          />
        </Reveal>

        {/* Cells sit on a 1px line-coloured background: the gaps between them are the grid lines. */}
        <ul
          role="list"
          className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid gap-px border-y border-line bg-line sm:grid-cols-2 lg:grid-cols-3"
        >
          {howWeHelp.map((item, i) => (
            <li
              key={item.title}
              className={`min-w-0 bg-paper py-8 sm:py-10 sm:pr-8 ${i % 2 === 0 ? "sm:pl-0" : "sm:pl-8"} ${
                i % 3 === 0 ? "lg:pl-0" : "lg:pl-8"
              }`}
            >
              <Reveal delay={i * 60}>
                <div className="flex items-center justify-between">
                  <Icon name={item.icon} className="text-ink" />
                  <span className="eyebrow tabular-nums text-muted">0{i + 1}</span>
                </div>
                <h3 className="text-h3 mt-8 tracking-tight">{item.title}</h3>
                <p className="mt-3 max-w-[40ch] text-[1.0625rem] leading-relaxed text-muted">{item.description}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
