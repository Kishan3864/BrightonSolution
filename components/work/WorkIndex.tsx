import Icon from "@/components/ui/Icon";
import { apps, webProjects } from "@/lib/work";

const entries = [
  { href: "#web", number: "01", label: "Web & software", count: `${webProjects.length} projects` },
  { href: "#apps", number: "02", label: "Android apps", count: `${apps.length} apps` },
];

/** In-page index under the /work hero, as two chips. They wrap onto two lines on narrow phones. */
export default function WorkIndex() {
  return (
    <nav aria-label="Work sections" className="mt-9">
      <ol role="list" className="flex flex-wrap gap-3">
        {entries.map((entry) => (
          <li key={entry.href} className="min-w-0 max-w-full">
            <a
              href={entry.href}
              className="group flex min-h-[48px] items-center gap-3 rounded-sharp border border-line-strong bg-surface px-4 py-2.5 text-fg transition-[border-color,background-color] duration-200 hover:border-accent hover:bg-surface-2"
            >
              <span className="eyebrow tabular-nums text-accent" aria-hidden="true">
                {entry.number}
              </span>
              <span className="whitespace-nowrap text-[0.9375rem] font-medium leading-snug tracking-tight">
                {entry.label}
              </span>
              <span className="whitespace-nowrap font-mono text-[0.75rem] tabular-nums text-muted">{entry.count}</span>
              <Icon
                name="arrow"
                size={16}
                className="rotate-90 text-muted transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-accent motion-reduce:transition-none"
              />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
