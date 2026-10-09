export type SectionCopy = {
  number: string;
  eyebrow: string;
  title: string;
  lead: string;
};

/** Home section order: Services 01, How we help 02, Work 03, Industries 04,
 *  Technologies 05, Process 06, Why us 07, Engagement models 08. */

export const industriesCopy = {
  number: "04",
  eyebrow: "Industries",
  title: "Industries we work with",
  lead: "Sectors we have shipped software for, and the kind of work we take on in each.",
} satisfies SectionCopy;

/** Only sectors backed by the genuine work in lib/work.ts (project names in comments). */
export const homeIndustries: { name: string; line: string }[] = [
  {
    // WeekendCart
    name: "E-commerce & retail",
    line: "Storefronts, catalogues, checkout and payments, order tracking and the admin console behind them.",
  },
  {
    // FlexyPdf, Leadpin
    name: "SaaS & technology",
    line: "Self-serve web products, browser-based tools, role-based platforms and admin tooling.",
  },
  {
    // EventErp, Empire Event, Martin’s Tavern
    name: "Events & hospitality",
    line: "Event ERP, quotations and invoicing, reservations, menus and venue websites.",
  },
  {
    // Recruitment Suite, Upward
    name: "Recruitment & careers",
    line: "Hiring pipelines, admin consoles, candidate portals and coaching platforms.",
  },
  {
    // Nassif 50th Anniversary (electrical contractor)
    name: "Construction & trades",
    line: "Company websites and anniversary microsites: brand story, milestone history and service highlights.",
  },
  {
    // Ten Android apps on Google Play
    name: "Consumer mobile apps",
    line: "Utility, productivity and game apps for Android, published on Google Play under our own developer account.",
  },
];

export const technologiesCopy = {
  number: "05",
  eyebrow: "Technologies",
  title: "Tools we work with",
  lead: "Chosen per project for fit and long-term maintainability, never for their own sake.",
} satisfies SectionCopy;

export const processCopy = {
  number: "06",
  eyebrow: "Process",
  title: "How a project runs",
  lead: "Seven steps, the same for a two-month MVP or a multi-year platform, each ending in something you can review.",
  outputLabel: "You get",
} satisfies SectionCopy & { outputLabel: string };

export const whyUsCopy = {
  number: "07",
  eyebrow: "Why BrightonSolution",
  title: "Why work with BrightonSolution",
  lead: "What stays the same on every project, whatever its size.",
} satisfies SectionCopy;

/** Differentiators deliberately not repeated elsewhere on the home page. */
export const whyUsItems: { title: string; description: string }[] = [
  {
    title: "The people who scope it build it",
    description: "Nothing is handed down to someone who was not in the conversation.",
  },
  {
    title: "One accountable lead",
    description: "A single person who knows your project in detail and answers for it. No ticket queues.",
  },
  {
    title: "Clear pricing",
    description: "Every engagement states what is billed, how and when. Nothing is invoiced that was not agreed.",
  },
  {
    title: "Everything is yours from day one",
    description: "Code, documentation and cloud accounts sit in your name. Nothing is held back at handover.",
  },
  {
    title: "Straight answers on fit",
    description: "If another approach, model or team would serve you better, we say so before anything is signed.",
  },
  {
    title: "We run products of our own",
    description: "We publish our own web tools and Android apps, so we know what software needs after launch.",
  },
];

export const engagementCopy = {
  number: "08",
  eyebrow: "Engagement models",
  title: "Four ways to work with us",
  lead: "Pick the model that fits how settled your scope is. You can change it as the project matures.",
  more: { label: "Compare the models in detail", href: "/services#engagement-models", track: "home_engagement_compare" },
} satisfies SectionCopy & { more: { label: string; href: string; track: string } };

/** Consistent gap between a section heading and its body across the home page. */
export const bodyGap = "mt-[clamp(2rem,1.25rem+2.5vw,3.5rem)]";

/** Hairline at container width above a section, followed by the section's vertical rhythm. */
export const dividedSection = "border-t border-line py-section";

export const pad = (n: number) => String(n).padStart(2, "0");
