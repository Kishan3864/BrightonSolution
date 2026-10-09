import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { whyUsCopy, whyUsItems, bodyGap, pad } from "@/lib/content/home-b";

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
          <ol className="grid min-w-0 border-b border-line sm:grid-cols-2 sm:gap-x-10 md:col-span-8 md:grid-cols-1 lg:grid-cols-2 md:col-start-5 lg:col-span-9 lg:col-start-4 lg:gap-x-14">
            {whyUsItems.map((reason, i) => (
              <Reveal
                as="li"
                key={reason.title}
                delay={i * 50}
                className="grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-t border-line py-5 md:py-6"
              >
                <span className="eyebrow tabular-nums text-accent" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium tracking-[-0.01em] text-balance sm:text-[1.0625rem]">
                    {reason.title}
                  </h3>
                  <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-muted">{reason.description}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
