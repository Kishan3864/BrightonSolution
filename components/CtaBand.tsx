import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import { LogoMark } from "@/components/Logo";
import { site } from "@/lib/site";
import styles from "./CtaBand.module.css";

export default function CtaBand() {
  return (
    <section id="cta" className="scroll-mt-4 pt-[clamp(2rem,1rem+3vw,4.5rem)] pb-[clamp(3.5rem,2rem+5vw,6.5rem)]" aria-labelledby="cta-title">
      <Container>
        <Reveal>
          <div
            className={`relative isolate overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface px-[clamp(1.25rem,0.5rem+3.4vw,4.5rem)] py-[clamp(2rem,1.2rem+3.6vw,5rem)] ${styles.card}`}
          >
            <div aria-hidden="true" className={styles.glow} />

            <SectionTitle variant="page">Start a project</SectionTitle>

            <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] grid gap-10 md:grid-cols-12 md:items-center md:gap-8">
              <div className="min-w-0 md:col-span-8">
                <h2 id="cta-title" className="text-h1 max-w-[14ch] text-balance">
                  Tell us what you need to build.
                </h2>
                <p className="text-lead mt-6 max-w-[44ch] text-muted">
                  Send a short note about your project and we will reply with honest next steps, whether or not that
                  involves us.
                </p>
                <div className="mt-9 flex flex-col items-start gap-x-7 gap-y-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <Button href="/contact">Let’s Talk</Button>
                  <a
                    href={`mailto:${site.email}`}
                    className="group inline-flex min-h-[44px] max-w-full items-center gap-2.5 text-[0.9375rem] text-fg transition-colors duration-200 hover:text-accent"
                  >
                    <Icon name="mail" size={18} className="text-accent" />
                    <span className="min-w-0 break-all decoration-1 underline-offset-[6px] group-hover:underline">
                      {site.email}
                    </span>
                  </a>
                </div>
              </div>

              {/* The logo's sun again at the close of the page: decorative, desktop and tablet only. */}
              <div className="hidden min-w-0 justify-center md:col-span-4 md:flex">
                <LogoMark className={`w-[min(100%,15rem)] ${styles.sun}`} raysClassName={styles.rays} />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
