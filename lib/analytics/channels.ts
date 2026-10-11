/**
 * Traffic channel of a session, from the landing page's referrer and UTM tags (the tracker stores
 * both only on the first page view of a session). Pure; used by lib/analytics/report.ts.
 *
 * Exports
 * - type Channel, CHANNELS (display order)
 * - classifyChannel({ referrer?, utmSource?, utmMedium?, utmCampaign? }) -> { channel, source }
 * - hostOf(referrer?)   lower-case host without "www." ("" when empty or unreadable)
 * - OWN_HOSTS           this site's hosts (a referrer from one of them is not a traffic source)
 *
 * Rules, first match wins:
 *  1. Paid            utm_medium cpc, ppc, paid*, display, cpm, banner (also cpv, cpa, cpp, ad, ads,
 *                     retargeting, remarketing) or an ad-network referrer (doubleclick, googleadservices)
 *  2. Email           utm_medium/utm_source email, e-mail, newsletter (and common mail tools), or a
 *                     webmail referrer (mail.google.com, outlook.live.com, mail.yahoo.com, ...)
 *  3. AI assistants   chatgpt.com, chat.openai.com, perplexity.ai, gemini.google.com, copilot.microsoft.com,
 *                     claude.ai, you.com, phind.com, poe.com (and a few more), by referrer or utm_source
 *                     (ChatGPT adds utm_source=chatgpt.com). Checked before the search engines, so
 *                     gemini.google.com is not Google search.
 *  4. Organic search  google.* (the search host only), bing.com, duckduckgo.com, yahoo.*, yandex.*,
 *                     baidu.com, ecosia.org, search.brave.com, startpage.com and other search engines
 *  5. Social          facebook, fb, instagram, linkedin, lnkd.in, t.co, twitter, x.com, youtube, reddit,
 *                     pinterest, whatsapp, wa.me, telegram, t.me, quora, threads.net (and tiktok, snapchat,
 *                     discord, ...) by referrer; or a social utm_medium (social, sm, ...) or utm_source
 *  6. Organic search  utm_medium=organic from a non-social source
 *  7. Campaign        any other UTM tag
 *  8. Direct          no referrer, or a referrer from this site's own hosts
 *  9. Referral        any other referrer (play.google.com, docs.google.com, github.com, ...)
 *
 * source = the utm_source (lower case) when tagged, else the referrer host without "www.", else
 * "(direct)" (or "(not set)" for a campaign without utm_source or referrer).
 */

export type Channel =
  | "Direct"
  | "Organic search"
  | "AI assistants"
  | "Social"
  | "Email"
  | "Paid"
  | "Campaign"
  | "Referral";

export const CHANNELS: readonly Channel[] = [
  "Direct",
  "Organic search",
  "AI assistants",
  "Social",
  "Email",
  "Paid",
  "Campaign",
  "Referral",
];

export type ChannelInput = { referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string };
export type ChannelResult = { channel: Channel; source: string };

export const OWN_HOSTS: readonly string[] = [
  "brightonsolution.com",
  "www.brightonsolution.com",
  "brighton-web-ea63c.web.app",
  "brighton-web-ea63c.firebaseapp.com",
];

const OWN = new Set(OWN_HOSTS.map((host) => host.replace(/^www\./, "")));

/** Android apps send android-app://<package>/ as the referrer; map the common ones to their web host. */
const ANDROID_APPS: Record<string, string> = {
  "com.google.android.gm": "mail.google.com",
  "com.google.android.googlequicksearchbox": "google.com",
  "com.google.android.apps.searchlite": "google.com",
  "com.google.android.apps.bard": "gemini.google.com",
  "com.openai.chatgpt": "chatgpt.com",
  "com.microsoft.office.outlook": "outlook.live.com",
  "com.facebook.katana": "facebook.com",
  "com.facebook.lite": "facebook.com",
  "com.facebook.orca": "facebook.com",
  "com.instagram.android": "instagram.com",
  "com.linkedin.android": "linkedin.com",
  "com.twitter.android": "x.com",
  "com.whatsapp": "whatsapp.com",
  "com.whatsapp.w4b": "whatsapp.com",
  "org.telegram.messenger": "telegram.org",
  "com.google.android.youtube": "youtube.com",
  "com.reddit.frontpage": "reddit.com",
  "com.pinterest": "pinterest.com",
  "com.quora.android": "quora.com",
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    try {
      return new URL(`https://${raw}`);
    } catch {
      return null;
    }
  }
}

/** Lower-case referrer host without "www." and a trailing dot; "" when there is none. */
export function hostOf(referrer?: string): string {
  const raw = text(referrer);
  if (!raw) return "";
  const url = parseUrl(raw);
  if (!url) return "";
  let host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol === "android-app:") host = ANDROID_APPS[host] ?? host;
  return host.replace(/^www\./, "");
}

function pathOf(referrer?: string): string {
  const url = parseUrl(text(referrer));
  return url ? url.pathname.toLowerCase() : "";
}

/** host is domain or one of its subdomains. */
function within(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function withinAny(host: string, domains: readonly string[]): boolean {
  return domains.some((domain) => within(host, domain));
}

/* --------------------------------------------------------------------- paid */

const PAID_MEDIUM = /^(?:cpc|ppc|cpm|cpv|cpa|cpp|display|banner|ad|ads|retargeting|remarketing)$|^paid/;
const AD_HOSTS = ["doubleclick.net", "googleadservices.com", "googlesyndication.com", "syndicatedsearch.goog"];

/* -------------------------------------------------------------------- email */

const EMAIL_TAG = /(?:^|[^a-z])e[-_ ]?mail(?:$|[^a-z])|newsletter/;
const EMAIL_SOURCES = new Set(["mail", "mailchimp", "sendgrid", "substack", "brevo", "sendinblue", "mailerlite", "convertkit", "klaviyo", "zoho campaigns"]);
const WEBMAIL_HOSTS = [
  "mail.google.com",
  "inbox.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "outlook.com",
  "mail.yahoo.com",
  "mail.yandex.ru",
  "mail.yandex.com",
  "e.mail.ru",
  "mail.zoho.com",
  "mail.zoho.in",
  "mail.zoho.eu",
  "mail.proton.me",
  "mail.protonmail.com",
  "mail.aol.com",
  "mail.rediff.com",
  "mail.rediffmail.com",
  "mail.yahoo.co.jp",
];

function isWebmail(host: string): boolean {
  return withinAny(host, WEBMAIL_HOSTS) || host.startsWith("webmail.") || host.startsWith("mail.");
}

/* ------------------------------------------------------------ AI assistants */

const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "gemini.google.com",
  "bard.google.com",
  "copilot.microsoft.com",
  "claude.ai",
  "you.com",
  "phind.com",
  "poe.com",
  "chat.deepseek.com",
  "meta.ai",
  "grok.com",
  "chat.mistral.ai",
];
const AI_SOURCE = /^(?:chatgpt|openai|perplexity|gemini|bard|copilot|claude|phind|poe|deepseek|grok|meta ?ai|mistral|le chat)$/;

function isAiSource(source: string): boolean {
  if (!source) return false;
  const host = source.replace(/^www\./, "");
  return withinAny(host, AI_HOSTS) || AI_SOURCE.test(source);
}

/* ----------------------------------------------------------- search engines */

const GOOGLE_SEARCH = /^(?:images\.)?google\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const YAHOO = /(?:^|\.)yahoo\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const YANDEX = /(?:^|\.)yandex\.(?:[a-z]{2,3}|com\.[a-z]{2})$/;
const SEARCH_HOSTS = [
  "bing.com",
  "duckduckgo.com",
  "baidu.com",
  "ecosia.org",
  "search.brave.com",
  "startpage.com",
  "ya.ru",
  "naver.com",
  "seznam.cz",
  "qwant.com",
  "so.com",
  "sogou.com",
  "petalsearch.com",
  "search.aol.com",
  "ask.com",
  "kagi.com",
  "mojeek.com",
];

function isSearch(host: string): boolean {
  return GOOGLE_SEARCH.test(host) || YAHOO.test(host) || YANDEX.test(host) || withinAny(host, SEARCH_HOSTS);
}

/* ------------------------------------------------------------------- social */

const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "fb.me",
  "messenger.com",
  "instagram.com",
  "linkedin.com",
  "lnkd.in",
  "t.co",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "reddit.com",
  "redd.it",
  "pinterest.com",
  "pin.it",
  "whatsapp.com",
  "wa.me",
  "telegram.org",
  "telegram.me",
  "t.me",
  "quora.com",
  "threads.net",
  "threads.com",
  "tiktok.com",
  "snapchat.com",
  "discord.com",
  "discord.gg",
  "vk.com",
  "tumblr.com",
  "bsky.app",
  "mastodon.social",
];
const PINTEREST = /(?:^|\.)pinterest\.(?:[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const SOCIAL_MEDIUM = /^(?:social|social[-_ ]?(?:media|network)|socialmedia|sm|sns)$/;
const SOCIAL_SOURCE =
  /^(?:facebook|fb|instagram|ig|linkedin|twitter|x|youtube|yt|reddit|pinterest|whatsapp|wa|telegram|tg|quora|threads|tiktok|snapchat|discord)$/;

function isSocialHost(host: string): boolean {
  return withinAny(host, SOCIAL_HOSTS) || PINTEREST.test(host);
}

function isSocialSource(source: string): boolean {
  if (!source) return false;
  return SOCIAL_SOURCE.test(source) || isSocialHost(source.replace(/^www\./, ""));
}

/* ----------------------------------------------------------------- classify */

export function classifyChannel(input: ChannelInput): ChannelResult {
  const host = hostOf(input.referrer);
  const own = host !== "" && OWN.has(host);
  const utmSource = text(input.utmSource).toLowerCase();
  const utmMedium = text(input.utmMedium).toLowerCase();
  const tagged = Boolean(utmSource || utmMedium || text(input.utmCampaign));
  const external = own ? "" : host;
  const source = utmSource || external;

  if (PAID_MEDIUM.test(utmMedium) || withinAny(host, AD_HOSTS)) {
    return { channel: "Paid", source: source || "(not set)" };
  }
  if (EMAIL_TAG.test(utmMedium) || EMAIL_TAG.test(utmSource) || EMAIL_SOURCES.has(utmSource) || (external && isWebmail(external))) {
    return { channel: "Email", source: source || "(not set)" };
  }
  if ((external && withinAny(external, AI_HOSTS)) || (within(external, "bing.com") && pathOf(input.referrer).startsWith("/chat")) || isAiSource(utmSource)) {
    return { channel: "AI assistants", source: source || "(not set)" };
  }
  if (external && isSearch(external)) return { channel: "Organic search", source };
  if ((external && isSocialHost(external)) || SOCIAL_MEDIUM.test(utmMedium) || isSocialSource(utmSource)) {
    return { channel: "Social", source: source || "(not set)" };
  }
  if (utmMedium === "organic") return { channel: "Organic search", source: source || "(not set)" };
  if (tagged) return { channel: "Campaign", source: source || "(not set)" };
  if (!external) return { channel: "Direct", source: "(direct)" };
  return { channel: "Referral", source: external };
}
