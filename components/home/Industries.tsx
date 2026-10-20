import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import IndustryShowcase, { type IndustryRow, type IndustryVisual } from "@/components/home/parts/IndustryShowcase";
import { apps, getProject, playDeveloperName } from "@/lib/work";
import { industriesCopy, homeIndustries, bodyGap, sectionSpace, pad } from "@/lib/content/home-b";

/* Each sector is shown with genuine work from it (the same projects the
   comments in lib/content/home-b.ts cite). No screenshot appears twice in one
   scroll of the home page: the Selected work stack shows FlexyPdf, WeekendCart,
   Empire Event and Martin's Tavern, and How we help shows Recruitment Suite, so
   sectors whose only screenshots are already on the page get a typographic
   project card (a project without a screenshot where one exists: Leadpin,
   EventErp) instead of repeating an image. */
function site(slug: string): IndustryVisual {
  const p = getProject(slug);
  return { kind: "site", src: p.image ?? "", caption: p.name, host: p.host };
}

function card(slug: string): IndustryVisual {
  const p = getProject(slug);
  return { kind: "type", category: p.category, tagline: p.tagline, tags: p.tags, caption: p.name, host: p.host };
}

const visuals: Record<string, IndustryVisual> = {
  "E-commerce & retail": card("weekendcart"),
  "SaaS & technology": card("leadpin"),
  "Events & hospitality": card("eventerp"),
  "Recruitment & careers": site("upward"),
  "Construction & trades": site("nassif-50"),
  "Consumer mobile apps": {
    kind: "apps",
    icons: apps.slice(0, 8).map((a) => ({ src: a.icon, name: a.name })),
    caption: `${playDeveloperName} on Google Play`,
    host: "play.google.com",
  },
};

const rows: IndustryRow[] = homeIndustries.map((industry, i) => ({
  name: industry.name,
  line: industry.line,
  num: pad(i + 1),
  visual: visuals[industry.name] ?? visuals["SaaS & technology"],
}));

export default function Industries() {
  return (
    <section id="industries" className="scroll-mt-4" aria-labelledby="industries-title">
      <Container>
        <div className={sectionSpace}>
          <Reveal>
            <SectionHeading
              id="industries-title"
              number={industriesCopy.number}
              eyebrow={industriesCopy.eyebrow}
              title={industriesCopy.title}
              lead={industriesCopy.lead}
            />
          </Reveal>

          <Reveal delay={80} className={bodyGap}>
            <IndustryShowcase rows={rows} />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
