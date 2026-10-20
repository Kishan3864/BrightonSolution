import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { whyUsCopy, whyUsItems, bodyGap, pad } from "@/lib/content/home-b";

/** Six reasons as numbered columns: a large light numeral over each, a vertical rule beside it. */
export default function WhyUs() {
  return (
    <section id="why-us" className="py-section scroll-mt-4" aria-labelledby="why-us-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="why-us-title"
            number={whyUsCopy.number}
            eyebrow={whyUsCopy.eyebrow}
            title={whyUsCopy.title}
            lead={whyUsCopy.lead}
          />
        </Reveal>

        {/* Aligned to the heading column so the list reads as the answer to it. */}
        <div className={`${bodyGap} md:grid md:grid-cols-12 md:gap-8`}>
          <ol className="grid min-w-0 gap-x-10 gap-y-10 sm:grid-cols-2 md:col-span-11 md:col-start-2 lg:col-span-9 lg:col-start-4 lg:gap-x-14 lg:gap-y-14">
            {whyUsItems.map((reason, i) => (
              <Reveal
                as="li"
                key={reason.title}
                delay={(i % 2) * 80 + Math.floor(i / 2) * 40}
                className="min-w-0 border-l border-line-strong pl-5 sm:pl-6"
              >
                <span
                  className="block font-display text-[clamp(2.5rem,2rem+1.6vw,3.5rem)] leading-none font-light tracking-[-0.05em] text-fg/30 tabular-nums"
                  aria-hidden="true"
                >
                  {pad(i + 1)}
                </span>
                <h3 className="mt-5 text-[clamp(1.0625rem,1rem+0.35vw,1.25rem)] leading-snug font-medium tracking-[-0.015em] text-balance">
                  {reason.title}
                </h3>
                <p className="mt-2 max-w-[44ch] text-[0.9375rem] leading-relaxed text-muted">{reason.description}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
