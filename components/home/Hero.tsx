import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import HeroArt from "@/components/home/HeroArt";
import { hero } from "@/lib/content/home-a";

export default function Hero() {
  return (
    <section
      id="hero"
      aria-labelledby="hero-title"
      className="pt-[clamp(3rem,2rem+4vw,6.5rem)] pb-[clamp(3rem,1.5rem+4vw,6rem)]"
    >
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-10">
          <div className="min-w-0 md:col-span-7 lg:col-span-8">
            <Reveal>
              <p className="eyebrow text-accent">{hero.eyebrow}</p>
            </Reveal>
            <Reveal delay={80}>
              <h1 id="hero-title" className="text-display mt-6 max-w-[16ch] text-balance tracking-tight">
                {hero.title}
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="text-lead mt-7 max-w-[54ch] text-muted">{hero.lead}</p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
                <Button href={hero.primary.href}>{hero.primary.label}</Button>
                <Button href={hero.secondary.href} variant="outline">
                  {hero.secondary.label}
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="min-w-0 md:col-span-5 md:self-center lg:col-span-4">
            <div className="mx-auto w-full max-w-[22rem] sm:max-w-[26rem] md:max-w-none">
              <HeroArt />
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
