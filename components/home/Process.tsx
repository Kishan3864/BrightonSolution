import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { process } from "@/lib/site";
import { processCopy, bodyGap } from "@/lib/content/home-b";

export default function Process() {
  return (
    <section id="process" className="section-dark py-section scroll-mt-24" aria-labelledby="process-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="process-title"
            number={processCopy.number}
            eyebrow={processCopy.eyebrow}
            title={processCopy.title}
            lead={processCopy.lead}
            dark
          />
        </Reveal>

        <ol className={`${bodyGap} border-b border-line-dark xl:grid xl:grid-cols-7 xl:grid-rows-[auto_auto_1fr_auto] xl:border-t xl:border-b-0`}>
          {process.map((step, i) => (
            <Reveal
              as="li"
              key={step.number}
              delay={i * 60}
              className="grid min-w-0 grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 border-t border-line-dark py-6 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6 md:py-8 xl:row-span-4 xl:grid-cols-1 xl:grid-rows-subgrid xl:gap-x-0 xl:border-t-0 xl:border-l xl:px-5 xl:pt-8 xl:pb-2 xl:first:border-l-0 xl:first:pl-0 xl:last:pr-0"
            >
              <span
                className="block text-[clamp(1.75rem,1.2rem+2vw,3rem)] leading-none font-semibold tracking-tight tabular-nums text-accent-soft"
                aria-hidden="true"
              >
                {step.number}
              </span>
              <div className="min-w-0 xl:contents">
                <h3 className="text-[1.125rem] font-semibold tracking-tight text-paper sm:text-xl xl:mt-8 xl:text-lg">
                  <span className="sr-only">Step {step.number}: </span>
                  {step.title}
                </h3>
                <p className="mt-2.5 max-w-[56ch] text-[0.9375rem] leading-relaxed text-paper/90 xl:pb-5 xl:text-sm">
                  {step.description}
                </p>
                <p className="mt-5 border-t border-line-dark pt-4 text-sm leading-relaxed xl:mt-0 text-muted-dark">
                  <span className="eyebrow block text-accent-soft">{processCopy.outputLabel}</span>
                  <span className="mt-1.5 block">{step.output}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120} className="mt-10 grid gap-6 md:grid-cols-12 md:gap-8">
          <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted-dark md:col-span-8 md:col-start-5 lg:col-span-6 lg:col-start-4">
            {processCopy.note}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
