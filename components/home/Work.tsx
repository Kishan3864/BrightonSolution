import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import ProjectMedia from "@/components/work/ProjectMedia";
import AppIcon from "@/components/work/AppIcon";
import Tags from "@/components/work/Tags";
import { PlayLink, VisitLink } from "@/components/work/WorkLinks";
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
import { dividedSection } from "@/lib/content/home-b";

const copy = workCopy.home;
const featured = getProject(featuredProjectSlug);
const more = homeProjectSlugs.map(getProject);

export default function Work() {
  return (
    <section id="work" className="scroll-mt-4" aria-labelledby="work-title">
      <Container>
        <div className={dividedSection}>
          <Reveal>
            <SectionHeading
              id="work-title"
              number={copy.number}
              eyebrow={copy.eyebrow}
              title={copy.title}
              lead={copy.lead}
            />
          </Reveal>

          {/* Featured project */}
          <article
            aria-labelledby="home-work-featured"
            className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid gap-x-8 gap-y-7 md:grid-cols-12 lg:gap-x-12"
          >
            <Reveal className="group min-w-0 md:col-span-7 lg:col-span-8">
              <a
                href={featured.url}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={-1}
                aria-hidden="true"
                data-track="outbound"
                data-track-label={featured.name}
                className="block"
              >
                <ProjectMedia project={featured} chrome />
              </a>
            </Reveal>
            <Reveal delay={80} className="flex min-w-0 flex-col md:col-span-5 md:justify-end lg:col-span-4">
              <p className="eyebrow text-muted">{featured.category}</p>
              <h3
                id="home-work-featured"
                className="mt-4 text-[clamp(1.375rem,1.1rem+1.1vw,1.875rem)] font-medium leading-[1.12] tracking-[-0.03em]"
              >
                {featured.name}
              </h3>
              <p className="mt-2 max-w-[36ch] text-[1rem] font-medium leading-snug">{featured.tagline}</p>
              <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">{featured.description}</p>
              <Tags tags={featured.tags} className="mt-5" />
              <VisitLink url={featured.url} name={featured.name} className="mt-4 self-start" />
            </Reveal>
          </article>

          {/* Three more projects, as an index with small screenshots */}
          <ul role="list" className="mt-[clamp(3rem,2rem+3vw,5rem)] border-b border-line">
            {more.map((project, i) => (
              <Reveal as="li" key={project.slug} delay={i * 60} className="border-t border-line">
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="outbound"
                  data-track-label={project.name}
                  aria-label={`${project.name}, ${project.category}: ${project.tagline} (opens in a new tab)`}
                  className="group grid grid-cols-[minmax(0,1fr)_minmax(0,38%)] items-start gap-x-5 gap-y-3 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,34%)] md:grid-cols-12 md:items-center md:gap-x-8 md:py-7"
                >
                  <div className="min-w-0 md:col-span-5">
                    <p className="eyebrow text-muted">{project.category}</p>
                    <h3 className="text-h3 mt-3 flex items-start gap-2 tracking-tight transition-colors duration-200 group-hover:text-accent">
                      <span className="min-w-0">{project.name}</span>
                      <Icon
                        name="arrowUpRight"
                        size={18}
                        className="mt-[0.2em] text-muted transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none"
                      />
                    </h3>
                    <p className="mt-2 max-w-[40ch] text-[0.9375rem] leading-snug text-muted">{project.tagline}</p>
                  </div>
                  <div className="hidden min-w-0 md:col-span-4 md:block">
                    <Tags tags={project.tags} />
                  </div>
                  <div className="min-w-0 md:col-span-3">
                    <ProjectMedia project={project} />
                  </div>
                </a>
              </Reveal>
            ))}
          </ul>

          {/* Google Play strip */}
          <Reveal className="mt-[clamp(3rem,2rem+3vw,5rem)] grid gap-x-8 gap-y-6 md:grid-cols-12">
            <div className="min-w-0 md:col-span-4 lg:col-span-3">
              <h3 className="eyebrow text-accent">{copy.playStrip}</h3>
              <p className="mt-3 max-w-[30ch] text-[0.9375rem] leading-relaxed text-muted">
                {capitalise(countWord(apps.length))} Android apps published under the {playDeveloperName} developer
                account.
              </p>
            </div>
            <ul
              role="list"
              className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-1 sm:gap-x-6 md:col-span-8 lg:col-span-9 lg:grid-cols-5 lg:gap-y-6"
            >
              {apps.map((app) => (
                <li key={app.slug} className="min-w-0">
                  <a
                    href={app.playUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track="play"
                    data-track-label={app.name}
                    className="group flex min-h-[44px] items-center gap-2.5 py-2 sm:gap-3 lg:flex-col lg:items-start lg:gap-3 lg:py-0"
                  >
                    {/* 40px on small screens, 48px in the five-column layout. */}
                    <AppIcon app={app} size={40} className="lg:size-12!" />
                    <span className="min-w-0 text-[0.8125rem] font-medium leading-snug tracking-tight break-words decoration-1 underline-offset-4 group-hover:underline sm:text-[0.875rem]">
                      {app.name}
                      <span className="sr-only"> on Google Play (opens in a new tab)</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="mt-10 md:grid md:grid-cols-12 md:gap-8">
            <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              <Button href="/work" variant="ghost">
                {copy.seeAll}
              </Button>
              <PlayLink url={playDeveloperUrl} label="Developer page">
                {copy.playAll}
              </PlayLink>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
