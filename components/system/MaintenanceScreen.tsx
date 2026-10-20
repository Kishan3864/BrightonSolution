import Container from "@/components/ui/Container";
import SectionTitle from "@/components/ui/SectionTitle";
import Logo from "@/components/Logo";
import { site } from "@/lib/site";

type MaintenanceScreenProps = {
  /**
   * true when rendered instead of the whole site (maintenance build, without Header/Footer):
   * shows the logo and fills the viewport. false inside the normal layout (/maintenance).
   */
  standalone?: boolean;
};

export default function MaintenanceScreen({ standalone = false }: MaintenanceScreenProps) {
  return (
    <section
      aria-labelledby="maintenance-title"
      className={`flex flex-col ${
        standalone
          ? "min-h-[100svh] py-[clamp(1.5rem,1rem+2vw,2.5rem)]"
          : "pt-[clamp(2.75rem,1.75rem+3.5vw,5rem)] pb-[clamp(3.5rem,2rem+6vw,7.5rem)]"
      }`}
    >
      {standalone ? (
        <Container>
          <Logo titled />
          <div className="hairline mt-[clamp(1.5rem,1rem+2vw,2.5rem)]" />
        </Container>
      ) : null}
      <Container className={standalone ? "flex flex-1 flex-col justify-center py-[clamp(3rem,2rem+5vw,6rem)]" : ""}>
        <SectionTitle variant="page">Scheduled maintenance</SectionTitle>
        <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] md:grid md:grid-cols-12 md:gap-8">
          <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
            <h1 id="maintenance-title" className="text-h1 max-w-[18ch] text-balance">
              We are making a few improvements
            </h1>
            <p className="text-lead mt-6 max-w-[56ch] text-muted">
              The website is briefly unavailable while we carry out planned work. Please check back a little later.
              Our team is still reachable by email in the meantime.
            </p>
            <dl className="mt-[clamp(2rem,1.5rem+2vw,3rem)] grid w-fit max-w-full items-center gap-x-6 gap-y-1 rounded-sharp border border-line bg-surface px-4 py-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:px-5">
              <dt className="eyebrow text-accent">Email</dt>
              <dd className="min-w-0">
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex min-h-[44px] items-center break-all font-medium text-fg underline decoration-line-strong decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {site.email}
                </a>
              </dd>
            </dl>
          </div>
        </div>
      </Container>
      {standalone ? (
        <Container>
          <div className="hairline" />
          <p className="pt-5 text-[0.8125rem] text-muted">
            © {new Date().getFullYear()} {site.name}
          </p>
        </Container>
      ) : null}
    </section>
  );
}
