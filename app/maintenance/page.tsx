import type { Metadata } from "next";
import MaintenanceScreen from "@/components/system/MaintenanceScreen";

export const metadata: Metadata = {
  title: "Scheduled maintenance",
  description: "The BrightonSolution website is briefly unavailable while we carry out planned improvements.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return <MaintenanceScreen />;
}
