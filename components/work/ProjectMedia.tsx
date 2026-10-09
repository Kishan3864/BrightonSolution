import { SCREENSHOT_HEIGHT, SCREENSHOT_WIDTH, type WebProject } from "@/lib/work";

type ProjectMediaProps = {
  project: WebProject;
  /** Thin browser bar with the site host above the image. */
  chrome?: boolean;
  eager?: boolean;
  className?: string;
};

/**
 * A 16:10 hairline frame holding a genuine screenshot of the project.
 * Projects without a screenshot get a typographic tile in ink: the project
 * name, category and a fine-line motif. Never a fake screenshot.
 * Hover zoom is driven by a `group` on an ancestor.
 */
export default function ProjectMedia({ project, chrome = false, eager = false, className = "" }: ProjectMediaProps) {
  const dark = !project.image;

  return (
    <div
      className={`overflow-hidden rounded-sharp border ${
        dark ? "border-ink bg-ink text-paper" : "border-line bg-[#fff]"
      } ${className}`.trim()}
    >
      {chrome ? (
        <div
          aria-hidden="true"
          className={`flex h-7 items-center gap-1.5 border-b px-3 ${
            dark ? "border-line-dark" : "border-line"
          }`}
        >
          <span className={`size-[7px] border ${dark ? "border-line-dark" : "border-line"}`} />
          <span className={`size-[7px] border ${dark ? "border-line-dark" : "border-line"}`} />
          <span className={`size-[7px] border ${dark ? "border-line-dark" : "border-line"}`} />
          <span
            className={`ml-3 min-w-0 truncate font-mono text-[0.625rem] tracking-[0.04em] ${
              dark ? "text-muted-dark" : "text-muted"
            }`}
          >
            {project.host}
          </span>
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
            className="absolute inset-0 block h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none"
          />
        ) : (
          <TypeTile project={project} showHost={!chrome} />
        )}
      </div>
    </div>
  );
}

/* The name is the typographic mark; category and tagline already sit beside
   the tile, so they are not repeated here. The host is shown only when there
   is no browser bar carrying it. */
function TypeTile({ project, showHost }: { project: WebProject; showHost: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 flex flex-col p-[clamp(1rem,0.6rem+2vw,2rem)] ${
        showHost ? "justify-between" : "justify-end"
      }`}
    >
      <Motif slug={project.slug} />
      {showHost ? (
        <p className="relative min-w-0 truncate font-mono text-[0.6875rem] tracking-[0.04em] text-muted-dark">
          {project.host}
        </p>
      ) : null}
      <p className="relative min-w-0 break-words text-[clamp(1.5rem,1rem+2.4vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.035em] text-paper">
        {project.name}
      </p>
    </div>
  );
}

/* Fine-line motifs, drawn in hairline strokes with a single accent detail. */
function Motif({ slug }: { slug: string }) {
  const line = "rgba(250,250,247,0.16)";
  const accent = "#7D93FF";

  if (slug === "leadpin") {
    // A quiet street grid, a search radius and one pinned location.
    return (
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMaxYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <g stroke={line} strokeWidth="1" vectorEffect="non-scaling-stroke">
          <path d="M150 0v250M215 0v250M300 0v250M360 0v250" />
          <path d="M120 40h280M120 105h280M120 170h280M120 225h280" />
          <path d="M260 250L400 120" />
          <circle cx="300" cy="105" r="38" />
          <circle cx="300" cy="105" r="72" strokeDasharray="2 5" />
        </g>
        <g stroke={accent} strokeWidth="1.25" vectorEffect="non-scaling-stroke">
          <path d="M300 105c0-10-7-17-15-17s-15 7-15 17c0 11 15 26 15 26s15-15 15-26z" transform="translate(15 -12)" />
          <circle cx="300" cy="81" r="4.5" />
        </g>
        <g fill={line}>
          <rect x="213" y="38" width="4" height="4" />
          <rect x="358" y="168" width="4" height="4" />
          <rect x="148" y="103" width="4" height="4" />
          <rect x="213" y="223" width="4" height="4" />
        </g>
      </svg>
    );
  }

  if (slug === "eventerp") {
    // A month grid beside a quotation ledger.
    const cols = 7;
    const rows = 5;
    const cell = 22;
    const ox = 208;
    const oy = 46;
    return (
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMaxYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <g stroke={line} strokeWidth="1" vectorEffect="non-scaling-stroke">
          {Array.from({ length: cols + 1 }, (_, i) => (
            <path key={`v${i}`} d={`M${ox + i * cell} ${oy}v${rows * cell}`} />
          ))}
          {Array.from({ length: rows + 1 }, (_, i) => (
            <path key={`h${i}`} d={`M${ox} ${oy + i * cell}h${cols * cell}`} />
          ))}
          <path d={`M${ox} ${oy - 14}h${cols * cell}`} />
          <path d="M208 196h154M208 210h120M208 224h154" />
          <path d="M330 210h32" strokeDasharray="2 3" />
        </g>
        <g stroke={accent} strokeWidth="1.25" vectorEffect="non-scaling-stroke">
          <rect x={ox + 3 * cell + 3} y={oy + 2 * cell + 3} width={cell - 6} height={cell - 6} />
          <path d={`M${ox + 4 * cell + 4} ${oy + 2 * cell + cell / 2}h${2 * cell - 8}`} />
        </g>
      </svg>
    );
  }

  if (slug === "recruitment-suite") {
    // A hiring pipeline: four stage columns narrowing to one placed candidate.
    const lanes = [214, 256, 298, 340];
    const cards = [4, 3, 2];
    return (
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMaxYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <g stroke={line} strokeWidth="1" vectorEffect="non-scaling-stroke">
          {lanes.map((x) => (
            <path key={`h${x}`} d={`M${x} 34h34`} />
          ))}
          {cards.map((count, lane) =>
            Array.from({ length: count }, (_, i) => (
              <rect key={`c${lane}-${i}`} x={lanes[lane]} y={44 + i * 18} width="34" height="12" />
            )),
          )}
        </g>
        <g stroke={accent} strokeWidth="1.25" vectorEffect="non-scaling-stroke">
          <rect x="340" y="44" width="34" height="12" />
          <path d="M346 50h14" />
        </g>
      </svg>
    );
  }

  if (slug === "upward") {
    // Career steps rising to a goal, over a twelve-week timeline.
    return (
      <svg
        viewBox="0 0 400 250"
        preserveAspectRatio="xMaxYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <g stroke={line} strokeWidth="1" vectorEffect="non-scaling-stroke">
          <path d="M214 198v-22h26v-22h26v-22h26v-22h26v-22h26v-22" />
          <path d="M214 216h156" />
          {Array.from({ length: 13 }, (_, i) => (
            <path key={`t${i}`} d={`M${214 + i * 13} 216v-5`} />
          ))}
        </g>
        <g stroke={accent} strokeWidth="1.25" vectorEffect="non-scaling-stroke">
          <path d="M344 66h26V42" />
          <path d="M370 42h12l-4 5 4 5h-12" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 400 250"
      preserveAspectRatio="xMaxYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke={line} strokeWidth="1" vectorEffect="non-scaling-stroke">
        <path d="M220 40h150v170H220z" />
        <path d="M220 80h150M260 80v130" />
      </g>
    </svg>
  );
}
