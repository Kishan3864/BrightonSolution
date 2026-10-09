import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import TrackCta from "@/components/services/TrackCta";
import { engagementModels } from "@/lib/site";
import { waysToWork } from "@/lib/content/services";

export default function WaysToWork() {
  return (
    <section
      id="engagement-models"
      className="section-dark py-section scroll-mt-4"
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

        <div className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] grid border-t border-line-dark sm:grid-cols-2 lg:grid-cols-4">
          {engagementModels.map((model, index) => (
            <Reveal
              key={model.title}
              as="article"
              delay={index * 70}
              className="min-w-0 border-b border-line-dark py-7 sm:odd:pr-6 sm:even:border-l sm:even:pl-6 lg:border-l lg:px-6 lg:py-8 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
            >
              <p className="eyebrow tabular-nums text-accent-soft" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="text-h3 mt-3">{model.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-dark">{model.summary}</p>
              <dl className="mt-6 grid gap-4 text-[0.875rem] leading-relaxed">
                <div>
                  <dt className="eyebrow text-accent-soft">{waysToWork.bestForLabel}</dt>
                  <dd className="mt-1.5 text-paper">{model.bestFor}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-accent-soft">{waysToWork.billingLabel}</dt>
                  <dd className="mt-1.5 text-paper">{model.billing}</dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120} className="mt-8 grid gap-5 md:grid-cols-12 md:items-center md:gap-8">
          <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted-dark md:col-span-7">{waysToWork.note}</p>
          <div className="md:col-span-5 md:flex md:justify-end">
            <TrackCta label="services_engagement_models">
              <Button href="/contact" variant="light">
                {waysToWork.cta}
              </Button>
            </TrackCta>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
