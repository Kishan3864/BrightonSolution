import type { CSSProperties } from "react";
import ProjectMedia from "@/components/work/ProjectMedia";
import Tags from "@/components/work/Tags";
import { VisitLink } from "@/components/work/WorkLinks";
import type { WebProject } from "@/lib/work";
import styles from "./ProjectStack.module.css";

type ProjectStackProps = {
  projects: WebProject[];
  /** Heading id per project; falls back to `home-work-<slug>`. */
  titleId?: (project: WebProject, index: number) => string;
};

/**
 * Stacked showcase: one large panel per project (screenshot in a browser frame,
 * text beside it). From 768px, where CSS scroll-driven animations exist and
 * motion is allowed, the panels are sticky with staggered tops, so each new
 * project slides up over the previous one while that one recedes and dims.
 * Everywhere else it is the same panels as a plain, fully readable list.
 * No JavaScript: all motion lives in ProjectStack.module.css.
 */
export default function ProjectStack({ projects, titleId }: ProjectStackProps) {
  return (
    <ol role="list" className={styles.stack} style={{ "--count": projects.length } as CSSProperties}>
      {projects.map((project, i) => {
        const id = titleId ? titleId(project, i) : `home-work-${project.slug}`;
        const number = String(i + 1).padStart(2, "0");

        return (
          <li key={project.slug} className={styles.item} style={{ "--i": i } as CSSProperties}>
            <article aria-labelledby={id} className={styles.card}>
              <div className="grid gap-x-[clamp(1.5rem,0.5rem+2.5vw,3.5rem)] gap-y-6 md:grid-cols-12 md:items-center">
                <div className="group min-w-0 md:col-span-6 lg:col-span-7">
                  {/* Duplicate of the Visit link for pointer users; hidden from AT and tab order. */}
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                    aria-hidden="true"
                    data-track="outbound"
                    data-track-label={project.name}
                    className={styles.mediaLink}
                  >
                    <div className={styles.tilt}>
                      <ProjectMedia project={project} chrome />
                    </div>
                  </a>
                </div>

                <div className="min-w-0 md:col-span-6 lg:col-span-5">
                  <p className="eyebrow flex flex-wrap items-baseline gap-x-3 gap-y-1 text-muted">
                    <span className="tabular-nums text-fg">{number}</span>
                    <span>{project.category}</span>
                  </p>
                  <h3
                    id={id}
                    className="mt-4 font-display text-[clamp(1.625rem,1.2rem+1.5vw,2.375rem)] font-medium leading-[1.08] tracking-[-0.035em]"
                  >
                    {project.name}
                  </h3>
                  <p className="mt-2.5 max-w-[38ch] text-[1rem] font-medium leading-snug">{project.tagline}</p>
                  <p className="mt-4 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">
                    {project.description}
                  </p>
                  <Tags tags={project.tags} className="mt-5" />
                  <VisitLink url={project.url} name={project.name} className="mt-3" />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
