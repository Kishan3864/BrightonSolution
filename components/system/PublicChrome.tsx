"use client";

import { usePathname } from "next/navigation";
import { isAdminPath } from "@/lib/analytics/env";

/** Renders its children everywhere except the private /admin tool. */
export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  if (isAdminPath(pathname)) return null;
  return <>{children}</>;
}
