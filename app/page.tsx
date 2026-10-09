import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import Intro from "@/components/home/Intro";
import Services from "@/components/home/Services";
import HowWeHelp from "@/components/home/HowWeHelp";
import Industries from "@/components/home/Industries";
import Technologies from "@/components/home/Technologies";
import Process from "@/components/home/Process";
import WhyUs from "@/components/home/WhyUs";
import Engagement from "@/components/home/Engagement";
import CtaBand from "@/components/CtaBand";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: { absolute: "BrightonSolution — Software Development & IT Services" },
  description:
    "Custom software, web and mobile apps, cloud & DevOps, AI integration, UI/UX design and maintenance for startups, small businesses and enterprises worldwide.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <Services />
      <HowWeHelp />
      <Industries />
      <Technologies />
      <Process />
      <WhyUs />
      <Engagement />
      <CtaBand />
    </>
  );
}
