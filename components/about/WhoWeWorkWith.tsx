import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { clientTypes, clientsIntro } from "@/lib/content/about";

export default function WhoWeWorkWith() {
  return (
    <section
      id="who-we-work-with"
      className="border-t border-line py-section scroll-mt-4"
      aria-labelledby="who-we-work-with-title"
    >
      <Container>
        <SectionHeading
          number="03"
          eyebrow="Who we work with"
          title={clientsIntro.title}
          lead={clientsIntro.lead}
          id="who-we-work-with-title"
        />

        <div className="mt-[clamp(2.25rem,1.5rem+2.5vw,4rem)] grid border-t border-line md:grid-cols-3 md:divide-x md:divide-line md:border-b">
          {clientTypes.map((client, i) => (
            <Reveal
              as="article"
              key={client.name}
              delay={i * 70}
              className="min-w-0 border-b border-line py-7 md:border-b-0 md:px-[clamp(1.25rem,0.75rem+1.5vw,2.25rem)] md:py-9 md:first:pl-0 md:last:pr-0"
            >
              <p className="eyebrow tabular-nums text-accent" aria-hidden="true">
                0{i + 1}
              </p>
              <h3 className="text-h3 mt-3">{client.name}</h3>
              <dl className="mt-6 space-y-5 text-[0.9375rem] leading-relaxed">
                <div>
                  <dt className="eyebrow text-muted">Typically need</dt>
                  <dd className="mt-1.5 max-w-[46ch] text-ink">{client.needs}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted">How we adapt</dt>
                  <dd className="mt-1.5 max-w-[46ch] text-muted">{client.adapt}</dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
