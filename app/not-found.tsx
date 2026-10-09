import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Button from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for does not exist or has moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="Error 404"
        title="Page not found"
        lead="The page you were looking for does not exist or has moved. Check the address, or head back to the home page."
      />
      <section aria-label="Return home">
        <Container>
          <div className="flex flex-col gap-4 pb-[clamp(4rem,2rem+8vw,9rem)] sm:flex-row sm:items-center sm:gap-6">
            <Button href="/" variant="dark">
              Back to home
            </Button>
            <Button href="/contact" variant="ghost">
              Contact us
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
