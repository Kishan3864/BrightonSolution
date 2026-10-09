type TagsProps = {
  tags: string[];
  className?: string;
};

/** Small, sharp, monospaced scope tags. */
export default function Tags({ tags, className = "" }: TagsProps) {
  return (
    <ul role="list" aria-label="Scope" className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-sharp border border-line px-2 py-[3px] font-mono text-[0.6875rem] uppercase leading-[1.5] tracking-[0.06em] text-muted [.section-dark_&]:border-line-dark [.section-dark_&]:text-muted-dark"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
