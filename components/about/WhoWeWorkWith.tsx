import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { clientTypes, clientsIntro } from "@/lib/content/about";

export default function WhoWeWorkWith() {
  return (
    <section
      id="who-we-work-with"
      className="border-t border-line py-section scroll-mt-24"
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

        <div className="mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid border-t border-line md:grid-cols-3 md:divide-x md:divide-line md:border-b">
          {clientTypes.map((client, i) => (
            <Reveal
              as="article"
              key={client.name}
              delay={i * 80}
              className="min-w-0 border-b border-line py-8 md:border-b-0 md:px-[clamp(1.5rem,1rem+1.5vw,2.5rem)] md:py-10 md:first:pl-0 md:last:pr-0"
            >
              <p className="eyebrow tabular-nums text-accent">0{i + 1}</p>
              <h3 className="text-h3 mt-4 tracking-tight">{client.name}</h3>
              <dl className="mt-8 space-y-6">
                <div>
                  <dt className="eyebrow text-muted">Typically need</dt>
                  <dd className="mt-2 max-w-[48ch] text-[1.0625rem] leading-relaxed">{client.needs}</dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted">How we adapt</dt>
                  <dd className="mt-2 max-w-[48ch] text-[1.0625rem] leading-relaxed text-muted">{client.adapt}</dd>
                </div>
              </dl>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
