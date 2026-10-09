import Link from "next/link";
import Logo from "@/components/Logo";
import { footerColumns, site } from "@/lib/site";

const linkClass =
  "inline-flex min-h-[44px] items-center text-[0.9375rem] text-muted-dark decoration-1 underline-offset-8 transition-colors hover:text-paper hover:underline";

export default function Footer() {
  return (
    <footer className="section-dark border-t border-line-dark" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Site footer
      </h2>
      <div className="mx-auto w-full max-w-[1320px] px-[clamp(1rem,0.5rem+2.5vw,3rem)]">
        <div className="grid gap-10 py-[clamp(3rem,2rem+4vw,6rem)] md:grid-cols-12 md:gap-8">
          <div className="min-w-0 md:col-span-6 lg:col-span-5">
            <Link href="/" className="inline-flex min-h-[44px] items-center" aria-label="BrightonSolution home">
              <Logo variant="light" />
            </Link>
            <p className="mt-6 max-w-[42ch] text-[0.9375rem] leading-relaxed text-muted-dark">
              Software development and IT services for startups, small businesses and enterprises worldwide.
            </p>
          </div>

          <dl className="grid gap-6 md:col-span-6 lg:col-span-6 lg:col-start-7">
            <div className="border-t border-line-dark pt-4">
              <dt className="eyebrow text-accent-soft">Email</dt>
              <dd className="mt-1">
                <a href={`mailto:${site.email}`} className={`${linkClass} break-all text-paper`}>
                  {site.email}
                </a>
              </dd>
            </div>
            {site.phone ? (
              <div className="border-t border-line-dark pt-4">
                <dt className="eyebrow text-accent-soft">Phone</dt>
                <dd className="mt-1">
                  <a href={`tel:${site.phone.replace(/\s+/g, "")}`} className={`${linkClass} text-paper`}>
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

        <div className="hairline" />

        <nav
          className="grid gap-10 py-[clamp(2.5rem,1.5rem+3vw,4.5rem)] sm:grid-cols-2 md:grid-cols-12 md:gap-8"
          aria-label="Footer"
        >
          {footerColumns.map((col, i) => (
            <div
              key={col.title}
              className={`min-w-0 ${i === 0 ? "sm:col-span-2 md:col-span-5" : i === 1 ? "md:col-span-4" : "md:col-span-3"}`}
            >
              <p className="eyebrow text-accent-soft">{col.title}</p>
              <ul className="mt-3 flex flex-col">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hairline" />

        <div className="flex flex-col gap-3 py-6 text-[0.8125rem] text-muted-dark md:flex-row md:items-center md:justify-between">
          <p>&copy; 2026 {site.name}. All rights reserved.</p>
          <p className="flex gap-6">
            <Link href="/privacy" className="inline-flex min-h-[44px] items-center decoration-1 underline-offset-8 transition-colors hover:text-paper hover:underline">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-[44px] items-center decoration-1 underline-offset-8 transition-colors hover:text-paper hover:underline">
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
