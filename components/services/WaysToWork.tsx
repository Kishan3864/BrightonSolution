import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { engagementModels } from "@/lib/site";
import { waysToWork } from "@/lib/content/services";

export default function WaysToWork() {
  return (
    <section
      id="engagement-models"
      className="section-dark py-section scroll-mt-24"
      aria-labelledby="engagement-models-title"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={waysToWork.eyebrow}
            title={waysToWork.title}
            lead={waysToWork.lead}
            dark
            id="engagement-models-title"
          />
        </Reveal>

        <div className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid border-t border-line-dark sm:grid-cols-2">
          {engagementModels.map((model, index) => (
            <Reveal
              key={model.title}
              as="article"
              delay={index * 80}
              className="min-w-0 border-b border-line-dark py-8 sm:odd:pr-8 sm:even:border-l sm:even:pl-8 lg:py-10"
            >
              <h3 className="text-h3 tracking-tight">{model.title}</h3>
              <p className="mt-3 max-w-[44ch] leading-relaxed text-muted-dark">{model.summary}</p>
              <dl className="mt-7 grid gap-5">
                <div>
                  <dt className="eyebrow text-accent-soft">{waysToWork.bestForLabel}</dt>
                  <dd className="mt-2 max-w-[44ch] leading-relaxed text-paper">{model.bestFor}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-accent-soft">{waysToWork.billingLabel}</dt>
                  <dd className="mt-2 max-w-[44ch] leading-relaxed text-paper">{model.billing}</dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-10 grid gap-6 md:grid-cols-12 md:items-center md:gap-8">
          <p className="max-w-[46ch] leading-relaxed text-muted-dark md:col-span-7">{waysToWork.note}</p>
          <div className="md:col-span-5 md:flex md:justify-end">
            <Button href="/contact" variant="light">
              {waysToWork.cta}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
