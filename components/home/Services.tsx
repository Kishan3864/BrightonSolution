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

export default function Services() {
  return (
    <section id="services" className="py-section scroll-mt-4" aria-labelledby="services-title">
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

        <ol role="list" className={`${bodyGap} border-b border-line`}>
          {services.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={i * 50} className="border-t border-line">
              <Link
                href={`/services#${service.slug}`}
                aria-labelledby={`home-service-${service.slug}`}
                className="group grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-2 rounded-sharp py-5 md:grid-cols-12 md:gap-x-8 md:py-6"
              >
                <div className="col-start-1 row-start-1 flex min-w-0 items-baseline gap-4 md:col-span-4 lg:col-span-3 lg:gap-5">
                  <span className="eyebrow w-7 shrink-0 tabular-nums text-accent">{service.number}</span>
                  <h3
                    id={`home-service-${service.slug}`}
                    className="text-h3 min-w-0 transition-colors duration-200 group-hover:text-accent"
                  >
                    {service.title}
                  </h3>
                </div>

                <p className="col-span-2 row-start-2 min-w-0 max-w-[60ch] pl-11 text-[0.9375rem] leading-relaxed text-muted md:col-span-7 md:col-start-5 md:row-start-1 md:pl-0 lg:col-span-8 lg:col-start-4 lg:pl-0">
                  {service.summary}
                </p>

                <div className="col-start-2 row-start-1 flex justify-end self-center md:col-span-1 md:col-start-12">
                  <Icon
                    name="arrow"
                    size={18}
                    className="text-ink transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent motion-reduce:transition-none"
                  />
                </div>
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
