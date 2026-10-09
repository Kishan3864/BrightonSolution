import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { technologies } from "@/lib/site";
import { technologiesCopy, bodyGap } from "@/lib/content/home-b";

export default function Technologies() {
  return (
    <section id="technologies" className="border-t border-line py-section scroll-mt-24" aria-labelledby="technologies-title">
      <Container>
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
              <div
                key={group.name}
                className="grid gap-3 border-t border-line py-6 md:grid-cols-12 md:gap-8 md:py-7"
              >
                <dt className="eyebrow pt-1.5 text-ink md:col-span-4 lg:col-span-3">{group.name}</dt>
                <dd className="min-w-0 md:col-span-8 lg:col-span-9">
                  <ul className="flex flex-wrap gap-2" aria-label={`${group.name} tools`}>
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="inline-flex items-center rounded-sharp border border-line px-2.5 py-1 text-sm leading-6 tracking-tight text-ink"
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

        <Reveal delay={120} className="mt-10 grid gap-6 md:grid-cols-12 md:gap-8">
          <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted md:col-span-8 md:col-start-5 lg:col-span-6 lg:col-start-4">
            {technologiesCopy.note}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
