import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import RetryButton from "@/components/system/RetryButton";
import EmailLine from "@/components/system/EmailLine";

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
      >
        <div className="mt-10">
          <RetryButton />
        </div>
      </PageHero>
      <section aria-label="Connection tips" className="pb-[clamp(3.5rem,2rem+6vw,7.5rem)]">
        <Container>
          <div className="grid gap-8 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-4 lg:col-span-3">
              <p className="eyebrow text-muted">Things to check</p>
            </div>
            <div className="min-w-0 md:col-span-8 lg:col-span-9">
              <ol className="border-t border-line">
                {tips.map((tip, index) => (
                  <li
                    key={tip}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-line py-4 sm:grid-cols-[3rem_minmax(0,1fr)]"
                  >
                    <span
                      className="font-mono text-[0.75rem] leading-[1.6rem] tracking-[0.08em] text-muted"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">{tip}</span>
                  </li>
                ))}
              </ol>
              <EmailLine className="mt-8" lead="You can also reach us by email at" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
