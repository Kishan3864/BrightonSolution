import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import HeroArt from "@/components/home/HeroArt";
import Track from "@/components/home/Track";
import { hero } from "@/lib/content/home-a";

/** The hero copy is the LCP element, so it renders immediately: no JS-dependent reveal. */
export default function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="pt-[clamp(2.5rem,1.5rem+4vw,6rem)] pb-[clamp(3rem,1.5rem+4.5vw,6rem)]"
    >
      <Container>
        <div className="grid items-center gap-10 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="min-w-0 md:col-span-7">
            <p className="eyebrow text-accent">{hero.eyebrow}</p>
            <h1 id="hero-title" className="text-display mt-5 max-w-[15ch] text-balance">
              {hero.title}
            </h1>
            <p className="text-lead mt-6 max-w-[48ch] text-pretty text-muted">{hero.lead}</p>
            <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
              <Track label={hero.primary.track}>
                <Button href={hero.primary.href}>{hero.primary.label}</Button>
              </Track>
              <Track label={hero.secondary.track}>
                <Button href={hero.secondary.href} variant="outline">
                  {hero.secondary.label}
                </Button>
              </Track>
            </div>
          </div>

          {/* Decorative; hidden on phones so the intro statement stays near the fold. */}
          <Reveal delay={200} className="hidden min-w-0 md:col-span-5 md:block lg:col-span-4 lg:col-start-9">
            <HeroArt />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
