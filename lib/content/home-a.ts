export const hero = {
  eyebrow: "Software development & IT services",
  title: "Software built properly, for companies that depend on it.",
  lead: "Custom software, web and mobile apps, cloud infrastructure and AI features for startups, small businesses and enterprises worldwide.",
  primary: { label: "Let’s Talk", href: "/contact", track: "home_hero_lets_talk" },
  secondary: { label: "See our work", href: "/work", track: "home_hero_see_work" },
};

export const intro = {
  eyebrow: "Who we are",
  statement:
    "One team to design, build and run your software, from the first written specification to years in production.",
};

export const servicesSection = {
  number: "01",
  eyebrow: "Services",
  title: "Seven services, from first screen to production.",
  lead: "Use one on its own or combine several. Each is covered in detail on the Services page.",
  more: { label: "All services in detail", href: "/services", track: "home_services_all" },
};

export const howWeHelpSection = {
  number: "02",
  eyebrow: "How we help",
  title: "Six kinds of work we take on.",
  lead: "Most projects start with one of these. Many grow into several.",
};

/** One line each, deliberately not repeating the service summaries above. */
export const howWeHelpItems: { title: string; line: string }[] = [
  { title: "Build", line: "Turn an idea or a specification into working software, shipped in usable increments." },
  { title: "Modernize", line: "Replace or refactor legacy systems in stages, while the business keeps running." },
  { title: "Scale", line: "Remove bottlenecks in code and infrastructure before growth turns them into outages." },
  { title: "Automate", line: "Take repetitive manual work out of operations with integrations, workflows and practical AI." },
  { title: "Secure", line: "Review access, data handling and infrastructure, close the gaps and keep them closed." },
  { title: "Maintain", line: "Keep production software healthy with monitoring, updates and a clear process for fixes." },
];
