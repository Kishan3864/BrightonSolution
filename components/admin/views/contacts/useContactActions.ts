"use client";

import { useCallback } from "react";
import type { ContactStatus } from "@/lib/firebase/schema";
import { useToast } from "../../kit";
import { useAdminData } from "../../data/AdminDataProvider";
import { CONTACT_STATUS_META, contactStatusOf } from "../../data/records";

/**
 * Status changes for contacts with a confirmation toast that can undo the change. The provider
 * already applies the change optimistically, rolls back and shows an error toast when it fails.
 */
export function useContactActions() {
  const { contacts, setContactStatus, busyIds } = useAdminData();
  const { toast } = useToast();

  const changeStatus = useCallback(
    async (id: string, status: ContactStatus) => {
      const contact = contacts.find((c) => c.id === id);
      if (!contact || busyIds.has(id)) return false;
      const before = contactStatusOf(contact);
      if (before === status) return true;
      const ok = await setContactStatus(id, status);
      if (ok) {
        toast({
          id: `contact-status-${id}`,
          tone: "success",
          title: `Marked ${CONTACT_STATUS_META[status].label.toLowerCase()}`,
          description: contact.name ? `${contact.name}${contact.company ? ` · ${contact.company}` : ""}` : undefined,
          action: { label: "Undo", onClick: () => void setContactStatus(id, before) },
        });
      }
      return ok;
    },
    [contacts, busyIds, setContactStatus, toast],
  );

  return { changeStatus };
}
