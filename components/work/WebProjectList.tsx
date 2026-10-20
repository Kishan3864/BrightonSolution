import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import ProjectMedia from "@/components/work/ProjectMedia";
import Tags from "@/components/work/Tags";
import { VisitLink } from "@/components/work/WorkLinks";
import { webProjects, workCopy, type WebProject } from "@/lib/work";
import styles from "./WebProjectList.module.css";

const copy = workCopy.web;

const card =
  "rounded-[var(--radius-card)] border border-line bg-surface p-[clamp(1rem,0.55rem+1.6vw,2rem)] transition-[transform,border-color] duration-200 ease-out hover:border-line-strong motion-safe:hover:-translate-y-0.5";

/** All web projects as large screenshot panels.
 *  Rhythm: one full-width featured panel, then two split panels (alternating
 *  sides), repeated, so never more than two identical splits in a row.
 *  This follows PageHero, which supplies the space above: only bottom padding here. */
export default function WebProjectList() {
  return (
    <section id="web" className="scroll-mt-4 pb-section" aria-labelledby="web-title">
      <Container>
        <Reveal>
          <SectionHeading id="web-title" number={copy.number} eyebrow={copy.eyebrow} title={copy.title} />
        </Reveal>

        <ol role="list" className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid gap-[clamp(1rem,0.7rem+1.2vw,1.75rem)]">
          {webProjects.map((project, i) => {
            const featured = i % 3 === 0;
            const flip = i % 3 === 2;

            return (
              <li key={project.slug} id={project.slug} className="min-w-0 scroll-mt-4">
                <Reveal>
                  {featured ? (
                    <FeaturedPanel project={project} number={i + 1} />
                  ) : (
                    <SplitPanel project={project} number={i + 1} flip={flip} />
                  )}
                </Reveal>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}

type PanelProps = { project: WebProject; number: number };

/** Screenshot wrapped in a pointer-only duplicate of the Visit link (hidden from AT and tab order). */
function Media({ project }: { project: WebProject }) {
  return (
    <div className={styles.stage}>
      <div className={styles.media}>
        <a
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden="true"
          data-track="outbound"
          data-track-label={project.name}
          className="group block"
        >
          <ProjectMedia project={project} chrome />
        </a>
      </div>
    </div>
  );
}

function Label({ project, number }: PanelProps) {
  return (
    <p className="eyebrow flex flex-wrap items-baseline gap-x-3 gap-y-1 text-muted">
      <span className="tabular-nums text-accent">{String(number).padStart(2, "0")}</span>
      <span>{project.category}</span>
    </p>
  );
}

function Links({ project }: { project: WebProject }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1">
      <VisitLink url={project.url} name={project.name} />
      <span className="min-w-0 break-all font-mono text-[0.75rem] text-muted">{project.host}</span>
    </div>
  );
}

/** Full-width panel: the screenshot across the card, details underneath in two columns. */
function FeaturedPanel({ project, number }: PanelProps) {
  const titleId = `work-${project.slug}-title`;

  return (
    <article aria-labelledby={titleId} className={card}>
      <Media project={project} />
      <div className="mt-[clamp(1.5rem,1rem+1.5vw,2.5rem)] grid gap-x-10 gap-y-5 md:grid-cols-12">
        <div className="min-w-0 md:col-span-5">
          <Label project={project} number={number} />
          <h3 id={titleId} className="text-h2 mt-4">
            {project.name}
          </h3>
          <p className="mt-3 max-w-[36ch] text-[1.0625rem] font-medium leading-snug">{project.tagline}</p>
        </div>
        <div className="min-w-0 md:col-span-7 lg:col-span-6 lg:col-start-7">
          <p className="max-w-[60ch] leading-relaxed text-muted">{project.description}</p>
          <Tags tags={project.tags} className="mt-5" />
          <Links project={project} />
        </div>
      </div>
    </article>
  );
}

/** Split panel: screenshot on one side (7 of 12), details on the other. Stacks under lg, screenshot first. */
function SplitPanel({ project, number, flip }: PanelProps & { flip: boolean }) {
  const titleId = `work-${project.slug}-title`;

  return (
    <article
      aria-labelledby={titleId}
      className={`${card} grid gap-x-[clamp(1.5rem,0.5rem+2.5vw,3rem)] gap-y-6 lg:grid-cols-12 lg:items-center`}
    >
      <div className={`min-w-0 lg:col-span-7 ${flip ? "lg:order-2" : ""}`}>
        <Media project={project} />
      </div>
      <div className={`min-w-0 lg:col-span-5 ${flip ? "lg:order-1 lg:pl-2" : "lg:pr-2"}`}>
        <Label project={project} number={number} />
        <h3
          id={titleId}
          className="mt-4 font-display text-[clamp(1.5rem,1.2rem+1.1vw,2.125rem)] font-medium leading-[1.1] tracking-[-0.03em]"
        >
          {project.name}
        </h3>
        <p className="mt-3 max-w-[40ch] text-[1rem] font-medium leading-snug">{project.tagline}</p>
        <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">{project.description}</p>
        <Tags tags={project.tags} className="mt-5" />
        <Links project={project} />
      </div>
    </article>
  );
}
