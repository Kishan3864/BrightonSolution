import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import type { Service } from "@/lib/site";
import { serviceFirstSteps, serviceLabels } from "@/lib/content/services";

type ServiceSectionProps = {
  service: Service;
};

export default function ServiceSection({ service }: ServiceSectionProps) {
  const titleId = `${service.slug}-title`;
  const firstStep = serviceFirstSteps[service.slug];

  return (
    <section id={service.slug} className="scroll-mt-24" aria-labelledby={titleId}>
      <Container>
        <div className="hairline" />
        <div className="grid gap-10 py-[clamp(3.5rem,2rem+5vw,7rem)] md:grid-cols-12 md:gap-8">
          <Reveal className="min-w-0 md:col-span-5 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <p
              className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] font-semibold leading-none tracking-tight text-accent tabular-nums"
              aria-hidden="true"
            >
              {service.number}
            </p>
            <h2
              id={titleId}
              className="mt-6 max-w-[14ch] text-balance text-[clamp(1.75rem,0.9rem+2.4vw,3.25rem)] font-semibold leading-[1.1] tracking-tight"
            >
              {service.title}
            </h2>
            <dl className="mt-8 max-w-[36ch]">
              <dt className="eyebrow text-muted">{serviceLabels.goodFor}</dt>
              <dd className="mt-2 leading-relaxed text-ink">{service.goodFor}</dd>
            </dl>
          </Reveal>

          <Reveal delay={120} className="min-w-0 md:col-span-7 md:col-start-6">
            <p className="text-lead max-w-[62ch] text-ink">{service.description}</p>

            {firstStep ? (
              <dl className="mt-10 grid gap-3 border-t border-line pt-6 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:gap-8">
                <dt className="eyebrow text-muted">{serviceLabels.firstStep}</dt>
                <dd className="max-w-[58ch] leading-relaxed text-ink">{firstStep}</dd>
              </dl>
            ) : null}

            <div className="mt-10">
              <h3 className="eyebrow text-muted">{serviceLabels.deliverables}</h3>
              <ul className="mt-4 border-t border-line">
                {service.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-4 border-b border-line py-3.5 leading-relaxed text-ink"
                  >
                    <Icon name="check" size={18} className="mt-[5px] text-accent" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8">
              <Button href="/contact" variant="ghost">
                {serviceLabels.cta}
              </Button>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
