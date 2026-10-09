import Link from "next/link";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import { services } from "@/lib/site";
import { servicesSection as copy } from "@/lib/content/home-a";

export default function Services() {
  return (
    <section id="services" className="py-section scroll-mt-24" aria-labelledby="services-title">
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

        <ol role="list" className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] border-b border-line">
          {services.map((service, i) => (
            <Reveal as="li" key={service.slug} delay={i * 60} className="border-t border-line">
              <Link
                href={`/services#${service.slug}`}
                aria-labelledby={`home-service-${service.slug}`}
                className="group grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-4 rounded-sharp py-7 md:grid-cols-12 md:gap-x-8 md:py-9"
              >
                <div className="col-start-1 row-start-1 flex min-w-0 gap-4 sm:gap-5 md:col-span-4">
                  <span className="eyebrow w-8 shrink-0 pt-[0.4em] tabular-nums text-accent">{service.number}</span>
                  <h3
                    id={`home-service-${service.slug}`}
                    className="text-h3 min-w-0 tracking-tight transition-colors duration-200 group-hover:text-accent"
                  >
                    {service.title}
                  </h3>
                </div>

                <div className="col-span-2 row-start-2 min-w-0 md:col-span-7 md:col-start-5 md:row-start-1">
                  <p className="max-w-[56ch] text-[1.0625rem] leading-relaxed">{service.summary}</p>
                  <ul
                    role="list"
                    className="mt-4 grid gap-x-8 gap-y-1.5 text-[0.875rem] leading-relaxed text-muted sm:grid-cols-2 lg:gap-x-12"
                  >
                    {service.deliverables.map((item) => (
                      <li key={item} className="flex min-w-0 gap-3">
                        <span aria-hidden="true" className="mt-[0.72em] h-px w-3 shrink-0 bg-line" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="col-start-2 row-start-1 flex justify-end md:col-span-1 md:col-start-12">
                  <Icon
                    name="arrow"
                    className="mt-1 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </div>
              </Link>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={120} className="mt-10 md:grid md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7 md:col-start-5">
            <Button href={copy.more.href} variant="ghost">
              {copy.more.label}
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
