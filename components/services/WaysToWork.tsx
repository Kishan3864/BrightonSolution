import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import TrackCta from "@/components/services/TrackCta";
import { engagementModels } from "@/lib/site";
import { waysToWork } from "@/lib/content/services";

/**
 * The four engagement models as comparison cards on the raised surface.
 * From 640px each card is a 5-row subgrid (number, title, summary, best for,
 * billing), so the same rows line up across cards in a row.
 *   < 640px   one column
 *   640px+    two columns
 *   1024px+   four columns
 */
export default function WaysToWork() {
  return (
    <section
      id="engagement-models"
      className="section-alt py-section scroll-mt-4"
      aria-labelledby="engagement-models-title"
    >
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={waysToWork.eyebrow}
            title={waysToWork.title}
            lead={waysToWork.lead}
            id="engagement-models-title"
          />
        </Reveal>

        <ul className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] grid gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-0 lg:grid-cols-4 lg:gap-x-4">
          {engagementModels.map((model, index) => (
            <Reveal
              key={model.title}
              as="li"
              delay={index * 70}
              className="flex min-w-0 sm:row-span-5 sm:mb-3 sm:grid sm:grid-rows-subgrid lg:mb-0"
            >
              <article className="flex w-full flex-col rounded-[var(--radius-card)] border border-line bg-surface-2 p-6 transition-[border-color,translate] duration-200 hover:border-line-strong motion-safe:hover:-translate-y-0.5 sm:row-span-5 sm:grid sm:grid-rows-subgrid sm:gap-0 lg:p-7">
                <p className="eyebrow tabular-nums text-accent" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="text-h3 mt-4 text-balance">{model.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">{model.summary}</p>
                <dl className="mt-7 border-t border-line pt-4 text-[0.875rem] leading-relaxed">
                  <dt className="eyebrow text-muted">{waysToWork.bestForLabel}</dt>
                  <dd className="mt-1.5 text-fg">{model.bestFor}</dd>
                </dl>
                <dl className="mt-4 border-t border-line pt-4 text-[0.875rem] leading-relaxed">
                  <dt className="eyebrow text-muted">{waysToWork.billingLabel}</dt>
                  <dd className="mt-1.5 font-medium text-fg">{model.billing}</dd>
                </dl>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal
          delay={120}
          className="mt-4 flex flex-col gap-5 rounded-[var(--radius-card)] border border-line p-6 sm:mt-1 md:flex-row md:items-center md:justify-between md:gap-8 lg:mt-4 lg:px-7"
        >
          <p className="max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted">{waysToWork.note}</p>
          <div className="shrink-0">
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
