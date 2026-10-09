import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Button from "@/components/ui/Button";
import { site } from "@/lib/site";
import { nextSteps } from "@/lib/content/contact";

export const metadata: Metadata = {
  title: "Thank you",
  description: "Your message has reached BrightonSolution.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <>
      <PageHero
        id="thank-you"
        eyebrow="Message received"
        title="Thank you — we have your message"
        lead={`Your brief has reached our team. Replies come from ${site.email}, so keep an eye on your inbox and spam folder.`}
      />
      <section aria-labelledby="thank-you-next" className="pb-[clamp(3.5rem,2rem+6vw,7.5rem)]">
        <Container>
          <div className="grid gap-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4 lg:col-span-3">
              <h2 id="thank-you-next" className="eyebrow text-muted">
                What happens next
              </h2>
            </div>
            <div className="min-w-0 md:col-span-8 lg:col-span-9">
              <ol className="border-t border-line">
                {nextSteps.map((step) => (
                  <li
                    key={step.number}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-4 sm:grid-cols-[3rem_minmax(0,1fr)]"
                  >
                    <span
                      className="font-mono text-[0.75rem] leading-[1.6rem] tracking-[0.08em] text-muted"
                      aria-hidden="true"
                    >
                      {step.number}
                    </span>
                    <span className="min-w-0 max-w-[60ch]">{step.text}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-8 max-w-[56ch] text-muted">
                In the meantime, you can look through the products we have built or read how we work.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
                <Button href="/work" variant="dark">
                  See our work
                </Button>
                <Button href="/services" variant="ghost">
                  Explore services
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
