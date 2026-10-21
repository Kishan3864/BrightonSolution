/**
 * Copy, form options and plans for the private landing page (LAUNCH_PATH in lib/site.ts).
 * Everything a visitor reads on that page lives here, so prices, promises and wording can be
 * changed in one place. Promises (reply time, support periods, code ownership) are commitments:
 * change them here if the way you work changes.
 */
import type { IconName } from "@/lib/site";
import type { LeadCurrency } from "@/lib/firebase/schema";

export type Currency = LeadCurrency;

export const launchMeta = {
  title: "Get your website or app built at a fixed price",
  description:
    "Websites, web apps and mobile apps designed, built and launched by BrightonSolution. Share your idea in two minutes and get a free plan with a fixed quote.",
};

export const launchHero = {
  eyebrow: "Websites, web apps and mobile apps",
  title: "Your website or app, live in weeks.",
  lead: "Designed and built by one team at a fixed price. Get a free quote within one business day.",
  primary: "Get my free quote",
  secondary: "See plans and pricing",
};

/** The one CTA label for "go to the form", used everywhere on the page. */
export const ctaLabel = launchHero.primary;

export const proofSection = {
  title: "Real products, built by our team and running today.",
  lead: "Websites, SaaS platforms, online stores and Android apps. Open any of them and look around.",
};

export const howItWorks = {
  title: "From first message to launch, without the guesswork.",
  steps: [
    {
      title: "Share your idea",
      text: "Answer a few quick questions below. Two minutes, no technical knowledge needed.",
      meta: "2 minutes",
    },
    {
      title: "Get your plan",
      text: "We reply with a clear scope, a fixed price and a timeline. Free, with no obligation.",
      meta: "Within 1 business day",
    },
    {
      title: "Watch it come together",
      text: "We design first, then build in milestones. You see working progress every week.",
      meta: "Weekly demos",
    },
    {
      title: "Launch and grow",
      text: "We put it live, hand over everything and stay on for support while you grow.",
      meta: "Free support included",
    },
  ],
};

export const briefSection = {
  eyebrow: "Free project plan",
  title: "Tell us what you need. We will plan it for free.",
  lead: "Answer three short steps. You get a written plan from our team, not an automated reply.",
  promises: [
    { icon: "lightbulb" as IconName, text: "What to build first, and what can wait" },
    { icon: "shield" as IconName, text: "A fixed price and timeline, in writing" },
    { icon: "clock" as IconName, text: "A reply within one business day" },
    { icon: "chat" as IconName, text: "On WhatsApp, a call or email: your choice" },
  ],
  privacy: "No obligation and no spam. Your details are only used to reply to you.",
};

/* ------------------------------------------------------------------ form */

export type Option = { id: string; label: string; hint?: string; icon?: IconName };

export const projectTypes: Option[] = [
  { id: "website", label: "Website", hint: "Business site, landing page, portfolio", icon: "web" },
  { id: "webapp", label: "Web app or SaaS", hint: "Portals, dashboards, platforms", icon: "code" },
  { id: "mobile", label: "Mobile app", hint: "Android and iOS", icon: "mobile" },
  { id: "store", label: "Online store", hint: "Products, cart and payments", icon: "cart" },
  { id: "software", label: "Custom software", hint: "CRM, ERP, internal tools", icon: "cloud" },
  { id: "ai", label: "AI or automation", hint: "Chat assistants, smart workflows", icon: "ai" },
  { id: "redesign", label: "Redesign or fix", hint: "Improve something that exists", icon: "design" },
  { id: "unsure", label: "Not sure yet", hint: "We will help you decide", icon: "lightbulb" },
];

export const stages: Option[] = [
  { id: "idea", label: "Just an idea" },
  { id: "spec", label: "I have designs or a written plan" },
  { id: "live", label: "I have a product that needs work" },
];

export const features: Option[] = [
  { id: "login", label: "User accounts and login" },
  { id: "payments", label: "Online payments" },
  { id: "admin", label: "Admin dashboard" },
  { id: "booking", label: "Bookings or appointments" },
  { id: "chat", label: "Chat or messaging" },
  { id: "push", label: "Push notifications" },
  { id: "maps", label: "Maps and location" },
  { id: "languages", label: "Multiple languages" },
  { id: "ai", label: "AI features" },
  { id: "integrations", label: "Connect existing tools" },
  { id: "cms", label: "Edit content yourself" },
  { id: "seo", label: "SEO and Google ranking" },
];

export const timelines: Option[] = [
  { id: "asap", label: "As soon as possible" },
  { id: "1m", label: "Within a month" },
  { id: "3m", label: "In 1-3 months" },
  { id: "6m", label: "In 3-6 months" },
  { id: "flexible", label: "I am flexible" },
];

export const budgets: Record<Currency, string[]> = {
  USD: ["Under $1,000", "$1,000 - $3,000", "$3,000 - $7,500", "$7,500 - $15,000", "$15,000+", "Not sure yet"],
  INR: [
    "Under ₹30,000",
    "₹30,000 - ₹1 lakh",
    "₹1 lakh - ₹2.5 lakh",
    "₹2.5 lakh - ₹6 lakh",
    "₹6 lakh+",
    "Not sure yet",
  ],
};

export const contactPrefs: Option[] = [
  { id: "whatsapp", label: "WhatsApp", icon: "chat" },
  { id: "call", label: "Phone call", icon: "phone" },
  { id: "email", label: "Email", icon: "mail" },
];

export const PLAN_UNSURE = "Help me choose";

export const formCopy = {
  steps: ["Project", "Scope", "Contact"],
  submit: "Get my free plan",
  sending: "Sending…",
  next: "Continue",
  back: "Back",
  successTitle: (name: string) => `Thank you${name ? `, ${name}` : ""}. Your brief is with our team.`,
  successText: (channel: string) =>
    `Our team reviews every brief personally. Expect a reply within one business day${
      channel ? ` by ${channel === "WhatsApp" ? channel : channel.toLowerCase()}` : ""
    }, with your plan and a fixed quote.`,
  errorText: "Your brief could not be sent right now. Your answers are still here, so try again in a moment.",
};

/* ----------------------------------------------------------------- plans */

export type PlanId = "starter" | "growth" | "premium";

export type Plan = {
  id: PlanId;
  name: string;
  summary: string;
  bestFor: string;
  price: Record<Currency, number>;
  delivery: string;
  /** First line of the list, e.g. "Everything in Starter, plus". */
  includesPrevious?: string;
  features: string[];
  recommended?: boolean;
};

/**
 * Three fixed-price packages. Growth is the one most projects need and is set as recommended:
 * Starter covers a website only, so anyone who needs accounts, payments or an app moves up, and
 * Premium anchors the top of the range for complete products.
 */
export const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    summary: "A fast, professional website that makes people trust you.",
    bestFor: "Shops, clinics, consultants and new businesses",
    price: { USD: 799, INR: 24_999 },
    delivery: "Live in about 2 weeks",
    features: [
      "Up to 6 custom-designed pages",
      "Looks great on every phone and screen",
      "Contact form, WhatsApp button and Google Maps",
      "SEO setup so customers find you on Google",
      "Domain, hosting and SSL set up for you",
      "30 days of free support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    summary: "A web or mobile app that runs a real part of your business.",
    bestFor: "Startups and growing businesses",
    price: { USD: 2_499, INR: 79_999 },
    delivery: "Live in 4-6 weeks",
    includesPrevious: "Everything in Starter, plus",
    features: [
      "Web app, or an Android and iOS app",
      "Up to 15 custom-designed screens",
      "User accounts, login and profiles",
      "Online payments (Razorpay, Stripe, PayPal)",
      "Admin dashboard to manage everything",
      "90 days of free support",
    ],
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium",
    summary: "A complete product on the web, iOS and Android, ready to scale.",
    bestFor: "Funded startups and established companies",
    price: { USD: 5_999, INR: 1_99_999 },
    delivery: "Live in 8-10 weeks",
    includesPrevious: "Everything in Growth, plus",
    features: [
      "Web app plus Android and iOS apps",
      "AI features: assistant, smart search, automation",
      "Custom back end, APIs and integrations",
      "Cloud setup with automatic backups",
      "Dedicated project manager and weekly demos",
      "6 months of free support and priority fixes",
    ],
  },
];

export const plansSection = {
  title: "Simple plans. Fixed prices.",
  lead: "Pick the plan closest to your idea. We confirm the exact scope with you before any work begins.",
  priceNote: "one-time, fixed price",
  included: [
    "Free plan and quote first",
    "Price agreed in writing",
    "Pay in milestones",
    "You own 100% of the code",
    "NDA on request",
  ],
  custom: "Need something bigger or different?",
  customLink: "Tell us in the form and get a custom quote",
};

export const planDialogCopy = {
  title: (plan: string) => `Get the ${plan} plan`,
  lead: "Leave your details and we will call or message you within one business day to confirm your scope. Nothing to pay now.",
  submit: (plan: string) => `Request the ${plan} plan`,
  successTitle: "Request received.",
  successText: "We will contact you within one business day to confirm your scope and timeline.",
  addDetails: "Add project details for a sharper quote",
};

/* ------------------------------------------------------------------- faq */

export const faq: { q: string; a: string }[] = [
  {
    q: "Is the price really fixed?",
    a: "Yes. We agree the scope and price in writing before we start. The price only changes if you ask for something new, and we quote that before doing it.",
  },
  {
    q: "How do payments work?",
    a: "In milestones, not all upfront. A deposit starts the work, and each next payment is due only when you have approved the milestone before it.",
  },
  {
    q: "Who owns the website or app?",
    a: "You do. At launch you get the full source code, the designs and every account in your own name.",
  },
  {
    q: "I am not technical. Is that a problem?",
    a: "Not at all. Most of our clients are not. We explain every decision in plain language and show you working progress every week.",
  },
  {
    q: "What if I do not know exactly what I need?",
    a: "Choose “Not sure yet” in the form. We suggest the smallest version worth building first, so you launch sooner and spend less.",
  },
  {
    q: "Do you work with clients in other countries?",
    a: "Yes. We work with clients worldwide, fully remote, and schedule calls around your time zone. Prices can be shown in US dollars or rupees.",
  },
  {
    q: "What happens after launch?",
    a: "Every plan includes free support after launch. After that you can keep us on for updates and improvements, or take everything in-house.",
  },
];

export const finalCta = {
  title: "Your idea deserves to go live.",
  lead: "Two minutes now. A clear plan and a fixed price within one business day.",
};
