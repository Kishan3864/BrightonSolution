import Link from "next/link";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import Track from "@/components/home/Track";
import { services } from "@/lib/site";
import { servicesSection as copy } from "@/lib/content/home-a";
import { bodyGap } from "@/lib/content/home-b";

/**
 * Index of the seven services, led by their icon tiles. Each row is one link to
 * its section on /services; on hover or keyboard focus the row lights up on a
 * raised surface, the tile warms and the arrow slides.
 */
export default function Services() {
  return (
    <section id="services" className="pb-section scroll-mt-4" aria-labelledby="services-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="services-title"
            number={copy.number}
            eyebrow={copy.eyebrow}
            title={copy.title}
            lead={copy.lead}
          />
        </Reveal>

        {/* One hairline above the group; rows are separated by space and light up on a raised
            surface on hover or focus. The icon tile leads each row. */}
        <ol role="list" className={`${bodyGap} grid gap-1 border-t border-line pt-4 md:gap-2 md:pt-6`}>
          {services.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={i * 50}>
              <Link
                href={`/services#${service.slug}`}
                aria-labelledby={`home-service-${service.slug}`}
                className="group grid min-h-[44px] grid-cols-[3rem_minmax(0,1fr)_2.75rem] items-center gap-x-4 gap-y-1.5 rounded-[var(--radius-card)] px-3 py-4 transition-colors duration-200 hover:bg-surface focus-visible:bg-surface md:grid-cols-[3.5rem_minmax(0,1fr)_2.75rem] md:gap-x-6 md:px-5 md:py-5 lg:grid-cols-[3.5rem_minmax(0,0.85fr)_minmax(0,1.35fr)_2.75rem] lg:gap-x-8"
              >
                {/* Icon tile: decorative, the title names the service. */}
                <span
                  aria-hidden="true"
                  className="col-start-1 row-[1/3] grid size-12 place-items-center self-start rounded-sharp border border-line-strong bg-surface-2 text-accent transition-[border-color,background-color] duration-200 group-hover:border-accent/60 group-hover:bg-accent/10 group-focus-visible:border-accent/60 group-focus-visible:bg-accent/10 md:size-14 md:self-center lg:row-[1/2]"
                >
                  <Icon name={service.icon} size={24} />
                </span>

                <h3
                  id={`home-service-${service.slug}`}
                  className="text-h3 col-start-2 row-start-1 min-w-0 self-center md:self-end lg:self-center"
                >
                  {service.title}
                </h3>

                <p className="col-[2/4] row-start-2 min-w-0 max-w-[60ch] text-[0.9375rem] leading-relaxed text-muted md:col-[2/3] md:self-start lg:col-[3/4] lg:row-start-1 lg:self-center">
                  {service.summary}
                </p>

                <span
                  aria-hidden="true"
                  className="col-start-3 row-start-1 grid size-11 place-items-center justify-self-end rounded-sharp border border-line text-fg transition-colors duration-200 group-hover:border-accent group-hover:bg-accent group-hover:text-canvas group-focus-visible:border-accent group-focus-visible:bg-accent group-focus-visible:text-canvas md:row-[1/3] lg:col-start-4 lg:row-[1/2]"
                >
                  <Icon
                    name="arrow"
                    size={18}
                    className="transition-transform duration-200 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120} className="mt-8 md:grid md:grid-cols-12 md:gap-8">
          <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
            <Track label={copy.more.track}>
              <Button href={copy.more.href} variant="ghost">
                {copy.more.label}
              </Button>
            </Track>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
