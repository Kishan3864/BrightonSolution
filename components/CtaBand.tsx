import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { site } from "@/lib/site";

export default function CtaBand() {
  return (
    <section id="cta" className="section-dark py-section scroll-mt-24" aria-labelledby="cta-title">
      <Container>
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <Reveal className="min-w-0 md:col-span-7">
            <p className="eyebrow text-accent-soft">Start a project</p>
            <h2 id="cta-title" className="text-h2 mt-5 max-w-[16ch] text-balance tracking-tight">
              Tell us what you need to build.
            </h2>
          </Reveal>
          <Reveal delay={120} className="min-w-0 md:col-span-5 md:self-end lg:col-span-5 lg:col-start-8">
            <p className="max-w-[42ch] text-[1.0625rem] leading-relaxed text-muted-dark">
              Send a short note about your project and we will reply with honest next steps, whether or not that
              involves us.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 xl:flex-row xl:items-center xl:gap-6">
              <Button href="/contact" variant="light" className="whitespace-nowrap">
                Let’s Talk
              </Button>
              <a
                href={`mailto:${site.email}`}
                className="inline-flex min-h-[44px] items-center break-words text-paper decoration-1 underline-offset-8 hover:underline"
              >
                {site.email}
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
