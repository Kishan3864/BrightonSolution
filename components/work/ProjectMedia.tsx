import { SCREENSHOT_HEIGHT, SCREENSHOT_WIDTH, type WebProject } from "@/lib/work";

type ProjectMediaProps = {
  project: WebProject;
  /** Thin browser bar with the site host above the image. */
  chrome?: boolean;
  eager?: boolean;
  className?: string;
};

/**
 * A 16:10 frame (20px radius, surface-2) holding a genuine screenshot of the
 * project. With `chrome`, a dark browser bar (three dots in line colour and the
 * site host) sits above the image. Projects without a screenshot get a
 * plain typographic tile (the host in mono, one orange mark) in the same 16:10
 * frame, so the layout does not shift. Never a fake screenshot. Hover zoom is driven by a `group` on an ancestor.
 */
export default function ProjectMedia({ project, chrome = false, eager = false, className = "" }: ProjectMediaProps) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-card,1.25rem)] border border-line bg-surface-2 ${className}`.trim()}
    >
      {chrome ? (
        <div
          aria-hidden="true"
          className="grid h-9 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 border-b border-line bg-surface-2 px-3.5"
        >
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-line-strong" />
            <span className="size-2 rounded-full bg-line-strong" />
            <span className="size-2 rounded-full bg-line-strong" />
          </span>
          <span className="mx-auto min-w-0 max-w-full truncate rounded-sharp bg-canvas/70 px-3 py-[3px] font-mono text-[0.6875rem] leading-[1.4] tracking-[0.02em] text-muted">
            {project.host}
          </span>
          <span />
        </div>
      ) : null}

      <div className="relative aspect-[16/10] overflow-hidden">
        {project.image ? (
          <img
            src={project.image}
            alt={`${project.name} website ${project.imagePage ?? "home page"}`}
            width={SCREENSHOT_WIDTH}
            height={SCREENSHOT_HEIGHT}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            className="absolute inset-0 block h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <TypeTile project={project} />
        )}
      </div>
    </div>
  );
}

/* A clean typographic tile for projects without a screenshot: the host in
   mono over the surface, with one small orange mark. The project name is not
   repeated here, since the h3 beside the tile already carries it. */
function TypeTile({ project }: { project: WebProject }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex flex-col justify-between bg-surface-2 p-[clamp(1.25rem,0.75rem+2vw,2.5rem)]"
    >
      <span className="block h-1 w-8 rounded-full bg-accent" />
      <p className="min-w-0 break-words font-mono text-[clamp(1.125rem,0.8rem+1.6vw,2rem)] font-normal leading-[1.15] tracking-[-0.01em] text-muted">
        {project.host}
      </p>
    </div>
  );
}
