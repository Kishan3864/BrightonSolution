import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import ProcessRail from "@/components/home/parts/ProcessRail";
import styles from "@/components/home/parts/ProcessRail.module.css";
import { process } from "@/lib/site";
import { processCopy, bodyGap } from "@/lib/content/home-b";

/** Seven steps on a raised surface: a horizontal rail from md that bleeds to the viewport's right
 *  edge (the section clips any overshoot from a classic scrollbar), a vertical timeline on phones. */
export default function Process() {
  return (
    <section id="process" className="section-alt overflow-x-clip py-section scroll-mt-4" aria-labelledby="process-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="process-title"
            number={processCopy.number}
            eyebrow={processCopy.eyebrow}
            title={processCopy.title}
            lead={processCopy.lead}
            dark
          />
        </Reveal>

        <Reveal delay={80} className={bodyGap}>
          <ProcessRail label={`${processCopy.eyebrow} steps`}>
            {/* The hairline is a sibling of the list, not a child: an <ol> holds only <li>s. */}
            <div className={styles.track}>
              <span aria-hidden="true" className={styles.line}>
                <span className={styles.fill} />
              </span>
              <ol role="list" className="relative flex flex-col md:flex-row">
              {process.map((step, i) => (
                <li
                  key={step.number}
                  data-step
                  className={`${styles.step} relative grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-x-5 pb-10 last:pb-0 md:flex md:w-[19rem] md:flex-none md:flex-col md:pr-8 md:pb-0 xl:w-[20.5rem] xl:pr-10`}
                >
                  {i < process.length - 1 ? <span aria-hidden="true" className={styles.segment} /> : null}
                  <span
                    aria-hidden="true"
                    className="relative grid size-11 place-items-center rounded-sharp border border-line-strong bg-surface-2 font-mono text-[0.9375rem] tabular-nums text-fg"
                  >
                    {step.number}
                  </span>
                  <div className="flex min-w-0 flex-col pt-2 md:flex-1 md:pt-7">
                    <h3 className="text-h3">
                      <span className="sr-only">Step {step.number}: </span>
                      {step.title}
                    </h3>
                    <p className="mt-2 max-w-[56ch] text-[0.9375rem] leading-relaxed text-muted md:flex-1">
                      {step.description}
                    </p>
                    <p className="mt-5 border-t border-line pt-4 text-[0.9375rem] leading-snug">
                      <span className="eyebrow block text-muted">{processCopy.outputLabel}</span>
                      <span className="mt-1.5 block text-fg">{step.output}</span>
                    </p>
                  </div>
                </li>
              ))}
              </ol>
            </div>
          </ProcessRail>
        </Reveal>
      </Container>
    </section>
  );
}
