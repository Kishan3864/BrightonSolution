import styles from "./StepRail.module.css";

export type RailStep = { number: string; text: string };

type StepRailProps = {
  steps: RailStep[];
  className?: string;
};

/** Numbered steps on a vertical rail: 12px marker tiles joined by a hairline. */
export default function StepRail({ steps, className = "" }: StepRailProps) {
  return (
    <ol className={`${styles.rail} ${className}`.trim()}>
      {steps.map((step) => (
        <li key={step.number} className={styles.step}>
          <span className={styles.marker} aria-hidden="true">
            {step.number}
          </span>
          <p className={styles.text}>{step.text}</p>
        </li>
      ))}
    </ol>
  );
}
