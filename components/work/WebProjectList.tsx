import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import ProjectMedia from "@/components/work/ProjectMedia";
import Tags from "@/components/work/Tags";
import { VisitLink } from "@/components/work/WorkLinks";
import { webProjects, workCopy } from "@/lib/work";

const copy = workCopy.web;

/** All web projects as alternating editorial rows.
 *  No top padding: this follows PageHero, whose hairline and bottom padding
 *  already separate the two, so the first screenshot reaches the first viewport.
 *  The bottom padding is the .py-section value. */
export default function WebProjectList() {
  return (
    <section id="web" className="scroll-mt-4 pb-[clamp(3.5rem,2rem+6vw,7.5rem)]" aria-labelledby="web-title">
      <Container>
        <Reveal>
          <SectionHeading id="web-title" number={copy.number} eyebrow={copy.eyebrow} title={copy.title} />
        </Reveal>

        <ol role="list" className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] border-b border-line">
          {webProjects.map((project, i) => {
            const flip = i % 2 === 1;
            const number = String(i + 1).padStart(2, "0");
            const titleId = `work-${project.slug}-title`;

            return (
              <li
                key={project.slug}
                id={project.slug}
                className="scroll-mt-4 border-t border-line py-[clamp(2.25rem,1.25rem+3vw,4.5rem)]"
              >
                <article aria-labelledby={titleId} className="grid gap-x-8 gap-y-7 md:grid-cols-12 md:items-center lg:gap-x-12">
                  <Reveal
                    className={`group min-w-0 md:col-span-7 md:row-start-1 ${flip ? "md:col-start-6" : "md:col-start-1"}`}
                  >
                    {/* Duplicate of the Visit link for pointer users; hidden from AT and tab order. */}
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      tabIndex={-1}
                      aria-hidden="true"
                      data-track="outbound"
                      data-track-label={project.name}
                      className="block"
                    >
                      <ProjectMedia project={project} chrome />
                    </a>
                  </Reveal>

                  <Reveal
                    delay={80}
                    className={`min-w-0 md:col-span-5 md:row-start-1 lg:col-span-4 ${flip ? "md:col-start-1" : "md:col-start-8 lg:col-start-9"}`}
                  >
                    <p className="eyebrow flex flex-wrap items-baseline gap-x-3 gap-y-1 text-muted">
                      <span className="tabular-nums text-accent">{number}</span>
                      <span>{project.category}</span>
                    </p>
                    <h3 id={titleId} className="text-h3 mt-4 tracking-tight">
                      {project.name}
                    </h3>
                    <p className="mt-2 max-w-[40ch] text-[1rem] font-medium leading-snug">{project.tagline}</p>
                    <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">
                      {project.description}
                    </p>
                    <Tags tags={project.tags} className="mt-5" />
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 md:flex-col md:items-start md:gap-y-0 xl:flex-row xl:items-center xl:gap-x-5">
                      <VisitLink url={project.url} name={project.name} />
                      <span className="min-w-0 break-all font-mono text-[0.75rem] text-muted">{project.host}</span>
                    </div>
                  </Reveal>
                </article>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
