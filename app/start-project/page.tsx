import type { Metadata } from "next";
import LaunchPage from "@/components/launch/LaunchPage";
import { launchMeta } from "@/lib/content/launch";
import { LAUNCH_PATH, site } from "@/lib/site";

/**
 * Private landing page, shared by direct link only (see LAUNCH_PATH in lib/site.ts). Not linked
 * anywhere on the site and not in the sitemap; noindex here and through X-Robots-Tag in
 * firebase.json. It is deliberately not listed in robots.txt, which is public. Open Graph tags
 * stay, so the link shows a proper preview card when it is sent on WhatsApp, email or social;
 * the card image comes from ./opengraph-image.tsx.
 */
export const metadata: Metadata = {
  title: { absolute: `${launchMeta.title} | ${site.name}` },
  description: launchMeta.description,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  alternates: { canonical: null },
  openGraph: {
    title: launchMeta.title,
    description: launchMeta.description,
    url: `${site.url}${LAUNCH_PATH}`,
    type: "website",
    siteName: site.name,
    locale: site.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: launchMeta.title,
    description: launchMeta.description,
  },
};

export default function StartProjectPage() {
  return <LaunchPage />;
}
