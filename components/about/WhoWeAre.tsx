import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { whoWeAre } from "@/lib/content/about";
import { site } from "@/lib/site";

export default function WhoWeAre() {
  return (
    <section id="who-we-are" className="py-section scroll-mt-24" aria-labelledby="who-we-are-title">
      <Container>
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-12 md:grid-rows-[auto_1fr]">
          <Reveal className="min-w-0 md:col-span-4 md:row-start-1 lg:col-span-3">
            <h2 id="who-we-are-title" className="eyebrow flex items-baseline gap-3 text-accent">
              <span className="tabular-nums" aria-hidden="true">
                01
              </span>
              <span>Who we are</span>
            </h2>
          </Reveal>

          <Reveal
            delay={100}
            className="min-w-0 md:col-span-8 md:col-start-5 md:row-span-2 md:row-start-1 lg:col-span-8 lg:col-start-5"
          >
            <p className="max-w-[34ch] text-balance text-[clamp(1.375rem,1.05rem+1.4vw,2rem)] font-medium leading-[1.3] tracking-tight">
              {whoWeAre.statement}
            </p>
            <div className="mt-8 space-y-6">
              {whoWeAre.paragraphs.map((text) => (
                <p key={text.slice(0, 24)} className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-muted">
                  {text}
                </p>
              ))}
            </div>
          </Reveal>

          <Reveal
            delay={160}
            className="min-w-0 md:col-span-4 md:col-start-1 md:row-start-2 md:self-start lg:col-span-3"
          >
            <dl className="border-b border-line">
              {whoWeAre.facts.map((fact) => (
                <div key={fact.label} className="border-t border-line py-5">
                  <dt className="eyebrow text-muted">{fact.label}</dt>
                  <dd className="mt-2 max-w-[30ch] text-[0.9375rem] leading-relaxed">{fact.value}</dd>
                </div>
              ))}
              <div className="border-t border-line py-5">
                <dt className="eyebrow text-muted">Contact</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-flex min-h-[44px] max-w-full items-center text-[0.9375rem] decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
                  >
                    <span className="min-w-0 break-words">
                      {site.email.split("@")[0]}@<wbr />
                      {site.email.split("@")[1]}
                    </span>
                  </a>
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
