"use client";

import { usePathname } from "next/navigation";
import { isAdminPath } from "@/lib/analytics/env";
import { isLaunchPath } from "@/lib/site";

/** Renders its children everywhere except the private /admin tool and the private landing page. */
export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  if (isAdminPath(pathname) || isLaunchPath(pathname)) return null;
  return <>{children}</>;
}
