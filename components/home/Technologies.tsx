import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { technologies } from "@/lib/site";
import { technologiesCopy, bodyGap, sectionSpace } from "@/lib/content/home-b";
import Marquee from "@/components/home/parts/Marquee";

const allTools = Array.from(new Set(technologies.flatMap((g) => g.items)));

export default function Technologies() {
  return (
    <section id="technologies" className="scroll-mt-4" aria-labelledby="technologies-title">
      <Container>
        <div>
          <Reveal>
            <SectionHeading
              id="technologies-title"
              number={technologiesCopy.number}
              eyebrow={technologiesCopy.eyebrow}
              title={technologiesCopy.title}
              lead={technologiesCopy.lead}
            />
          </Reveal>
        </div>
      </Container>

      {/* Full-bleed strip between the heading and the groups. */}
      <Reveal delay={60} className={`${bodyGap} border-y border-line bg-surface`}>
        <Marquee items={allTools} />
      </Reveal>

      <Container>
        <div className={sectionSpace}>
          <Reveal delay={80} className={bodyGap}>
            <dl className="grid gap-x-10 gap-y-9 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-12">
              {technologies.map((group) => (
                <div key={group.name} className="min-w-0 border-t border-line-strong pt-5">
                  <dt className="text-[1.0625rem] font-medium tracking-[-0.01em]">{group.name}</dt>
                  <dd className="mt-4 min-w-0">
                    <ul className="flex flex-wrap gap-2" aria-label={`${group.name} tools`}>
                      {group.items.map((item) => (
                        <li
                          key={item}
                          className="inline-flex min-h-9 items-center rounded-sharp border border-line bg-surface px-3 py-1 text-[0.875rem] leading-snug text-fg"
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
