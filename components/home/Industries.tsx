import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { industries } from "@/lib/site";
import { industriesCopy, bodyGap, pad } from "@/lib/content/home-b";

export default function Industries() {
  return (
    <section id="industries" className="border-t border-line py-section scroll-mt-24" aria-labelledby="industries-title">
      <Container>
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
          className={`${bodyGap} grid border-b border-line md:grid-cols-2 md:gap-x-12 lg:gap-x-20`}
        >
          {industries.map((industry, i) => (
            <li
              key={industry.name}
              className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-t border-line py-6 md:py-7"
            >
              <span className="eyebrow pt-1 tabular-nums text-accent">{pad(i + 1)}</span>
              <div className="min-w-0">
                <p className="text-[1.0625rem] font-semibold tracking-tight break-words sm:text-lg">
                  {industry.name}
                </p>
                <p className="mt-1.5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">{industry.line}</p>
              </div>
            </li>
          ))}
        </Reveal>

        <Reveal delay={120} className="mt-10 grid gap-6 md:grid-cols-12 md:gap-8">
          <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted md:col-span-8 md:col-start-5 lg:col-span-6 lg:col-start-4">
            {industriesCopy.note}
          </p>
          <div className="md:col-span-8 md:col-start-5 lg:col-span-6 lg:col-start-4">
            <Button href={industriesCopy.noteLink.href} variant="ghost">
              {industriesCopy.noteLink.label}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
