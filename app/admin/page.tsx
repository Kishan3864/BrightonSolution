import type { Metadata, Viewport } from "next";
import AdminDashboard from "@/components/admin/AdminDashboard";

/**
 * Private admin app (enquiries, landing leads, analytics). Static shell; all data is fetched
 * client-side with a Firebase ID token and protected by firestore.rules. Rendered full-bleed: the
 * public header and footer are hidden on admin paths, the app brings its own chrome. Not linked
 * anywhere, not in the sitemap, disallowed in robots.txt and marked noindex here (firebase.json
 * also sends X-Robots-Tag). Routes inside the app are hash-based (#/contacts ...).
 */
export const metadata: Metadata = {
  title: "Admin",
  description: "Private dashboard.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  alternates: { canonical: null },
  // Home Screen app on iPhone/iPad (the admin site serves its own manifest at /manifest.webmanifest).
  appleWebApp: { capable: true, title: "Brighton Admin", statusBarStyle: "black-translucent" },
  // Next.js only emits mobile-web-app-capable; iOS before 16.4 reads the Apple name.
  other: { "apple-mobile-web-app-capable": "yes" },
};

/** viewportFit "cover" lets the app paint under the notch and home indicator (it pads with safe-area insets). */
export const viewport: Viewport = {
  themeColor: "#0b0c10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
