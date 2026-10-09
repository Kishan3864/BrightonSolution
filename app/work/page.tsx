import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import CtaBand from "@/components/CtaBand";
import WorkIndex from "@/components/work/WorkIndex";
import WebProjectList from "@/components/work/WebProjectList";
import AppList from "@/components/work/AppList";
import { pageMetadata } from "@/lib/seo";
import { workCopy } from "@/lib/work";

const copy = workCopy.page;

export const metadata: Metadata = pageMetadata({
  title: "Work",
  description: copy.metaDescription,
  path: "/work",
});

export default function WorkPage() {
  return (
    <>
      <PageHero eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead}>
        <WorkIndex />
      </PageHero>
      <WebProjectList />
      <AppList />
      <CtaBand />
    </>
  );
}
