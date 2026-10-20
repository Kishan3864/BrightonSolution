import type { CSSProperties } from "react";
import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import { intro } from "@/lib/content/home-a";
import styles from "@/components/home/parts/Intro.module.css";

const words = intro.statement.split(" ");

export default function Intro() {
  return (
    <section id="intro" className="scroll-mt-4" aria-labelledby="intro-title">
      <Container>
        <div className="pb-section">
          <Reveal>
            <SectionTitle>{intro.eyebrow}</SectionTitle>
          </Reveal>
          <div className="mt-[clamp(1.75rem,1rem+2.5vw,3.5rem)] md:grid md:grid-cols-12 md:gap-8">
            <Reveal delay={100} className="min-w-0 md:col-span-11 md:col-start-2 lg:col-span-10 lg:col-start-3">
              {/* Larger and lighter than a section h2: this is the one statement on the page. */}
              <h2
                id="intro-title"
                className={`${styles.statement} max-w-[24ch] font-display text-[clamp(1.875rem,1.05rem+3.4vw,4rem)] leading-[1.08] font-normal tracking-[-0.04em] text-balance`}
              >
                {/* Read once as a sentence; the per-word spans exist only for the scroll lighting. */}
                <span className="sr-only">{intro.statement}</span>
                <span aria-hidden="true">
                  {words.map((word, i) => (
                    <span key={i}>
                      <span className={styles.word} style={{ "--p": i / words.length } as CSSProperties}>
                        {word}
                      </span>
                      {i < words.length - 1 ? " " : null}
                    </span>
                  ))}
                </span>
              </h2>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
