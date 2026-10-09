export type Principle = {
  number: string;
  title: string;
  description: string;
};

export type ClientType = {
  name: string;
  needs: string;
  adapt: string;
};

export type Commitment = {
  title: string;
  description: string;
};

export type Fact = { label: string; value: string };

export const aboutHero = {
  eyebrow: "About",
  title: "A software partner built on clear thinking and careful engineering.",
  lead: "BrightonSolution designs, builds and maintains software for startups, small businesses and enterprises worldwide. We keep teams small, communication direct and the code yours.",
};

export const aboutMeta = {
  title: "About",
  description:
    "How BrightonSolution thinks and works: a remote software development and IT services company for startups, small businesses and enterprises worldwide.",
};

export const whoWeAre = {
  statement:
    "BrightonSolution is a software development and IT services company. We build custom software, web and mobile applications, cloud infrastructure and AI-powered features, and we look after them once they are live.",
  paragraphs: [
    "We work with startups that need a first product built properly, small businesses replacing tools they have outgrown, and enterprises that need a dependable team for a specific system. Our clients are spread across time zones, so we work remotely and in writing by default.",
    "Every engagement is run by a small team of senior people who scope the work, build it and stay accountable for it. You talk to the engineers directly, you see working software early, and everything we produce lives in your repositories and accounts from the first day.",
  ],
  facts: [
    { label: "Built for", value: "Startups, small businesses and enterprises worldwide" },
    { label: "Ways of working", value: "Remote, in writing, in short increments" },
    { label: "Ownership", value: "Code, accounts and documentation stay with you" },
  ] as Fact[],
};

export const principlesIntro = {
  title: "Five principles that shape every decision we make.",
  lead: "These are the rules we apply when scoping, estimating and building. They are written here so you can hold us to them.",
};

export const principles: Principle[] = [
  {
    number: "01",
    title: "Clarity before code",
    description:
      "We do not start building until the problem, the scope and the definition of done are written down and agreed. The most expensive mistakes in software are misunderstandings, and they are cheapest to fix on paper.",
  },
  {
    number: "02",
    title: "Senior people, small teams",
    description:
      "A few experienced engineers who understand the whole system outperform a large team that has to coordinate. The people who scope your project are the people who build it.",
  },
  {
    number: "03",
    title: "Build what the business needs",
    description:
      "We recommend the simplest system that solves the problem, which is sometimes smaller than what was asked for. Features earn their place by being used, not by appearing in a proposal.",
  },
  {
    number: "04",
    title: "Security and quality are not add-ons",
    description:
      "Code review, automated tests, access control and dependency updates are part of every project from the first commit. They are how we work, not a line item you can remove.",
  },
  {
    number: "05",
    title: "Honest timelines, long-term choices",
    description:
      "Estimates come with their assumptions attached, and you hear about changes as soon as we do. We choose technology that will still be well supported and easy to hire for in years, not months.",
  },
];

export const clientsIntro = {
  title: "Three kinds of company, one way of working.",
  lead: "Companies at different stages ask us for different things. What changes is the shape of the engagement; how we run it stays the same.",
};

export const clientTypes: ClientType[] = [
  {
    name: "Startups",
    needs:
      "A first version that proves the idea without painting the company into a corner: a product people can use, built on foundations that will not need rewriting at the first sign of growth.",
    adapt:
      "We scope a tight first release, make pragmatic technology choices and keep the team small so the budget goes into the product. As the company grows, we can hand over to an in-house team or keep building alongside it.",
  },
  {
    name: "Small businesses",
    needs:
      "Software that fits how the business actually runs: replacing spreadsheets, connecting the tools already in use, and a reliable team to call when something needs changing.",
    adapt:
      "We explain options in plain language, estimate in writing and prefer well-supported technology that is easy to maintain. Once the first project is live, we can stay on under a maintenance and support arrangement, so there is always someone to call when something needs changing.",
  },
  {
    name: "Enterprises",
    needs:
      "A dependable team for a specific system or initiative that has to work within existing architecture, security policies and procurement requirements.",
    adapt:
      "We fit into your tooling, review processes and reporting cadence, document as we go and coordinate with internal teams and other vendors. Scope, access and responsibilities are agreed in writing before work begins.",
  },
];

export const commitmentsIntro = {
  title: "What every client can expect, whatever the size of the project.",
  lead: "These are not aspirations. They are written into how we scope, run and hand over every engagement.",
};

export const commitments: Commitment[] = [
  {
    title: "Written scope before work starts",
    description:
      "You receive a written scope, estimate and list of assumptions before any billable work begins. Changes to scope are agreed the same way.",
  },
  {
    title: "A named lead",
    description:
      "One person who knows your project in detail answers for it, from the first conversation to handover. You are never passed between departments.",
  },
  {
    title: "Regular written updates",
    description:
      "Progress, decisions and open questions are summarised in writing on an agreed rhythm, with working software to review alongside them.",
  },
  {
    title: "Code and documentation handed over",
    description:
      "Source code, infrastructure definitions, credentials and documentation live in your accounts and repositories throughout the project, not only at the end.",
  },
  {
    title: "No lock-in",
    description:
      "You can take the work to another team at any time. We build with widely used, well-supported technology and leave nothing that only we can operate.",
  },
  {
    title: "Clear pricing",
    description:
      "Every engagement states what is billed, how and when. Nothing is invoiced that was not agreed in advance.",
  },
];

export const howWeWorkIntro = {
  title: "Seven steps, in the same order, on every project.",
  lead: "The size of each step changes with the project. The order, and what you receive at the end of each one, does not.",
  aside:
    "The same process runs behind every service we offer, from a first product to the maintenance of a system we did not build.",
};
