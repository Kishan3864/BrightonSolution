import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Track from "@/components/home/Track";
import HeroSun from "@/components/home/HeroSun";
import { hero } from "@/lib/content/home-a";

/** The hero copy is the LCP element, so it renders immediately: no JS-dependent reveal. */
export default function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="relative overflow-hidden pt-[clamp(2rem,1rem+4vw,5.5rem)] pb-[clamp(3rem,1.5rem+5vw,6.5rem)]"
    >
      <Container>
        <div className="grid items-center gap-8 md:grid-cols-12 md:gap-6">
          <div className="relative z-10 min-w-0 md:col-span-7 lg:col-span-9 xl:col-span-8">
            <p className="eyebrow text-muted">{hero.eyebrow}</p>
            <h1 id="hero-title" className="text-display mt-5 max-w-[20ch] text-balance">
              {hero.title}
            </h1>
            <p className="text-lead mt-6 max-w-[46ch] text-muted">{hero.lead}</p>
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

          {/* The logo's sun in 3D: decorative, so it sits beside the copy and never carries meaning. */}
          <HeroSun className="mx-auto w-[min(78vw,22rem)] md:col-span-5 md:w-full md:max-w-[34rem] lg:col-span-3 xl:col-span-4" />
        </div>
      </Container>
    </section>
  );
}
