import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import Analytics from "@/components/analytics/Analytics";
import ConsentBanner from "@/components/analytics/ConsentBanner";
import ServiceWorkerRegister from "@/components/system/ServiceWorkerRegister";
import MaintenanceScreen from "@/components/system/MaintenanceScreen";
import PublicChrome from "@/components/system/PublicChrome";
import { site } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const maintenance = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

/*
 * Runs before first paint:
 * - marks <html> as JS-capable so scroll reveals can start hidden;
 * - fail-safe: if the Reveal component has not mounted within 2.5s (bundle
 *   blocked, failed or very slow), everything is made visible anyway.
 */
const bootScript =
  "(function(){try{var d=document.documentElement;d.classList.add('js');" +
  "setTimeout(function(){if(!window.__bsRevealReady){d.classList.add('reveal-ready-fallback')}},2500)}" +
  "catch(e){}})();";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "BrightonSolution — Software Development & IT Services",
    template: "%s — BrightonSolution",
  },
  description: site.description,
  applicationName: site.name,
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: site.locale,
  },
  twitter: {
    card: "summary_large_image",
  },
  // Indexable even in a maintenance build: noindex during a temporary outage
  // would drop every URL from search on the next crawl. Each page keeps its own
  // title, description and canonical; /maintenance itself is noindex.
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0C10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${bricolage.variable} ${geistMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="bg-canvas font-sans text-fg antialiased">
        {/* The admin app has its own skip link (its hash is the router). */}
        <PublicChrome only="admin">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:min-h-[44px] focus:items-center focus:rounded-sharp focus:bg-fg focus:px-5 focus:text-[0.9375rem] focus:text-canvas"
          >
            Skip to content
          </a>
        </PublicChrome>
        {/* Maintenance build: one standalone screen (logo, message, email) on every route. */}
        {maintenance ? null : <Header />}
        <main id="main">{maintenance ? <MaintenanceScreen standalone /> : children}</main>
        {maintenance ? null : (
          <PublicChrome>
            <Footer />
            <JsonLd />
          </PublicChrome>
        )}
        <Analytics />
        <ConsentBanner />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
