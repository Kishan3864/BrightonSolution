import { site } from "@/lib/site";

export default function JsonLd() {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: site.url,
    logo: `${site.url}/logo.svg`,
    email: site.email,
    description: site.description,
    areaServed: "Worldwide",
    sameAs: [site.playStoreUrl],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: site.email,
      availableLanguage: ["English"],
      ...(site.phone ? { telephone: site.phone } : {}),
    },
  };

  if (site.phone) data.telephone = site.phone;
  if (site.address) {
    data.address = { "@type": "PostalAddress", streetAddress: site.address };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
