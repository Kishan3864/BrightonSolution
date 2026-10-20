import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import AppIcon from "@/components/work/AppIcon";
import { PlayLink } from "@/components/work/WorkLinks";
import { apps, playDeveloperName, playDeveloperUrl, workCopy } from "@/lib/work";

const copy = workCopy.apps;

/** Every Android app on Google Play, as a grid of cards.
 *  One column on phones, two from sm, icon beside the text; five from xl, icon on top. */
export default function AppList() {
  return (
    <section id="apps" className="pb-section scroll-mt-4" aria-labelledby="apps-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="apps-title"
            number={copy.number}
            eyebrow={copy.eyebrow}
            title={copy.title}
            lead={copy.lead}
          />
        </Reveal>

        <ul
          role="list"
          className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-5"
        >
          {apps.map((app, i) => (
            <Reveal as="li" key={app.slug} delay={(i % 5) * 50} className="flex min-w-0">
              <article
                aria-labelledby={`app-${app.slug}-title`}
                className="grid w-full grid-cols-[56px_minmax(0,1fr)] gap-x-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-[transform,border-color] duration-200 ease-out hover:border-line-strong motion-safe:hover:-translate-y-0.5 xl:flex xl:flex-col xl:p-6"
              >
                <AppIcon app={app} size={56} />
                <div className="flex min-w-0 flex-1 flex-col xl:mt-5">
                  <h3
                    id={`app-${app.slug}-title`}
                    className="text-[1.0625rem] font-medium leading-snug tracking-[-0.015em]"
                  >
                    {app.name}
                  </h3>
                  <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{app.summary}</p>
                  <div className="mt-auto pt-2">
                    <PlayLink url={app.playUrl} label={app.name} srSuffix={`: ${app.name}`}>
                      Get it on Google Play
                    </PlayLink>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={80} className="mt-8">
          <PlayLink url={playDeveloperUrl} label="Developer page">
            All apps by {playDeveloperName} on Google Play
          </PlayLink>
        </Reveal>
      </Container>
    </section>
  );
}
