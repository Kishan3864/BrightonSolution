import Logo from "@/components/Logo";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
import Reveal from "@/components/ui/Reveal";
import ProjectMedia from "@/components/work/ProjectMedia";
import ConsentSettingsButton from "@/components/analytics/ConsentSettingsButton";
import LaunchProvider from "@/components/launch/LaunchProvider";
import LeadForm from "@/components/launch/LeadForm";
import Plans from "@/components/launch/Plans";
import MobileCtaBar from "@/components/launch/MobileCtaBar";
import {
  briefSection,
  ctaLabel,
  faq,
  finalCta,
  howItWorks,
  launchHero,
  plansSection,
  proofSection,
} from "@/lib/content/launch";
import { firebaseConfig } from "@/lib/firebase/config";
import { services, site } from "@/lib/site";
import { APP_ICON_SIZE, apps, getProject, playDeveloperUrl, webProjects, type WebProject } from "@/lib/work";
import styles from "./launch.module.css";

const showConsentSettings = firebaseConfig.measurementId.trim() !== "";

const primaryButton =
  "group inline-flex min-h-[52px] items-center justify-center gap-2.5 whitespace-nowrap rounded-sharp bg-accent px-6 text-[1rem] font-semibold tracking-tight text-canvas transition-[background-color,transform] duration-200 hover:bg-accent-2 active:translate-y-px";
const secondaryButton =
  "inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-sharp border border-line-strong px-6 text-[1rem] font-medium tracking-tight text-fg transition-[border-color,background-color] duration-200 hover:border-fg hover:bg-fg/5";

function CtaLink({ label, track, className = "" }: { label: string; track: string; className?: string }) {
  return (
    <a href="#brief" data-track="cta_click" data-track-label={track} className={`${primaryButton} ${className}`.trim()}>
      {label}
      <Icon name="arrow" size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
    </a>
  );
}

/**
 * The private landing page (LAUNCH_PATH): one focused path from the promise to the brief form,
 * with the plans at the end. No site navigation or footer, so the only ways forward are the form
 * and the plan requests. Proof is the company's real, live work.
 */
export default function LaunchPage() {
  const stack = [getProject("recruitment-suite"), getProject("weekendcart"), getProject("flexypdf")];

  return (
    <LaunchProvider>
      <LaunchHeader />
      <Hero stack={stack} />
      <Facts />
      <Proof />
      <HowItWorks />
      <Brief />
      <section id="plans" aria-labelledby="plans-title" className="scroll-mt-16 py-section">
        <Container>
          <Plans />
          <p className="mt-6 text-[0.9375rem] text-muted">
            {plansSection.custom}{" "}
            <a
              href="#brief"
              data-track="cta_click"
              data-track-label="launch_plans_custom"
              className="font-medium text-fg underline decoration-1 underline-offset-4 transition-colors hover:text-accent"
            >
              {plansSection.customLink}
            </a>
            .
          </p>
        </Container>
      </section>
      <Faq />
      <FinalCta />
      <LaunchFooter />
      <MobileCtaBar />
    </LaunchProvider>
  );
}

function LaunchHeader() {
  return (
    <header className={`sticky top-0 z-50 border-b border-line ${styles.headerBar}`}>
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-4 px-[clamp(1rem,0.5rem+2.5vw,3rem)]">
        <a href="#top" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution, back to top">
          <Logo />
        </a>
        <nav aria-label="Page" className="flex items-center gap-1 sm:gap-3">
          <a
            href="#plans"
            className="hidden min-h-[44px] items-center px-3 text-[0.875rem] font-medium text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            Plans
          </a>
          <a
            href="#faq"
            className="hidden min-h-[44px] items-center px-3 text-[0.875rem] font-medium text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            FAQ
          </a>
          <a
            href="#brief"
            data-track="cta_click"
            data-track-label="launch_header_quote"
            className="inline-flex min-h-[44px] items-center rounded-sharp bg-fg px-4 text-[0.875rem] font-semibold text-canvas transition-colors hover:bg-accent"
          >
            Free quote
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero({ stack }: { stack: WebProject[] }) {
  const layers = [styles.back, styles.mid, styles.front];
  return (
    <section
      id="hero"
      aria-labelledby="launch-title"
      className="relative overflow-hidden pt-[clamp(2.5rem,1.25rem+4vw,5.5rem)] pb-[clamp(3rem,1.5rem+5vw,6rem)]"
    >
      <span id="top" className="absolute top-0" aria-hidden="true" />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="relative z-10 min-w-0 lg:col-span-6 xl:col-span-6">
            <p className="eyebrow text-accent">{launchHero.eyebrow}</p>
            <h1
              id="launch-title"
              className="mt-5 max-w-[14ch] font-display text-[clamp(2.5rem,1.4rem+4.2vw,4.75rem)] font-medium leading-[1.02] tracking-[-0.045em] text-balance"
            >
              {launchHero.title}
            </h1>
            <p className="text-lead mt-6 max-w-[42ch] text-muted">{launchHero.lead}</p>
            <div className="mt-9 flex flex-col gap-3 min-[460px]:flex-row min-[460px]:flex-wrap">
              <CtaLink label={launchHero.primary} track="launch_hero_quote" />
              <a href="#plans" data-track="cta_click" data-track-label="launch_hero_plans" className={secondaryButton}>
                {launchHero.secondary}
              </a>
            </div>
          </div>

          {/* Real, live projects in a depth stack: decorative here, the same work is listed below. */}
          <div className={`min-w-0 lg:col-span-6 ${styles.visual}`} aria-hidden="true">
            <div className={styles.stack}>
              {stack.map((project, index) => (
                <div key={project.slug} className={`${styles.layer} ${layers[index]}`}>
                  <ProjectMedia project={project} chrome eager={index === 2} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Facts() {
  const facts = [
    { value: String(webProjects.length), label: "web platforms and sites built" },
    { value: String(apps.length), label: "Android apps live on Google Play" },
    { value: String(services.length), label: "services under one team" },
    { value: "100%", label: "code ownership for you" },
  ];
  return (
    <section aria-label="BrightonSolution in numbers" className="border-y border-line bg-surface">
      <Container>
        <dl className="grid grid-cols-2 md:grid-cols-4">
          {/* Phones: two by two with hairlines between. md: one row. The label is the dt; the number shows above it. */}
          {facts.map((fact, index) => (
            <div
              key={fact.label}
              className={[
                "flex min-w-0 flex-col-reverse justify-end border-line py-7 md:py-9",
                index % 2 === 1 ? "border-l pl-5" : "",
                index > 1 ? "border-t md:border-t-0" : "",
                index > 0 ? "md:border-l md:pl-8" : "",
              ].join(" ")}
            >
              <dt className="mt-2.5 max-w-[20ch] text-[0.9375rem] leading-snug text-muted">{fact.label}</dt>
              <dd className="font-display text-[clamp(2.25rem,1.6rem+2.2vw,3.5rem)] font-medium leading-none tracking-[-0.04em] tabular-nums text-fg">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

function ProofTile({ project, className = "", large = false }: { project: WebProject; className?: string; large?: boolean }) {
  return (
    <li className={`min-w-0 ${className}`.trim()}>
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        data-track="outbound"
        data-track-label={`launch_proof_${project.slug}`}
        className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-3 transition-colors duration-300 hover:border-line-strong sm:p-4"
      >
        <ProjectMedia project={project} />
        <span className="flex items-start justify-between gap-4 px-1 pt-4 pb-1">
          <span className="min-w-0">
            <span
              className={`block font-display font-medium leading-tight tracking-[-0.025em] text-fg ${
                large ? "text-[clamp(1.375rem,1.1rem+0.9vw,1.875rem)]" : "text-[1.25rem]"
              }`}
            >
              {project.name}
            </span>
            <span className="mt-1 block text-[0.875rem] text-muted">
              {project.category}
              {large ? `. ${project.tagline}` : ""}
            </span>
          </span>
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-muted transition-colors duration-300 group-hover:border-accent group-hover:text-accent">
            <Icon name="arrowUpRight" size={16} />
          </span>
        </span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </li>
  );
}

function Proof() {
  return (
    <section aria-labelledby="proof-title" className="py-section">
      <Container>
        <Reveal>
          <h2 id="proof-title" className="text-h1 max-w-[20ch] text-balance">
            {proofSection.title}
          </h2>
          <p className="text-lead mt-5 max-w-[56ch] text-muted">{proofSection.lead}</p>
        </Reveal>

        {/* Phones: one column. md: two columns. lg: big FlexyPdf tile with the apps and WeekendCart beside it,
            then two half-width tiles. Five items, five cells. */}
        <ul role="list" className="mt-[clamp(2.5rem,1.5rem+3vw,4rem)] grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <ProofTile project={getProject("flexypdf")} large className="md:col-span-2 lg:col-span-4 lg:row-span-2" />

          <li className="min-w-0 lg:col-span-2">
            <a
              href={playDeveloperUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-track="play"
              data-track-label="launch_proof_play"
              className="group flex h-full flex-col justify-between gap-6 rounded-[var(--radius-card)] border border-line bg-[radial-gradient(120%_90%_at_100%_0%,rgba(237,148,59,0.16),transparent_60%)] bg-surface p-5 transition-colors duration-300 hover:border-line-strong sm:p-6"
            >
              <span className="grid grid-cols-5 gap-2.5">
                {apps.map((app) => (
                  <img
                    key={app.slug}
                    src={app.icon}
                    alt=""
                    width={APP_ICON_SIZE}
                    height={APP_ICON_SIZE}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full rounded-[22%] border border-line object-cover"
                  />
                ))}
              </span>
              <span className="flex items-end justify-between gap-4">
                <span>
                  <span className="block font-display text-[1.25rem] font-medium leading-tight tracking-[-0.025em]">
                    {apps.length} Android apps
                  </span>
                  <span className="mt-1 block text-[0.875rem] text-muted">Published on Google Play</span>
                </span>
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line-strong text-muted transition-colors duration-300 group-hover:border-accent group-hover:text-accent">
                  <Icon name="arrowUpRight" size={16} />
                </span>
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>

          <ProofTile project={getProject("weekendcart")} className="lg:col-span-2" />
          <ProofTile project={getProject("empire-event")} className="lg:col-span-3" />
          <ProofTile project={getProject("upward")} className="lg:col-span-3" />
        </ul>
      </Container>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="border-t border-line bg-surface py-section">
      <Container>
        <Reveal>
          <h2 id="how-title" className="text-h1 max-w-[18ch] text-balance">
            {howItWorks.title}
          </h2>
        </Reveal>
        {/* Phones: a vertical rail. md: two by two. lg: one row joined by a line. */}
        <ol className="relative mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] grid gap-10 md:grid-cols-2 md:gap-x-10 lg:grid-cols-4 lg:gap-8">
          <span aria-hidden="true" className="absolute top-6 right-[12%] left-6 hidden h-px bg-line-strong lg:block" />
          {howItWorks.steps.map((item, index) => (
            <Reveal as="li" key={item.title} delay={index * 90} className="relative min-w-0">
              <span className="relative z-10 inline-flex size-12 items-center justify-center rounded-full border border-accent bg-canvas font-mono text-[0.875rem] tabular-nums text-accent">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-h3 mt-6">{item.title}</h3>
              <p className="mt-3 max-w-[34ch] text-[0.9375rem] leading-relaxed text-muted">{item.text}</p>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-[0.8125rem] text-fg">
                <Icon name="clock" size={14} className="text-accent" />
                {item.meta}
              </p>
            </Reveal>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function Brief() {
  return (
    <section id="brief" aria-labelledby="brief-title" className="scroll-mt-16 py-section">
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-x-12 xl:gap-x-16">
          <div className="min-w-0 lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow text-accent">{briefSection.eyebrow}</p>
              <h2 id="brief-title" className="text-h1 mt-5 max-w-[16ch] text-balance">
                {briefSection.title}
              </h2>
              <p className="text-lead mt-5 max-w-[44ch] text-muted">{briefSection.lead}</p>
              <ul role="list" className="mt-9 grid gap-5">
                {briefSection.promises.map((item) => (
                  <li key={item.text} className="flex items-center gap-4">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sharp border border-line-strong bg-surface text-accent">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="text-[1rem] leading-snug text-fg">{item.text}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-9 flex max-w-[44ch] items-start gap-2.5 text-sm leading-relaxed text-muted">
                <Icon name="shield" size={18} className="mt-px text-accent" />
                {briefSection.privacy}
              </p>
            </div>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <div className="rounded-[var(--radius-card)] border border-line-strong bg-surface p-5 shadow-[0_40px_120px_-48px_rgba(237,148,59,0.35)] sm:p-8 md:p-10">
              <LeadForm />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-16 border-t border-line py-section">
      <Container>
        {/* Phones: heading, then the questions. lg: heading in the left third, questions beside it. */}
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-4">
            <h2 id="faq-title" className="text-h1 max-w-[12ch] text-balance">
              Questions before you start
            </h2>
            <p className="mt-5 max-w-[36ch] text-muted">
              Something else on your mind? Write it in the form and we will answer it in your plan.
            </p>
          </div>
          <div className="min-w-0 lg:col-span-8">
            {faq.map((item) => (
              <details key={item.q} className="group border-b border-line first:border-t">
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.0625rem] font-medium leading-snug text-fg transition-colors hover:text-accent [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-strong text-muted transition-transform duration-300 group-open:rotate-45 group-open:border-accent group-open:text-accent">
                    <Icon name="plus" size={16} />
                  </span>
                </summary>
                <p className="max-w-[62ch] pb-6 text-[0.9375rem] leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

function FinalCta() {
  return (
    <section aria-labelledby="final-title" className="pb-section">
      <Container>
        <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-accent/40 bg-[radial-gradient(90%_140%_at_0%_100%,rgba(237,148,59,0.24),transparent_60%)] bg-surface px-6 py-[clamp(3rem,2rem+4vw,5.5rem)] sm:px-10 md:px-14">
          <h2 id="final-title" className="text-h1 max-w-[16ch] text-balance">
            {finalCta.title}
          </h2>
          <p className="text-lead mt-5 max-w-[44ch] text-muted">{finalCta.lead}</p>
          <div className="mt-9">
            <CtaLink label={ctaLabel} track="launch_final_quote" />
          </div>
        </div>
      </Container>
    </section>
  );
}

function LaunchFooter() {
  return (
    <footer className="border-t border-line pt-10 pb-28 md:pb-10">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3">
            <Logo />
            <p className="text-[0.8125rem] text-muted">
              © {new Date().getFullYear()} {site.name}. Software development and IT services.
            </p>
          </div>
          <ul role="list" className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.8125rem]">
            <li>
              <a href={`mailto:${site.email}`} className="inline-flex min-h-[44px] items-center text-muted transition-colors hover:text-fg">
                {site.email}
              </a>
            </li>
            <li>
              <a href="/privacy" target="_blank" className="inline-flex min-h-[44px] items-center text-muted transition-colors hover:text-fg">
                Privacy
              </a>
            </li>
            <li>
              <a href="/terms" target="_blank" className="inline-flex min-h-[44px] items-center text-muted transition-colors hover:text-fg">
                Terms
              </a>
            </li>
            {showConsentSettings ? (
              <li>
                <ConsentSettingsButton className="inline-flex min-h-[44px] items-center text-muted transition-colors hover:text-fg" />
              </li>
            ) : null}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
