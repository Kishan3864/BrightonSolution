export type IconName =
  | "arrow"
  | "arrowUpRight"
  | "plus"
  | "minus"
  | "check"
  | "build"
  | "modernize"
  | "scale"
  | "automate"
  | "secure"
  | "maintain"
  | "mail"
  | "menu"
  | "close"
  | "code"
  | "web"
  | "mobile"
  | "cloud"
  | "ai"
  | "design"
  | "support";

export type NavItem = { label: string; href: string };

export type Service = {
  slug: string;
  number: string;
  title: string;
  summary: string;
  description: string;
  deliverables: string[];
  goodFor: string;
  icon: IconName;
};

export type HelpItem = {
  title: string;
  description: string;
  icon: IconName;
};

export type Industry = { name: string; line: string };

export type TechnologyGroup = { name: string; items: string[] };

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
  output: string;
};

export type Reason = { title: string; description: string };

export type EngagementModel = {
  title: string;
  summary: string;
  bestFor: string;
  howItWorks: string;
  billing: string;
};

export type FooterColumn = { title: string; links: NavItem[] };

export type SiteInfo = {
  name: string;
  url: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  tagline: string;
  locale: string;
};

export const site: SiteInfo = {
  name: "BrightonSolution",
  url: "https://brightonsolution.com",
  email: "support@brightonsolution.com",
  phone: "",
  address: "",
  description:
    "BrightonSolution is a software development and IT services company. We design, build and maintain custom software, web and mobile applications, cloud infrastructure and AI-powered features for startups, small businesses and enterprises worldwide.",
  tagline: "Software built properly, for companies that depend on it.",
  locale: "en_GB",
};

export const nav: NavItem[] = [
  { label: "Services", href: "/services" },
  { label: "Industries", href: "/#industries" },
  { label: "Technologies", href: "/#technologies" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const services: Service[] = [
  {
    slug: "custom-software",
    number: "01",
    title: "Custom Software Development",
    summary:
      "Purpose-built systems for the parts of your business that off-the-shelf tools do not fit.",
    description:
      "When spreadsheets, plugins and generic SaaS stop keeping up, we build software around how your company actually works. That means internal platforms, customer portals, integrations between the tools you already use and the back-office systems nobody else wants to touch. Every system is designed to be understood and extended by whoever maintains it next.",
    deliverables: [
      "Requirements and technical specification",
      "System architecture and data model",
      "Back-end services and APIs",
      "Admin and internal user interfaces",
      "Integrations with existing tools and third-party APIs",
      "Documentation and handover",
    ],
    goodFor:
      "Companies whose workflows, data or compliance needs have outgrown ready-made products.",
    icon: "code",
  },
  {
    slug: "web-applications",
    number: "02",
    title: "Web Application Development",
    summary:
      "Fast, accessible web applications and marketing sites that hold up under real traffic.",
    description:
      "We build web products end to end: the public-facing site, the logged-in application behind it and the APIs that connect them. We favour proven frameworks, server-side rendering where it matters and measurable performance budgets. The result is a product that loads quickly, works on every device and is easy for your team to update.",
    deliverables: [
      "Front-end built with React or Next.js",
      "REST or GraphQL API layer",
      "Authentication, roles and permissions",
      "Content management where you need to edit copy yourself",
      "Performance, accessibility and SEO baseline",
      "Automated tests and deployment pipeline",
    ],
    goodFor:
      "Startups launching a product and established businesses replacing a site or portal that has become a liability.",
    icon: "web",
  },
  {
    slug: "mobile-apps",
    number: "03",
    title: "Mobile App Development",
    summary:
      "iOS and Android applications, native or cross-platform, with the back end to match.",
    description:
      "We build mobile apps that are designed for the platform they run on and the people who use them. Depending on your product and budget, that can mean a single cross-platform codebase with React Native or Flutter, or fully native Swift and Kotlin. We handle the whole lifecycle from store listings and release builds to crash reporting and updates.",
    deliverables: [
      "Cross-platform or native app for iOS and Android",
      "Offline support, push notifications and deep links",
      "Secure API and account management",
      "App Store and Google Play submission",
      "Analytics and crash reporting setup",
      "Release process for ongoing updates",
    ],
    goodFor:
      "Products where the phone is the main interface: field teams, consumer services, bookings, loyalty and on-demand businesses.",
    icon: "mobile",
  },
  {
    slug: "cloud-devops",
    number: "04",
    title: "Cloud & DevOps",
    summary:
      "Infrastructure that is reproducible, observable and sized for what you actually run.",
    description:
      "We set up and operate cloud environments on AWS, Google Cloud and Azure using infrastructure as code, so every environment can be rebuilt from a repository rather than from memory. We put in place CI/CD pipelines, monitoring, backups and cost controls, and we document how it all fits together. If you already have infrastructure, we review it and fix what is fragile before it fails.",
    deliverables: [
      "Cloud architecture review or design",
      "Infrastructure as code with Terraform or Pulumi",
      "Containerisation and orchestration with Docker and Kubernetes",
      "CI/CD pipelines with automated testing and rollbacks",
      "Monitoring, logging, alerting and backups",
      "Cost and security review with written recommendations",
    ],
    goodFor:
      "Teams that deploy by hand, cannot see why things break, or are paying for far more cloud than they use.",
    icon: "cloud",
  },
  {
    slug: "ai-integration",
    number: "05",
    title: "AI Integration",
    summary:
      "Practical AI features inside the software you already use, built with guardrails.",
    description:
      "We add language models, retrieval and automation to real products: search across your documents, assistants that answer from your own data, classification and extraction for documents and tickets, and workflows that draft rather than decide. We start by proving the use case on your data, measure the quality honestly and only then build it into production with logging, evaluation and human review where it belongs.",
    deliverables: [
      "Use-case assessment and feasibility test on your data",
      "Retrieval-augmented search and assistants over internal content",
      "Document, email and ticket classification and extraction",
      "Integration with OpenAI, Anthropic, Google or open-source models",
      "Evaluation harness, logging and cost controls",
      "Privacy and data-handling review",
    ],
    goodFor:
      "Companies with repetitive knowledge work, large document sets or support queues that need faster first answers.",
    icon: "ai",
  },
  {
    slug: "ui-ux-design",
    number: "06",
    title: "UI/UX Design",
    summary:
      "Interfaces designed around real tasks, tested before anyone writes production code.",
    description:
      "Good design is what makes software usable without training. We map the flows your users go through, prototype the screens, test them with real people where possible and hand over a design system that engineers can build from directly. We design for accessibility from the first wireframe, not as a final check.",
    deliverables: [
      "User flows and information architecture",
      "Wireframes and clickable prototypes",
      "High-fidelity screens for web and mobile",
      "Design system with components and tokens",
      "Accessibility review against WCAG 2.2 AA",
      "Developer handover with specifications",
    ],
    goodFor:
      "New products that need to be right the first time, and existing products whose interface is slowing people down.",
    icon: "design",
  },
  {
    slug: "maintenance-support",
    number: "07",
    title: "Maintenance & Support",
    summary:
      "Ongoing care for software in production: updates, fixes, monitoring and small improvements.",
    description:
      "Software needs looking after once it is live. We keep dependencies current, apply security patches, watch the monitoring, fix what breaks and make the steady stream of small improvements that keep a product useful. We can take over systems we did not build, starting with an audit so you know exactly what you have.",
    deliverables: [
      "Codebase and infrastructure audit on takeover",
      "Dependency, framework and security updates",
      "Bug fixes with agreed priorities and timelines",
      "Uptime monitoring and incident handling",
      "Scheduled improvements and small features",
      "Monthly report of work done and recommendations",
    ],
    goodFor:
      "Any business running software it depends on without an in-house team to maintain it.",
    icon: "support",
  },
];

export const howWeHelp: HelpItem[] = [
  {
    title: "Build",
    description:
      "Turn an idea, a specification or a pile of requirements into working software. We scope it carefully, build it in short increments and ship something usable early.",
    icon: "build",
  },
  {
    title: "Modernize",
    description:
      "Replace or refactor legacy systems that are slow, hard to change or impossible to hire for. We migrate in stages so the business keeps running throughout.",
    icon: "modernize",
  },
  {
    title: "Scale",
    description:
      "Prepare a product for more users, more data and more teams. We remove bottlenecks in the code and the infrastructure before they become outages.",
    icon: "scale",
  },
  {
    title: "Automate",
    description:
      "Take repetitive manual work out of your operations with integrations, workflows and, where it genuinely helps, AI. Your people keep the judgement calls.",
    icon: "automate",
  },
  {
    title: "Secure",
    description:
      "Review access, data handling and infrastructure against current standards. We fix the gaps and set up practices that keep things secure as the product changes.",
    icon: "secure",
  },
  {
    title: "Maintain",
    description:
      "Keep production software healthy with monitoring, updates and a clear process for fixes. You always know who to call and what happens next.",
    icon: "maintain",
  },
];

export const industries: Industry[] = [
  {
    name: "Fintech & payments",
    line: "Payment flows, ledgers, KYC onboarding and reporting that must be correct to the cent.",
  },
  {
    name: "Healthcare",
    line: "Patient portals, scheduling, clinical workflows and integrations that handle sensitive data carefully.",
  },
  {
    name: "E-commerce & retail",
    line: "Storefronts, catalogue and inventory systems, checkout and order management.",
  },
  {
    name: "Logistics & supply chain",
    line: "Tracking, dispatch, warehouse tools and dashboards that show where everything is right now.",
  },
  {
    name: "Education",
    line: "Learning platforms, student and course management, assessments and content delivery.",
  },
  {
    name: "Real estate & property",
    line: "Listings, tenant and owner portals, document workflows and maintenance tracking.",
  },
  {
    name: "SaaS & technology",
    line: "Multi-tenant products, billing, usage metering, admin tooling and public APIs.",
  },
  {
    name: "Professional services",
    line: "Client portals, time and project tracking, proposals, invoicing and reporting.",
  },
  {
    name: "Manufacturing",
    line: "Production planning, quality tracking, equipment data and supplier coordination.",
  },
  {
    name: "Media & publishing",
    line: "Content platforms, subscriptions, editorial tools and audience analytics.",
  },
];

export const technologies: TechnologyGroup[] = [
  {
    name: "Frontend",
    items: ["TypeScript", "React", "Next.js", "Vue", "Tailwind CSS", "Web accessibility"],
  },
  {
    name: "Backend",
    items: ["Node.js", "Python", ".NET", "Go", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL"],
  },
  {
    name: "Mobile",
    items: ["React Native", "Flutter", "Swift", "Kotlin", "App Store & Play Store release"],
  },
  {
    name: "Cloud & DevOps",
    items: ["AWS", "Google Cloud", "Azure", "Docker", "Kubernetes", "Terraform", "GitHub Actions", "Firebase"],
  },
  {
    name: "Data & AI",
    items: ["OpenAI", "Anthropic", "Open-source models", "Vector search", "Data pipelines", "Analytics"],
  },
  {
    name: "Design & Delivery",
    items: ["Figma", "Design systems", "Automated testing", "Agile delivery", "Technical documentation"],
  },
];

export const process: ProcessStep[] = [
  {
    number: "01",
    title: "Discover",
    description:
      "We learn how your business works, who the software is for and what success looks like. We ask the awkward questions early so they do not surface mid-build.",
    output: "Written summary of goals, constraints and open questions",
  },
  {
    number: "02",
    title: "Strategize",
    description:
      "We define the scope, choose the technology and agree what ships first. You get a plan with real trade-offs, not a wish list.",
    output: "Scope, architecture outline, timeline and estimate",
  },
  {
    number: "03",
    title: "Design",
    description:
      "We map the user flows and design the screens before anything is coded. Prototypes are reviewed with you and, where possible, with real users.",
    output: "Prototype, screen designs and design system",
  },
  {
    number: "04",
    title: "Build",
    description:
      "Engineers build in short increments, with code review on every change. You see working software every week or two, not a reveal at the end.",
    output: "Working increments in a staging environment",
  },
  {
    number: "05",
    title: "Test",
    description:
      "Automated tests run on every change. Before launch we test performance, security and accessibility, and fix what we find.",
    output: "Test coverage report and pre-launch checklist",
  },
  {
    number: "06",
    title: "Launch",
    description:
      "We plan the release, migrate data if needed and go live with monitoring in place. Rollback is prepared before it is needed.",
    output: "Production release, runbook and handover",
  },
  {
    number: "07",
    title: "Scale",
    description:
      "After launch we watch how the product is used, fix what gets in the way and plan the next improvements with you.",
    output: "Support plan and prioritised roadmap",
  },
];

export const whyUs: Reason[] = [
  {
    title: "Senior engineers on every project",
    description:
      "The people who scope your project are the people who build it. Nothing is handed down to someone who was not in the room.",
  },
  {
    title: "One accountable point of contact",
    description:
      "You have a single lead who knows your project in detail and answers for it. No ticket queues, no being passed around.",
  },
  {
    title: "You own the code and the documentation",
    description:
      "Everything we produce lives in your repositories and accounts from day one. If you ever want to move on, nothing is held hostage.",
  },
  {
    title: "A fixed communication rhythm",
    description:
      "Agreed check-ins, written updates and a shared board you can look at whenever you like. You never have to wonder what is happening.",
  },
  {
    title: "Security and quality built in from day one",
    description:
      "Code review, automated tests, access control and dependency updates are part of how we work, not extras you pay for later.",
  },
  {
    title: "Long-term thinking",
    description:
      "We make choices that are easy to maintain in three years, not just quick to ship this month. Boring, well-supported technology wins most of the time.",
  },
];

export const engagementModels: EngagementModel[] = [
  {
    title: "Fixed Project",
    summary: "A defined scope, delivered for an agreed price and timeline.",
    bestFor: "Clearly specified products, MVPs, redesigns and migrations.",
    howItWorks:
      "We scope the work together, agree the deliverables in writing and deliver in milestones you sign off on.",
    billing: "Fixed price, invoiced per milestone.",
  },
  {
    title: "Dedicated Team",
    summary: "Engineers and designers who work only on your product, led by us.",
    bestFor: "Products under continuous development that need stable, full-time capacity.",
    howItWorks:
      "We assemble a team around your needs, integrate with your tools and ways of working, and plan with you in regular sprints.",
    billing: "Monthly, per team member.",
  },
  {
    title: "Time & Material",
    summary: "Flexible capacity billed for the hours actually worked.",
    bestFor: "Evolving requirements, research-heavy work and ongoing improvements.",
    howItWorks:
      "You set the priorities, we estimate each piece of work and report time transparently as we go.",
    billing: "Hourly or daily rate, invoiced monthly.",
  },
  {
    title: "Long-Term Partnership",
    summary: "An ongoing technology partner for companies without an in-house team.",
    bestFor: "Businesses that depend on software and want one team to own it over years.",
    howItWorks:
      "We maintain what exists, plan what comes next and act as your technical lead for decisions, vendors and hiring.",
    billing: "Monthly retainer, reviewed quarterly.",
  },
];

export const budgets: string[] = [
  "Under $5,000",
  "$5,000 – $15,000",
  "$15,000 – $50,000",
  "$50,000 – $150,000",
  "$150,000+",
  "Not sure yet",
];

export const footerColumns: FooterColumn[] = [
  {
    title: "Services",
    links: services.map((s) => ({ label: s.title, href: `/services#${s.slug}` })),
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Industries", href: "/#industries" },
      { label: "Technologies", href: "/#technologies" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];
