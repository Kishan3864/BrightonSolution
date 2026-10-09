import Icon from "@/components/ui/Icon";

/* External links for project and Play Store destinations.
   Every link opens in a new tab with noopener/noreferrer, announces that to
   screen readers, and carries data-track hooks for the first-party click
   tracker (closest("[data-track]")). Colours adapt inside .section-dark. */

const linkBase =
  "group/link inline-flex min-h-[44px] items-center gap-2 text-[0.9375rem] font-medium tracking-tight text-ink underline decoration-line decoration-1 underline-offset-[7px] transition-colors duration-200 hover:text-accent hover:decoration-current [.section-dark_&]:text-paper [.section-dark_&]:decoration-line-dark [.section-dark_&]:hover:text-accent-soft";

const arrow =
  "transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5 motion-reduce:transition-none";

type VisitLinkProps = {
  url: string;
  name: string;
  className?: string;
};

/** Visible text "Visit site"; accessible name "Visit {name} site (opens in a new tab)". */
export function VisitLink({ url, name, className = "" }: VisitLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-track="outbound"
      data-track-label={name}
      className={`${linkBase} ${className}`.trim()}
    >
      <span>
        Visit<span className="sr-only"> {name}</span> site<span className="sr-only"> (opens in a new tab)</span>
      </span>
      <Icon name="arrowUpRight" size={16} className={arrow} />
    </a>
  );
}

type PlayLinkProps = {
  url: string;
  /** App name, or a label such as "Developer page" for the developer listing. */
  label: string;
  children: React.ReactNode;
  /** Extra text for screen readers, appended before "(opens in a new tab)". */
  srSuffix?: string;
  className?: string;
};

export function PlayLink({ url, label, children, srSuffix, className = "" }: PlayLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-track="play"
      data-track-label={label}
      className={`${linkBase} ${className}`.trim()}
    >
      <span>
        {children}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
        <span className="sr-only"> (opens in a new tab)</span>
      </span>
      <Icon name="arrowUpRight" size={16} className={arrow} />
    </a>
  );
}
