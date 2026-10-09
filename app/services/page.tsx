import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import CtaBand from "@/components/CtaBand";
import ServiceIndex from "@/components/services/ServiceIndex";
import ServiceSection from "@/components/services/ServiceSection";
import WaysToWork from "@/components/services/WaysToWork";
import Included from "@/components/services/Included";
import { pageMetadata } from "@/lib/seo";
import { services } from "@/lib/site";
import { servicesPage } from "@/lib/content/services";

export const metadata: Metadata = pageMetadata({
  title: "Services",
  description: servicesPage.metaDescription,
  path: "/services",
});

export default function ServicesPage() {
  return (
    <>
      <PageHero eyebrow={servicesPage.eyebrow} title={servicesPage.title} lead={servicesPage.lead} />
      <ServiceIndex />
      {services.map((service) => (
        <ServiceSection key={service.slug} service={service} />
      ))}
      <WaysToWork />
      <Included />
      <CtaBand />
    </>
  );
}
