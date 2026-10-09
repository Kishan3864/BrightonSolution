import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { technologies } from "@/lib/site";
import { technologiesCopy, bodyGap, dividedSection } from "@/lib/content/home-b";

export default function Technologies() {
  return (
    <section id="technologies" className="scroll-mt-4" aria-labelledby="technologies-title">
      <Container>
        <div className={dividedSection}>
          <Reveal>
            <SectionHeading
              id="technologies-title"
              number={technologiesCopy.number}
              eyebrow={technologiesCopy.eyebrow}
              title={technologiesCopy.title}
              lead={technologiesCopy.lead}
            />
          </Reveal>

          <Reveal delay={80} className={bodyGap}>
            <dl className="border-b border-line">
              {technologies.map((group) => (
                <div key={group.name} className="grid gap-3 border-t border-line py-5 md:grid-cols-12 md:gap-8">
                  <dt className="eyebrow pt-1.5 text-ink md:col-span-4 lg:col-span-3">{group.name}</dt>
                  <dd className="min-w-0 md:col-span-8 lg:col-span-9">
                    <ul className="flex flex-wrap gap-1.5" aria-label={`${group.name} tools`}>
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="inline-flex items-center rounded-sharp border border-line px-2 py-0.5 text-[0.8125rem] leading-6 text-ink"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
