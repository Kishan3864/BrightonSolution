import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import SectionTitle from "@/components/ui/SectionTitle";
import DestinationList from "@/components/system/DestinationList";
import EmailLine from "@/components/system/EmailLine";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist or has moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <PageHero
        id="not-found"
        eyebrow="404"
        title="This page could not be found"
        lead="The address may be mistyped, or the page has moved. One of these should get you where you need to be."
        divider={false}
      />
      <section aria-label="Where to go next" className="pb-[clamp(3.5rem,2rem+6vw,7.5rem)]">
        <Container>
          <SectionTitle variant="sub">Where to next</SectionTitle>
          <div className="sm:mt-3 md:grid md:grid-cols-12 md:gap-8">
            <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              <DestinationList />
              <EmailLine className="mt-8" lead="Looking for something specific? Write to" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
