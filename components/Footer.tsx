import Link from "next/link";
import Logo from "@/components/Logo";
import ConsentSettingsButton from "@/components/analytics/ConsentSettingsButton";
import Icon from "@/components/ui/Icon";
import { firebaseConfig } from "@/lib/firebase/config";
import { footerColumns, site, type NavItem } from "@/lib/site";

const linkClass =
  "inline-flex min-h-[44px] items-center gap-1.5 py-1 text-[0.875rem] leading-snug text-muted decoration-1 underline-offset-[6px] transition-colors duration-200 hover:text-fg hover:underline";

function FooterLink({ link }: { link: NavItem }) {
  if (/^https?:/.test(link.href)) {
    return (
      <a href={link.href} className={linkClass} target="_blank" rel="noopener noreferrer">
        {link.label}
        <Icon name="arrowUpRight" size={12} />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={link.href} className={linkClass}>
      {link.label}
    </Link>
  );
}

// The Google Play developer page sits in the social row beside Instagram, so the Company
// column does not repeat it.
const columns = footerColumns.map((col) => ({
  ...col,
  links: col.links.filter((link) => link.href !== site.playStoreUrl),
}));

// Phones: Services full width, Company and Legal side by side. sm and up: three columns.
const columnSpan = ["col-span-2 sm:col-span-1", "", ""];

const [emailUser, emailDomain] = site.email.split("@");

const showConsentSettings = firebaseConfig.measurementId.trim() !== "";

export default function Footer() {
  return (
    <footer className="section-alt border-t border-line" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(1rem,0.5rem+2.5vw,3rem)]">
        <div className="grid gap-x-8 gap-y-12 py-[clamp(3rem,2rem+3.5vw,5.5rem)] lg:grid-cols-12">
          {/* Brand, contact and social */}
          <div className="min-w-0 lg:col-span-5">
            <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home">
              <Logo />
            </Link>
            <p className="mt-5 max-w-[38ch] text-[0.9375rem] leading-relaxed text-muted">
              Software development and IT services for startups, small businesses and enterprises worldwide.
            </p>

            <dl className="mt-8 grid gap-4">
              <div>
                <dt className="sr-only">Email</dt>
                <dd>
                  <a
                    href={`mailto:${site.email}`}
                    className="group inline-flex min-h-[44px] max-w-full items-center gap-3 font-display text-[clamp(1rem,0.8rem+1vw,1.4375rem)] font-medium tracking-[-0.02em] text-fg transition-colors duration-200 hover:text-accent"
                  >
                    <Icon name="mail" size={20} className="text-accent" />
                    <span className="min-w-0 decoration-1 underline-offset-[6px] [overflow-wrap:anywhere] group-hover:underline">
                      {emailUser}@<wbr />
                      {emailDomain}
                    </span>
                  </a>
                </dd>
              </div>
              {site.phone ? (
                <div>
                  <dt className="eyebrow text-muted">Phone</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${site.phone.replace(/\s+/g, "")}`}
                      className="inline-flex min-h-[44px] items-center text-[0.9375rem] text-fg decoration-1 underline-offset-[6px] hover:text-accent hover:underline"
                    >
                      {site.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {site.address ? (
                <div>
                  <dt className="eyebrow text-muted">Address</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-relaxed text-fg">{site.address}</dd>
                </div>
              ) : null}
            </dl>

            <ul className="mt-6 flex flex-wrap items-center gap-3" aria-label="BrightonSolution elsewhere">
              <li>
                <a
                  href={site.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="BrightonSolution on Instagram (opens in a new tab)"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-sharp border border-line text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  <Icon name="instagram" size={20} />
                </a>
              </li>
              <li>
                <a
                  href={site.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-[44px] items-center gap-2 rounded-sharp border border-line px-4 text-[0.875rem] font-medium text-fg transition-colors duration-200 hover:border-accent hover:text-accent"
                >
                  Google Play
                  <Icon
                    name="arrowUpRight"
                    size={14}
                    className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Link columns */}
          <div className="grid min-w-0 grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-[1.5fr_1fr_1fr] lg:col-span-7 lg:col-start-6 lg:pt-1">
            {columns.map((col, i) => (
              <nav key={col.title} className={`min-w-0 ${columnSpan[i] ?? ""}`} aria-label={`Footer: ${col.title}`}>
                <p className="eyebrow border-b border-line pb-3 text-fg">{col.title}</p>
                <ul className="mt-3 flex flex-col">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t border-line py-5 text-[0.8125rem] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-8">
          <p className="py-2">&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          {showConsentSettings ? (
            <ConsentSettingsButton className="inline-flex min-h-[44px] items-center self-start text-[0.8125rem] text-muted decoration-1 underline-offset-[6px] transition-colors hover:text-fg hover:underline sm:self-auto" />
          ) : (
            <p className="eyebrow py-2 text-balance">Software development &amp; IT services</p>
          )}
        </div>
      </div>
    </footer>
  );
}
