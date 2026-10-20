import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Track from "@/components/home/Track";
import { engagementModels } from "@/lib/site";
import { engagementCopy as copy, bodyGap, sectionSpace, pad } from "@/lib/content/home-b";

/** Four comparison cards; the full comparison lives on /services. */
export default function Engagement() {
  return (
    <section id="engagement" className="scroll-mt-4" aria-labelledby="engagement-title">
      <Container>
        <div className={sectionSpace}>
          <Reveal>
            <SectionHeading
              id="engagement-title"
              number={copy.number}
              eyebrow={copy.eyebrow}
              title={copy.title}
              lead={copy.lead}
            />
          </Reveal>

          <ol role="list" className={`${bodyGap} grid gap-x-3 gap-y-3 sm:grid-cols-2 md:gap-x-4 md:gap-y-4 xl:grid-cols-4`}>
            {engagementModels.map((model, i) => (
              <Reveal as="li" key={model.title} delay={i * 60} className="row-span-5 grid min-w-0 grid-rows-subgrid gap-y-0">
                <article className="row-span-5 grid grid-rows-subgrid gap-y-0 rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-7">
                  <span className="eyebrow tabular-nums text-muted" aria-hidden="true">
                    {pad(i + 1)}
                  </span>
                  <h3 className="mt-6 font-display text-[clamp(1.375rem,1.2rem+0.7vw,1.75rem)] leading-[1.1] font-medium tracking-[-0.03em] text-balance">
                    {model.title}
                  </h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{model.summary}</p>
                  <dl className="row-span-2 grid grid-rows-subgrid gap-y-4 pt-8 text-[0.9375rem] leading-relaxed">
                    <div className="border-t border-line pt-4">
                      <dt className="eyebrow text-muted">Best for</dt>
                      <dd className="mt-1.5">{model.bestFor}</dd>
                    </div>
                    <div className="border-t border-line pt-4">
                      <dt className="eyebrow text-muted">Billing</dt>
                      <dd className="mt-1.5 font-medium">{model.billing}</dd>
                    </div>
                  </dl>
                </article>
              </Reveal>
            ))}
          </ol>

          {/* Same rule as every "more" link on the page: the heading column. */}
          <Reveal delay={120} className="mt-8 md:grid md:grid-cols-12 md:gap-8">
            <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              <Track label={copy.more.track}>
                <Button href={copy.more.href} variant="ghost">
                  {copy.more.label}
                </Button>
              </Track>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
