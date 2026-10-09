import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { whyUs } from "@/lib/site";
import { whyUsCopy, bodyGap, pad } from "@/lib/content/home-b";

export default function WhyUs() {
  return (
    <section id="why-us" className="py-section scroll-mt-24" aria-labelledby="why-us-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="why-us-title"
            number={whyUsCopy.number}
            eyebrow={whyUsCopy.eyebrow}
            title={whyUsCopy.title}
          />
        </Reveal>

        <div className={`${bodyGap} grid gap-10 md:grid-cols-12 md:gap-8`}>
          <Reveal delay={60} className="min-w-0 md:col-span-5 lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <div className="max-w-[40ch]">
              {whyUsCopy.standing.map((paragraph, i) => (
                <p
                  key={i}
                  className={`text-[1.0625rem] leading-relaxed ${i === 0 ? "text-ink" : "mt-4 text-muted"}`}
                >
                  {paragraph}
                </p>
              ))}
              <div className="mt-8">
                <Button href={whyUsCopy.link.href} variant="ghost">
                  {whyUsCopy.link.label}
                </Button>
              </div>
            </div>
          </Reveal>

          <ol className="min-w-0 border-b border-line md:col-span-7 lg:col-span-7 lg:col-start-6">
            {whyUs.map((reason, i) => (
              <Reveal
                as="li"
                key={reason.title}
                delay={80 + i * 60}
                className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-x-4 border-t border-line py-7 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-x-6 md:py-8"
              >
                <span className="eyebrow pt-2 tabular-nums text-accent" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <div className="min-w-0">
                  <h3 className="text-h3 max-w-[24ch] text-balance tracking-tight">{reason.title}</h3>
                  <p className="mt-3 max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                    {reason.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
