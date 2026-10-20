import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import { principles, principlesIntro } from "@/lib/content/about";

/** Principles as a sticky split: the statement holds on the left (lg) while the
 *  numbered list scrolls past on the right. Under lg the two simply stack. */
export default function Principles() {
  return (
    <section id="principles" className="pb-section scroll-mt-4" aria-labelledby="principles-title">
      <Container>
        <Reveal>
          <SectionTitle number="02">What we believe</SectionTitle>
        </Reveal>

        <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] grid gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <Reveal className="lg:sticky lg:top-28">
              <h2 id="principles-title" className="text-h2 max-w-[18ch] text-balance">
                {principlesIntro.title}
              </h2>
              <p className="text-lead mt-4 max-w-[46ch] text-muted">{principlesIntro.lead}</p>
            </Reveal>
          </div>

          <ol role="list" className="min-w-0 divide-y divide-line lg:col-span-7">
            {principles.map((principle, i) => (
              <Reveal
                as="li"
                key={principle.number}
                delay={i * 50}
                className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 py-[clamp(1.5rem,1.2rem+1vw,2.25rem)] first:pt-0 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-6"
              >
                <span
                  className="font-display text-[clamp(2rem,1.6rem+1.6vw,3rem)] font-light leading-[0.9] tracking-[-0.04em] text-muted tabular-nums"
                  aria-hidden="true"
                >
                  {principle.number}
                </span>
                <div className="min-w-0">
                  <h3 className="text-h3 max-w-[30ch] text-balance">{principle.title}</h3>
                  <p className="mt-2.5 max-w-[56ch] leading-relaxed text-muted">{principle.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
