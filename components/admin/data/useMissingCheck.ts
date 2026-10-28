"use client";

import { useEffect, useState } from "react";
import { useAdminData } from "./AdminDataProvider";

/**
 * For a detail view opened on an enquiry that is not in the loaded list, typically a push alert
 * tapped while the admin was already open, before its next check for new enquiries: asks for new
 * enquiries once. True only when that check has finished and the enquiry is still missing, so the
 * view shows "not found" instead of a loading state only then.
 */
export function useMissingCheck(id: string | null, found: boolean): boolean {
  const { checkNew, inboxLoaded } = useAdminData();
  const [checkedId, setCheckedId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || found || !inboxLoaded || checkedId === id) return;
    let cancelled = false;
    void checkNew().finally(() => {
      if (!cancelled) setCheckedId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [id, found, inboxLoaded, checkedId, checkNew]);

  return Boolean(id) && !found && inboxLoaded && checkedId === id;
}
