type TagsProps = {
  tags: string[];
  className?: string;
};

/** Small monospaced scope chips: 12px radius, raised one step above the surface they sit on. */
export default function Tags({ tags, className = "" }: TagsProps) {
  return (
    <ul role="list" aria-label="Scope" className={`flex flex-wrap gap-1.5 ${className}`.trim()}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-sharp border border-line bg-surface-2 px-2.5 py-1 font-mono text-[0.75rem] uppercase leading-[1.5] tracking-[0.05em] text-muted"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
