import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { engagementModels } from "@/lib/site";
import { engagementCopy, bodyGap, pad } from "@/lib/content/home-b";

export default function Engagement() {
  return (
    <section id="engagement" className="border-t border-line py-section scroll-mt-24" aria-labelledby="engagement-title">
      <Container>
        <Reveal>
          <SectionHeading
            id="engagement-title"
            number={engagementCopy.number}
            eyebrow={engagementCopy.eyebrow}
            title={engagementCopy.title}
            lead={engagementCopy.lead}
          />
        </Reveal>

        {/* md and up: comparison table */}
        <Reveal delay={80} className={`${bodyGap} hidden lg:block`}>
          <div
            className="w-full overflow-x-auto focus-visible:outline-2 focus-visible:outline-accent"
            tabIndex={0}
            role="region"
            aria-label="Engagement models comparison table"
          >
            <table className="w-full min-w-[720px] border-collapse text-left">
              <caption className="sr-only">{engagementCopy.caption}</caption>
              <thead>
                <tr className="align-top">
                  <th scope="col" className="w-[15%] border-t border-b border-line py-6 pr-6 text-left font-normal">
                    <span className="sr-only">Model</span>
                  </th>
                  {engagementModels.map((model, i) => (
                    <th
                      key={model.title}
                      scope="col"
                      className="border-t border-b border-line py-6 pr-6 text-left font-normal last:pr-0"
                    >
                      <span className="eyebrow block tabular-nums text-accent">{pad(i + 1)}</span>
                      <span className="mt-3 block text-[1.0625rem] font-semibold tracking-tight text-ink lg:text-lg">
                        {model.title}
                      </span>
                      <span className="mt-2 block max-w-[28ch] text-sm leading-relaxed text-muted">
                        {model.summary}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {engagementCopy.rows.map((row) => (
                  <tr key={row.key} className="align-top">
                    <th scope="row" className="eyebrow border-b border-line py-6 pr-6 text-left text-muted">
                      {row.label}
                    </th>
                    {engagementModels.map((model) => (
                      <td
                        key={model.title}
                        className="border-b border-line py-6 pr-6 text-[0.9375rem] leading-relaxed text-ink last:pr-0"
                      >
                        {model[row.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* below md: stacked list */}
        <Reveal as="ul" delay={80} className={`${bodyGap} border-b border-line lg:hidden`}>
          {engagementModels.map((model, i) => (
            <li key={model.title} className="min-w-0 border-t border-line py-7">
              <p className="eyebrow tabular-nums text-accent">{pad(i + 1)}</p>
              <h3 className="text-h3 mt-3 tracking-tight">{model.title}</h3>
              <p className="mt-2 max-w-[46ch] text-[0.9375rem] leading-relaxed text-muted">{model.summary}</p>
              <dl className="mt-6 grid gap-5">
                {engagementCopy.rows.map((row) => (
                  <div key={row.key} className="min-w-0">
                    <dt className="eyebrow text-muted">{row.label}</dt>
                    <dd className="mt-1.5 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ink">
                      {model[row.key]}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </Reveal>

        <Reveal delay={120} className="mt-10">
          <Button href={engagementCopy.cta.href} variant="outline">
            {engagementCopy.cta.label}
          </Button>
        </Reveal>
      </Container>
    </section>
  );
}
