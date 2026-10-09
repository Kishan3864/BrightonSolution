/**
 * Genuine company work, supplied by the owner.
 * Web projects: kishanportfolio.tech/#projects. Android apps: Google Play
 * developer "Brighton Solution". Facts only: no metrics, ratings, download
 * counts, client quotes or outcomes.
 */

export type WebProject = {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  description: string;
  tags: string[];
  url: string;
  /** Display host, e.g. "flexypdf.com". */
  host: string;
  /** 1200x750 screenshot in /public, or null when there is no usable one
   *  (none exists, or the live page shows figures we cannot stand behind). */
  image: string | null;
  /** The page the screenshot shows, for its alt text. Defaults to "home page". */
  imagePage?: string;
};

export type AndroidApp = {
  slug: string;
  name: string;
  summary: string;
  packageId: string;
  /** 192x192 Play Store icon in /public. */
  icon: string;
  playUrl: string;
};

export const playDeveloperName = "Brighton Solution";
export const playDeveloperUrl = "https://play.google.com/store/apps/developer?id=Brighton+Solution";

export const SCREENSHOT_WIDTH = 1200;
export const SCREENSHOT_HEIGHT = 750;
export const APP_ICON_SIZE = 192;

function hostOf(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

function project(p: Omit<WebProject, "host">): WebProject {
  return { ...p, host: hostOf(p.url) };
}

function app(a: Omit<AndroidApp, "playUrl">): AndroidApp {
  return { ...a, playUrl: `https://play.google.com/store/apps/details?id=${a.packageId}` };
}

/** Order is presentation order on /work. Projects without a screenshot are kept
 *  apart (never two typographic tiles in a row), the list starts and ends with a
 *  screenshot, and EventErp follows Empire Event, the studio it runs. */
export const webProjects: WebProject[] = [
  project({
    slug: "flexypdf",
    name: "FlexyPdf",
    category: "SaaS product",
    tagline: "Free online PDF, image and developer tools",
    description:
      "A privacy-first toolbox of browser-based utilities: PDF editing, conversion, merging and compression, image tools with AI upscaling, code formatters, SEO helpers and calculators. Files are processed locally in the browser, with no uploads and no account required.",
    tags: ["Next.js", "Client-side processing", "SEO"],
    url: "https://flexypdf.com",
    image: "/work/sites/flexypdf.webp",
  }),
  project({
    slug: "leadpin",
    name: "Leadpin",
    category: "Platform",
    tagline: "Local business leads from Google Places",
    description:
      "A lead-generation platform that sources local business leads from Google Places, with search and filtering, lead export, team assignment and separate admin and sales-rep access.",
    tags: ["Google Places API", "Role-based access", "Lead export"],
    url: "https://map.flexypdf.com",
    image: null,
  }),
  project({
    slug: "weekendcart",
    name: "WeekendCart",
    category: "E-commerce",
    tagline: "Home appliances, kitchen and home essentials online",
    description:
      "A full e-commerce store for home appliances and kitchen essentials: product catalogue, cart and checkout with UPI, PayU and cash on delivery, order tracking, returns and refunds, invoices and an admin console that runs the whole operation.",
    tags: ["E-commerce", "Payments", "Admin console"],
    url: "https://weekendcart.com",
    image: "/work/sites/weekendcart.webp",
  }),
  project({
    slug: "recruitment-suite",
    name: "Recruitment Suite",
    category: "Platform",
    tagline: "Hiring and staffing platform with an admin console",
    description:
      "A recruitment-agency platform covering permanent hiring, contract staffing, executive search and RPO, with a candidate-facing front end and a separate admin console for managing the full hiring pipeline.",
    tags: ["HR tech", "Admin console", "Multi-tenant"],
    url: "https://recruitment.flexypdf.com",
    image: "/work/sites/recruitment-suite.webp",
    imagePage: "services page",
  }),
  project({
    slug: "empire-event",
    name: "Empire Event",
    category: "Client website",
    tagline: "Wedding and event planners, Surat",
    description:
      "The digital presence for an event-management studio covering destination weddings, corporate productions and celebrations, backed by the custom event ERP and API built for their operations.",
    tags: ["Website", "CMS", "API"],
    url: "https://empireevent.org",
    image: "/work/sites/empire-event.webp",
  }),
  project({
    slug: "eventerp",
    name: "EventErp",
    category: "Platform",
    tagline: "Quotations, invoices and operations for event planners",
    description:
      "An event-management ERP built for a working event studio: client quotations, invoices and end-to-end event management in one place. It is the back office behind Empire Event’s day-to-day operations.",
    tags: ["ERP", "Invoicing", "Operations"],
    url: "https://event.flexypdf.com",
    image: null,
  }),
  project({
    slug: "martins-tavern",
    name: "Martin’s Tavern",
    category: "Client website",
    tagline: "Restaurant website, Georgetown, Washington D.C.",
    description:
      "A website build for a historic Georgetown restaurant: online reservations, full digital menus, a historical timeline, private events and a gallery.",
    tags: ["Website", "Reservations", "Menus"],
    url: "https://martinstavern.flexypdf.com",
    image: "/work/sites/martins-tavern.webp",
  }),
  project({
    slug: "upward",
    name: "Upward",
    category: "Platform",
    tagline: "Career coaching for tech professionals",
    description:
      "A career-coaching platform for tech professionals: resume and LinkedIn rewrites, one-to-one coaching, mock interviews and a structured 12-week placement process.",
    tags: ["Coaching", "Landing page", "Conversion"],
    url: "https://upward.flexypdf.com",
    image: "/work/sites/upward.webp",
    imagePage: "services page",
  }),
  project({
    slug: "nassif-50",
    name: "Nassif 50th Anniversary",
    category: "Client website",
    tagline: "Commemorative microsite, 1976–2026",
    description:
      "A commemorative microsite marking 50 years of an electrical contracting company: brand storytelling, milestone history and service highlights.",
    tags: ["Microsite", "Storytelling"],
    url: "https://anniversary.flexypdf.com",
    image: "/work/sites/nassif-50.webp",
  }),
];

export const apps: AndroidApp[] = [
  app({
    slug: "appanalyzer",
    name: "AppInspector: APK Analyzer",
    summary: "Analyse SDKs, export APKs, audit privacy and inspect technical app details.",
    packageId: "com.smartcodies.appanalyzer",
    icon: "/work/apps/appanalyzer.webp",
  }),
  app({
    slug: "smart-calculator",
    name: "Smart Calculator – GST EMI",
    summary: "All-in-one calculator with GST, EMI, SIP, currency and daily tools.",
    packageId: "com.smartcodies.calculatorformultipurpose",
    icon: "/work/apps/calculatorformultipurpose.webp",
  }),
  app({
    slug: "call-blocker-plus",
    name: "Call Blocker Plus",
    summary: "Block unknown, private and unwanted calls with smart blocking rules.",
    packageId: "com.smartcodies.callblocker",
    icon: "/work/apps/callblocker.webp",
  }),
  app({
    slug: "day-counter",
    name: "Day Counter",
    summary: "Count down to birthdays, trips, anniversaries and special moments.",
    packageId: "com.smartcodies.daycounter",
    icon: "/work/apps/daycounter.webp",
  }),
  app({
    slug: "find-near-me",
    name: "Find Near Me Places",
    summary: "Find well-known places and services near you in a few simple steps.",
    packageId: "com.smartcodies.findnearme",
    icon: "/work/apps/findnearme.webp",
  }),
  app({
    slug: "gps-map-camera",
    name: "GPS Map Camera",
    summary: "Capture photos stamped with location, date and time.",
    packageId: "com.smartcodies.gps.map.camera",
    icon: "/work/apps/gps-map-camera.webp",
  }),
  app({
    slug: "papernote",
    name: "PaperNote: Notepad & Notes",
    summary: "A simple notepad for notes, checklists, to-do lists, sketches and locked notes.",
    packageId: "com.smartcodies.papernote",
    icon: "/work/apps/papernote.webp",
  }),
  app({
    slug: "smart-launcher",
    name: "Smart Launcher – Customize",
    summary: "A fast, clean and customisable home-screen launcher for Android.",
    packageId: "com.smartcodies.smartlauncher",
    icon: "/work/apps/smartlauncher.webp",
  }),
  app({
    slug: "snake-arena",
    name: "Snake Arena: Slither.io Battle",
    summary: "Slither, eat, grow and compete in a multiplayer snake battle arena.",
    packageId: "com.smartcodies.snakeio.android",
    icon: "/work/apps/snakeio-android.webp",
  }),
  app({
    slug: "win-11-launcher",
    name: "Win 11 Launcher",
    summary: "A Windows 11-style launcher with Start menu, taskbar, widgets and notification centre.",
    packageId: "com.smartcodies.winos",
    icon: "/work/apps/winos.webp",
  }),
];

export function getProject(slug: string): WebProject {
  const found = webProjects.find((p) => p.slug === slug);
  if (!found) throw new Error(`Unknown project: ${slug}`);
  return found;
}

/** Home page selection: one featured project and three supporting ones. */
export const featuredProjectSlug = "flexypdf";
export const homeProjectSlugs = ["weekendcart", "empire-event", "martins-tavern"] as const;

/** Spelled-out counts used in copy, derived from the data so they never drift. */
const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
export function countWord(n: number): string {
  return words[n] ?? String(n);
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Copy for the /work page and the home Work section. */
export const workCopy = {
  page: {
    eyebrow: "Work",
    title: "Software we have designed, built and run",
    lead: `${capitalise(countWord(webProjects.length))} web platforms and websites, and ${countWord(
      apps.length,
    )} Android apps published on Google Play: our own products, operational platforms and client builds.`,
    metaDescription: `Selected work by BrightonSolution: ${countWord(
      webProjects.length,
    )} web platforms, SaaS products and client websites, and ${countWord(
      apps.length,
    )} Android apps published on Google Play.`,
  },
  web: {
    number: "01",
    eyebrow: "Web & software",
    title: "Web platforms and websites",
  },
  apps: {
    number: "02",
    eyebrow: "Android apps",
    title: "Android apps on Google Play",
    lead: `${capitalise(countWord(apps.length))} utility, productivity and game apps, published under the ${playDeveloperName} developer account.`,
  },
  home: {
    number: "03",
    eyebrow: "Selected work",
    title: "Products and platforms we have built",
    lead: `A selection from ${countWord(webProjects.length)} web projects and ${countWord(
      apps.length,
    )} Android apps: our own products, operational platforms and client websites.`,
    seeAll: "See all work",
    playStrip: "On Google Play",
    playAll: "All apps on Google Play",
  },
} as const;
