import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import WhoWeAre from "@/components/about/WhoWeAre";
import Principles from "@/components/about/Principles";
import WhoWeWorkWith from "@/components/about/WhoWeWorkWith";
import WorkTeaser from "@/components/about/WorkTeaser";
import CtaBand from "@/components/CtaBand";
import { pageMetadata } from "@/lib/seo";
import { aboutHero, aboutMeta } from "@/lib/content/about";

export const metadata: Metadata = pageMetadata({
  title: aboutMeta.title,
  description: aboutMeta.description,
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow={aboutHero.eyebrow} title={aboutHero.title} lead={aboutHero.lead} />
      <WhoWeAre />
      <Principles />
      <WhoWeWorkWith />
      <WorkTeaser />
      <CtaBand />
    </>
  );
}
