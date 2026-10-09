export type SectionCopy = {
  number: string;
  eyebrow: string;
  title: string;
  lead: string;
};

export const industriesCopy = {
  number: "03",
  eyebrow: "Industries",
  title: "Industries we work with",
  lead:
    "Sectors whose problems we understand well. This describes the kind of work we take on, not a list of clients or credentials.",
  note:
    "Working in a sector that is not listed? Most of what we do transfers: data models, integrations, permissions and reporting look similar in every industry.",
  noteLink: { label: "Tell us about your project", href: "/contact" },
} satisfies SectionCopy & { note: string; noteLink: { label: string; href: string } };

export const technologiesCopy = {
  number: "04",
  eyebrow: "Technologies",
  title: "Tools we work with",
  lead:
    "Chosen per project for fit, maintainability and the team that will inherit them, never for their own sake.",
  note:
    "If your existing stack is not here, ask. We will say plainly whether we have worked with it and whether we are the right team for it.",
} satisfies SectionCopy & { note: string };

export const processCopy = {
  number: "05",
  eyebrow: "Process",
  title: "How a project runs",
  lead:
    "Seven steps, the same for a two-month MVP or a multi-year platform. Each one ends with something you can read, click or run, so you always know where the project stands.",
  outputLabel: "You get",
  note: "Smaller projects move through the same steps, only faster. Nothing is skipped; each step is simply shorter.",
} satisfies SectionCopy & { outputLabel: string; note: string };

export const whyUsCopy = {
  number: "06",
  eyebrow: "Why BrightonSolution",
  title: "What you can expect from us",
  standing: [
    "Most of what goes wrong in software projects is not technical. It is unclear scope, slow decisions, people changing halfway through and nobody quite owning the outcome.",
    "We have organised the way we work around avoiding those problems. These are the commitments that make that concrete.",
  ],
  link: { label: "More about how we work", href: "/about" },
} satisfies Omit<SectionCopy, "lead"> & { standing: string[]; link: { label: string; href: string } };

export const engagementCopy = {
  number: "07",
  eyebrow: "Engagement models",
  title: "Four ways to work with us",
  lead:
    "Pick the arrangement that matches how defined your scope is and how long you expect to need us. If a different one would serve you better, we will say so before anything is signed.",
  rows: [
    { key: "bestFor", label: "Best for" },
    { key: "howItWorks", label: "How it works" },
    { key: "billing", label: "Billing" },
  ] as const,
  caption: "Comparison of the four engagement models by what they suit, how they run and how they are billed",
  cta: { label: "Discuss your project", href: "/contact" },
} satisfies SectionCopy & {
  rows: readonly { key: "bestFor" | "howItWorks" | "billing"; label: string }[];
  caption: string;
  cta: { label: string; href: string };
};

/** Consistent gap between a section heading and its body across the home page. */
export const bodyGap = "mt-[clamp(2.5rem,1.5rem+3vw,4.5rem)]";

export const pad = (n: number) => String(n).padStart(2, "0");
