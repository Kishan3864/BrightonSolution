import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/ContactForm";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { contactHero, emailNote, nextSteps, workingTogether } from "@/lib/content/contact";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Tell BrightonSolution about your project. Send a short brief through the contact form or email ${site.email} and we will reply with next steps.`,
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow={contactHero.eyebrow} title={contactHero.title} lead={contactHero.lead} id="contact-hero" />

      <section
        id="contact"
        aria-label="Contact details and project brief form"
        className="pb-[clamp(3.5rem,2rem+6vw,8rem)]"
      >
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-x-12">
            <div className="min-w-0 md:col-span-5 md:self-start lg:col-span-5">
              <Reveal>
                <h2 className="eyebrow text-accent">Email</h2>
                <a
                  href={`mailto:${site.email}`}
                  className="mt-3 inline-flex min-h-[44px] max-w-full items-center text-[clamp(1.0625rem,0.85rem+0.5vw,1.5rem)] font-semibold leading-snug tracking-tight text-ink decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
                >
                  <span className="min-w-0 break-words">
                    {site.email.split("@")[0]}@<wbr />
                    {site.email.split("@")[1]}
                  </span>
                </a>
                <p className="mt-2 max-w-[36ch] text-[0.9375rem] leading-relaxed text-muted">{emailNote}</p>
              </Reveal>

              {site.phone ? (
                <Reveal delay={60} className="mt-10 border-t border-line pt-5">
                  <h2 className="eyebrow text-accent">Phone</h2>
                  <a
                    href={`tel:${site.phone.replace(/\s+/g, "")}`}
                    className="text-h3 mt-3 inline-flex min-h-[44px] items-center tracking-tight text-ink decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
                  >
                    {site.phone}
                  </a>
                </Reveal>
              ) : null}

              {site.address ? (
                <Reveal delay={60} className="mt-10 border-t border-line pt-5">
                  <h2 className="eyebrow text-accent">Address</h2>
                  <p className="mt-3 max-w-[36ch] whitespace-pre-line text-[1.0625rem] leading-relaxed text-ink">
                    {site.address}
                  </p>
                </Reveal>
              ) : null}

              <Reveal delay={120} className="mt-12 md:mt-16">
                <h2 className="eyebrow border-t border-line pt-5 text-accent">What happens next</h2>
                <ol className="mt-5 border-b border-line">
                  {nextSteps.map((step) => (
                    <li key={step.number} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4 border-t border-line py-5">
                      <span className="eyebrow pt-1 tabular-nums text-accent" aria-hidden="true">
                        {step.number}
                      </span>
                      <p className="max-w-[36ch] text-[1.0625rem] leading-relaxed text-ink">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>
            </div>

            <Reveal delay={80} className="min-w-0 border-t border-line pt-10 md:col-span-6 md:col-start-7 md:border-t-0 md:pt-0">
              <ContactForm />
            </Reveal>
          </div>
        </Container>
      </section>

      <section aria-labelledby="working-together-title" className="pb-[clamp(4rem,2rem+8vw,9rem)]">
        <Container>
          <div className="hairline" />
          <Reveal className="grid gap-5 pt-8 md:grid-cols-12 md:gap-8 md:pt-10">
            <div className="md:col-span-4 lg:col-span-3">
              <h2 id="working-together-title" className="eyebrow text-accent">
                {workingTogether.eyebrow}
              </h2>
            </div>
            <div className="min-w-0 md:col-span-8 lg:col-span-7">
              <p className="max-w-[62ch] text-[1.0625rem] leading-relaxed text-muted">{workingTogether.text}</p>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
