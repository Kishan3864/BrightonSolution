import Container from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { commitments, commitmentsIntro } from "@/lib/content/about";

export default function Commitments() {
  return (
    <section
      id="commitments"
      className="section-dark py-section scroll-mt-24"
      aria-labelledby="commitments-title"
    >
      <Container>
        <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12">
          <div className="min-w-0 lg:sticky lg:top-28 lg:col-span-5 lg:self-start">
            <Reveal>
              <p className="eyebrow flex items-baseline gap-3 text-accent-soft">
                <span className="tabular-nums">04</span>
                <span>Our commitments</span>
              </p>
              <h2 id="commitments-title" className="text-h2 mt-5 max-w-[18ch] text-balance tracking-tight">
                {commitmentsIntro.title}
              </h2>
              <p className="text-lead mt-6 max-w-[40ch] text-muted-dark">{commitmentsIntro.lead}</p>
            </Reveal>
          </div>

          <div className="min-w-0 lg:col-span-6 lg:col-start-7">
            <ul className="list-none border-b border-line-dark">
              {commitments.map((commitment, i) => (
                <Reveal
                  as="li"
                  key={commitment.title}
                  delay={i * 60}
                  className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 border-t border-line-dark py-[clamp(1.5rem,1.2rem+1vw,2.25rem)]"
                >
                  <span className="eyebrow pt-1.5 tabular-nums text-accent-soft">0{i + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-h3 max-w-[22ch] text-balance tracking-tight">{commitment.title}</h3>
                    <p className="mt-3 max-w-[52ch] text-[1.0625rem] leading-relaxed text-muted-dark">
                      {commitment.description}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
