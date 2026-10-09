import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import TrackCta from "@/components/services/TrackCta";
import { workTeaser } from "@/lib/content/about";
import { APP_ICON_SIZE, apps, capitalise, countWord, playDeveloperName, webProjects } from "@/lib/work";

export default function WorkTeaser() {
  const summary = `${capitalise(countWord(webProjects.length))} web projects, from a browser-based PDF toolbox to an e-commerce store and an event ERP, and ${countWord(apps.length)} Android apps published on Google Play as ${playDeveloperName}.`;

  return (
    <section id="our-work" className="border-t border-line py-section scroll-mt-4" aria-labelledby="our-work-title">
      <Container>
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          <Reveal className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow flex items-baseline gap-3 text-accent">
              <span className="tabular-nums">04</span>
              <span>{workTeaser.eyebrow}</span>
            </p>
          </Reveal>
          <Reveal delay={80} className="min-w-0 md:col-span-8 lg:col-span-9">
            <h2 id="our-work-title" className="text-h2 max-w-[20ch] text-balance">
              {workTeaser.title}
            </h2>
            <p className="text-lead mt-5 max-w-[60ch] text-muted">{summary}</p>

            {apps.length > 0 ? (
              <ul className="mt-8 grid w-fit grid-cols-5 gap-3 sm:flex sm:flex-wrap" aria-label={`Android apps by ${playDeveloperName}`}>
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
                      className="block size-11 rounded-[22%] border border-line object-cover sm:size-12"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8">
              <TrackCta label="about_see_work">
                <Button href="/work" variant="outline">
                  {workTeaser.cta}
                </Button>
              </TrackCta>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
