import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import { services } from "@/lib/site";
import { serviceIndex, serviceIndexLabels } from "@/lib/content/services";

/**
 * Jump navigation to the seven services: a grid of 12px tiles, each with the
 * service icon, its number and a short label.
 *   < 768px  two columns, the seventh tile spans both
 *   768px+   four columns, the seventh tile spans two (4 + 4 cells, no gap)
 *   1280px+  one row of seven
 */
export default function ServiceIndex() {
  return (
    <section
      id="services-index"
      className="pb-section scroll-mt-4"
      aria-labelledby="services-index-title"
    >
      <Container>
        <Reveal>
          <h2 id="services-index-title" className="eyebrow text-muted">
            {serviceIndex.eyebrow}
          </h2>
          <nav aria-label={serviceIndex.ariaLabel} className="mt-5">
            <ol className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3 xl:grid-cols-7">
              {services.map((service) => (
                <li
                  key={service.slug}
                  className="min-w-0 last:col-span-2 md:last:col-span-2 xl:last:col-span-1"
                >
                  <a
                    href={`#${service.slug}`}
                    className="group flex h-full min-h-[5.75rem] flex-col justify-between gap-4 rounded-sharp border border-line bg-surface p-3.5 sm:min-h-[6.5rem] sm:gap-5 sm:p-4 text-fg transition-[border-color,background-color,translate] duration-200 hover:border-line-strong hover:bg-surface-2 motion-safe:hover:-translate-y-0.5 xl:min-h-[7.5rem]"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span
                        className="grid size-10 place-items-center rounded-sharp border border-line bg-canvas text-accent transition-colors duration-200 group-hover:border-accent/40"
                        aria-hidden="true"
                      >
                        <Icon name={service.icon} size={20} />
                      </span>
                      <span className="eyebrow text-muted tabular-nums" aria-hidden="true">
                        {service.number}
                      </span>
                    </span>
                    <span className="flex items-end justify-between gap-2">
                      <span className="min-w-0 text-[0.9375rem] font-medium leading-snug tracking-[-0.01em]">
                        {serviceIndexLabels[service.slug] ?? service.title}
                      </span>
                      <Icon
                        name="arrow"
                        size={14}
                        className="mb-1 rotate-90 text-muted transition-[translate,color] duration-200 group-hover:text-accent motion-safe:group-hover:translate-y-0.5"
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
