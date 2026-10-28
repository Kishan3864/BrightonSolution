"use client";

import { PageHeader } from "../kit";
import { AccountCard, AppCard, DataCard, ShortcutsCard } from "./settings/AboutCards";
import BrowserCard, { useBrowserIdentity } from "./settings/BrowserCard";
import ExcludedVisitorsCard from "./settings/ExcludedVisitorsCard";
import NotificationsCard from "./settings/NotificationsCard";

/**
 * Settings (#/settings). Main column: enquiry alerts (permission, enable, test, preview of the real
 * wording, what arrives now vs with the admin app), this browser (don't-track switch, its visitor id)
 * and the excluded visitors editor (Firestore settings/dashboard). Side column: account and sign out,
 * data & privacy (retention purge, loaded data, CSV exports), admin app install + info and keyboard
 * shortcuts. One column below 1280px, in that order, so phones read alerts first.
 */
export default function SettingsView() {
  const identity = useBrowserIdentity();
  return (
    <div className="min-w-0">
      <PageHeader title="Settings" description="Alerts, your own browsers, data and account." />
      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] xl:items-start">
        <div className="grid min-w-0 gap-3">
          <NotificationsCard />
          <BrowserCard identity={identity} />
          <ExcludedVisitorsCard identity={identity} />
        </div>
        <div className="grid min-w-0 gap-3">
          <AccountCard />
          <DataCard />
          <AppCard />
          <div className="hidden min-w-0 md:block">
            <ShortcutsCard />
          </div>
        </div>
      </div>
    </div>
  );
}
