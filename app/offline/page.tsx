import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import SectionTitle from "@/components/ui/SectionTitle";
import RetryButton from "@/components/system/RetryButton";
import EmailLine from "@/components/system/EmailLine";
import StepRail from "@/components/system/StepRail";

export const metadata: Metadata = {
  title: "You are offline",
  description: "Your device appears to be offline.",
  robots: { index: false, follow: false },
};

const tips = [
  "Check that Wi-Fi or mobile data is switched on.",
  "On a company or public network, make sure you are signed in to it.",
  "Pages you opened recently may still be available while you are offline.",
];

export default function OfflinePage() {
  return (
    <>
      <PageHero
        id="offline"
        eyebrow="Offline"
        title="You appear to be offline"
        lead="We could not reach the network. Once your connection is back, retry and the page will load as normal."
        divider={false}
      >
        <div className="mt-10">
          <RetryButton />
        </div>
      </PageHero>
      <section aria-label="Connection tips" className="pb-[clamp(3.5rem,2rem+6vw,7.5rem)]">
        <Container>
          <SectionTitle variant="sub">Things to check</SectionTitle>
          <div className="mt-6 md:mt-8 md:grid md:grid-cols-12 md:gap-8">
            <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              <StepRail
                steps={tips.map((tip, index) => ({ number: String(index + 1).padStart(2, "0"), text: tip }))}
                className="mt-2"
              />
              <EmailLine className="mt-10 border-t border-line pt-6" lead="You can also reach us by email at" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
