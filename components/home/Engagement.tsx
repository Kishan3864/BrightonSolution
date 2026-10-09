import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Track from "@/components/home/Track";
import { engagementModels } from "@/lib/site";
import { engagementCopy as copy, bodyGap, dividedSection, pad } from "@/lib/content/home-b";

/** Compact overview of the four engagement models; the full comparison lives on /services. */
export default function Engagement() {
  return (
    <section id="engagement" className="scroll-mt-4" aria-labelledby="engagement-title">
      <Container>
        <div className={dividedSection}>
          <Reveal>
            <SectionHeading
              id="engagement-title"
              number={copy.number}
              eyebrow={copy.eyebrow}
              title={copy.title}
              lead={copy.lead}
            />
          </Reveal>

          <ol role="list" className={`${bodyGap} grid border-b border-line sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-4 lg:gap-x-0`}>
            {engagementModels.map((model, i) => (
              <Reveal
                as="li"
                key={model.title}
                delay={i * 60}
                className="flex min-w-0 flex-col border-t border-line py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0 lg:[&:not(:first-child)]:border-l"
              >
                <span className="eyebrow tabular-nums text-accent" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <h3 className="mt-3 text-h3">{model.title}</h3>
                <dl className="mt-4 grid gap-4 text-sm leading-relaxed">
                  <div>
                    <dt className="eyebrow text-muted">Best for</dt>
                    <dd className="mt-1.5">{model.bestFor}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-muted">Billing</dt>
                    <dd className="mt-1.5">{model.billing}</dd>
                  </div>
                </dl>
              </Reveal>
            ))}
          </ol>

          <Reveal delay={120} className="mt-8">
            <Track label={copy.more.track}>
              <Button href={copy.more.href} variant="ghost">
                {copy.more.label}
              </Button>
            </Track>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
