import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import SectionTitle from "@/components/ui/SectionTitle";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import ProjectStack from "@/components/showcase/ProjectStack";
import AppOrbit from "@/components/showcase/AppOrbit";
import { PlayLink } from "@/components/work/WorkLinks";
import {
  apps,
  capitalise,
  countWord,
  featuredProjectSlug,
  getProject,
  homeProjectSlugs,
  playDeveloperName,
  playDeveloperUrl,
  workCopy,
} from "@/lib/work";
import { sectionSpace } from "@/lib/content/home-b";

const copy = workCopy.home;
const projects = [getProject(featuredProjectSlug), ...homeProjectSlugs.map(getProject)];

export default function Work() {
  return (
    <section id="work" className="scroll-mt-4" aria-labelledby="work-title">
      <Container>
        <div className={sectionSpace}>
          <Reveal>
            <SectionHeading
              id="work-title"
              number={copy.number}
              eyebrow={copy.eyebrow}
              title={copy.title}
              lead={copy.lead}
            />
          </Reveal>

          {/* Featured project first, then the three home projects, as a stacked showcase. */}
          <div className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)]">
            <ProjectStack
              projects={projects}
              titleId={(project, i) => (i === 0 ? "home-work-featured" : `home-work-${project.slug}`)}
            />
          </div>

          {/* Google Play */}
          <div className="mt-[clamp(4rem,2.5rem+4vw,7rem)]">
            <Reveal>
              <SectionTitle as="h3" variant="sub">
                {copy.playStrip}
              </SectionTitle>
            </Reveal>

            {/* Phones: sentence, app tiles, actions. From 768px: sentence and actions beside the ring. */}
            <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] grid gap-x-8 gap-y-8 md:grid-cols-12 md:grid-rows-[1fr_1fr] md:gap-y-0 lg:gap-x-12">
              <Reveal className="min-w-0 md:col-span-5 md:row-start-1 md:self-end lg:col-span-4">
                <p className="text-lead max-w-[30ch] text-muted">
                  {capitalise(countWord(apps.length))} Android apps published under the {playDeveloperName} developer
                  account.
                </p>
              </Reveal>

              <Reveal
                delay={80}
                className="min-w-0 md:col-span-7 md:col-start-6 md:row-span-2 md:row-start-1 lg:col-span-8 lg:col-start-5"
              >
                <AppOrbit apps={apps} label={workCopy.apps.eyebrow} />
              </Reveal>

              <Reveal className="min-w-0 md:col-span-5 md:row-start-2 md:self-start md:pt-6 lg:col-span-4">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <PlayLink url={playDeveloperUrl} label="Developer page">
                    {copy.playAll}
                  </PlayLink>
                  <Button href="/work" variant="ghost">
                    {copy.seeAll}
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
