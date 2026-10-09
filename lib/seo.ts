import type { Metadata } from "next";
import { site } from "@/lib/site";

export type PageMeta = {
  title: string | { absolute: string };
  description: string;
  path: string;
};

const ogImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "BrightonSolution — Software Development & IT Services",
};

export function pageMetadata({ title, description, path }: PageMeta): Metadata {
  const url = path === "/" ? `${site.url}/` : `${site.url}${path}`;
  const fullTitle = typeof title === "string" ? `${title} — ${site.name}` : title.absolute;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url,
      type: "website",
      siteName: site.name,
      locale: site.locale,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [ogImage],
    },
  };
}
