import Icon from "@/components/ui/Icon";
import { apps, webProjects } from "@/lib/work";

const entries = [
  { href: "#web", number: "01", label: "Web & software", count: `${webProjects.length} projects` },
  { href: "#apps", number: "02", label: "Android apps", count: `${apps.length} apps` },
];

/** In-page index under the /work hero. */
export default function WorkIndex() {
  return (
    <nav aria-label="Work sections" className="mt-10 max-w-[44rem]">
      <ol role="list" className="grid border-b border-line sm:grid-cols-2 sm:gap-x-8 md:grid-cols-1 lg:grid-cols-2">
        {entries.map((entry) => (
          <li key={entry.href} className="min-w-0 border-t border-line">
            <a
              href={entry.href}
              className="group flex min-h-[44px] items-center justify-between gap-4 py-4 text-ink"
            >
              <span className="flex min-w-0 items-baseline gap-4">
                <span className="eyebrow tabular-nums text-accent" aria-hidden="true">
                  {entry.number}
                </span>
                <span className="whitespace-nowrap text-[0.9375rem] font-medium leading-snug tracking-tight decoration-1 underline-offset-4 group-hover:underline">
                  {entry.label}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[0.75rem] tabular-nums text-muted">{entry.count}</span>
                <Icon
                  name="arrow"
                  size={16}
                  className="rotate-90 text-muted transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none"
                />
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
