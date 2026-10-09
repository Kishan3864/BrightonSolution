import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import AppIcon from "@/components/work/AppIcon";
import { PlayLink } from "@/components/work/WorkLinks";
import { apps, playDeveloperName, playDeveloperUrl, workCopy } from "@/lib/work";

const copy = workCopy.apps;

/** Every Android app on Google Play, as a two-column hairline list on paper. */
export default function AppList() {
  return (
    <section id="apps" className="border-t border-line py-section scroll-mt-4" aria-labelledby="apps-title">
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
          className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid border-b border-line md:grid-cols-2 md:gap-x-12"
        >
          {apps.map((app, i) => (
            <Reveal as="li" key={app.slug} delay={(i % 2) * 60} className="min-w-0 border-t border-line">
              <article
                aria-labelledby={`app-${app.slug}-title`}
                className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-5 py-6 md:py-7"
              >
                <AppIcon app={app} size={56} />
                <div className="min-w-0">
                  <h3
                    id={`app-${app.slug}-title`}
                    className="text-[1.0625rem] font-medium leading-snug tracking-[-0.015em]"
                  >
                    {app.name}
                  </h3>
                  <p className="mt-1.5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">
                    {app.summary}
                  </p>
                  <PlayLink url={app.playUrl} label={app.name} srSuffix={`: ${app.name}`} className="mt-1">
                    Get it on Google Play
                  </PlayLink>
                </div>
              </article>
            </Reveal>
          ))}
        </ul>

        <Reveal delay={80} className="mt-8 md:grid md:grid-cols-12 md:gap-8">
          <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
            <PlayLink url={playDeveloperUrl} label="Developer page">
              All apps by {playDeveloperName} on Google Play
            </PlayLink>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
