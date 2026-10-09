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

export const aboutHero = {
  eyebrow: "About",
  title: "A software partner built on clear thinking and careful engineering.",
  lead: "Direct communication and code that stays yours, for startups, small businesses and enterprises worldwide.",
};

export const aboutMeta = {
  title: "About",
  description:
    "How BrightonSolution thinks and works: a remote software development and IT services company for startups, small businesses and enterprises worldwide.",
};

export const whoWeAre = {
  statement:
    "BrightonSolution builds custom software, web and mobile applications, cloud infrastructure and AI-powered features, and looks after them once they are live.",
  paragraphs: [
    "Our clients are spread across time zones, so we work remotely and in writing by default. You talk to the people doing the work, see working software early, and everything we produce lives in your repositories and accounts from the first day.",
  ],
};

export const principlesIntro = {
  title: "Five principles behind every decision.",
  lead: "The rules we apply when scoping, estimating and building, written down so you can hold us to them.",
};

export const principles: Principle[] = [
  {
    number: "01",
    title: "Clarity before code",
    description:
      "We do not start building until the problem and the definition of done are agreed. The most expensive mistakes in software are misunderstandings, and they are cheapest to fix on paper.",
  },
  {
    number: "02",
    title: "Experienced people, close to the work",
    description:
      "The people who understand the whole system build it, so nothing is lost between a planning team and a delivery team.",
  },
  {
    number: "03",
    title: "Build what the business needs",
    description:
      "We recommend the simplest system that solves the problem, which is sometimes smaller than what was asked for. Features earn their place by being used.",
  },
  {
    number: "04",
    title: "Quality and security are not add-ons",
    description:
      "They are how we work from the first commit, not a line item you can remove from a proposal.",
  },
  {
    number: "05",
    title: "Honest timelines, long-term choices",
    description:
      "Estimates come with their assumptions attached, and you hear about changes as soon as we do. We choose technology that will still be well supported and easy to hire for in years.",
  },
];

export const clientsIntro = {
  title: "Three kinds of company, one way of working.",
  lead: "What changes is the shape of the engagement; how we run it stays the same.",
};

export const clientTypes: ClientType[] = [
  {
    name: "Startups",
    needs:
      "A first version that proves the idea without painting the company into a corner, on foundations that will not need rewriting at the first sign of growth.",
    adapt:
      "A tight first release, pragmatic technology choices and a small team, so the budget goes into the product. Later we can hand over to an in-house team or build alongside it.",
  },
  {
    name: "Small businesses",
    needs:
      "Software that fits how the business actually runs: replacing spreadsheets, connecting the tools already in use, and a reliable team to call when something needs changing.",
    adapt:
      "Options explained in plain language, estimates in writing and well-supported technology that is easy to maintain, with ongoing support once the first project is live.",
  },
  {
    name: "Enterprises",
    needs:
      "A dependable team for a specific system or initiative that has to work within existing architecture, security policies and procurement requirements.",
    adapt:
      "We fit into your tooling, review processes and reporting cadence, and coordinate with internal teams and other vendors. Scope, access and responsibilities are agreed in writing first.",
  },
];

export const workTeaser = {
  eyebrow: "Our work",
  title: "Products we have designed, built and shipped.",
  cta: "See what we have built",
};
