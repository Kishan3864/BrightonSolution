import Link from "next/link";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import TrackCta from "@/components/services/TrackCta";
import type { Service } from "@/lib/site";
import {
  APP_ICON_SIZE,
  SCREENSHOT_HEIGHT,
  SCREENSHOT_WIDTH,
  apps,
  countWord,
  playDeveloperName,
  webProjects,
  type WebProject,
} from "@/lib/work";
import { serviceFirstSteps, serviceLabels, serviceRelatedWork } from "@/lib/content/services";

type ServiceSectionProps = {
  service: Service;
};

/** Genuine projects from lib/work.ts that illustrate this service. */
function relatedProjects(slug: string): WebProject[] {
  const related = serviceRelatedWork[slug];
  if (!related?.projects) return [];
  return related.projects
    .map((projectSlug) => webProjects.find((p) => p.slug === projectSlug))
    .filter((p): p is WebProject => p !== undefined);
}

/** The related work as one line of names. */
function relatedWorkLine(slug: string): string | null {
  const related = serviceRelatedWork[slug];
  if (!related) return null;
  const parts: string[] = relatedProjects(slug).map((p) => p.name);
  if (related.apps && apps.length > 0) {
    const n = countWord(apps.length);
    parts.push(`${n.charAt(0).toUpperCase()}${n.slice(1)} Android apps published on Google Play as ${playDeveloperName}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * One service. The numbered band (h2) runs the full width; underneath:
 *   < 1024px  the "Good for" card, then the description, deliverables and details, stacked
 *   1024px+   the card sits in a sticky 4-column rail beside an 8-column body
 * Inside the body the deliverables become two columns from 640px and the
 * first-step / related-work pair from 768px.
 */
export default function ServiceSection({ service }: ServiceSectionProps) {
  const titleId = `${service.slug}-title`;
  const firstStep = serviceFirstSteps[service.slug];
  const related = relatedWorkLine(service.slug);
  const shots = relatedProjects(service.slug).filter((p) => p.image);
  const showApps = Boolean(serviceRelatedWork[service.slug]?.apps) && apps.length > 0;
  const details = [firstStep, related].filter(Boolean).length;

  return (
    <section id={service.slug} className="pb-section scroll-mt-4" aria-labelledby={titleId}>
      <Container>
        <Reveal>
          <SectionTitle as="h2" id={titleId} number={service.number}>
            {service.title}
          </SectionTitle>
        </Reveal>

        <div className="mt-[clamp(1.75rem,1rem+2.5vw,3.25rem)] grid gap-8 lg:grid-cols-12 lg:gap-10">
          <Reveal delay={60} className="min-w-0 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <div className="grid gap-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-7 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-8 lg:grid-cols-1 lg:items-stretch lg:gap-6">
              <span
                className="grid size-12 place-items-center rounded-sharp border border-line bg-surface-2 text-accent"
                aria-hidden="true"
              >
                <Icon name={service.icon} size={24} />
              </span>
              <dl>
                <dt className="eyebrow text-muted">{serviceLabels.goodFor}</dt>
                <dd className="mt-2.5 max-w-[46ch] text-[1rem] leading-relaxed text-fg">{service.goodFor}</dd>
              </dl>
              <div className="border-t border-line pt-5 md:border-t-0 md:pt-0 lg:border-t lg:pt-5">
                <TrackCta label={`services_${service.slug}`}>
                  <Button href="/contact" variant="ghost">
                    {serviceLabels.cta}
                  </Button>
                </TrackCta>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="min-w-0 lg:col-span-8">
            <p className="text-lead max-w-[62ch] text-fg">{service.description}</p>

            <div className="mt-10">
              <h3 className="eyebrow text-muted">{serviceLabels.deliverables}</h3>
              <ul className="mt-4 grid gap-x-8 gap-y-3.5 border-t border-line pt-5 sm:grid-cols-2">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex min-w-0 items-start gap-3 text-[0.9375rem] leading-snug text-fg">
                    <Icon name="check" size={18} className="mt-px text-accent" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {details > 0 ? (
              <dl
                className={`mt-10 grid gap-x-10 gap-y-7 border-t border-line pt-7 text-[0.9375rem] leading-relaxed ${
                  details > 1 ? "md:grid-cols-2" : ""
                }`.trim()}
              >
                {firstStep ? (
                  <div className="min-w-0">
                    <dt className="eyebrow text-accent">{serviceLabels.firstStep}</dt>
                    <dd className="mt-2.5 max-w-[58ch] text-muted">{firstStep}</dd>
                  </div>
                ) : null}
                {related ? (
                  <div className="min-w-0">
                    <dt className="eyebrow text-accent">{serviceLabels.relatedWork}</dt>
                    <dd className="mt-2.5 max-w-[58ch] text-muted">
                      <span className="text-fg">{related}.</span>{" "}
                      <Link
                        href="/work"
                        className="relative inline text-accent underline decoration-1 underline-offset-4 after:absolute after:inset-x-0 after:-inset-y-3 after:content-[''] hover:text-fg"
                      >
                        {serviceLabels.relatedWorkLink}
                      </Link>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {/* One shot sits alone in a frame capped at 36rem, so it never leaves empty grid cells.
                Two share two columns; with three, under 640px the first spans both columns. */}
            {shots.length > 0 ? (
              <ul className={`mt-7 grid gap-3 ${shots.length === 1 ? "max-w-[36rem]" : shots.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
                {shots.slice(0, 3).map((project, i) => (
                  <li key={project.slug} className={`min-w-0 ${i === 0 && shots.length === 3 ? "col-span-2 sm:col-span-1" : ""}`.trim()}>
                    <figure>
                      <div className="aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface-2">
                        <img
                          src={project.image ?? undefined}
                          alt={`${project.name} website ${project.imagePage ?? "home page"}`}
                          width={SCREENSHOT_WIDTH}
                          height={SCREENSHOT_HEIGHT}
                          loading="lazy"
                          decoding="async"
                          className="block h-full w-full object-cover object-top"
                        />
                      </div>
                      <figcaption className="mt-2.5 truncate text-[0.8125rem] text-muted">{project.name}</figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            ) : null}

            {showApps ? (
              <ul className="mt-7 flex flex-wrap gap-2.5" aria-label={`Apps by ${playDeveloperName} on Google Play`}>
                {apps.map((app) => (
                  <li key={app.slug}>
                    <img
                      src={app.icon}
                      alt={`${app.name} app icon`}
                      width={APP_ICON_SIZE}
                      height={APP_ICON_SIZE}
                      loading="lazy"
                      decoding="async"
                      className="block size-12 rounded-sharp border border-line bg-surface-2 sm:size-14"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
