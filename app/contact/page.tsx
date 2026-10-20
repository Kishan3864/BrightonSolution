import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import Icon from "@/components/ui/Icon";
import ContactForm from "@/components/ContactForm";
import StepRail from "@/components/system/StepRail";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";
import { contactHero, emailNote, nextSteps, workingTogether } from "@/lib/content/contact";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description: `Tell BrightonSolution about your project. Send a short brief through the contact form or email ${site.email} and we will reply by email with next steps.`,
  path: "/contact",
});

const [emailUser, emailDomain] = site.email.split("@");
const instagramHandle = `@${site.instagramUrl.replace(/\/+$/, "").split("/").pop() ?? ""}`;

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
          {/* Phones and tablets: details, then the form. From lg: details left (5 of 12), form panel right (7). */}
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
            <div className="min-w-0 lg:col-span-5">
              {/* Direct channels: two columns on tablets, stacked beside the form from lg. */}
              <div className="grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-1 lg:gap-8">
                <Reveal className="min-w-0">
                  <h2 className="eyebrow text-accent">Email</h2>
                  <a
                    href={`mailto:${site.email}`}
                    data-track="mailto"
                    data-track-label="contact_email"
                    className="mt-3 inline-flex min-h-[44px] max-w-full items-center font-display text-[clamp(1.25rem,0.75rem+1.3vw,1.875rem)] font-medium leading-tight tracking-[-0.03em] text-fg decoration-accent decoration-1 underline-offset-8 transition-colors duration-200 hover:text-accent hover:underline"
                  >
                    <span className="min-w-0 break-words">
                      {emailUser}@<wbr />
                      {emailDomain}
                    </span>
                  </a>
                  <p className="mt-2 max-w-[36ch] text-[0.9375rem] leading-relaxed text-muted">{emailNote}</p>
                </Reveal>

                <Reveal delay={60} className="min-w-0 md:border-l md:border-line md:pl-10 lg:border-l-0 lg:border-t lg:pl-0 lg:pt-8">
                  <h2 className="eyebrow text-accent">Instagram</h2>
                  <a
                    href={site.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track="outbound"
                    data-track-label="instagram_contact"
                    className="group mt-3 flex min-h-[64px] max-w-[26rem] items-center gap-4 rounded-sharp border border-line bg-surface p-2.5 pr-4 transition-[border-color,background-color,transform] duration-200 hover:border-line-strong hover:bg-surface-2 motion-safe:hover:-translate-y-0.5"
                  >
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sharp bg-accent text-canvas">
                      <Icon name="instagram" size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium tracking-[-0.01em] text-fg">{instagramHandle}</span>
                      <span className="block text-[0.8125rem] text-muted">Follow our work on Instagram</span>
                    </span>
                    <Icon
                      name="arrowUpRight"
                      size={18}
                      className="text-muted transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </Reveal>

                {site.phone ? (
                  <Reveal delay={60} className="min-w-0 border-t border-line pt-6">
                    <h2 className="eyebrow text-accent">Phone</h2>
                    <a
                      href={`tel:${site.phone.replace(/\s+/g, "")}`}
                      data-track="tel"
                      data-track-label="contact_phone"
                      className="mt-2 inline-flex min-h-[44px] items-center text-[1.0625rem] font-medium text-fg decoration-1 underline-offset-8 transition-colors hover:text-accent hover:underline"
                    >
                      {site.phone}
                    </a>
                  </Reveal>
                ) : null}

                {site.address ? (
                  <Reveal delay={60} className="min-w-0 border-t border-line pt-6">
                    <h2 className="eyebrow text-accent">Address</h2>
                    <p className="mt-3 max-w-[36ch] whitespace-pre-line leading-relaxed text-fg">{site.address}</p>
                  </Reveal>
                ) : null}
              </div>

              <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10 lg:mt-16 lg:grid-cols-1 lg:gap-14">
                <Reveal delay={100} className="min-w-0">
                  <SectionTitle as="h2" variant="sub">
                    What happens next
                  </SectionTitle>
                  <StepRail steps={nextSteps} className="mt-6 text-[0.9375rem]" />
                </Reveal>

                <Reveal delay={140} className="min-w-0">
                  <SectionTitle as="h2" variant="sub">
                    {workingTogether.eyebrow}
                  </SectionTitle>
                  <p className="mt-5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">{workingTogether.text}</p>
                </Reveal>
              </div>
            </div>

            <Reveal delay={80} className="min-w-0 lg:col-span-7">
              <div className="rounded-[var(--radius-card)] border border-line bg-surface p-[clamp(1.25rem,0.6rem+2.6vw,2.75rem)]">
                <ContactForm />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
