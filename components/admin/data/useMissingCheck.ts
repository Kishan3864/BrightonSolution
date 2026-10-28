"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminData } from "./AdminDataProvider";

/**
 * What a detail view shows for the enquiry it was opened on:
 *   "found"    it is in the loaded list
 *   "loading"  the inbox is still loading, or a check for new enquiries is running
 *   "missing"  that check finished and the enquiry is still not there (deleted, or too old)
 *   "error"    the inbox or the check failed; retry() tries again
 *
 * A view opened on an enquiry that is not loaded yet (typically a push alert tapped while the admin
 * was already open, before its next check) asks for new enquiries once before calling it missing.
 */
export type LookupState = "found" | "loading" | "missing" | "error";

export function useMissingCheck(id: string | null, found: boolean): { state: LookupState; retry: () => void } {
  const { checkNew, inboxLoaded, inboxError, refresh } = useAdminData();
  const [result, setResult] = useState<{ id: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!id || found || !inboxLoaded || result?.id === id) return;
    let cancelled = false;
    void checkNew().then((ok) => {
      if (!cancelled) setResult({ id, ok });
    });
    return () => {
      cancelled = true;
    };
  }, [id, found, inboxLoaded, result, checkNew]);

  const retry = useCallback(() => {
    if (inboxLoaded) setResult(null);
    else void refresh();
  }, [inboxLoaded, refresh]);

  let state: LookupState;
  if (found) state = "found";
  else if (!inboxLoaded) state = inboxError ? "error" : "loading";
  else if (!id || result?.id !== id) state = "loading";
  else state = result.ok ? "missing" : "error";
  return { state, retry };
}
