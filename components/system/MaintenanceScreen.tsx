import Container from "@/components/ui/Container";
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
        <div className="grid gap-6 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4 lg:col-span-3">
            <p className="eyebrow text-accent md:pt-3">Scheduled maintenance</p>
          </div>
          <div className="min-w-0 md:col-span-8 lg:col-span-9">
            <h1 id="maintenance-title" className="text-h1 max-w-[18ch] text-balance">
              We are making a few improvements
            </h1>
            <p className="text-lead mt-6 max-w-[56ch] text-muted">
              The website is briefly unavailable while we carry out planned work. Please check back a little later.
              Our team is still reachable by email in the meantime.
            </p>
            <div className="hairline mt-[clamp(2rem,1.5rem+2vw,3rem)]" />
            <dl className="mt-4 grid items-center gap-x-8 gap-y-1 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="eyebrow text-muted">Email</dt>
              <dd className="min-w-0">
                <a
                  href={`mailto:${site.email}`}
                  className="inline-flex min-h-[44px] items-center break-all font-medium underline decoration-line decoration-1 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
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
