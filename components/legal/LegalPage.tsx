import Link from "next/link";
import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
import SectionTitle from "@/components/ui/SectionTitle";
import LegalToc from "@/components/legal/LegalToc";
import { legalHost, type LegalBlock, type LegalDocument } from "@/lib/content/legal";
import styles from "@/components/legal/legal.module.css";

/* Renders the [label](href) notation used in lib/content/legal.ts. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;

  for (const match of text.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const index = match.index ?? 0;
    const [full, label, href] = match;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      href.startsWith("/") || href.startsWith("#") ? (
        <Link key={index} href={href}>
          {label}
        </Link>
      ) : (
        <a key={index} href={href}>
          {label}
        </a>
      ),
    );
    last = index + full.length;
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Block({ block, opensSection }: { block: LegalBlock; opensSection: boolean }) {
  switch (block.type) {
    case "p":
      return <p>{renderInline(block.text)}</p>;
    case "list":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "terms":
      return (
        // Straight under a section title, the title's rule is the top line of the list.
        <dl className={opensSection ? "border-t-0! [&>div:first-child]:pt-0!" : undefined}>
          {block.items.map((item) => (
            <div key={item.term}>
              <dt>{item.term}</dt>
              <dd>{renderInline(item.detail)}</dd>
            </div>
          ))}
        </dl>
      );
  }
}


export default function LegalPage({ doc }: { doc: LegalDocument }) {
  const summaryId = `${doc.slug}-summary`;
  const lastIndex = doc.sections.length - 1;

  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} lead={doc.lead} id={`${doc.slug}-hero`}>
        <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="eyebrow text-muted">Last updated:</dt>
            <dd className="eyebrow tabular-nums text-ink">
              <time dateTime={doc.updatedISO}>{doc.updated}</time>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <dt className="eyebrow text-muted">Applies to:</dt>
            <dd className="eyebrow text-ink">{legalHost}</dd>
          </div>
        </dl>
      </PageHero>

      <section
        id={summaryId}
        className="section-dark py-[clamp(2.75rem,1.75rem+3.5vw,5rem)]"
        aria-labelledby={`${summaryId}-title`}
      >
        <Container>
          <Reveal>
            <SectionTitle variant="page">In short</SectionTitle>
          </Reveal>
          <div className="mt-[clamp(1.5rem,1rem+2vw,3rem)] grid gap-8 md:grid-cols-12 md:gap-8">
            <Reveal className="min-w-0 md:col-span-4 lg:col-span-3">
              <h2
                id={`${summaryId}-title`}
                className="text-h3 max-w-[18ch] text-balance"
              >
                {doc.summaryTitle}
              </h2>
              <p className="mt-4 max-w-[34ch] text-[0.875rem] leading-relaxed text-muted-dark">
                {doc.summaryNote}
              </p>
            </Reveal>
            <ul className="grid gap-x-8 sm:grid-cols-2 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              {doc.summary.map((point, i) => (
                <Reveal
                  as="li"
                  key={point.title}
                  delay={80 + i * 60}
                  className="min-w-0 border-b border-line-dark py-5 first:pt-0 sm:[&:nth-child(2)]:pt-0"
                >
                  <p className="font-medium text-paper">{point.title}</p>
                  <p className="mt-1.5 max-w-[42ch] text-[0.875rem] leading-relaxed text-muted-dark">
                    {point.text}
                  </p>
                </Reveal>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section
        id={`${doc.slug}-full-text`}
        className="py-section"
        aria-label={`${doc.title}: full text`}
      >
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <Reveal className="min-w-0 self-start md:col-span-4 lg:col-span-3 lg:sticky lg:top-28">
              <LegalToc sections={doc.sections} label="On this page" />
            </Reveal>

            <div className="min-w-0 md:col-span-8 md:col-start-5 lg:col-span-9 lg:col-start-4">
              {doc.sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  aria-labelledby={`${section.id}-title`}
                  className={`scroll-mt-8 ${i === lastIndex ? "" : "pb-[clamp(3rem,2rem+3.5vw,5rem)]"}`.trim()}
                >
                  <Reveal>
                    <SectionTitle
                      as="h2"
                      variant="sub"
                      number={String(i + 1).padStart(2, "0")}
                      id={`${section.id}-title`}
                    >
                      {section.title}
                    </SectionTitle>
                    <div className={`${styles.prose} mt-[clamp(1.25rem,1rem+1vw,2rem)]`}>
                      {section.blocks.map((block, j) => (
                        <Block key={j} block={block} opensSection={j === 0} />
                      ))}
                    </div>
                  </Reveal>
                </section>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
