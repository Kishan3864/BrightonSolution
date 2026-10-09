import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import { services } from "@/lib/site";
import { serviceIndex, serviceIndexLabels } from "@/lib/content/services";

export default function ServiceIndex() {
  return (
    <section
      id="services-index"
      className="pb-[clamp(2rem,1rem+3vw,4rem)] scroll-mt-24"
      aria-labelledby="services-index-title"
    >
      <Container>
        <Reveal>
          <h2 id="services-index-title" className="eyebrow text-muted">
            {serviceIndex.eyebrow}
          </h2>
          <nav aria-label={serviceIndex.ariaLabel} className="mt-4">
            <ol className="grid grid-cols-2 gap-x-6 border-b border-line md:grid-cols-4 xl:grid-cols-7">
              {services.map((service) => (
                <li
                  key={service.slug}
                  className="min-w-0 border-t border-line last:col-span-2 xl:last:col-span-1"
                >
                  <a
                    href={`#${service.slug}`}
                    className="group flex min-h-[44px] flex-col justify-between gap-5 py-4 text-ink xl:min-h-[6.5rem]"
                  >
                    <span className="eyebrow text-accent tabular-nums" aria-hidden="true">
                      {service.number}
                    </span>
                    <span className="flex items-end justify-between gap-3">
                      <span className="text-[0.9375rem] font-medium leading-snug tracking-tight decoration-1 underline-offset-4 group-hover:underline">
                        {serviceIndexLabels[service.slug] ?? service.title}
                      </span>
                      <Icon
                        name="arrow"
                        size={16}
                        className="mb-0.5 rotate-90 text-muted transition-transform duration-200 group-hover:translate-y-0.5"
                      />
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Reveal>
      </Container>
    </section>
  );
}
