import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Icon from "@/components/ui/Icon";
import type { IconName } from "@/lib/site";
import { apps, getProject, SCREENSHOT_HEIGHT, SCREENSHOT_WIDTH, APP_ICON_SIZE } from "@/lib/work";
import { howWeHelpSection as copy, howWeHelpItems } from "@/lib/content/home-a";
import { bodyGap, sectionSpace } from "@/lib/content/home-b";

/* Glyphs the shared icon set does not have, drawn on the same 24px grid and stroke. */
type Glyph = IconName | "modernize" | "scale" | "secure";

const localGlyphs: Record<Exclude<Glyph, IconName>, ReactNode> = {
  modernize: (
    <>
      <path d="M19.5 10A7.5 7.5 0 0 0 6 6.2L4.5 8" />
      <path d="M4.5 4v4h4" />
      <path d="M4.5 14A7.5 7.5 0 0 0 18 17.8l1.5-1.8" />
      <path d="M19.5 20v-4h-4" />
    </>
  ),
  scale: (
    <>
      <path d="M4 20h16" />
      <path d="M6 16v4" />
      <path d="M11 12v8" />
      <path d="M16 8v12" />
      <path d="M15 4h5v5" />
      <path d="M20 4l-6 6" />
    </>
  ),
  secure: (
    <>
      <rect x="5" y="10.5" width="14" height="10" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2" />
    </>
  ),
};

type Cell = {
  /** Grid placement per breakpoint. Mobile is always one column. */
  place: string;
  look: "feature" | "plain" | "raised" | "wide";
  icon: Glyph;
};

/* Exactly six cells, one per item, in reading order.
   lg (12 columns):  Build tall 5 | Modernize 7
                     Build      | Scale 3 | Automate 4
                     Secure 4   | Maintain 8 (wide)
   md (2 columns):   Build wide, four halves, Maintain wide.
   Every cell leads with its icon, top-left. Build carries a real screenshot of a
   platform we built (one the Selected work stack does not show); Maintain carries
   the icons of the Android apps we publish and keep up to date. */
const cells: Cell[] = [
  { place: "md:col-span-2 lg:col-span-5 lg:row-span-2", look: "feature", icon: "code" },
  { place: "lg:col-span-7", look: "plain", icon: "modernize" },
  { place: "lg:col-span-3", look: "plain", icon: "scale" },
  { place: "lg:col-span-4", look: "raised", icon: "ai" },
  { place: "lg:col-span-4", look: "plain", icon: "secure" },
  { place: "md:col-span-2 lg:col-span-8", look: "wide", icon: "support" },
];

const buildShot = getProject("recruitment-suite");

const card =
  "group h-full min-w-0 rounded-[var(--radius-card)] border border-line p-6 transition-[translate,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-7";

/** Bento of the six kinds of work: one tall feature cell, two wide cells, three compact ones. */
export default function HowWeHelp() {
  return (
    <section id="how-we-help" className="scroll-mt-4" aria-labelledby="how-we-help-title">
      <Container>
        <div className={sectionSpace}>
          <Reveal>
            <SectionHeading
              id="how-we-help-title"
              number={copy.number}
              eyebrow={copy.eyebrow}
              title={copy.title}
              lead={copy.lead}
            />
          </Reveal>

          <ul
            role="list"
            className={`${bodyGap} grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:auto-rows-[minmax(13.5rem,auto)] lg:grid-cols-12`}
          >
            {howWeHelpItems.map((item, i) => {
              const cell = cells[i];

              return (
                <Reveal as="li" key={item.title} delay={i * 60} className={`min-w-0 ${cell.place}`}>
                  {cell.look === "feature" ? (
                    <div className={`${card} flex flex-col gap-6 bg-surface-2 md:gap-7`}>
                      <IconTile name={cell.icon} />
                      <BrowserShot />
                      <div>
                        <h3 className="font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-[1.05] font-medium tracking-[-0.035em]">
                          {item.title}
                        </h3>
                        <p className="mt-3 max-w-[38ch] text-[1rem] leading-relaxed text-muted">{item.line}</p>
                      </div>
                    </div>
                  ) : cell.look === "wide" ? (
                    <div className={`${card} flex flex-col justify-between gap-8 bg-surface`}>
                      {/* Icon tile top-left like every cell; the app icons fill the rest of the top row. */}
                      <div className="flex items-start justify-between gap-6">
                        <IconTile name={cell.icon} />
                        <AppIconRow className="hidden sm:flex sm:flex-nowrap" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-h3">{item.title}</h3>
                        <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-muted">{item.line}</p>
                      </div>
                      <AppIconRow className="-mt-2 grid w-max grid-cols-5 sm:hidden" />
                    </div>
                  ) : (
                    <div
                      className={`${card} flex flex-col justify-between gap-8 ${
                        cell.look === "raised" ? "bg-surface-2" : "bg-surface"
                      }`}
                    >
                      <IconTile name={cell.icon} />
                      <div>
                        <h3 className="text-h3">{item.title}</h3>
                        <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-muted">{item.line}</p>
                      </div>
                    </div>
                  )}
                </Reveal>
              );
            })}
          </ul>
        </div>
      </Container>
    </section>
  );
}

/** A real screenshot in a slim browser frame. It fills the middle of the tall Build cell from lg
 *  (cropped from the top), and keeps a wide 16:9-ish window below that. */
function BrowserShot() {
  return (
    <div className="flex min-h-[12rem] flex-col overflow-hidden rounded-sharp border border-line bg-canvas lg:min-h-[13rem] lg:flex-1">
      <div aria-hidden="true" className="flex h-7 shrink-0 items-center gap-3 border-b border-line px-3">
        <span className="flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-line-strong" />
          <span className="size-1.5 rounded-full bg-line-strong" />
          <span className="size-1.5 rounded-full bg-line-strong" />
        </span>
        <span className="min-w-0 truncate font-mono text-[0.6875rem] tracking-[0.02em] text-muted">
          {buildShot.host}
        </span>
      </div>
      <div className="relative aspect-[16/9] overflow-hidden md:aspect-[2/1] lg:aspect-auto lg:flex-1">
        <img
          src={buildShot.image ?? ""}
          alt={`${buildShot.name} website ${buildShot.imagePage ?? "home page"}`}
          width={SCREENSHOT_WIDTH}
          height={SCREENSHOT_HEIGHT}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 block h-full w-full object-cover object-top transition-[scale] duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>
    </div>
  );
}

/** The ten Google Play apps we publish and keep up to date. Decorative: the apps are named and
 *  linked in the Selected work section. */
function AppIconRow({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`gap-2 ${className}`}>
      {apps.map((app) => (
        <img
          key={app.slug}
          src={app.icon}
          alt=""
          width={APP_ICON_SIZE}
          height={APP_ICON_SIZE}
          loading="lazy"
          decoding="async"
          className="block size-9 shrink-0 rounded-[0.625rem] border border-line bg-surface-2 object-cover lg:size-10"
        />
      ))}
    </div>
  );
}

function IconTile({ name }: { name: Glyph }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-11 shrink-0 place-items-center rounded-sharp border border-line-strong bg-canvas text-accent"
    >
      {name in localGlyphs ? (
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="square"
          strokeLinejoin="miter"
          focusable="false"
          className="shrink-0"
        >
          {localGlyphs[name as Exclude<Glyph, IconName>]}
        </svg>
      ) : (
        <Icon name={name as IconName} size={20} />
      )}
    </span>
  );
}
