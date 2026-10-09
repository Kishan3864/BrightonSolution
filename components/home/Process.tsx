import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { process } from "@/lib/site";
import { processCopy, bodyGap } from "@/lib/content/home-b";

export default function Process() {
  return (
    <section id="process" className="section-dark py-section scroll-mt-4" aria-labelledby="process-title">
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

        {/* Rows at every width. From lg the number sits in the heading's label
            column and the step text in its title column (3 + 9 of 12). */}
        <ol role="list" className={`${bodyGap} border-b border-line-dark`}>
          {process.map((step, i) => (
            <Reveal
              as="li"
              key={step.number}
              delay={i * 50}
              className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-t border-line-dark py-5 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-6 md:py-6 lg:grid-cols-12 lg:gap-x-8"
            >
              <span
                className="block font-mono text-[clamp(1.25rem,1rem+1vw,1.75rem)] leading-none font-normal tabular-nums text-accent-soft lg:col-span-3"
                aria-hidden="true"
              >
                {step.number}
              </span>
              <div className="min-w-0 lg:col-span-9 lg:grid lg:grid-cols-9 lg:gap-x-8">
                <div className="min-w-0 lg:col-span-6">
                  <h3 className="text-base font-medium tracking-[-0.01em] text-paper sm:text-[1.0625rem]">
                    <span className="sr-only">Step {step.number}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-paper/85">{step.description}</p>
                </div>
                <p className="mt-4 border-t border-line-dark pt-3 text-[0.8125rem] leading-relaxed text-muted-dark lg:col-span-3 lg:mt-0 lg:border-t-0 lg:pt-1">
                  <span className="eyebrow block text-accent-soft">{processCopy.outputLabel}</span>
                  <span className="mt-1 block">{step.output}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}
