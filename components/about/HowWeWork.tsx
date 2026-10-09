import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { howWeWorkIntro } from "@/lib/content/about";
import { process } from "@/lib/site";

const rowGrid =
  "grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3.25rem_minmax(0,10rem)_minmax(0,1fr)] sm:gap-x-6 lg:grid-cols-[3.25rem_minmax(0,12rem)_minmax(0,1fr)]";

export default function HowWeWork() {
  return (
    <section id="how-we-work" className="py-section scroll-mt-24" aria-labelledby="how-we-work-title">
      <Container>
        <SectionHeading
          number="05"
          eyebrow="How we work"
          title={howWeWorkIntro.title}
          lead={howWeWorkIntro.lead}
          id="how-we-work-title"
        />

        <div className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid gap-x-8 gap-y-10 md:grid-cols-12">
          <Reveal className="min-w-0 md:col-span-4 lg:col-span-3">
            <p className="max-w-[30ch] text-[0.9375rem] leading-relaxed text-muted">{howWeWorkIntro.aside}</p>
            <div className="mt-6">
              <Button href="/services" variant="outline">
                See what we build
              </Button>
            </div>
          </Reveal>

          <div className="min-w-0 md:col-span-8 lg:col-span-8 lg:col-start-5">
            <div className={`${rowGrid} hidden pb-3 sm:grid`}>
              <span aria-hidden="true" />
              <span className="eyebrow text-muted">Step</span>
              <span className="eyebrow text-muted">What you receive</span>
            </div>
            <ol className="list-none border-b border-line">
              {process.map((step, i) => (
                <Reveal
                  as="li"
                  key={step.number}
                  delay={i * 50}
                  className={`${rowGrid} border-t border-line py-5`}
                >
                  <span className="eyebrow pt-1 tabular-nums text-accent">{step.number}</span>
                  <h3 className="text-[1.0625rem] font-semibold tracking-tight">{step.title}</h3>
                  <p className="col-start-2 mt-1 text-[0.9375rem] leading-relaxed text-muted sm:col-start-3 sm:mt-0.5">
                    {step.output}
                  </p>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Container>
    </section>
  );
}
