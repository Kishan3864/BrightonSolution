import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { privacyPolicy } from "@/lib/content/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: privacyPolicy.description,
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalPage doc={privacyPolicy} />;
}
