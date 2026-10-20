import Link from "next/link";
import Icon from "@/components/ui/Icon";

export type Destination = { label: string; href: string; note: string };

export const coreDestinations: Destination[] = [
  { label: "Home", href: "/", note: "Overview of what we do" },
  { label: "Services", href: "/services", note: "Software, web, mobile, cloud and AI" },
  { label: "Work", href: "/work", note: "Websites, software and Android apps" },
  { label: "About", href: "/about", note: "Who we are and how we work" },
  { label: "Contact", href: "/contact", note: "Start a conversation" },
];

type DestinationListProps = {
  items?: Destination[];
  label?: string;
};

/**
 * Useful destinations as 12px-radius link rows on the raised surface, shown on the system pages
 * (404 and similar). Phones show the label alone; from 640px the note sits in its own column.
 */
export default function DestinationList({ items = coreDestinations, label = "Useful pages" }: DestinationListProps) {
  return (
    <nav aria-label={label}>
      <ol className="grid gap-2">
        {items.map((item, index) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group grid min-h-[60px] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-sharp border border-line bg-surface px-4 py-3 transition-[border-color,background-color,transform] duration-200 hover:border-line-strong hover:bg-surface-2 motion-safe:hover:-translate-y-0.5 sm:grid-cols-[2.75rem_minmax(0,11rem)_minmax(0,1fr)_auto] sm:gap-x-4 sm:px-5"
            >
              <span className="font-mono text-[0.8125rem] tracking-[0.08em] text-accent" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 font-medium tracking-tight text-fg">{item.label}</span>
              <span className="hidden min-w-0 truncate text-[0.9375rem] text-muted sm:block">{item.note}</span>
              <Icon
                name="arrow"
                size={18}
                className="text-muted transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
