import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import CtaBand from "@/components/CtaBand";
import { termsOfService } from "@/lib/content/legal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  description: termsOfService.description,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <LegalPage doc={termsOfService} />
      <CtaBand />
    </>
  );
}
