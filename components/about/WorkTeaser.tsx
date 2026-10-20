import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import TrackCta from "@/components/services/TrackCta";
import { workTeaser } from "@/lib/content/about";
import {
  APP_ICON_SIZE,
  SCREENSHOT_HEIGHT,
  SCREENSHOT_WIDTH,
  apps,
  capitalise,
  countWord,
  getProject,
  playDeveloperName,
  webProjects,
} from "@/lib/work";
import styles from "./WorkTeaser.module.css";

/** Three real screenshots for the fan: back left, back right, front. */
const fan = [
  { slug: "martins-tavern", position: styles.left },
  { slug: "weekendcart", position: styles.right },
  { slug: "empire-event", position: styles.front },
] as const;

/** Text and app icons on the left, a fanned stack of project screenshots on the
 *  right (lg). Under lg the stack sits under the text, narrower and centred.
 *  Under 640px the fan would shrink to unreadable cards, so a single full-width
 *  screenshot (the front card of the fan) stands in for it. */
export default function WorkTeaser() {
  const summary = `${capitalise(countWord(webProjects.length))} web projects, from a browser-based PDF toolbox to an e-commerce store and an event ERP, and ${countWord(apps.length)} Android apps published on Google Play as ${playDeveloperName}.`;
  const shots = fan.map((f) => ({ ...f, project: getProject(f.slug) })).filter((f) => f.project.image);
  const single = shots.find((s) => s.position === styles.front)?.project;

  return (
    <section id="our-work" className="pb-section scroll-mt-4" aria-labelledby="our-work-title">
      <Container>
        <Reveal>
          <SectionTitle number="04">{workTeaser.eyebrow}</SectionTitle>
        </Reveal>

        <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] grid items-center gap-x-12 gap-y-12 lg:grid-cols-12">
          <Reveal delay={80} className="min-w-0 lg:col-span-5">
            <h2 id="our-work-title" className="text-h2 max-w-[20ch] text-balance">
              {workTeaser.title}
            </h2>
            <p className="text-lead mt-5 max-w-[52ch] text-muted">{summary}</p>

            {apps.length > 0 ? (
              <ul
                className="mt-8 grid w-fit grid-cols-5 gap-2.5 sm:gap-3"
                aria-label={`Android apps by ${playDeveloperName}`}
              >
                {apps.map((app) => (
                  <li key={app.slug} className="shrink-0">
                    <img
                      src={app.icon}
                      alt={`${app.name} app icon`}
                      title={app.name}
                      width={APP_ICON_SIZE}
                      height={APP_ICON_SIZE}
                      loading="lazy"
                      decoding="async"
                      className="block size-11 rounded-sharp border border-line object-cover sm:size-12"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-9">
              <TrackCta label="about_see_work">
                <Button href="/work" variant="outline">
                  {workTeaser.cta}
                </Button>
              </TrackCta>
            </div>
          </Reveal>

          {shots.length === fan.length ? (
            <div className="mx-auto w-full min-w-0 max-w-[40rem] lg:col-span-7 lg:max-w-none">
              {single ? (
                <figure className="m-0 overflow-hidden rounded-[var(--radius-card)] border border-line-strong bg-surface-2 sm:hidden">
                  <img
                    src={single.image ?? ""}
                    alt={`${single.name} website ${single.imagePage ?? "home page"}`}
                    width={SCREENSHOT_WIDTH}
                    height={SCREENSHOT_HEIGHT}
                    loading="lazy"
                    decoding="async"
                    className="block aspect-[16/10] h-auto w-full object-cover object-top"
                  />
                </figure>
              ) : null}
              <div className={`${styles.fan} hidden sm:block`}>
                {shots.map(({ slug, position, project }) => (
                  <figure key={slug} className={`${styles.card} ${position}`}>
                    <img
                      src={project.image ?? ""}
                      alt={`${project.name} website ${project.imagePage ?? "home page"}`}
                      width={SCREENSHOT_WIDTH}
                      height={SCREENSHOT_HEIGHT}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
