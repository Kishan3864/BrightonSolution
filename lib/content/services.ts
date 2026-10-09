export type IncludedPractice = { title: string; description: string };

export const servicesPage = {
  eyebrow: "Services",
  title: "What we build and run for you",
  lead: "Seven services that cover the life of a software product, from the first specification to the years of running it. Each one sets out what we do, what you receive and who it suits.",
  metaDescription:
    "Custom software, web and mobile apps, cloud and DevOps, AI integration, UI/UX design and maintenance from BrightonSolution: what each one delivers and who it suits.",
};

export const serviceIndex = {
  eyebrow: "On this page",
  ariaLabel: "Services on this page",
};

/** Short labels for the table-of-contents strip, keyed by service slug. */
export const serviceIndexLabels: Record<string, string> = {
  "custom-software": "Custom software",
  "web-applications": "Web applications",
  "mobile-apps": "Mobile apps",
  "cloud-devops": "Cloud & DevOps",
  "ai-integration": "AI integration",
  "ui-ux-design": "UI/UX design",
  "maintenance-support": "Maintenance",
};

/** How an engagement for each service usually opens, keyed by service slug. */
export const serviceFirstSteps: Record<string, string> = {
  "custom-software":
    "A working session to map the process the software has to support, then a written specification and estimate for a first release.",
  "web-applications":
    "A review of the current site or product, if there is one, and a short specification covering pages, user roles, integrations and performance targets.",
  "mobile-apps":
    "A decision on native versus cross-platform based on your features, team and budget, written up with the trade-offs.",
  "cloud-devops":
    "A read-only review of your accounts and deployment process, ending in a written list of risks and changes in priority order.",
  "ai-integration":
    "A feasibility test on a sample of your own data, so you see what the model gets right and wrong before anything is built.",
  "ui-ux-design":
    "Conversations with the people who use the product today and a map of the tasks they need to complete, before any screens are drawn.",
  "maintenance-support":
    "An audit of the codebase, infrastructure and access, so both sides know exactly what is being taken over and in what state.",
};

/**
 * Genuine projects from lib/work.ts that illustrate a service, keyed by
 * service slug. Web entries are project slugs; "apps" means the Google Play apps.
 */
export const serviceRelatedWork: Record<string, { projects?: string[]; apps?: boolean }> = {
  "custom-software": { projects: ["eventerp", "recruitment-suite", "leadpin"] },
  "web-applications": { projects: ["flexypdf", "weekendcart", "empire-event"] },
  "mobile-apps": { apps: true },
};

export const serviceLabels = {
  goodFor: "Good for",
  firstStep: "First step",
  deliverables: "What you get",
  relatedWork: "From our work",
  relatedWorkLink: "See the work",
  cta: "Talk about this",
};

export const waysToWork = {
  eyebrow: "Engagement models",
  title: "Ways to work with us",
  lead: "Any service above can run under one of four commercial arrangements. The right one depends on how well defined the work is and how long it will continue.",
  bestForLabel: "Best for",
  billingLabel: "Billing",
  note: "Not sure which applies? Describe the work and we will recommend a model and explain the trade-offs.",
  cta: "Discuss which model fits",
};

export const includedSection = {
  eyebrow: "Standard practice",
  title: "What every engagement includes",
  lead: "Whatever the service or the commercial model, these are part of the work rather than extras.",
};

export const includedPractices: IncludedPractice[] = [
  {
    title: "A written scope and estimate before work starts",
    description:
      "What will be built, what is out of scope, how long it should take and what it will cost, agreed in writing. Nothing starts on a verbal agreement.",
  },
  {
    title: "Reviewed, traceable changes",
    description:
      "Every change goes through a pull request with a written description and review before it reaches the main branch, so decisions remain traceable in your repository.",
  },
  {
    title: "A staging environment from the first sprint",
    description:
      "Working software is deployed somewhere you can open at any time, so progress is something you can click rather than a status report.",
  },
  {
    title: "Automated tests and a deployment pipeline",
    description:
      "Tests run on every change and deployments are scripted, so releases are repeatable and a bad one can be rolled back.",
  },
  {
    title: "Documentation and handover",
    description:
      "Architecture notes, a runbook and setup instructions, written so that an engineer who has never spoken to us can take over.",
  },
  {
    title: "A support window after launch",
    description:
      "After go-live we stay on to fix issues and answer questions for an agreed period, before any longer-term support arrangement begins.",
  },
];
