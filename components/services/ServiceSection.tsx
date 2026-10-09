import Link from "next/link";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import TrackCta from "@/components/services/TrackCta";
import type { Service } from "@/lib/site";
import { apps, countWord, playDeveloperName, webProjects } from "@/lib/work";
import { serviceFirstSteps, serviceLabels, serviceRelatedWork } from "@/lib/content/services";

type ServiceSectionProps = {
  service: Service;
  total: number;
};

/** Genuine project names from lib/work.ts that illustrate this service, as one line. */
function relatedWorkLine(slug: string): string | null {
  const related = serviceRelatedWork[slug];
  if (!related) return null;
  const parts: string[] = [];
  if (related.projects) {
    for (const projectSlug of related.projects) {
      const project = webProjects.find((p) => p.slug === projectSlug);
      if (project) parts.push(project.name);
    }
  }
  if (related.apps && apps.length > 0) {
    const n = countWord(apps.length);
    parts.push(`${n.charAt(0).toUpperCase()}${n.slice(1)} Android apps published on Google Play as ${playDeveloperName}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function ServiceSection({ service, total }: ServiceSectionProps) {
  const titleId = `${service.slug}-title`;
  const firstStep = serviceFirstSteps[service.slug];
  const related = relatedWorkLine(service.slug);

  return (
    <section id={service.slug} className="scroll-mt-4" aria-labelledby={titleId}>
      <Container>
        <div className="hairline" />
        <div className="grid gap-8 py-[clamp(3rem,1.75rem+4vw,5.5rem)] md:grid-cols-12 md:gap-8">
          <Reveal className="min-w-0 md:col-span-5 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow tabular-nums text-accent" aria-hidden="true">
              {service.number}
              <span className="text-muted"> / {String(total).padStart(2, "0")}</span>
            </p>
            <h2 id={titleId} className="text-h2 mt-4 max-w-[14ch] text-balance">
              {service.title}
            </h2>
            <dl className="mt-6 max-w-[34ch] border-t border-line pt-4">
              <dt className="eyebrow text-muted">{serviceLabels.goodFor}</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed text-ink">{service.goodFor}</dd>
            </dl>
          </Reveal>

          <Reveal delay={100} className="min-w-0 md:col-span-7 md:col-start-6">
            <p className="text-lead max-w-[60ch] text-ink">{service.description}</p>

            <div className="mt-8">
              <h3 className="eyebrow text-muted">{serviceLabels.deliverables}</h3>
              <ul className="mt-3 grid border-t border-line sm:grid-cols-2 sm:gap-x-8">
                {service.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex min-w-0 items-start gap-3 border-b border-line py-3 text-[0.9375rem] leading-snug text-ink"
                  >
                    <Icon name="check" size={16} className="mt-[3px] text-accent" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <dl className="mt-8 grid gap-y-5 text-[0.9375rem] leading-relaxed">
              {firstStep ? (
                <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
                  <dt className="eyebrow whitespace-nowrap pt-[0.2em] text-muted">{serviceLabels.firstStep}</dt>
                  <dd className="max-w-[58ch] text-ink">{firstStep}</dd>
                </div>
              ) : null}
              {related ? (
                <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
                  <dt className="eyebrow whitespace-nowrap pt-[0.2em] text-muted">{serviceLabels.relatedWork}</dt>
                  <dd className="max-w-[58ch] text-ink">
                    {related}.{" "}
                    <Link
                      href="/work"
                      className="inline-flex min-h-[44px] items-center text-accent underline decoration-1 underline-offset-4 hover:text-ink sm:min-h-0"
                    >
                      {serviceLabels.relatedWorkLink}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-6">
              <TrackCta label={`services_${service.slug}`}>
                <Button href="/contact" variant="ghost">
                  {serviceLabels.cta}
                </Button>
              </TrackCta>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
