import Link from "next/link";
import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import Icon from "@/components/ui/Icon";
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

function Block({ block }: { block: LegalBlock }) {
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
        <dl>
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

/**
 * A legal document: hero with its dates, the "In short" summary panel, then
 * the full text beside a table of contents.
 *   < 768px   the contents panel sits above the text
 *   768px+    the contents panel is a sticky rail (4 of 12 columns, 3 from 1024px)
 */
export default function LegalPage({ doc }: { doc: LegalDocument }) {
  const summaryId = `${doc.slug}-summary`;
  const lastIndex = doc.sections.length - 1;

  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} lead={doc.lead} id={`${doc.slug}-hero`} divider={false}>
        <dl className="mt-8 flex flex-wrap gap-2.5">
          <div className="flex flex-wrap items-baseline gap-x-2 rounded-sharp border border-line bg-surface px-3.5 py-2.5">
            <dt className="eyebrow text-muted">Last updated:</dt>
            <dd className="eyebrow tabular-nums text-fg">
              <time dateTime={doc.updatedISO}>{doc.updated}</time>
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-2 rounded-sharp border border-line bg-surface px-3.5 py-2.5">
            <dt className="eyebrow text-muted">Applies to:</dt>
            <dd className="eyebrow text-fg">{legalHost}</dd>
          </div>
        </dl>
      </PageHero>

      <section
        id={summaryId}
        className="pb-[clamp(3.5rem,2rem+5vw,6.5rem)]"
        aria-labelledby={`${summaryId}-title`}
      >
        <Container>
          <Reveal>
            <SectionTitle variant="page">In short</SectionTitle>
          </Reveal>
          <Reveal
            delay={60}
            className="mt-[clamp(1.25rem,1rem+1.5vw,2.25rem)] grid gap-8 rounded-[var(--radius-card)] border border-line bg-surface p-6 sm:p-8 lg:grid-cols-12 lg:gap-10 lg:p-10"
          >
            <div className="min-w-0 lg:col-span-4">
              <h2 id={`${summaryId}-title`} className="text-h3 max-w-[20ch] text-balance">
                {doc.summaryTitle}
              </h2>
              <p className="mt-3 max-w-[38ch] text-[0.875rem] leading-relaxed text-muted">{doc.summaryNote}</p>
            </div>
            <ul className="grid min-w-0 gap-x-8 gap-y-6 sm:grid-cols-2 lg:col-span-8">
              {doc.summary.map((point) => (
                <li key={point.title} className="flex min-w-0 items-start gap-3.5 border-t border-line pt-5">
                  <Icon name="check" size={18} className="mt-[3px] text-accent" />
                  <div className="min-w-0">
                    <p className="font-medium leading-snug text-fg">{point.title}</p>
                    <p className="mt-1.5 max-w-[44ch] text-[0.875rem] leading-relaxed text-muted">{point.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      <section id={`${doc.slug}-full-text`} className="pb-section" aria-label={`${doc.title}: full text`}>
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-8 lg:gap-10">
            <div className="min-w-0 self-start md:sticky md:top-24 md:col-span-4 lg:col-span-3">
              <LegalToc sections={doc.sections} label="On this page" />
            </div>

            <div className="min-w-0 md:col-span-8 lg:col-span-9">
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
                        <Block key={j} block={block} />
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
