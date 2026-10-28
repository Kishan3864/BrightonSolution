import type { AdminIconName } from "../kit/AdminIcon";
import type { AnalyticsTab, ViewKey } from "./router";

/**
 * Menu definition shared by the sidebar, the phone tab bar and the top bar titles.
 * `badge` names the unread counter from useAdminData().counts shown on the item.
 */

export type NavItem = {
  key: ViewKey;
  label: string;
  /** Shorter label for the phone tab bar. */
  short: string;
  href: string;
  icon: AdminIconName;
  description: string;
  badge?: "newContacts" | "newLeads";
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "overview", label: "Overview", short: "Home", href: "#/overview", icon: "home", description: "Inbox and today at a glance" },
  {
    key: "contacts",
    label: "Contacts",
    short: "Contacts",
    href: "#/contacts",
    icon: "mail",
    description: "Website contact-form submissions",
    badge: "newContacts",
  },
  {
    key: "landing",
    label: "Landing page",
    short: "Landing",
    href: "#/landing",
    icon: "rocket",
    description: "Leads from /start-project",
    badge: "newLeads",
  },
  { key: "analytics", label: "Analytics", short: "Analytics", href: "#/analytics/overview", icon: "chart", description: "Traffic, audience and behaviour" },
  { key: "settings", label: "Settings", short: "Settings", href: "#/settings", icon: "settings", description: "Alerts, exclusions and account" },
];

export const ANALYTICS_TAB_ITEMS: readonly { key: AnalyticsTab; label: string; icon: AdminIconName }[] = [
  { key: "overview", label: "Overview", icon: "activity" },
  { key: "acquisition", label: "Acquisition", icon: "link" },
  { key: "pages", label: "Pages", icon: "file" },
  { key: "audience", label: "Audience", icon: "users" },
  { key: "behaviour", label: "Behaviour", icon: "pointer" },
  { key: "sessions", label: "Sessions & visitors", icon: "list" },
  { key: "speed", label: "Speed & data", icon: "gauge" },
];

export function navItem(key: ViewKey): NavItem {
  return NAV_ITEMS.find((item) => item.key === key) ?? NAV_ITEMS[0];
}
