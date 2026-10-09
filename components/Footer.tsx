import Link from "next/link";
import Logo from "@/components/Logo";
import ConsentSettingsButton from "@/components/analytics/ConsentSettingsButton";
import { firebaseConfig } from "@/lib/firebase/config";
import { footerColumns, site, type NavItem } from "@/lib/site";

const linkClass =
  "inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 text-[0.875rem] text-muted-dark decoration-1 underline-offset-[6px] transition-colors hover:text-paper hover:underline";

function FooterLink({ link }: { link: NavItem }) {
  if (/^https?:/.test(link.href)) {
    return (
      <a href={link.href} className={linkClass} target="_blank" rel="noopener noreferrer">
        {link.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="square"
          aria-hidden="true"
          focusable="false"
          className="shrink-0"
        >
          <path d="M7 17L17 7" />
          <path d="M8 7h9v9" />
        </svg>
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

// Phones: brand and Services full width, Company and Legal side by side.
const columnSpan = ["col-span-2 sm:col-span-1 lg:col-span-3 lg:col-start-6", "lg:col-span-2", "lg:col-span-2"];

const showConsentSettings = firebaseConfig.measurementId.trim() !== "";

export default function Footer() {
  return (
    <footer className="section-dark" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(1rem,0.5rem+2.5vw,3rem)]">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-t border-line-dark py-[clamp(3rem,2rem+3.5vw,5.5rem)] lg:grid-cols-12">
          <div className="col-span-2 min-w-0 lg:col-span-4">
            <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home">
              <Logo variant="light" />
            </Link>
            <p className="mt-5 max-w-[38ch] text-[0.875rem] leading-relaxed text-muted-dark">
              Software development and IT services for startups, small businesses and enterprises worldwide.
            </p>

            <dl className="mt-8 grid gap-5">
              <div className="border-t border-line-dark pt-4">
                <dt className="eyebrow text-accent-soft">Email</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-flex min-h-[44px] items-center break-all text-[0.9375rem] text-paper decoration-1 underline-offset-[6px] hover:underline"
                  >
                    {site.email}
                  </a>
                </dd>
              </div>
              {site.phone ? (
                <div className="border-t border-line-dark pt-4">
                  <dt className="eyebrow text-accent-soft">Phone</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${site.phone.replace(/\s+/g, "")}`}
                      className="inline-flex min-h-[44px] items-center text-[0.9375rem] text-paper decoration-1 underline-offset-[6px] hover:underline"
                    >
                      {site.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {site.address ? (
                <div className="border-t border-line-dark pt-4">
                  <dt className="eyebrow text-accent-soft">Address</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-relaxed text-paper">{site.address}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {footerColumns.map((col, i) => (
            <nav key={col.title} className={`min-w-0 ${columnSpan[i] ?? "lg:col-span-2"}`} aria-label={`Footer: ${col.title}`}>
              <p className="eyebrow border-t border-line-dark pt-4 text-accent-soft">{col.title}</p>
              <ul className="mt-2 flex flex-col">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="hairline" />

        <div className="flex flex-col gap-1 py-5 text-[0.8125rem] text-muted-dark sm:flex-row sm:items-center sm:justify-between">
          <p className="py-2">&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          {showConsentSettings ? (
            <ConsentSettingsButton className="inline-flex min-h-[44px] items-center self-start text-[0.8125rem] text-muted-dark decoration-1 underline-offset-[6px] transition-colors hover:text-paper hover:underline sm:self-auto" />
          ) : (
            <p className="eyebrow py-2">Software development &amp; IT services</p>
          )}
        </div>
      </div>
    </footer>
  );
}
