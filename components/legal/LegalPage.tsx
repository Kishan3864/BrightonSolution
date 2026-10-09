import Link from "next/link";
import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import PageHero from "@/components/ui/PageHero";
import Reveal from "@/components/ui/Reveal";
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
        className="section-dark py-[clamp(3rem,2rem+4vw,6rem)]"
        aria-labelledby={`${summaryId}-title`}
      >
        <Container>
          <div className="grid gap-8 md:grid-cols-12 md:gap-8">
            <Reveal className="min-w-0 md:col-span-4 lg:col-span-3">
              <p className="eyebrow text-accent-soft">In short</p>
              <h2
                id={`${summaryId}-title`}
                className="text-h3 mt-4 max-w-[18ch] text-balance tracking-tight"
              >
                {doc.summaryTitle}
              </h2>
              <p className="mt-4 max-w-[34ch] text-[0.9375rem] leading-relaxed text-muted-dark">
                {doc.summaryNote}
              </p>
            </Reveal>
            <ul className="grid gap-x-8 sm:grid-cols-2 md:col-span-8 md:col-start-5">
              {doc.summary.map((point, i) => (
                <Reveal
                  as="li"
                  key={point.title}
                  delay={80 + i * 60}
                  className="min-w-0 border-t border-line-dark py-5"
                >
                  <p className="font-semibold tracking-tight text-paper">{point.title}</p>
                  <p className="mt-2 max-w-[42ch] text-[0.9375rem] leading-relaxed text-muted-dark">
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

            <div className="min-w-0 md:col-span-8 md:col-start-5">
              {doc.sections.map((section, i) => {
                const isFirst = i === 0;
                const isLast = i === lastIndex;
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    aria-labelledby={`${section.id}-title`}
                    className={`scroll-mt-28 ${isFirst ? "" : "border-t border-line pt-[clamp(2rem,1.25rem+2.5vw,3.5rem)]"} ${isLast ? "" : "pb-[clamp(2rem,1.25rem+2.5vw,3.5rem)]"}`.trim()}
                  >
                    <Reveal className="grid gap-x-6 gap-y-3 sm:grid-cols-[3rem_minmax(0,1fr)]">
                      <p className="eyebrow text-accent tabular-nums sm:pt-[0.3em]" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <div className="min-w-0">
                        <h2
                          id={`${section.id}-title`}
                          className="text-h3 max-w-[24ch] text-balance tracking-tight"
                        >
                          {section.title}
                        </h2>
                        <div className={`${styles.prose} mt-5`}>
                          {section.blocks.map((block, j) => (
                            <Block key={j} block={block} />
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  </section>
                );
              })}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
