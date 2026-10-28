/**
 * DEV-ONLY demo data source for designing the admin without Firebase: open /admin?demo=1 under
 * `next dev`. AdminDashboard imports this module with a dynamic import() inside a
 * process.env.NODE_ENV === "development" guard, so production builds never include it.
 *
 * Deterministic: a seeded PRNG builds the same shape on every load, placed relative to "now":
 * ~60 contacts, ~90 landing leads (both kinds, every status, plan and currency), ~4000 page views
 * and ~1500 events over 100 days with realistic referrers, UTM tags, devices, countries and time
 * zones. A new contact or lead "arrives" every ~45 s so toasts and notifications can be tried.
 * Every mutation only changes this in-memory store.
 */

import { budgets as siteBudgets } from "@/lib/site";
import { budgets as launchBudgets, contactPrefs, features as launchFeatures, plans, PLAN_UNSURE, projectTypes, stages, timelines } from "@/lib/content/launch";
import type { ContactStatus, LeadCurrency, LeadKind, LeadStatus } from "@/lib/firebase/schema";
import type { AdminSource, ContactDoc, EventDoc, LeadDoc, PageviewDoc, SettingsState } from "./types";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const DAYS = 100;
const SESSIONS = 1650;

/* ------------------------------------------------------------------ random */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)] as T;
}

function weighted<T>(rng: Rng, list: readonly (readonly [T, number])[]): T {
  const total = list.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [value, w] of list) {
    r -= w;
    if (r <= 0) return value;
  }
  return list[list.length - 1][0];
}

function id(rng: Rng, length = 20): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(rng() * chars.length)];
  return out;
}

/** Log-normal-ish duration around `median` ms. */
function duration(rng: Rng, median: number, spread = 1.1): number {
  const u = Math.max(1e-6, rng());
  const v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return Math.max(0, Math.round(median * Math.exp(z * spread * 0.6)));
}

/* -------------------------------------------------------------------- data */

type Zone = { zone: string; offset: number; languages: readonly string[]; weight: number; inr?: boolean };

const ZONES: readonly Zone[] = [
  { zone: "Asia/Kolkata", offset: 5.5, languages: ["en-IN", "en-IN", "hi-IN", "en-US", "gu-IN"], weight: 44, inr: true },
  { zone: "America/New_York", offset: -4, languages: ["en-US"], weight: 10 },
  { zone: "Europe/London", offset: 1, languages: ["en-GB"], weight: 8 },
  { zone: "America/Los_Angeles", offset: -7, languages: ["en-US", "es-US"], weight: 5 },
  { zone: "Asia/Dubai", offset: 4, languages: ["en-AE", "ar-AE", "en-US"], weight: 6 },
  { zone: "Europe/Berlin", offset: 2, languages: ["de-DE", "en-GB"], weight: 4 },
  { zone: "Asia/Singapore", offset: 8, languages: ["en-SG", "zh-SG"], weight: 4 },
  { zone: "America/Chicago", offset: -5, languages: ["en-US"], weight: 4 },
  { zone: "Australia/Sydney", offset: 10, languages: ["en-AU"], weight: 3 },
  { zone: "America/Toronto", offset: -4, languages: ["en-CA", "fr-CA"], weight: 3 },
  { zone: "Europe/Paris", offset: 2, languages: ["fr-FR", "en-GB"], weight: 3 },
  { zone: "Africa/Lagos", offset: 1, languages: ["en-NG"], weight: 2 },
  { zone: "Asia/Tokyo", offset: 9, languages: ["ja-JP", "en-US"], weight: 2 },
  { zone: "Asia/Karachi", offset: 5, languages: ["en-PK", "ur-PK"], weight: 2 },
];

type Device = { device: "mobile" | "tablet" | "desktop"; browser: string; os: string; screen: [number, number]; viewport: [number, number]; ua: string };

const DEVICES: readonly (readonly [Device, number])[] = [
  [{ device: "mobile", browser: "Chrome", os: "Android", screen: [412, 915], viewport: [412, 780], ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36" }, 30],
  [{ device: "mobile", browser: "Safari", os: "iOS", screen: [390, 844], viewport: [390, 664], ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1" }, 18],
  [{ device: "mobile", browser: "Samsung Internet", os: "Android", screen: [384, 854], viewport: [384, 720], ua: "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36" }, 7],
  [{ device: "desktop", browser: "Chrome", os: "Windows", screen: [1920, 1080], viewport: [1903, 955], ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" }, 20],
  [{ device: "desktop", browser: "Safari", os: "macOS", screen: [1512, 982], viewport: [1512, 860], ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15" }, 8],
  [{ device: "desktop", browser: "Edge", os: "Windows", screen: [1536, 864], viewport: [1519, 730], ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0" }, 5],
  [{ device: "desktop", browser: "Firefox", os: "Linux", screen: [2560, 1440], viewport: [2544, 1300], ua: "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0" }, 2],
  [{ device: "tablet", browser: "Safari", os: "iOS", screen: [820, 1180], viewport: [820, 1060], ua: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }, 6],
];

type Landing = { referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; utmTerm?: string; utmContent?: string; path: string };

const LANDINGS: readonly (readonly [(rng: Rng) => Landing, number])[] = [
  [() => ({ path: "/" }), 26],
  [(r) => ({ referrer: "https://www.google.com/", path: pick(r, ["/", "/services", "/work", "/about", "/contact"]) }), 26],
  [(r) => ({ referrer: pick(r, ["https://www.bing.com/", "https://duckduckgo.com/", "https://search.yahoo.com/"]), path: pick(r, ["/", "/services"]) }), 4],
  [(r) => ({ referrer: "https://chatgpt.com/", utmSource: "chatgpt.com", path: pick(r, ["/", "/services", "/about"]) }), 4],
  [() => ({ referrer: "https://www.perplexity.ai/", path: "/services" }), 1.5],
  [(r) => ({ referrer: pick(r, ["https://l.instagram.com/", "https://www.linkedin.com/", "https://m.facebook.com/", "https://t.co/"]), path: pick(r, ["/", "/work"]) }), 10],
  [() => ({ utmSource: "newsletter", utmMedium: "email", utmCampaign: "october-update", path: "/work" }), 2.5],
  [(r) => ({ utmSource: "google", utmMedium: "cpc", utmCampaign: "start-project-in", utmTerm: pick(r, ["app development company", "website design india", "mvp developers"]), path: "/start-project" }), 7],
  [(r) => ({ referrer: "https://l.instagram.com/", utmSource: "instagram", utmMedium: "social", utmCampaign: "launch-reel", utmContent: pick(r, ["reel-1", "story-2"]), path: "/start-project" }), 6],
  [() => ({ utmSource: "whatsapp", utmMedium: "referral", utmCampaign: "client-share", path: "/start-project" }), 2],
  [(r) => ({ referrer: pick(r, ["https://clutch.co/", "https://github.com/", "https://play.google.com/", "https://www.goodfirms.co/"]), path: pick(r, ["/", "/work", "/about"]) }), 5],
];

const TITLES: Record<string, string> = {
  "/": "BrightonSolution — Software Development & IT Services",
  "/services": "Services — BrightonSolution",
  "/work": "Work — BrightonSolution",
  "/about": "About — BrightonSolution",
  "/contact": "Contact — BrightonSolution",
  "/thank-you": "Thank you — BrightonSolution",
  "/start-project": "Start your project — BrightonSolution",
  "/privacy": "Privacy policy — BrightonSolution",
  "/terms": "Terms — BrightonSolution",
};

const NEXT_PAGE: Record<string, readonly (readonly [string, number])[]> = {
  "/": [["/services", 4], ["/work", 4], ["/about", 2], ["/contact", 3], ["/privacy", 0.3]],
  "/services": [["/work", 3], ["/contact", 4], ["/", 1], ["/about", 1]],
  "/work": [["/services", 2], ["/contact", 3], ["/about", 1], ["/", 1]],
  "/about": [["/contact", 3], ["/work", 2], ["/services", 1], ["/terms", 0.3]],
  "/contact": [["/thank-you", 0], ["/services", 1], ["/work", 1]],
  "/start-project": [["/work", 1], ["/", 1], ["/about", 0.5]],
  "/privacy": [["/", 1]],
  "/terms": [["/", 1]],
  "/thank-you": [["/", 1], ["/work", 1]],
};

const FIRST = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rahul", "Meera", "Daniel", "Sophie", "Omar", "Fatima", "Lucas", "Emma", "Hiroshi", "Chloe", "Ethan", "Aisha", "Karan", "Nisha", "Jacob", "Olivia", "Mohammed", "Isabella", "Dev", "Riya", "Liam", "Zara"];
const LAST = ["Patel", "Shah", "Mehta", "Sharma", "Iyer", "Reddy", "Kapoor", "Desai", "Singh", "Nair", "Miller", "Brown", "Khan", "Al Mansoori", "Schmidt", "Dubois", "Tanaka", "Wilson", "Lee", "Okafor", "Joshi", "Bose", "Taylor", "Martin", "Rahman", "Rossi", "Verma", "Gupta", "Walker", "Hussain"];
const COMPANIES = ["", "", "Spice Route Foods", "Nimbus Health", "UrbanNest Realty", "Kiran Textiles", "BlueOrbit Labs", "FitLoop", "Harbor Legal", "Saffron Tours", "Medisync Clinics", "GreenCart", "Pixel & Pine", "Northwind Logistics", "EduSpark Academy", "Atlas Motors", "Verde Interiors", "CloudKitchen Co"];
const SERVICES = ["Custom Software Development", "Web Application Development", "Mobile App Development", "Website design", "Cloud & DevOps", "AI integration", "UI/UX design", "Maintenance & support"];
const CONTACT_MESSAGES = [
  "Hi, we run a chain of 6 clinics and need an appointment booking app for patients with reminders on WhatsApp. Could you share a rough estimate and timeline?",
  "Looking for a team to rebuild our company website. It is slow and not mobile friendly. We would also like a blog we can edit ourselves.",
  "We need an internal dashboard to track orders from Shopify and Amazon in one place. Is this something you build?",
  "Hello, I have a startup idea for a fitness coaching app (iOS and Android). I have rough wireframes. When can we talk?",
  "Our current vendor stopped supporting our Laravel app. We need someone to take over maintenance and add two new features.",
  "Can you integrate an AI chat assistant into our customer support portal? We get about 400 tickets a day.",
  "We are a logistics company and want a driver app with live tracking plus an admin panel for dispatch.",
  "Please share your portfolio of e-commerce projects and your typical price range for a store with 200 products.",
  "Need help moving our servers from a VPS to AWS with automatic backups and monitoring.",
  "We'd like a quote for a school management system: attendance, fees, results and a parent app.",
];
const LEAD_MESSAGES = [
  "Want to launch before Diwali if possible.",
  "We already have the designs in Figma, need development only.",
  "Budget is flexible for the right team. Please call after 6 pm.",
  "Need an MVP to show investors next quarter.",
  "Looking for a long-term tech partner, not just a one-off build.",
  "",
  "",
  "Please WhatsApp me, I am travelling this week.",
];
const NOTES = [
  "Called, sent proposal. Follow up Friday.",
  "Asked for portfolio, shared 3 case studies.",
  "Quote sent: ₹1.2 lakh, 5 weeks.",
  "Not a fit: wants WordPress theme tweaks only.",
  "Meeting booked for Tuesday 11:00 IST.",
  "Signed. Kick-off next Monday.",
];

/* ------------------------------------------------------------------- build */

type Visitor = { id: string; zone: Zone; language: string; device: Device; sessions: number };

type Store = {
  pageviews: PageviewDoc[];
  events: EventDoc[];
  contacts: ContactDoc[];
  leads: LeadDoc[];
  settings: SettingsState;
};

function zoneOf(rng: Rng): Zone {
  return weighted(rng, ZONES.map((z) => [z, z.weight] as const));
}

/** A start time `daysAgo` days back at a plausible local hour in the visitor's zone. */
function startAt(rng: Rng, now: number, daysAgo: number, zone: Zone): number {
  const hour = weighted(rng, [
    [7, 1], [8, 2], [9, 3], [10, 4], [11, 5], [12, 5], [13, 4], [14, 4], [15, 4], [16, 4], [17, 4], [18, 3], [19, 4], [20, 5], [21, 5], [22, 4], [23, 2], [0, 1], [1, 0.5], [2, 0.3], [6, 0.6],
  ]);
  const day = new Date(now - daysAgo * DAY);
  const midnightUtc = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  let t = midnightUtc + (hour - zone.offset) * HOUR + Math.floor(rng() * 60) * MIN;
  while (t > now - 5 * MIN) t -= DAY;
  return t;
}

function personFor(rng: Rng) {
  const first = pick(rng, FIRST);
  const last = pick(rng, LAST);
  const company = pick(rng, COMPANIES);
  const domain = company ? `${company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}.com` : pick(rng, ["gmail.com", "outlook.com", "yahoo.com", "icloud.com"]);
  return { name: `${first} ${last}`, company, email: `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, "")}@${domain}` };
}

function phoneFor(rng: Rng, zone: Zone): string {
  const digits = () => String(Math.floor(rng() * 9e9) + 1e9);
  if (zone.inr) return rng() < 0.6 ? `+91 ${digits().slice(0, 5)} ${digits().slice(0, 5)}` : digits();
  if (zone.zone.startsWith("America")) return `+1 ${digits().slice(0, 3)} ${digits().slice(0, 3)} ${digits().slice(0, 4)}`;
  if (zone.zone === "Europe/London") return `+44 7${digits().slice(0, 3)} ${digits().slice(0, 6)}`;
  if (zone.zone === "Asia/Dubai") return `+971 5${digits().slice(0, 1)} ${digits().slice(0, 3)} ${digits().slice(0, 4)}`;
  return `+${Math.floor(rng() * 80) + 20} ${digits()}`;
}

function build(seed: number, now: number): Store {
  const rng = mulberry32(seed);
  const store: Store = { pageviews: [], events: [], contacts: [], leads: [], settings: { excludedVisitors: [], updatedAt: null } };

  // Visitors: most come once, a quarter return 2-4 times.
  const visitors: Visitor[] = [];
  let planned = 0;
  while (planned < SESSIONS) {
    const zone = zoneOf(rng);
    const visitor: Visitor = {
      id: id(rng, 21),
      zone,
      language: pick(rng, zone.languages),
      device: weighted(rng, DEVICES),
      sessions: rng() < 0.25 ? 2 + Math.floor(rng() * 3) : 1,
    };
    visitors.push(visitor);
    planned += visitor.sessions;
  }
  // The team's own browser: excluded in settings so its visits never count.
  store.settings = { excludedVisitors: [visitors[3].id, id(rng, 21)], updatedAt: new Date(now - 12 * DAY) };

  // Day weights: traffic grows towards today, weekends are quieter.
  const dayWeights: (readonly [number, number])[] = [];
  for (let d = 0; d < DAYS; d += 1) {
    const weekday = new Date(now - d * DAY).getUTCDay();
    dayWeights.push([d, (0.45 + 0.9 * (1 - d / DAYS)) * (weekday === 0 || weekday === 6 ? 0.72 : 1)]);
  }

  let contactBudget = 58;
  let leadBudget = 88;

  for (const visitor of visitors) {
    const firstDay = weighted(rng, dayWeights);
    for (let s = 0; s < visitor.sessions; s += 1) {
      const daysAgo = Math.max(0, firstDay - s * Math.floor(1 + rng() * 6));
      const start = startAt(rng, now, daysAgo, visitor.zone);
      const sessionId = id(rng, 22);
      const landing: Landing = s === 0 || rng() < 0.3 ? weighted(rng, LANDINGS)(rng) : { path: pick(rng, ["/", "/work", "/start-project"]) };
      const pages: string[] = [landing.path];
      const length = weighted(rng, [[1, 45], [2, 22], [3, 15], [4, 9], [5, 5], [6, 4]]);
      while (pages.length < length) {
        const options = NEXT_PAGE[pages[pages.length - 1]] ?? NEXT_PAGE["/"];
        const next = weighted(rng, options.filter(([, w]) => w > 0));
        pages.push(next);
      }
      const wantsContact = pages.includes("/contact") && contactBudget > 0 && rng() < 0.32;
      const wantsLead = pages[0] === "/start-project" && leadBudget > 0 && rng() < 0.42;
      if (wantsContact) pages.splice(pages.indexOf("/contact") + 1, pages.length, "/thank-you");

      let t = start;
      const dev = visitor.device;
      pages.forEach((path, index) => {
        const engaged = duration(rng, path === "/start-project" ? 75_000 : path === "/contact" ? 60_000 : 28_000);
        const bounceQuick = length === 1 && rng() < 0.45 ? Math.round(rng() * 7000) : engaged;
        const ms = Math.min(bounceQuick, 6 * HOUR);
        const loadMs = index === 0 ? Math.round((dev.device === "desktop" ? 700 : 1500) + duration(rng, dev.device === "desktop" ? 600 : 1300, 1.2)) : undefined;
        const view: PageviewDoc = {
          id: id(rng),
          visitorId: visitor.id,
          sessionId,
          path,
          title: TITLES[path] ?? "BrightonSolution",
          durationMs: ms,
          scrollDepth: Math.min(100, Math.round(ms < 4000 ? rng() * 30 : 25 + rng() * 75)),
          loadMs: loadMs !== undefined ? Math.min(loadMs, 30_000) : undefined,
          viewportW: dev.viewport[0],
          viewportH: dev.viewport[1],
          screenW: dev.screen[0],
          screenH: dev.screen[1],
          language: visitor.language,
          timeZone: visitor.zone.zone,
          device: dev.device,
          browser: dev.browser,
          os: dev.os,
          isNewVisitor: s === 0,
          pageIndex: index + 1,
          createdAt: new Date(t + ms + 400),
          ...(index === 0
            ? {
                referrer: landing.referrer,
                utmSource: landing.utmSource,
                utmMedium: landing.utmMedium,
                utmCampaign: landing.utmCampaign,
                utmTerm: landing.utmTerm,
                utmContent: landing.utmContent,
              }
            : {}),
        };
        store.pageviews.push(view);
        // Occasional continuation segment (tab hidden and resumed): merged by the report.
        if (rng() < 0.05) {
          store.pageviews.push({
            ...view,
            id: id(rng),
            referrer: undefined,
            utmSource: undefined,
            utmMedium: undefined,
            utmCampaign: undefined,
            utmTerm: undefined,
            utmContent: undefined,
            loadMs: undefined,
            durationMs: 2000 + Math.round(rng() * 40_000),
            createdAt: new Date(t + ms + 4 * MIN),
          });
        }

        const event = (type: string, label: string, href = "", at = t + ms * rng()) =>
          store.events.push({ id: id(rng), visitorId: visitor.id, sessionId, type, label, href, path, createdAt: new Date(at) });
        if (index < pages.length - 1 && rng() < 0.4) event("nav", pick(rng, ["Services", "Work", "About", "Contact"]));
        if (rng() < 0.15) event("cta_click", pick(rng, ["Start a project", "Get a quote", "See our work", "Book a call"]));
        if (path === "/work" && rng() < 0.3) event("play", pick(rng, ["FitLoop on Google Play", "Medisync on Google Play"]), "https://play.google.com/store/apps/developer?id=Brighton+Solution");
        if (rng() < 0.06) event("outbound", pick(rng, ["Instagram", "LinkedIn", "Clutch reviews"]), pick(rng, ["https://www.instagram.com/brighton.solution", "https://www.linkedin.com/company/brightonsolution", "https://clutch.co/"]));
        if (path === "/contact") {
          if (rng() < 0.18) event(rng() < 0.6 ? "mailto" : "tel", rng() < 0.6 ? "support@brightonsolution.com" : "Call us", rng() < 0.6 ? "mailto:support@brightonsolution.com" : "tel:+910000000000");
          const starts = wantsContact || rng() < 0.4;
          if (starts) event("form_start", "contact", "", t + 4000);
          if (starts && rng() < 0.25) event("form_error", `contact:${pick(rng, ["email", "message", "name,email", "message,phone"])}`, "", t + ms * 0.6);
          if (wantsContact) {
            event("form_submit", "contact:ok", "", t + ms - 300);
            contactBudget -= 1;
            const person = personFor(rng);
            const age = now - (t + ms);
            const status: ContactStatus = age < 2 * DAY ? "new" : weighted(rng, [["handled", 70], ["new", 18], ["spam", 12]] as const);
            store.contacts.push({
              id: id(rng),
              ...person,
              phone: rng() < 0.65 ? phoneFor(rng, visitor.zone) : undefined,
              service: rng() < 0.85 ? pick(rng, SERVICES) : undefined,
              budget: rng() < 0.75 ? pick(rng, siteBudgets) : undefined,
              message: status === "spam" ? "Hello dear, we offer SEO backlinks 1000+ DA90 cheap price, reply for list." : pick(rng, CONTACT_MESSAGES),
              page: "/contact",
              referrer: landing.referrer,
              userAgent: dev.ua,
              language: visitor.language,
              timeZone: visitor.zone.zone,
              visitorId: visitor.id,
              status,
              note: status === "handled" && rng() < 0.4 ? pick(rng, NOTES) : undefined,
              createdAt: new Date(t + ms - 200),
              updatedAt: status !== "new" ? new Date(t + ms + 6 * HOUR) : undefined,
            });
          }
        }
        if (path === "/start-project" && index === 0 && wantsLead) {
          leadBudget -= 1;
          event("cta_click", pick(rng, ["Get my plan", "Send my brief", "Start my project"]), "", t + ms * 0.7);
          store.leads.push(makeLead(rng, now, t + ms - 500, visitor, landing));
        }
        t += ms + 1500 + Math.round(rng() * 20_000);
      });
    }
  }

  store.pageviews.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  store.events.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  store.contacts.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  store.leads.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  return store;
}

function makeLead(rng: Rng, now: number, at: number, visitor: Visitor, landing: Landing): LeadDoc {
  const kind: LeadKind = rng() < 0.55 ? "brief" : "plan";
  const currency: LeadCurrency = visitor.zone.inr ? "INR" : "USD";
  const planName = weighted(rng, [["Starter", 3], ["Growth", 5], ["Premium", 2], [PLAN_UNSURE, 2]] as const);
  const plan = plans.find((p) => p.name === planName);
  const person = personFor(rng);
  const age = now - at;
  const status: LeadStatus =
    age < 2 * DAY
      ? weighted(rng, [["new", 8], ["contacted", 2]] as const)
      : weighted(rng, [["contacted", 35], ["won", 13], ["lost", 18], ["spam", 5], ["new", 10]] as const);
  const types = projectTypes.filter(() => rng() < 0.25).map((o) => o.label);
  const feats = launchFeatures.filter(() => rng() < 0.3).map((o) => o.label);
  return {
    id: id(rng),
    kind,
    ...person,
    phone: phoneFor(rng, visitor.zone),
    company: person.company || undefined,
    projectTypes: kind === "brief" ? (types.length ? types : [pick(rng, projectTypes).label]).join(", ") : undefined,
    features: kind === "brief" && feats.length ? feats.join(", ") : undefined,
    stage: kind === "brief" ? pick(rng, stages).label : undefined,
    timeline: kind === "brief" || rng() < 0.3 ? pick(rng, timelines).label : undefined,
    budget: kind === "brief" ? pick(rng, launchBudgets[currency]) : undefined,
    plan: kind === "plan" || rng() < 0.5 ? planName : undefined,
    currency,
    price: plan && (kind === "plan" || rng() < 0.5) ? plan.price[currency] : undefined,
    contactPref: pick(rng, contactPrefs).label,
    message: pick(rng, LEAD_MESSAGES) || undefined,
    page: "/start-project",
    referrer: landing.referrer,
    utmSource: landing.utmSource,
    utmMedium: landing.utmMedium,
    utmCampaign: landing.utmCampaign,
    utmTerm: landing.utmTerm,
    utmContent: landing.utmContent,
    userAgent: visitor.device.ua,
    language: visitor.language,
    timeZone: visitor.zone.zone,
    visitorId: visitor.id,
    status,
    note: status !== "new" && status !== "spam" && rng() < 0.45 ? pick(rng, NOTES) : undefined,
    createdAt: new Date(at),
    updatedAt: status !== "new" ? new Date(at + 5 * HOUR) : undefined,
  };
}

/* ------------------------------------------------------------------ source */

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function newestFirst<T extends { createdAt?: Date | null }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

/** In-memory AdminSource with generated data. Pass `seed` for another (still deterministic) data set. */
export function createDemoSource(seed = 20261027): AdminSource {
  const born = Date.now();
  const store = build(seed, born);
  const live = mulberry32(seed ^ 0x5eed);
  let lastArrival = born;
  let arrivals = 0;

  /** Every ~45 s one new enquiry arrives (alternating lead / contact). */
  function arrive() {
    const now = Date.now();
    if (now - lastArrival < 40_000) return;
    lastArrival = now;
    arrivals += 1;
    const visitorZone = zoneOf(live);
    const visitor: Visitor = { id: id(live, 21), zone: visitorZone, language: pick(live, visitorZone.languages), device: weighted(live, DEVICES), sessions: 1 };
    if (arrivals % 2 === 1) {
      const landing = weighted(live, LANDINGS.slice(7, 10))(live);
      const lead = makeLead(live, now, now - 1000, visitor, landing);
      store.leads.unshift({ ...lead, status: "new", note: undefined, updatedAt: undefined });
    } else {
      const person = personFor(live);
      store.contacts.unshift({
        id: id(live),
        ...person,
        phone: phoneFor(live, visitorZone),
        service: pick(live, SERVICES),
        budget: pick(live, siteBudgets),
        message: pick(live, CONTACT_MESSAGES),
        page: "/contact",
        userAgent: visitor.device.ua,
        language: visitor.language,
        timeZone: visitorZone.zone,
        visitorId: visitor.id,
        status: "new",
        createdAt: new Date(now - 1000),
      });
    }
  }

  return {
    mode: "demo",
    pollMs: 45_000,
    async loadInbox(limit) {
      await wait(250);
      return { contacts: newestFirst(store.contacts).slice(0, limit), leads: newestFirst(store.leads).slice(0, limit) };
    },
    async loadAnalytics(since, until, max) {
      await wait(450);
      const from = since.getTime();
      const to = until.getTime();
      const inWindow = <T extends { createdAt?: Date | null }>(list: readonly T[]) =>
        list.filter((doc) => {
          const t = doc.createdAt?.getTime() ?? 0;
          return t >= from && t < to;
        });
      const pageviews = inWindow(store.pageviews);
      const events = inWindow(store.events);
      return {
        pageviews: pageviews.slice(0, max),
        events: events.slice(0, max),
        pageviewsTruncated: pageviews.length > max,
        eventsTruncated: events.length > max,
      };
    },
    async loadSettings() {
      await wait(120);
      return { ...store.settings, excludedVisitors: [...store.settings.excludedVisitors] };
    },
    async pollNew(contactsSince, leadsSince) {
      arrive();
      const after = (since: Date | null) => (doc: { createdAt?: Date | null }) => !since || (doc.createdAt?.getTime() ?? 0) >= since.getTime();
      return { contacts: store.contacts.filter(after(contactsSince)).slice(0, 100), leads: store.leads.filter(after(leadsSince)).slice(0, 100) };
    },
    async updateContact(docId, fields) {
      await wait(300);
      store.contacts = store.contacts.map((doc) => (doc.id === docId ? { ...doc, ...fields, updatedAt: new Date() } : doc));
    },
    async updateLead(docId, fields) {
      await wait(300);
      store.leads = store.leads.map((doc) => (doc.id === docId ? { ...doc, ...fields, updatedAt: new Date() } : doc));
    },
    async saveSettings(excludedVisitors) {
      await wait(300);
      store.settings = { excludedVisitors: [...excludedVisitors], updatedAt: new Date() };
    },
    async purge() {
      return 0;
    },
    async journeyDocs(visitorId) {
      await wait(200);
      const mine = <T extends { visitorId?: string }>(list: readonly T[]) => list.filter((doc) => doc.visitorId === visitorId);
      return { pageviews: mine(store.pageviews), events: mine(store.events), contacts: mine(store.contacts) };
    },
  };
}
