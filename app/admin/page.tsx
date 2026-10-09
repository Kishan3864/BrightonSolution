import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import AdminDashboard from "@/components/admin/AdminDashboard";

/**
 * Private analytics + enquiries dashboard. Static shell; all data is fetched client-side with a
 * Firebase ID token and protected by firestore.rules. Not linked anywhere, not in the sitemap,
 * disallowed in robots.txt and marked noindex here (firebase.json also sends X-Robots-Tag).
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
};

export default function AdminPage() {
  return (
    <Container className="pt-[clamp(2.5rem,1.5rem+3vw,4.5rem)] pb-[clamp(3rem,2rem+4vw,6rem)]">
      <AdminDashboard />
    </Container>
  );
}
