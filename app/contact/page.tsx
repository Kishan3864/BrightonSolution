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
  description: `Tell BrightonSolution about your project. Send a short brief through the contact form or email ${site.email} and we will reply by email with next steps.`,
  path: "/contact",
});

const [emailUser, emailDomain] = site.email.split("@");

export default function ContactPage() {
  return (
    <>
      <PageHero eyebrow={contactHero.eyebrow} title={contactHero.title} lead={contactHero.lead} id="contact-hero" />

      <section
        id="contact"
        aria-label="Contact details and project brief form"
        className="pb-[clamp(3.5rem,2rem+6vw,7.5rem)]"
      >
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-x-12">
            <div className="min-w-0 md:col-span-5 md:self-start">
              <Reveal>
                <h2 className="eyebrow text-accent">Email</h2>
                <a
                  href={`mailto:${site.email}`}
                  data-track="mailto"
                  data-track-label="contact_email"
                  className="mt-2 inline-flex min-h-[44px] max-w-full items-center text-[clamp(1.0625rem,0.95rem+0.4vw,1.3125rem)] font-medium leading-snug tracking-[-0.015em] text-ink decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
                >
                  <span className="min-w-0 break-words">
                    {emailUser}@<wbr />
                    {emailDomain}
                  </span>
                </a>
                <p className="mt-1 max-w-[36ch] text-[0.875rem] leading-relaxed text-muted">{emailNote}</p>
              </Reveal>

              {site.phone ? (
                <Reveal delay={60} className="mt-8 border-t border-line pt-5">
                  <h2 className="eyebrow text-accent">Phone</h2>
                  <a
                    href={`tel:${site.phone.replace(/\s+/g, "")}`}
                    data-track="tel"
                    data-track-label="contact_phone"
                    className="mt-2 inline-flex min-h-[44px] items-center text-[1.0625rem] font-medium text-ink decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
                  >
                    {site.phone}
                  </a>
                </Reveal>
              ) : null}

              {site.address ? (
                <Reveal delay={60} className="mt-8 border-t border-line pt-5">
                  <h2 className="eyebrow text-accent">Address</h2>
                  <p className="mt-3 max-w-[36ch] whitespace-pre-line leading-relaxed text-ink">{site.address}</p>
                </Reveal>
              ) : null}

              <Reveal delay={100} className="mt-10 md:mt-14">
                <h2 className="eyebrow border-t border-line pt-5 text-accent">What happens next</h2>
                <ol className="mt-4 border-b border-line">
                  {nextSteps.map((step) => (
                    <li
                      key={step.number}
                      className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-t border-line py-4"
                    >
                      <span className="eyebrow pt-[0.35em] tabular-nums text-accent" aria-hidden="true">
                        {step.number}
                      </span>
                      <p className="max-w-[40ch] text-[0.9375rem] leading-relaxed text-ink">{step.text}</p>
                    </li>
                  ))}
                </ol>
              </Reveal>

              <Reveal delay={140} className="mt-10">
                <h2 className="eyebrow text-muted">{workingTogether.eyebrow}</h2>
                <p className="mt-3 max-w-[44ch] text-[0.875rem] leading-relaxed text-muted">{workingTogether.text}</p>
              </Reveal>
            </div>

            <Reveal
              delay={80}
              className="min-w-0 border-t border-line pt-10 md:col-span-7 md:border-t-0 md:pt-0 lg:col-span-6 lg:col-start-7"
            >
              <ContactForm />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
