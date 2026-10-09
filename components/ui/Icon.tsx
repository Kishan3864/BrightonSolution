import type { IconName } from "@/lib/site";

type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
};

const paths: Record<IconName, React.ReactNode> = {
  arrow: (
    <>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  arrowUpRight: (
    <>
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  mail: (
    <>
      <rect x="3" y="6" width="18" height="12" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  code: (
    <>
      <path d="M8 7l-5 5 5 5" />
      <path d="M16 7l5 5-5 5" />
      <path d="M14 4l-4 16" />
    </>
  ),
  web: (
    <>
      <rect x="3" y="4" width="18" height="16" />
      <path d="M3 9h18" />
      <path d="M7 6.5h.01" />
      <path d="M10 6.5h.01" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="3" width="10" height="18" />
      <path d="M11 17.5h2" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 6.9 11.2 3.5 3.5 0 0 0 7 18z" />
    </>
  ),
  ai: (
    <>
      <rect x="5" y="5" width="14" height="14" />
      <path d="M9 9h6v6H9z" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </>
  ),
  design: (
    <>
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
      <path d="M13 8l3 3" />
    </>
  ),
  support: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v5" />
      <path d="M12 15v5" />
      <path d="M4 12h5" />
      <path d="M15 12h5" />
    </>
  ),
};

export default function Icon({ name, className = "", size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`.trim()}
    >
      {paths[name]}
    </svg>
  );
}
