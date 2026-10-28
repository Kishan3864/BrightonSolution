"use client";

import { usePathname } from "next/navigation";
import { isAdminPath } from "@/lib/analytics/env";
import { isLaunchPath } from "@/lib/site";

/**
 * Renders its children everywhere except the private /admin tool and the private landing page
 * (or, with `only="admin"`, everywhere except the admin, which brings its own chrome and skip link).
 */
export default function PublicChrome({ children, only = "private" }: { children: React.ReactNode; only?: "private" | "admin" }) {
  const pathname = usePathname() || "/";
  if (isAdminPath(pathname) || (only === "private" && isLaunchPath(pathname))) return null;
  return <>{children}</>;
}
