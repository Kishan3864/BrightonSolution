const W = 720;
const H = 640;
const STEP = 40;

/* Keep every line exactly one device pixel, whatever the rendered size. */
const ve = { vectorEffect: "non-scaling-stroke" } as const;

const verticals = Array.from({ length: W / STEP - 1 }, (_, i) => (i + 1) * STEP);
const horizontals = Array.from({ length: H / STEP - 1 }, (_, i) => (i + 1) * STEP);

/* 45-degree hatching clipped to the annex at (480,400)-(640,560): lines x + y = c */
const hatch = Array.from({ length: 15 }, (_, i) => {
  const c = 900 + i * 20;
  const x1 = Math.max(480, c - 560);
  const x2 = Math.min(640, c - 400);
  return { x1, y1: c - x1, x2, y2: c - x2 };
});

const marks: Array<[number, number]> = [
  [40, 40],
  [680, 40],
  [40, 600],
  [680, 600],
];

export default function HeroArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={`hero-art text-ink ${className}`.trim()}
      style={{ maxHeight: "70vh" }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {/* Tracing-paper grid */}
      <g opacity={0.12}>
        {verticals.map((x) => (
          <path key={`v${x}`} d={`M${x} 0V${H}`} {...ve} />
        ))}
        {horizontals.map((y) => (
          <path key={`h${y}`} d={`M0 ${y}H${W}`} {...ve} />
        ))}
      </g>

      {/* Registration marks */}
      <g opacity={0.35}>
        {marks.map(([x, y]) => (
          <path key={`m${x}-${y}`} d={`M${x - 8} ${y}H${x + 8}M${x} ${y - 8}V${y + 8}`} {...ve} />
        ))}
      </g>

      {/* Plan: second sheet, main block with double wall line, partition walls, hatched annex */}
      <rect x={80} y={40} width={200} height={160} opacity={0.4} {...ve} />
      <rect x={160} y={120} width={400} height={320} opacity={0.6} {...ve} />
      <rect x={168} y={128} width={384} height={304} opacity={0.22} {...ve} />
      <path d="M320 120V440M320 280H560" opacity={0.35} {...ve} />
      <rect x={480} y={400} width={160} height={160} opacity={0.45} {...ve} />
      <g opacity={0.22}>
        {hatch.map((l) => (
          <path key={`x${l.x1}-${l.y1}`} d={`M${l.x1} ${l.y1}L${l.x2} ${l.y2}`} {...ve} />
        ))}
      </g>

      {/* Dimension lines */}
      <g opacity={0.5}>
        <path d="M320 80H560M320 74V86M560 74V86" {...ve} />
        <path d="M600 120V280M594 120H606M594 280H606" {...ve} />
      </g>

      {/* Section line */}
      <path className="ha-dash" d="M140 600L620 120" opacity={0.45} {...ve} />

      {/* Network overlay: a slowly drifting sheet of nodes and routed connections */}
      <g className="ha-drift">
        <g opacity={0.75}>
          <path d="M400 360H240V240" {...ve} />
          <path d="M400 360V400" {...ve} />
          <path d="M200 400H440" {...ve} />
          <path className="ha-dash ha-delay-2" d="M240 240V160" {...ve} />
        </g>
        <path className="ha-dash ha-delay-1 text-accent" stroke="currentColor" d="M400 360V200H480" {...ve} />

        <g fill="var(--color-paper)">
          <circle className="ha-pulse" cx={240} cy={240} r={4.5} {...ve} />
          <circle className="ha-pulse ha-delay-1" cx={200} cy={400} r={4.5} {...ve} />
          <circle className="ha-pulse ha-delay-3" cx={480} cy={200} r={4.5} {...ve} />
          <rect x={235.5} y={155.5} width={9} height={9} {...ve} />
          <rect className="ha-pulse ha-delay-2" x={435.5} y={395.5} width={9} height={9} {...ve} />
        </g>
        <rect className="text-accent" x={395} y={355} width={10} height={10} fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}
