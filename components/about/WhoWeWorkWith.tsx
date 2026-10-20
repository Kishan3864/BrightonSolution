import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { clientTypes, clientsIntro, type ClientType } from "@/lib/content/about";

/* An asymmetric trio rather than three equal columns:
     lg  : [ Startups 5 ][ Small businesses 7 ]
           [ Enterprises 12, details in two columns ]
     md  : two columns, Enterprises across both
     < md: one column
   All three share the dark surfaces; Small businesses is marked only by an
   orange top hairline, so no card outshouts the section. */
const layouts = [
  { span: "lg:col-span-5", tone: "plain", wide: false },
  { span: "lg:col-span-7", tone: "accent", wide: false },
  { span: "md:col-span-2 lg:col-span-12", tone: "raised", wide: true },
] as const;

export default function WhoWeWorkWith() {
  return (
    <section id="who-we-work-with" className="pb-section scroll-mt-4" aria-labelledby="who-we-work-with-title">
      <Container>
        <Reveal>
          <SectionHeading
            number="03"
            eyebrow="Who we work with"
            title={clientsIntro.title}
            lead={clientsIntro.lead}
            id="who-we-work-with-title"
          />
        </Reveal>

        <div className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          {clientTypes.map((client, i) => {
            const layout = layouts[i % layouts.length];
            return (
              <Reveal key={client.name} delay={i * 70} className={`flex min-w-0 ${layout.span}`}>
                <ClientCard client={client} number={i + 1} tone={layout.tone} wide={layout.wide} />
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}

type Tone = (typeof layouts)[number]["tone"];

const tones: Record<Tone, { card: string; label: string; need: string; adapt: string; number: string }> = {
  plain: {
    card: "border border-line bg-surface text-fg",
    label: "text-muted",
    need: "text-fg",
    adapt: "text-muted",
    number: "text-accent",
  },
  accent: {
    card: "border border-line border-t-accent bg-surface-2 text-fg",
    label: "text-muted",
    need: "text-fg",
    adapt: "text-muted",
    number: "text-accent",
  },
  raised: {
    card: "border border-line-strong bg-surface-2 text-fg",
    label: "text-muted",
    need: "text-fg",
    adapt: "text-muted",
    number: "text-accent",
  },
};

function ClientCard({ client, number, tone, wide }: { client: ClientType; number: number; tone: Tone; wide: boolean }) {
  const t = tones[tone];

  return (
    <article
      className={`flex w-full flex-col rounded-[var(--radius-card)] p-[clamp(1.5rem,1rem+1.5vw,2.5rem)] ${t.card} ${
        wide ? "lg:grid lg:grid-cols-12 lg:gap-x-8" : ""
      }`}
    >
      <div className={`min-w-0 ${wide ? "lg:col-span-4" : ""}`}>
        <p
          className={`font-display text-[clamp(2.5rem,2rem+2vw,4rem)] font-light leading-[0.9] tracking-[-0.05em] tabular-nums ${t.number}`}
          aria-hidden="true"
        >
          0{number}
        </p>
        <h3 className="mt-5 font-display text-[clamp(1.5rem,1.25rem+0.9vw,2rem)] font-medium leading-tight tracking-[-0.03em]">
          {client.name}
        </h3>
      </div>
      <dl
        className={`grid gap-6 text-[0.9375rem] leading-relaxed ${
          wide ? "mt-8 md:grid-cols-2 md:gap-x-8 lg:col-span-8 lg:mt-0" : "pt-8"
        }`}
      >
        <div className="min-w-0">
          <dt className={`eyebrow ${t.label}`}>Typically need</dt>
          <dd className={`mt-2 max-w-[48ch] ${t.need}`}>{client.needs}</dd>
        </div>
        <div className="min-w-0">
          <dt className={`eyebrow ${t.label}`}>How we adapt</dt>
          <dd className={`mt-2 max-w-[48ch] ${t.adapt}`}>{client.adapt}</dd>
        </div>
      </dl>
    </article>
  );
}
