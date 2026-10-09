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

/** Hairline list of useful destinations, shown on the system pages (404, error, offline). */
export default function DestinationList({ items = coreDestinations, label = "Useful pages" }: DestinationListProps) {
  return (
    <nav aria-label={label}>
      <ol className="border-t border-line">
        {items.map((item, index) => (
          <li key={item.href} className="border-b border-line">
            <Link
              href={item.href}
              className="group grid min-h-[56px] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 py-4 transition-colors duration-200 hover:text-accent sm:grid-cols-[3rem_minmax(0,12rem)_minmax(0,1fr)_auto]"
            >
              <span className="font-mono text-[0.75rem] tracking-[0.08em] text-muted" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 font-medium tracking-tight">{item.label}</span>
              <span className="hidden min-w-0 truncate text-[0.9375rem] text-muted sm:block">{item.note}</span>
              <Icon
                name="arrow"
                size={18}
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
