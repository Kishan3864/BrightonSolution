"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatDateTime, formatNumber } from "@/lib/analytics/report";
import { ID_PATTERN, MAX_EXCLUDED_VISITORS } from "@/lib/firebase/schema";
import { useAdminData } from "../../data/AdminDataProvider";
import { routes } from "../../shell/router";
import {
  AdminIcon,
  Button,
  Card,
  CardHeader,
  CopyButton,
  EmptyState,
  Field,
  IconButton,
  LinkButton,
  Notice,
  SearchField,
  Skeleton,
  StatusPill,
  TextInput,
  cx,
  useToast,
} from "../../kit";
import type { BrowserIdentity } from "./BrowserCard";

/**
 * Settings > Excluded visitors: the visitor ids (bs_vid) of the team's own browsers stored in Firestore
 * settings/dashboard. Every report leaves their page views, events and enquiries out. Edits are made
 * to a local draft (add several ids at once, add this browser, remove) and written with one Save via
 * saveExcludedVisitors(), which validates ID_PATTERN and MAX_EXCLUDED_VISITORS again and applies only
 * the changes to a fresh copy of the stored list. Editing stays off until the saved list has loaded.
 */

const PAGE = 12;

function sameList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((id) => set.has(id));
}

export default function ExcludedVisitorsCard({ identity }: { identity: BrowserIdentity }) {
  const { settings, settingsLoaded, settingsError, reloadSettings, saveExcludedVisitors, report, rangeLabel } = useAdminData();
  const [reloading, setReloading] = useState(false);
  const { toast } = useToast();
  const saved = settings.excludedVisitors;

  /** null = no local edits (show the saved list). */
  const [draft, setDraft] = useState<string[] | null>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const list = draft ?? saved;
  const dirty = draft !== null && !sameList(draft, saved);
  const savedSet = useMemo(() => new Set(saved), [saved]);
  const listSet = useMemo(() => new Set(list), [list]);
  const added = list.filter((id) => !savedSet.has(id)).length;
  const removed = saved.filter((id) => !listSet.has(id)).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? list.filter((id) => id.toLowerCase().includes(q)) : list;
  }, [list, query]);
  const visible = showAll || query ? filtered : filtered.slice(0, PAGE);

  function addIds(raw: string): boolean {
    const ids = [...new Set(raw.split(/[\s,;]+/).map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      setInputError("Paste a visitor id first.");
      return false;
    }
    const invalid = ids.filter((id) => !ID_PATTERN.test(id));
    if (invalid.length) {
      setInputError(`Not a visitor id: ${invalid.slice(0, 3).map((id) => `“${id}”`).join(", ")}${invalid.length > 3 ? "…" : ""}. Ids are 8-64 letters, digits, - or _.`);
      return false;
    }
    const fresh = ids.filter((id) => !listSet.has(id));
    if (fresh.length === 0) {
      setInputError(ids.length === 1 ? "That id is already on the list." : "Those ids are already on the list.");
      return false;
    }
    if (list.length + fresh.length > MAX_EXCLUDED_VISITORS) {
      setInputError(`At most ${MAX_EXCLUDED_VISITORS} visitor ids can be excluded (${list.length} on the list).`);
      return false;
    }
    setDraft([...fresh, ...list]);
    setInputError(null);
    setSaveError(null);
    return true;
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    if (addIds(input)) setInput("");
  }

  function remove(id: string) {
    setDraft(list.filter((value) => value !== id));
    setSaveError(null);
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveExcludedVisitors(list);
      if (result.ok) {
        setDraft(null);
        toast({ tone: "success", title: "Excluded visitors saved", description: "Reports leave these browsers out from now on." });
      } else {
        setSaveError(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDraft(null);
    setSaveError(null);
    setInputError(null);
  }

  const notes = report?.dataNotes;
  const canAddSelf = identity.ready && identity.visitorId !== "" && !listSet.has(identity.visitorId);

  return (
    <Card aria-labelledby="settings-excluded">
      <CardHeader
        id="settings-excluded"
        icon="shield"
        title="Excluded visitors"
        description="Your team's browsers, left out of every report."
        actions={
          settingsLoaded ? (
            <span className="font-mono text-[0.75rem] tabular-nums text-muted" aria-label={`${list.length} of ${MAX_EXCLUDED_VISITORS} ids used`}>
              {list.length}/{MAX_EXCLUDED_VISITORS}
            </span>
          ) : null
        }
      />

      <p className="text-[0.8125rem] leading-relaxed text-muted text-pretty">
        Visits already recorded from these ids are hidden from analytics, and their enquiries never count in conversions. To stop a browser
        being recorded at all, use <strong className="font-medium text-fg">Don&apos;t track this browser</strong> on that device.
      </p>

      {/* Add */}
      <form onSubmit={onAdd} className="mt-4" noValidate>
        <Field
          label="Add visitor ids"
          error={inputError}
        >
          {(field) => (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <TextInput
                {...field}
                aria-describedby={[field["aria-describedby"], "excluded-ids-hint"].filter(Boolean).join(" ")}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="e.g. k3Jd8_x2Lq0PzA91bVtc"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="done"
                className="font-mono sm:flex-1"
                disabled={!settingsLoaded}
              />
              <Button type="submit" icon="plus" disabled={!settingsLoaded} className="sm:w-auto">
                Add
              </Button>
            </div>
          )}
        </Field>
        {canAddSelf ? (
          <Button type="button" variant="ghost" size="sm" icon="monitor" className="-ml-2.5 mt-2" onClick={() => addIds(identity.visitorId)}>
            Add this browser&apos;s id
          </Button>
        ) : null}
        <p id="excluded-ids-hint" className="mt-2 text-[0.75rem] leading-relaxed text-muted">
          Copy an id from Analytics › Sessions &amp; visitors, or from “This browser” on that device. Paste several separated by spaces or commas.
        </p>
      </form>

      {/* Unsaved changes */}
      {dirty ? (
        <div
          role="status"
          className="mt-4 flex flex-col gap-3 rounded-sharp border border-accent/40 bg-accent/[0.07] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-fg">
            <AdminIcon name="info" size={16} className="shrink-0 text-accent" />
            <span>
              Unsaved:{" "}
              {[added ? `${added} to add` : "", removed ? `${removed} to remove` : ""].filter(Boolean).join(", ")}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="ghost" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button variant="primary" icon="check" loading={saving} onClick={() => void save()}>
              Save
            </Button>
          </div>
        </div>
      ) : null}
      {saveError ? (
        <Notice tone="error" role="alert" title="Could not save" className="mt-3">
          {saveError}
        </Notice>
      ) : null}

      {settingsError && !settingsLoaded ? (
        <Notice
          tone="error"
          role="alert"
          title="Could not load the saved list"
          className="mt-4"
          action={
            <Button
              size="sm"
              icon="refresh"
              loading={reloading}
              onClick={() => {
                setReloading(true);
                void reloadSettings().finally(() => setReloading(false));
              }}
            >
              Try again
            </Button>
          }
        >
          {settingsError} Editing is off until it loads, so no saved id can be overwritten. Reports run without exclusions meanwhile.
        </Notice>
      ) : null}

      {/* List */}
      <div className="mt-5">
        {settingsError && !settingsLoaded ? null : !settingsLoaded ? (
          <div className="space-y-2" aria-label="Loading excluded visitors">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-sharp border border-dashed border-line">
            <EmptyState compact icon="shield" title="No excluded visitors" description="Every recorded visit counts in the reports." />
          </div>
        ) : (
          <>
            {list.length > 6 ? (
              <SearchField value={query} onChange={setQuery} placeholder="Find an id…" label="Find an excluded id" className="mb-3" />
            ) : null}
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-[0.8125rem] text-muted">No id matches “{query}”.</p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-sharp border border-line">
                {visible.map((id) => {
                  const isNew = !savedSet.has(id);
                  const isSelf = identity.visitorId === id;
                  return (
                    <li key={id} className={cx("flex min-w-0 items-center gap-2 py-1.5 pl-3 pr-1.5", isNew && "bg-accent/[0.05]")}>
                      <div className="min-w-0 flex-1 py-1">
                        <code className="block font-mono text-[0.8125rem] leading-snug text-fg [overflow-wrap:anywhere]">{id}</code>
                        {isNew || isSelf ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {isSelf ? (
                              <StatusPill tone="blue" size="sm">
                                This browser
                              </StatusPill>
                            ) : null}
                            {isNew ? (
                              <StatusPill tone="accent" size="sm">
                                Not saved
                              </StatusPill>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 items-center">
                        <CopyButton value={id} label="Copy visitor id" />
                        <span className="hidden sm:inline-flex">
                          <LinkButton href={routes.visitor(id)} variant="ghost" size="sm" aria-label={`Journey of visitor ${id}`}>
                            Journey
                          </LinkButton>
                        </span>
                        <IconButton icon="trash" label={`Remove ${id}`} size="sm" onClick={() => remove(id)} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {!query && filtered.length > PAGE ? (
              <Button variant="ghost" size="sm" block className="mt-2" iconRight={showAll ? "chevronUp" : "chevronDown"} onClick={() => setShowAll((v) => !v)}>
                {showAll ? "Show fewer" : `Show all ${formatNumber(filtered.length)}`}
              </Button>
            ) : null}
          </>
        )}
      </div>

      {/* Effect in the selected range + last save */}
      {settingsLoaded && (saved.length > 0 || settings.updatedAt) ? (
        <div className="mt-4 flex flex-col gap-1 text-[0.75rem] leading-relaxed text-muted sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-4">
          {notes && saved.length > 0 ? (
            <p>
              Last {rangeLabel}: left out{" "}
              <span className="font-mono tabular-nums text-fg">{formatNumber(notes.excludedPageviews)}</span> page views,{" "}
              <span className="font-mono tabular-nums text-fg">{formatNumber(notes.excludedEvents)}</span> events and{" "}
              <span className="font-mono tabular-nums text-fg">{formatNumber(notes.excludedEnquiries)}</span> enquiries.
            </p>
          ) : (
            <span />
          )}
          {settings.updatedAt ? <p>Saved {formatDateTime(settings.updatedAt)}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
